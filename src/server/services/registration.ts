import type { z } from 'zod'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { appUrl } from '@/lib/env'
import { reference } from '@/lib/ids'
import { emailLayout, sendMail } from '@/lib/mail'
import { createToken, hashPassword, hashToken } from '@/lib/password'
import { NotFoundError, ROLE_FOR_ORG_TYPE, ValidationError, requirePermission, type Actor } from '@/lib/rbac'
import type { registrationDecisionSchema, registrationSchema } from '@/lib/validation'
import {
  NOTIFICATION_EVENTS,
  aiLogistixStaffUserIds,
  notify,
} from '@/server/services/notifications'

/**
 * Registration.
 *
 * Self-registration never grants platform access. It creates a user in
 * PENDING_REVIEW and a registration request in the AI Logistix queue. An
 * administrator approves it, which creates or attaches the organization and
 * activates the account.
 */

export type RegistrationInput = z.infer<typeof registrationSchema>
export type RegistrationDecisionInput = z.infer<typeof registrationDecisionSchema>

export async function register(
  input: RegistrationInput,
): Promise<{ created: boolean }> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  // Reply identically whether or not the address is already registered, so the
  // form cannot be used to enumerate accounts.
  if (existing) {
    await recordAudit({
      action: AUDIT_ACTIONS.USER_REGISTERED,
      entityType: 'User',
      actorEmail: input.email,
      metadata: { duplicate: true },
    })
    return { created: false }
  }

  const passwordHash = await hashPassword(input.password)
  const { token, tokenHash } = createToken()

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        jobTitle: input.jobTitle || null,
        phone: input.phone || null,
        country: input.country,
        status: 'PENDING_REVIEW',
      },
      select: { id: true, email: true, name: true },
    })

    await tx.registrationRequest.create({
      data: {
        userId: created.id,
        name: input.name,
        email: input.email,
        companyName: input.companyName,
        jobTitle: input.jobTitle || null,
        phone: input.phone || null,
        country: input.country,
        organizationType: input.organizationType,
        reason: input.reason,
        status: 'PENDING_REVIEW',
      },
    })

    await tx.verificationToken.create({
      data: {
        userId: created.id,
        type: 'EMAIL_VERIFICATION',
        tokenHash,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    })

    return created
  })

  await recordAudit({
    action: AUDIT_ACTIONS.USER_REGISTERED,
    entityType: 'User',
    entityId: user.id,
    actorEmail: user.email,
    after: {
      name: input.name,
      companyName: input.companyName,
      organizationType: input.organizationType,
      country: input.country,
    },
  })

  const verifyUrl = `${appUrl()}/verify-email?token=${token}`
  await sendMail({
    to: user.email,
    subject: '[MConnect] Confirm your email address',
    text:
      `Thank you for registering with MConnect.\n\nConfirm your email address:\n${verifyUrl}\n\n` +
      'Your registration will then be reviewed by AI Logistix before your account is activated. ' +
      'This link expires in 48 hours.',
    html: emailLayout(
      'Confirm your email address',
      '<p style="line-height:1.65">Thank you for registering with MConnect. Please confirm your email address. ' +
        'Your registration will then be reviewed by AI Logistix before your account is activated.</p>' +
        '<p style="line-height:1.65;color:#476296;font-size:13px">This link expires in 48 hours.</p>',
      verifyUrl,
      'Confirm email address',
    ),
  })

  await notify({
    userIds: await aiLogistixStaffUserIds(),
    event: NOTIFICATION_EVENTS.REGISTRATION_RECEIVED,
    subject: `New registration: ${input.companyName}`,
    body: `${input.name} (${input.email}) registered on behalf of ${input.companyName} as a ${input.organizationType.replace(/_/g, ' ').toLowerCase()}.`,
    linkPath: '/app/admin/registrations',
  })

  return { created: true }
}

export async function verifyEmail(token: string): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true } } },
  })
  if (!record || record.type !== 'EMAIL_VERIFICATION') return false
  if (record.usedAt || record.expiresAt < new Date()) return false

  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: new Date() } }),
  ])

  await recordAudit({
    action: AUDIT_ACTIONS.USER_EMAIL_VERIFIED,
    entityType: 'User',
    entityId: record.userId,
    actorEmail: record.user.email,
  })
  return true
}

