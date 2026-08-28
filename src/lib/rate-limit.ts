import { prisma } from '@/lib/db'

/**
 * Fixed-window rate limiting backed by Postgres.
 *
 * A database counter rather than an in-process map, so the limit holds across
 * restarts and across multiple Coolify replicas. Fixed windows allow a burst at
 * a boundary; that is an accepted trade-off for login and upload throttling.
 */
export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export async function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date()
  const windowStartCutoff = new Date(now.getTime() - windowSeconds * 1000)

  try {
    const existing = await prisma.rateLimitCounter.findUnique({ where: { bucketKey: key } })

    if (!existing || existing.windowStart < windowStartCutoff) {
      await prisma.rateLimitCounter.upsert({
        where: { bucketKey: key },
        create: { bucketKey: key, count: 1, windowStart: now },
        update: { count: 1, windowStart: now },
      })
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(now.getTime() + windowSeconds * 1000),
      }
    }

    const resetAt = new Date(existing.windowStart.getTime() + windowSeconds * 1000)
    if (existing.count >= limit) {
      return { allowed: false, remaining: 0, resetAt }
    }

    const updated = await prisma.rateLimitCounter.update({
      where: { bucketKey: key },
      data: { count: { increment: 1 } },
    })
    return { allowed: true, remaining: Math.max(0, limit - updated.count), resetAt }
  } catch (error) {
    // A rate-limiter outage must not lock every user out of the platform.
    console.error('[rate-limit] backend unavailable, allowing request', error)
    return { allowed: true, remaining: limit, resetAt: new Date(now.getTime() + windowSeconds * 1000) }
  }
}

export const RATE_LIMITS = {
  login: { limit: 10, windowSeconds: 15 * 60 },
  register: { limit: 5, windowSeconds: 60 * 60 },
  passwordReset: { limit: 5, windowSeconds: 60 * 60 },
  upload: { limit: 60, windowSeconds: 60 * 60 },
  inquiry: { limit: 5, windowSeconds: 60 * 60 },
  download: { limit: 200, windowSeconds: 60 * 60 },
} as const

/** Best-effort client address behind the Coolify reverse proxy. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return headers.get('x-real-ip') ?? 'unknown'
}

/** Purge counters whose window has long expired. Called from the health route. */
export async function pruneRateLimitCounters(olderThanHours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 3600 * 1000)
  const result = await prisma.rateLimitCounter.deleteMany({ where: { windowStart: { lt: cutoff } } })
  return result.count
}
