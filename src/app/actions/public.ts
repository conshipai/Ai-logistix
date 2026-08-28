'use server'

import { headers } from 'next/headers'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { RATE_LIMITS, clientIp, rateLimit } from '@/lib/rate-limit'
import { fieldErrors, inquirySchema, registrationSchema } from '@/lib/validation'
import { register } from '@/server/services/registration'
import { aiLogistixStaffUserIds, notify } from '@/server/services/notifications'

/**
 * Public (unauthenticated) server actions.
 *
 * Both are rate limited by client address and neither discloses whether an
 * email address is already known to the platform.
 */

export interface FormState {
  ok: boolean
  message?: string
  errors?: Record<string, string[]>
}

export async function submitInquiry(_prev: FormState, formData: FormData): Promise<FormState> {
  const ip = clientIp(await headers())
  const limit = await rateLimit(`inquiry:${ip}`, RATE_LIMITS.inquiry.limit, RATE_LIMITS.inquiry.windowSeconds)
  if (!limit.allowed) {
    return { ok: false, message: 'Too many submissions. Please try again later.' }
  }

  const parsed = inquirySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }

  const { website: _honeypot, ...input } = parsed.data

  const inquiry = await prisma.inquiry.create({
    data: {
      type: input.type,
      name: input.name,
      email: input.email,
      company: input.company,
      jobTitle: input.jobTitle || null,
      phone: input.phone || null,
      country: input.country,
      message: input.message,
    },
    select: { id: true },
  })

  await recordAudit({
    action: 'inquiry.received',
    entityType: 'Inquiry',
    entityId: inquiry.id,
    actorEmail: input.email,
    after: { type: input.type, company: input.company, country: input.country },
    ipAddress: ip,
  })

  await notify({
    userIds: await aiLogistixStaffUserIds(),
    event: 'inquiry.received',
    subject: `New ${input.type.replace(/_/g, ' ').toLowerCase()} inquiry: ${input.company}`,
    body: `${input.name} (${input.email}) at ${input.company}:\n\n${input.message}`,
    linkPath: '/app/admin/inquiries',
  })

  return {
    ok: true,
    message:
      'Thank you. Your inquiry has been received and a member of the AI Logistix team will be in touch.',
  }
}

export async function submitRegistration(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ip = clientIp(await headers())
  const limit = await rateLimit(
    `register:${ip}`,
    RATE_LIMITS.register.limit,
    RATE_LIMITS.register.windowSeconds,
  )
  if (!limit.allowed) {
    return { ok: false, message: 'Too many registration attempts. Please try again later.' }
  }

  const parsed = registrationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Please correct the highlighted fields.',
      errors: fieldErrors(parsed.error),
    }
  }

  await register(parsed.data)

  // The same confirmation is returned whether or not the address was already
  // registered, so the form cannot be used to enumerate accounts.
  return {
    ok: true,
    message:
      'Registration received. Please check your email to confirm your address. Your account will ' +
      'be activated once AI Logistix has reviewed your registration.',
  }
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ip = clientIp(await headers())
  const limit = await rateLimit(
    `pwreset:${ip}`,
    RATE_LIMITS.passwordReset.limit,
    RATE_LIMITS.passwordReset.windowSeconds,
  )
  if (!limit.allowed) {
    return { ok: false, message: 'Too many requests. Please try again later.' }
  }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, errors: { email: ['Enter a valid email address.'] } }
  }

  const { requestPasswordReset } = await import('@/server/services/users')
  await requestPasswordReset(email)

  return {
    ok: true,
    message:
      'If an account exists for that address, a password reset link has been sent. The link ' +
      'expires in one hour.',
  }
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { resetPasswordSchema } = await import('@/lib/validation')
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      ok: false,
      message: 'Please correct the highlighted fields.',
      errors: fieldErrors(parsed.error),
    }
  }

  const { resetPassword } = await import('@/server/services/users')
  const ok = await resetPassword(parsed.data.token, parsed.data.password)
  if (!ok) {
    return {
      ok: false,
      message: 'That reset link is invalid or has expired. Please request a new one.',
    }
  }
  return { ok: true, message: 'Your password has been reset. You can now sign in.' }
}

export { AUDIT_ACTIONS }
