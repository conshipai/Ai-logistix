import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { appUrl } from '@/lib/env'
import { emailLayout, sendMail } from '@/lib/mail'
import { createToken, hashPassword, hashToken } from '@/lib/password'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  isAdmin,
  isStaff,
  requirePermission,
  type Actor,
} from '@/lib/rbac'
import type { Role } from '@prisma/client'

/**
 * User administration and credential recovery.
 *
 * Password reset never discloses whether an address is registered: the response
 * is identical either way, and the token is stored only as a SHA-256 hash.
 */

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, status: true },
  })

  await recordAudit({
    action: AUDIT_ACTIONS.USER_PASSWORD_RESET_REQUESTED,
    entityType: 'User',
    entityId: user?.id ?? null,
    actorEmail: email,
    metadata: { accountExists: Boolean(user) },
  })

  if (!user || user.status === 'REJECTED' || user.status === 'CLOSED') return

  const { token, tokenHash } = createToken()
  await prisma.verificationToken.create({
    data: {
      userId: user.id,
      type: 'PASSWORD_RESET',
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  })

  const resetUrl = `${appUrl()}/reset-password?token=${token}`
  await sendMail({
    to: user.email,
    subject: '[MConnect] Reset your password',
    text:
      `A password reset was requested for your MConnect account.\n\n${resetUrl}\n\n` +
      'This link expires in one hour. If you did not request this, no action is needed.',
    html: emailLayout(
      'Reset your password',
      '<p style="line-height:1.65">A password reset was requested for your MConnect account. ' +
        'This link expires in one hour.</p>' +
        '<p style="line-height:1.65;color:#476296;font-size:13px">If you did not request this, no action is needed.</p>',
      resetUrl,
      'Reset password',
    ),
  })
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const record = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true } } },
  })
  if (!record || record.type !== 'PASSWORD_RESET') return false
  if (record.usedAt || record.expiresAt < new Date()) return false

  const passwordHash = await hashPassword(newPassword)
  await prisma.$transaction([
    prisma.verificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, failedLoginCount: 0, lockedUntil: null },
    }),
    // Invalidate any other outstanding reset tokens for this account.
    prisma.verificationToken.updateMany({
      where: { userId: record.userId, type: 'PASSWORD_RESET', usedAt: null },
      data: { usedAt: new Date() },
    }),
  ])

  await recordAudit({
    action: AUDIT_ACTIONS.USER_PASSWORD_RESET,
    entityType: 'User',
    entityId: record.userId,
    actorEmail: record.user.email,
  })
  return true
}

/** Adds a colleague to the actor's own organization. */
export async function inviteUser(
  actor: Actor,
  input: { name: string; email: string; jobTitle?: string; phone?: string; role: Role; organizationId: string },
): Promise<{ id: string; temporaryPassword: string }> {
  const ownOrganization = input.organizationId === actor.organizationId
  requirePermission(actor, ownOrganization ? 'user:manage:own-org' : 'user:manage:any')
  if (!ownOrganization && !isAdmin(actor)) throw new AuthorizationError()

  // A non-admin can never grant a role that outranks their own organization's
  // remit — an EPC user cannot mint an AI Logistix administrator.
  if (!isStaff(actor) && ['AI_LOGISTIX_ADMIN', 'AI_LOGISTIX_OPERATIONS'].includes(input.role)) {
    throw new AuthorizationError('You cannot assign that role.')
  }
  if (!isAdmin(actor) && input.role === 'AI_LOGISTIX_ADMIN') {
    throw new AuthorizationError('Only an administrator can assign the administrator role.')
  }

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  if (existing) {
    throw new ValidationError('A user with that email address already exists.', {
      email: ['A user with that email address already exists.'],
    })
  }

  // A random password the invitee never learns; they set their own via the
  // reset link. Nothing usable is ever emailed or logged.
  const temporaryPassword = createToken().token
  const passwordHash = await hashPassword(temporaryPassword)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      jobTitle: input.jobTitle || null,
      phone: input.phone || null,
      status: 'ACTIVE',
      memberships: {
        create: { organizationId: input.organizationId, role: input.role, isPrimary: true },
      },
    },
    select: { id: true, email: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.USER_CREATED,
    entityType: 'User',
    entityId: user.id,
    after: { email: input.email, role: input.role, organizationId: input.organizationId },
  })

  await requestPasswordReset(input.email)
  return { id: user.id, temporaryPassword }
}

export async function updateMembership(
  actor: Actor,
  membershipId: string,
  update: { role?: Role; isActive?: boolean },
): Promise<void> {
  const membership = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
    select: { id: true, organizationId: true, userId: true, role: true, isActive: true },
  })
  if (!membership) throw new NotFoundError('Membership not found.')

  const ownOrganization = membership.organizationId === actor.organizationId
  requirePermission(actor, ownOrganization ? 'user:manage:own-org' : 'user:manage:any')

  if (!isStaff(actor) && update.role && ['AI_LOGISTIX_ADMIN', 'AI_LOGISTIX_OPERATIONS'].includes(update.role)) {
    throw new AuthorizationError('You cannot assign that role.')
  }
  if (membership.userId === actor.userId && update.isActive === false) {
    throw new ValidationError('You cannot deactivate your own membership.')
  }

  await prisma.organizationMembership.update({
    where: { id: membershipId },
    data: { role: update.role, isActive: update.isActive },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.USER_PERMISSION_CHANGED,
    entityType: 'OrganizationMembership',
    entityId: membershipId,
    before: { role: membership.role, isActive: membership.isActive },
    after: update,
  })
}

export async function listUsers(actor: Actor, search?: string) {
  requirePermission(actor, 'user:manage:any')
  return prisma.user.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {},
    include: {
      memberships: {
        include: { organization: { select: { id: true, legalName: true, tradingName: true, type: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}

export async function unreadNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId, channel: 'IN_APP', readAt: null },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export async function markNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, channel: 'IN_APP', readAt: null },
    data: { readAt: new Date() },
  })
}
