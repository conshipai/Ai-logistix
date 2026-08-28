/**
 * Production start for deployments that run from the repository.
 *
 * Applies outstanding migrations, then starts the Next.js standalone server.
 * `migrate deploy` only ever applies committed migration files: it never resets
 * a database and never generates a migration from schema drift. A failed
 * migration exits rather than serving traffic against an unexpected schema.
 *
 * The production Docker image does not use this script — it has its own
 * entrypoint, because the Prisma CLI lives in an isolated tree there rather
 * than in node_modules. Both paths apply migrations the same way.
 *
 * Requires the Prisma CLI, which is a devDependency. A deployment that installs
 * with `--omit=dev` must skip migrations here and apply them from a release job
 * instead (SKIP_MIGRATIONS=true).
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { reportEnvironment } from './check-env.mjs'

const server = path.join(process.cwd(), '.next', 'standalone', 'server.js')
if (!existsSync(server)) {
  console.error(
    '[mconnect] .next/standalone/server.js is missing. Run `npm run build` before `npm start`.',
  )
  process.exit(1)
}

// Fail on configuration before invoking Prisma, so a missing variable reads as
// one clear message rather than a schema-validation stack trace.
if (!reportEnvironment({ production: process.env.NODE_ENV === 'production' })) {
  process.exit(1)
}

if (process.env.SKIP_MIGRATIONS === 'true') {
  console.info('[mconnect] SKIP_MIGRATIONS=true — not applying migrations.')
} else {
  console.info('[mconnect] Applying database migrations…')
  // Resolve the installed CLI rather than shelling out to npx, which tries to
  // fetch the package over the network when it cannot resolve it locally — an
  // unwanted dependency in a container's start path, and a confusing failure
  // when egress is restricted.
  let cli
  try {
    cli = createRequire(import.meta.url).resolve('prisma/build/index.js')
  } catch {
    console.error(
      '[mconnect] The Prisma CLI is not installed. It is a devDependency, so an\n' +
        '           install with --omit=dev cannot apply migrations. Either install\n' +
        '           dev dependencies, or set SKIP_MIGRATIONS=true and apply them\n' +
        '           from a separate release step.',
    )
    process.exit(1)
  }

  const migrate = spawnSync(process.execPath, [cli, 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
  })
  if (migrate.status !== 0) {
    console.error('[mconnect] Migrations failed. Refusing to start.')
    process.exit(migrate.status ?? 1)
  }
  console.info('[mconnect] Migrations up to date.')
}

// Docker sets HOSTNAME to the container id, and the Next.js standalone server
// binds to whatever HOSTNAME contains (`process.env.HOSTNAME || '0.0.0.0'`).
// Left alone, the server binds to the container's own id instead of every
// interface, so a reverse proxy on the shared Docker network cannot reach it —
// a healthy, "Ready" container that answers every request with 502 Bad Gateway.
// The production Dockerfile pins HOSTNAME=0.0.0.0 for the same reason; this is
// the equivalent for deployments that run from the repository.
process.env.HOSTNAME = process.env.BIND_HOST || '0.0.0.0'

console.info(`[mconnect] Starting server on ${process.env.HOSTNAME}:${process.env.PORT ?? 3000}`)
await import(server)
