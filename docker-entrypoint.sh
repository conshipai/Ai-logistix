#!/bin/sh
# MConnect container entrypoint.
#
# Applies outstanding database migrations, then starts the server. Migrations
# run with `migrate deploy`, which only ever applies committed migration files —
# it never resets a database and never generates a migration from a schema
# drift. If a migration fails the container exits rather than serving traffic
# against a schema the application does not expect.
set -eu

# Fail on configuration before invoking Prisma, so a missing variable reads as
# one clear message rather than a schema-validation stack trace repeated on
# every restart of a crash-looping container.
missing=""
[ -z "${DATABASE_URL:-}" ] && missing="${missing}  DATABASE_URL   PostgreSQL connection string\n"
[ -z "${AUTH_SECRET:-}" ] && missing="${missing}  AUTH_SECRET    Session signing key (openssl rand -base64 32)\n"

if [ -n "$missing" ]; then
  echo ""
  echo "[mconnect] Cannot start — the deployment is not configured."
  echo ""
  printf "%b" "$missing"
  echo ""
  echo "  Set these in your deployment environment. In Coolify:"
  echo "  the application -> Environment Variables -> add, then redeploy."
  echo ""
  echo "  DATABASE_URL must use the database service's internal hostname,"
  echo "  not localhost — containers do not share a network namespace."
  echo ""
  exit 1
fi

if [ "${SKIP_MIGRATIONS:-false}" = "true" ]; then
  echo "[mconnect] SKIP_MIGRATIONS=true — not applying migrations."
else
  echo "[mconnect] Applying database migrations…"
  node ./prisma-cli/node_modules/prisma/build/index.js migrate deploy --schema=./prisma/schema.prisma
  echo "[mconnect] Migrations up to date."
fi

echo "[mconnect] Starting server on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"
exec "$@"
