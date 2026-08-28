import { execSync } from 'node:child_process'
import { PrismaClient } from '@prisma/client'

/**
 * Test database.
 *
 * The integration tests exercise the real Prisma client against a real
 * PostgreSQL schema — the authorization rules they check are enforced partly by
 * database constraints and partly by query composition, so mocking Prisma would
 * test nothing worth testing.
 *
 * The schema is applied with `prisma migrate deploy`, which also proves the
 * committed migrations produce the schema the application expects. Tables are
 * then truncated rather than dropped, so the run never destroys a schema it did
 * not create.
 *
 * TEST_DATABASE_URL must point at a dedicated test database.
 */
const url =
  process.env.TEST_DATABASE_URL ??
  'postgresql://mconnect:mconnect@localhost:5432/mconnect_test?schema=public'

process.env.DATABASE_URL = url
Object.assign(process.env, { NODE_ENV: 'test' })
process.env.AUTH_SECRET ??= 'test-secret-value-that-is-at-least-32-characters-long'
process.env.APP_URL ??= 'http://localhost:3000'
process.env.STORAGE_DRIVER ??= 'local'
process.env.STORAGE_LOCAL_PATH ??= './.storage-test'

execSync('npx prisma migrate deploy', {
  stdio: 'pipe',
  env: { ...process.env, DATABASE_URL: url },
})

/** Empties every application table, leaving the schema in place. */
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
  `
  if (tables.length === 0) return
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
}
