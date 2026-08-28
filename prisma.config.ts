// Loading .env must come before defineConfig: from Prisma 6.x, the presence of
// this config file disables Prisma's own automatic .env loading ("Prisma config
// detected, skipping environment variable loading"). Without this import the
// CLI cannot see DATABASE_URL from a .env file, which breaks the documented
// local-development flow and any deployment that supplies configuration that
// way. Real process environment variables — how Coolify injects configuration —
// always take precedence over the file.
import 'dotenv/config'

import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
