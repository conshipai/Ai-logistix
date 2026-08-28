/**
 * Startup configuration check.
 *
 * Without this, a missing DATABASE_URL surfaces as a wall of Prisma schema
 * validation output ("Error code: P1012 ... Validation Error Count: 1") that
 * buries the one line that matters, and the container crash-loops repeating it.
 * A deployment is usually missing more than one variable, so every problem is
 * reported at once rather than one per restart.
 *
 * Exported so both the npm start path and any other entry point can share one
 * definition of what "configured" means.
 */

const REQUIRED = [
  {
    name: 'DATABASE_URL',
    describe: 'PostgreSQL connection string',
    example: 'postgresql://user:password@postgres-host:5432/mconnect?schema=public',
    validate: (value) =>
      /^postgres(ql)?:\/\//.test(value)
        ? null
        : 'must be a postgresql:// connection string',
  },
  {
    name: 'AUTH_SECRET',
    describe: 'Session signing key — generate with: openssl rand -base64 32',
    example: '<32+ random characters>',
    validate: (value) =>
      value.length >= 32 ? null : 'must be at least 32 characters',
  },
]

const RECOMMENDED = [
  { name: 'APP_URL', describe: 'Public origin, used to build links in email' },
  { name: 'AUTH_URL', describe: 'Public origin, used to validate sign-in callbacks' },
]

export function checkEnvironment({ production = false } = {}) {
  const problems = []

  for (const variable of REQUIRED) {
    const value = process.env[variable.name]
    if (!value || value.trim() === '') {
      problems.push({ ...variable, reason: 'is not set' })
      continue
    }
    const invalid = variable.validate?.(value.trim())
    if (invalid) problems.push({ ...variable, reason: invalid })
  }

  const warnings = []

  // Documents are the evidence behind a financing decision. The local driver
  // writes them inside the container, so unless a persistent volume is mounted
  // every redeploy destroys them — silently, and only discovered when someone
  // needs a document months later. Worth saying loudly on every start.
  if (production && (process.env.STORAGE_DRIVER ?? 'local') === 'local') {
    warnings.push(
      `STORAGE_DRIVER is "local" — uploaded documents are written inside the container at ` +
        `${process.env.STORAGE_LOCAL_PATH ?? './.storage'} and will be LOST on every redeploy ` +
        `unless a persistent volume is mounted there. Set STORAGE_DRIVER=s3 with ` +
        `object-storage credentials, or attach a volume.`,
    )
  }

  for (const variable of RECOMMENDED) {
    const value = process.env[variable.name]
    if (!value) {
      warnings.push(`${variable.name} is not set — ${variable.describe}.`)
    } else if (production && /localhost|127\.0\.0\.1/.test(value)) {
      warnings.push(`${variable.name} points at localhost (${value}), which will break email links and sign-in.`)
    }
  }

  return { problems, warnings }
}

/** Prints the result. Returns true when it is safe to start. */
export function reportEnvironment({ production = false } = {}) {
  const { problems, warnings } = checkEnvironment({ production })

  for (const warning of warnings) {
    console.warn(`[mconnect] Warning: ${warning}`)
  }

  if (problems.length === 0) return true

  console.error('')
  console.error('[mconnect] Cannot start — the deployment is not configured.')
  console.error('')
  for (const problem of problems) {
    console.error(`  ${problem.name}  ${problem.reason}`)
    console.error(`      ${problem.describe}`)
    console.error(`      e.g. ${problem.example}`)
    console.error('')
  }
  console.error('  Set these in your deployment environment. In Coolify:')
  console.error('  the application → Environment Variables → add, then redeploy.')
  console.error('  For local development, put them in a .env file (see .env.example).')
  console.error('')
  console.error('  DATABASE_URL must use the database service\'s internal hostname,')
  console.error('  not localhost — containers do not share a network namespace.')
  console.error('')
  return false
}
