import type { z } from 'zod'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { reference } from '@/lib/ids'
import { NotFoundError, ValidationError, isStaff, requirePermission, type Actor } from '@/lib/rbac'
import type { commentSchema, rfiSchema } from '@/lib/validation'
import { assertWritable, requireTransactionScope, transactionScopeWhere } from '@/server/services/access'
import { NOTIFICATION_EVENTS, notify, usersInOrganization } from '@/server/services/notifications'

/**
 * Comments and requests for information.
 *
 * Internal notes (`internalOnly`) are visible to AI Logistix staff only and are
 * filtered out of the thread server-side, never merely hidden in the markup.
 */

export type CommentInput = z.infer<typeof commentSchema>
export type RfiInput = z.infer<typeof rfiSchema>

export async function createComment(actor: Actor, input: CommentInput): Promise<{ id: string }> {
  requirePermission(actor, 'comment:create')
  const scope = await requireTransactionScope(actor, input.transactionId)
  assertWritable(scope)

  if (input.internalOnly && !isStaff(actor)) {
    throw new ValidationError('Only AI Logistix staff can post internal notes.')
  }

  // Only mention users who can already reach this transaction, so a mention
  // cannot be used to notify someone about a transaction they cannot see.
  const mentionable = await mentionableUsers(actor, input.transactionId)
  const mentionableIds = new Set(mentionable.map((u) => u.id))
  const mentionedUserIds = input.mentionedUserIds.filter((id) => mentionableIds.has(id))

  const comment = await prisma.comment.create({
    data: {
      transactionId: input.transactionId,
      authorId: actor.userId,
      authorOrganizationId: actor.organizationId,
      body: input.body,
      rfiId: input.rfiId || null,
      internalOnly: input.internalOnly,
      mentionedUserIds,
    },
    select: { id: true },
  })

  if (input.rfiId) {
    const rfi = await prisma.rfi.findUnique({
      where: { id: input.rfiId },
      select: { id: true, transactionId: true, status: true, assignedToOrganizationId: true },
    })
    if (rfi && rfi.transactionId === input.transactionId && rfi.status === 'OPEN') {
      // A reply from the organization the RFI was addressed to marks it answered.
      if (rfi.assignedToOrganizationId === actor.organizationId) {
        await prisma.rfi.update({
          where: { id: rfi.id },
          data: { status: 'RESPONDED', respondedAt: new Date() },
        })
      }
    }
  }

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.COMMENT_CREATED,
    entityType: 'Comment',
    entityId: comment.id,
    after: { transactionId: input.transactionId, internalOnly: input.internalOnly },
  })

  if (mentionedUserIds.length > 0) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: input.transactionId },
      select: { number: true },
    })
    await notify({
      userIds: mentionedUserIds,
      event: NOTIFICATION_EVENTS.COMMENT_MENTION,
      subject: `${actor.name} mentioned you on ${transaction?.number}`,
      body: input.body.slice(0, 500),
      linkPath: `/app/transactions/${input.transactionId}?tab=communications`,
    })
  }

  return { id: comment.id }
}

