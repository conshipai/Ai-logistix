'use server'

import { AuthError } from 'next-auth'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { SignInError, signIn, signOut } from '@/lib/auth'
import { RATE_LIMITS, clientIp, rateLimit } from '@/lib/rate-limit'
import { loginSchema } from '@/lib/validation'
import type { FormState } from '@/app/actions/public'

/**
 * Sign-in.
 *
 * Rate limited per address and per account. A failed attempt always returns the
 * same generic message so the form cannot be used to tell a wrong password from
 * an unknown account.
 */
export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = clientIp(await headers())
  const parsed = loginSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Enter your email address and password.' }
  }

  const byIp = await rateLimit(`login:ip:${ip}`, RATE_LIMITS.login.limit, RATE_LIMITS.login.windowSeconds)
  const byAccount = await rateLimit(
    `login:account:${parsed.data.email}`,
    RATE_LIMITS.login.limit,
    RATE_LIMITS.login.windowSeconds,
  )
  if (!byIp.allowed || !byAccount.allowed) {
    return {
      ok: false,
      message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
    }
  }

  const redirectTo = sanitizeRedirect(String(formData.get('redirectTo') ?? '/app'))

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    })
  } catch (error) {
    if (error instanceof SignInError || (error as { cause?: { err?: unknown } })?.cause?.err instanceof SignInError) {
      const reason =
        error instanceof SignInError
          ? error.reason
          : ((error as { cause: { err: SignInError } }).cause.err.reason)
      await recordAudit({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: 'User',
        actorEmail: parsed.data.email,
        metadata: { reason },
        ipAddress: ip,
      })
      return { ok: false, message: SIGN_IN_MESSAGES[reason] }
    }
    if (error instanceof AuthError) {
      await recordAudit({
        action: AUDIT_ACTIONS.USER_LOGIN_FAILED,
        entityType: 'User',
        actorEmail: parsed.data.email,
        metadata: { reason: 'INVALID' },
        ipAddress: ip,
      })
      return { ok: false, message: SIGN_IN_MESSAGES.INVALID }
    }
    throw error
  }

  await recordAudit({
    action: AUDIT_ACTIONS.USER_LOGIN,
    entityType: 'User',
    actorEmail: parsed.data.email,
    ipAddress: ip,
  })

  redirect(redirectTo)
}

const SIGN_IN_MESSAGES: Record<'INVALID' | 'PENDING' | 'SUSPENDED' | 'LOCKED', string> = {
  INVALID: 'Those sign-in details were not recognised.',
  PENDING:
    'Your account is awaiting review by AI Logistix. You will be emailed once it is activated.',
  SUSPENDED: 'This account is not currently active. Please contact AI Logistix.',
  LOCKED:
    'This account is temporarily locked after too many failed attempts. Try again in 15 minutes, ' +
    'or reset your password.',
}

export async function signOutAction(): Promise<void> {
  const { currentActor } = await import('@/lib/session')
  const actor = await currentActor()
  if (actor) {
    await recordAudit({ actor, action: AUDIT_ACTIONS.USER_LOGOUT, entityType: 'User', entityId: actor.userId })
  }
  await signOut({ redirectTo: '/login' })
}

/** Only same-origin application paths are accepted as a post-login destination. */
function sanitizeRedirect(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/app'
  return value
}
