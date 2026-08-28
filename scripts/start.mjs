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
  const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
  })
  if (migrate.status !== 0) {
    console.error('[mconnect] Migrations failed. Refusing to start.')
    process.exit(migrate.status ?? 1)
  }
  console.info('[mconnect] Migrations up to date.')
}

console.info(`[mconnect] Starting server on ${process.env.HOSTNAME ?? '0.0.0.0'}:${process.env.PORT ?? 3000}`)
await import(server)
