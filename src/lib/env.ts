import { z } from 'zod'

/**
 * Environment contract.
 *
 * Parsed once, lazily, on the server. Missing production values fail loudly at
 * first use rather than silently degrading — except for the optional subsystems
 * (SMTP, S3) which are explicitly allowed to be absent so the platform can run
 * in a reduced mode during early deployment.
 */
const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  AUTH_SECRET: z
    .string()
    .min(32, 'AUTH_SECRET must be at least 32 characters — generate with `openssl rand -base64 32`'),
  AUTH_URL: z.string().url().optional(),
  APP_URL: z.string().url().default('http://localhost:3000'),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  EMAIL_FROM: z.string().optional(),

  STORAGE_DRIVER: z.enum(['s3', 'local']).default('local'),
  STORAGE_ENDPOINT: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_REGION: z.string().default('us-east-1'),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v !== 'false'),
  STORAGE_LOCAL_PATH: z.string().default('./.storage'),

  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(25 * 1024 * 1024),
  SIGNED_URL_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  ALLOW_DEMO_SEED: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

export function env(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/** Absolute base URL of the deployment, used to build links in emails. */
export function appUrl(): string {
  return env().APP_URL.replace(/\/$/, '')
}