export async function listComments(actor: Actor, transactionId: string) {
  const scope = await requireTransactionScope(actor, transactionId)
  return prisma.comment.findMany({
    where: {
      transactionId,
      ...(scope.isStaff ? {} : { internalOnly: false }),
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      rfi: { select: { id: true, reference: true, subject: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
}

export async function createRfi(actor: Actor, input: RfiInput): Promise<{ id: string }> {
  requirePermission(actor, 'rfi:create')
  const scope = await requireTransactionScope(actor, input.transactionId)
  assertWritable(scope)

  const transaction = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
    select: {
      number: true,
      supplierId: true,
      buyerId: true,
      project: { select: { projectOwnerId: true, epcId: true } },
      access: { where: { revokedAt: null }, select: { organizationId: true } },
    },
  })
  if (!transaction) throw new NotFoundError('Transaction not found.')

  // An RFI can only be addressed to an organization already party to the
  // transaction, so it cannot be used to expose a transaction to a third party.
  const parties = new Set(
    [
      transaction.supplierId,
      transaction.buyerId,
      transaction.project.projectOwnerId,
      transaction.project.epcId,
      ...transaction.access.map((a) => a.organizationId),
    ].filter((v): v is string => Boolean(v)),
  )
  if (!parties.has(input.assignedToOrganizationId)) {
    throw new ValidationError('Requests can only be addressed to a party on this transaction.')
  }

  const rfi = await prisma.rfi.create({
    data: {
      reference: reference('RFI'),
      transactionId: input.transactionId,
      subject: input.subject,
      body: input.body,
      requestedDocumentCategory: input.requestedDocumentCategory || null,
      raisedById: actor.userId,
      raisedByOrganizationId: actor.organizationId,
      assignedToOrganizationId: input.assignedToOrganizationId,
      assignedToUserId: input.assignedToUserId || null,
      dueDate: input.dueDate ?? null,
      status: 'OPEN',
    },
    select: { id: true, reference: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.RFI_CREATED,
    entityType: 'Rfi',
    entityId: rfi.id,
    after: {
      reference: rfi.reference,
      subject: input.subject,
      assignedToOrganizationId: input.assignedToOrganizationId,
      transactionId: input.transactionId,
    },
  })

  await notify({
    userIds: input.assignedToUserId
      ? [input.assignedToUserId]
      : await usersInOrganization(input.assignedToOrganizationId),
    event: NOTIFICATION_EVENTS.RFI_RAISED,
    subject: `Information requested on ${transaction.number}: ${input.subject}`,
    body: input.body,
    linkPath: `/app/transactions/${input.transactionId}?tab=communications`,
  })

  return { id: rfi.id }
}

export async function updateRfiStatus(
  actor: Actor,
  rfiId: string,
  status: 'RESPONDED' | 'RESOLVED' | 'CANCELLED',
): Promise<void> {
  const rfi = await prisma.rfi.findUnique({
    where: { id: rfiId },
    select: {
      id: true,
      transactionId: true,
      status: true,
      raisedByOrganizationId: true,
      assignedToOrganizationId: true,
      reference: true,
    },
  })
  if (!rfi) throw new NotFoundError('Request not found.')

  const scope = await requireTransactionScope(actor, rfi.transactionId)
  assertWritable(scope)

  // Only the organization that raised the request (or staff) can close it out;
  // the organization it was addressed to can mark it answered.
  if (status === 'RESOLVED' || status === 'CANCELLED') {
    requirePermission(actor, 'rfi:resolve')
    if (!isStaff(actor) && rfi.raisedByOrganizationId !== actor.organizationId) {
      throw new ValidationError('Only the organization that raised this request can resolve it.')
    }
  } else {
    requirePermission(actor, 'rfi:respond')
    if (!isStaff(actor) && rfi.assignedToOrganizationId !== actor.organizationId) {
      throw new ValidationError('Only the organization this request was sent to can respond.')
    }
  }

  await prisma.rfi.update({
    where: { id: rfiId },
    data: {
      status,
      respondedAt: status === 'RESPONDED' ? new Date() : undefined,
      resolvedAt: status === 'RESOLVED' ? new Date() : undefined,
    },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.RFI_UPDATED,
    entityType: 'Rfi',
    entityId: rfiId,
    before: { status: rfi.status },
    after: { status, reference: rfi.reference },
  })
}

/** Open RFIs addressed to the actor's organization. */
export async function openRfisFor(actor: Actor, limit = 20) {
  return prisma.rfi.findMany({
    where: {
      status: { in: ['OPEN', 'RESPONDED'] },
      transaction: transactionScopeWhere(actor),
      ...(isStaff(actor) ? {} : { assignedToOrganizationId: actor.organizationId }),
    },
    include: {
      transaction: { select: { id: true, number: true } },
      raisedBy: { select: { name: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    take: limit,
  })
}

/** Users an actor may @-mention: those who can already see the transaction. */
export async function mentionableUsers(actor: Actor, transactionId: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      supplierId: true,
      buyerId: true,
      project: { select: { projectOwnerId: true, epcId: true } },
      access: { where: { revokedAt: null }, select: { organizationId: true } },
    },
  })
  if (!transaction) return []

  const organizationIds = [
    transaction.supplierId,
    transaction.buyerId,
    transaction.project.projectOwnerId,
    transaction.project.epcId,
    ...transaction.access.map((a) => a.organizationId),
  ].filter((v): v is string => Boolean(v))

  const memberships = await prisma.organizationMembership.findMany({
    where: {
      isActive: true,
      user: { status: 'ACTIVE' },
      OR: [
        { organizationId: { in: organizationIds } },
        { role: { in: ['AI_LOGISTIX_ADMIN', 'AI_LOGISTIX_OPERATIONS'] } },
      ],
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      organization: { select: { legalName: true, tradingName: true } },
    },
    orderBy: { user: { name: 'asc' } },
  })

  return memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    organization: m.organization.tradingName ?? m.organization.legalName,
  }))
}
