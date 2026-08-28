import bcrypt from 'bcryptjs'
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

const COST = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}

/**
 * Password policy. Length carries most of the strength; the character-class
 * rules are kept modest so suppliers are not pushed toward writing passwords
 * down. MFA is the intended second factor (schema is in place).
 */
export const passwordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters.')
  .max(200, 'Password must be at most 200 characters.')
  .refine((v) => /[a-z]/.test(v), 'Password must contain a lower-case letter.')
  .refine((v) => /[A-Z]/.test(v), 'Password must contain an upper-case letter.')
  .refine((v) => /[0-9]/.test(v), 'Password must contain a digit.')

/** Single-use token: the plaintext goes in the emailed link, the hash in the DB. */
export function createToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url')
  return { token, tokenHash: hashToken(token) }
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function safeEquals(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

/** Blunt but effective: keeps throwaway inboxes out of the registration queue. */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 'tempmail.com',
  'temp-mail.org', 'throwawaymail.com', 'yopmail.com', 'trashmail.com',
  'getnada.com', 'sharklasers.com', 'dispostable.com', 'maildrop.cc',
  'fakeinbox.com', 'tempinbox.com', 'mytemp.email', 'moakt.com',
  'emailondeck.com', 'mohmal.com', 'spamgourmet.com', 'inboxbear.com',
])

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false
}