export async function listRegistrationRequests(actor: Actor, status?: 'PENDING_REVIEW') {
  requirePermission(actor, 'registration:review')
  return prisma.registrationRequest.findMany({
    where: status ? { status } : {},
    include: {
      user: { select: { id: true, email: true, emailVerifiedAt: true, status: true } },
      reviewedBy: { select: { name: true, email: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })
}

/**
 * Approves or rejects a registration.
 *
 * On approval the organization is created (or an existing one attached), the
 * membership is written with the role appropriate to the organization type, and
 * the user is activated. The organization itself starts ACTIVE but with KYC
 * NOT_STARTED, so onboarding can proceed while compliance is still in progress.
 */
export async function decideRegistration(
  actor: Actor,
  input: RegistrationDecisionInput,
): Promise<void> {
  requirePermission(actor, 'registration:review')

  const request = await prisma.registrationRequest.findUnique({
    where: { id: input.registrationRequestId },
    include: { user: true },
  })
  if (!request) throw new NotFoundError('Registration request not found.')
  if (request.status !== 'PENDING_REVIEW') {
    throw new ValidationError('This registration has already been reviewed.')
  }
  if (!request.user) throw new ValidationError('This registration has no associated user account.')

  if (input.decision === 'REJECT') {
    await prisma.$transaction([
      prisma.registrationRequest.update({
        where: { id: request.id },
        data: {
          status: 'REJECTED',
          reviewedById: actor.userId,
          reviewedAt: new Date(),
          reviewNotes: input.notes || null,
        },
      }),
      prisma.user.update({ where: { id: request.user.id }, data: { status: 'REJECTED' } }),
    ])

    await recordAudit({
      actor,
      action: AUDIT_ACTIONS.REGISTRATION_REJECTED,
      entityType: 'RegistrationRequest',
      entityId: request.id,
      after: { email: request.email, notes: input.notes },
    })

    await sendMail({
      to: request.email,
      subject: '[MConnect] Registration update',
      text:
        'Thank you for your interest in MConnect. We are not able to activate your account at ' +
        'this time.' + (input.notes ? `\n\n${input.notes}` : '') +
        '\n\nIf you believe this is in error, please reply to this message.',
      html: emailLayout(
        'Registration update',
        '<p style="line-height:1.65">Thank you for your interest in MConnect. We are not able to activate ' +
          'your account at this time.</p>' +
          (input.notes ? `<p style="line-height:1.65">${escapeHtml(input.notes)}</p>` : ''),
      ),
    })
    return
  }

  const organizationType = request.organizationType
  const role = input.role ?? ROLE_FOR_ORG_TYPE[organizationType]

  await prisma.$transaction(async (tx) => {
    let organizationId = input.existingOrganizationId || null

    if (organizationId) {
      const organization = await tx.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
      })
      if (!organization) throw new NotFoundError('Organization not found.')
    } else {
      const organization = await tx.organization.create({
        data: {
          reference: reference('ORG'),
          type: organizationType,
          legalName: request.companyName,
          country: request.country,
          email: request.email,
          primaryContactName: request.name,
          primaryContactEmail: request.email,
          phone: request.phone,
          accountStatus: 'ACTIVE',
          kycStatus: 'NOT_STARTED',
        },
        select: { id: true },
      })
      organizationId = organization.id

      if (organizationType === 'SUPPLIER') {
        await tx.supplierProfile.create({ data: { organizationId } })
      }

      await recordAudit(
        {
          actor,
          action: AUDIT_ACTIONS.ORGANIZATION_CREATED,
          entityType: 'Organization',
          entityId: organizationId,
          after: { legalName: request.companyName, type: organizationType, country: request.country },
        },
        tx,
      )
    }

    await tx.organizationMembership.upsert({
      where: { userId_organizationId: { userId: request.user!.id, organizationId } },
      create: { userId: request.user!.id, organizationId, role, isPrimary: true, isActive: true },
      update: { role, isActive: true },
    })

    await tx.user.update({ where: { id: request.user!.id }, data: { status: 'ACTIVE' } })

    await tx.registrationRequest.update({
      where: { id: request.id },
      data: {
        status: 'ACTIVE',
        reviewedById: actor.userId,
        reviewedAt: new Date(),
        reviewNotes: input.notes || null,
        createdOrganizationId: organizationId,
      },
    })
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.REGISTRATION_APPROVED,
    entityType: 'RegistrationRequest',
    entityId: request.id,
    after: { email: request.email, role, organizationType },
  })

  await notify({
    userIds: [request.user.id],
    event: NOTIFICATION_EVENTS.REGISTRATION_APPROVED,
    subject: 'Your MConnect account is active',
    body:
      `Your MConnect account has been approved. You can now sign in and complete your ` +
      `company profile.${input.notes ? `\n\n${input.notes}` : ''}`,
    linkPath: '/app',
  })
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
