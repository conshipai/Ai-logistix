import { randomBytes, randomUUID } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * MCONNECT-2026-000001.
 *
 * Sequence is per calendar year and derived inside the caller's transaction so
 * two concurrent submissions cannot claim the same number. The number is a
 * display identifier only — every internal reference uses the UUID id.
 */
export async function nextTransactionNumber(db: Db, year = new Date().getUTCFullYear()): Promise<string> {
  const prefix = `MCONNECT-${year}-`
  const rows = await db.$queryRaw<Array<{ number: string }>>`
    SELECT number FROM transactions
    WHERE number LIKE ${prefix + '%'}
    ORDER BY number DESC
    LIMIT 1
  `
  const last = rows[0]?.number
  const lastSeq = last ? Number.parseInt(last.slice(prefix.length), 10) : 0
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1
  return `${prefix}${String(next).padStart(6, '0')}`
}

/** Short, non-sequential public reference for secondary records. */
export function reference(prefix: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return `${prefix}-${out}`
}

export function uuid(): string {
  return randomUUID()
}

/** Storage keys are unguessable so a leaked key still needs an authorization pass. */
export function storageKey(organizationId: string, fileName: string): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80)
  return `org/${organizationId}/${randomUUID()}/${safe}`
}
