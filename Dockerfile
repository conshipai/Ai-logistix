# MConnect production image.
#
# Multi-stage: dependencies, build, then a minimal runtime that carries only the
# Next.js standalone output, the Prisma engine and the migration files. The
# final image runs as a non-root user and contains no build toolchain.

# ---------------------------------------------------------------------------
# 1. Dependencies
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ---------------------------------------------------------------------------
# 2. Build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# The build never connects to a database or signs anything; these placeholders
# exist only to satisfy env validation during the compile step. They are scoped
# to this RUN, so no value is recorded in the image's environment, and the real
# values are injected by Coolify at runtime.
RUN DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build" \
    AUTH_SECRET="build-step-placeholder-never-used-to-sign-anything" \
    sh -c "npx prisma generate && npm run build"

# ---------------------------------------------------------------------------
# 3. Prisma CLI
# ---------------------------------------------------------------------------
# The CLI is needed at container start to apply migrations, but it is a build
# tool rather than part of the application. Installing it into its own tree —
# at the exact version package.json pins — keeps its dependencies out of the
# application's node_modules and keeps the runtime image small.
FROM node:22-alpine AS prisma-cli
RUN apk add --no-cache libc6-compat openssl
WORKDIR /cli
COPY package.json ./package.json
RUN npm init -y >/dev/null 2>&1 \
 && npm install --no-audit --no-fund --omit=optional \
      "prisma@$(node -p "require('/cli/package.json').devDependencies.prisma")"

# ---------------------------------------------------------------------------
# 4. Runtime
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl dumb-init
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 --ingroup nodejs mconnect

# The standalone bundle, its static assets and the public directory.
COPY --from=builder --chown=mconnect:nodejs /app/.next/standalone ./
COPY --from=builder --chown=mconnect:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=mconnect:nodejs /app/public ./public

# Prisma CLI, schema and migrations, so `migrate deploy` can run at startup.
# The CLI is invoked as prisma/build/index.js rather than through .bin/prisma:
# that entry is a symlink, and COPY dereferences it, which would move the CLI
# away from the WASM assets it loads by relative path. prisma.config.ts is
# deliberately not copied — it is TypeScript and the runtime image carries no
# TS loader — so the schema path is passed to the CLI explicitly.
COPY --from=builder --chown=mconnect:nodejs /app/prisma ./prisma
# create-admin is needed in the running container: a fresh deployment has no
# users, and there is otherwise no way to obtain the first one.
COPY --from=builder --chown=mconnect:nodejs /app/scripts ./scripts
COPY --from=prisma-cli --chown=mconnect:nodejs /cli/node_modules ./prisma-cli/node_modules

COPY --chown=mconnect:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Fallback document storage when STORAGE_DRIVER=local. Mount a Coolify volume
# here, or set STORAGE_DRIVER=s3 and point at object storage instead.
RUN mkdir -p /app/.storage && chown mconnect:nodejs /app/.storage
VOLUME ["/app/.storage"]

USER mconnect
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--", "./docker-entrypoint.sh"]
CMD ["node", "server.js"]
