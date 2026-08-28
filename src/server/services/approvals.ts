import type { ApprovalType, Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import type { Actor } from '@/lib/rbac'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Approvals are first-class records rather than boolean columns, so every
 * decision carries who asked, who decided, when, and why — and a rejected
 * decision remains in the history after a later approval supersedes it.
 */

export interface RequestApprovalInput {
  transactionId: string
  type: ApprovalType
  requestedFromOrganizationId?: string | null
  requestedFromUserId?: string | null
  requestedById?: string | null
  comments?: string | null
}

export async function requestApproval(
  input: RequestApprovalInput,
  db: Db = prisma,
): Promise<string> {
  // Re-requesting the same approval supersedes any pending one rather than
  // stacking duplicates in every reviewer's queue.
  await db.approval.updateMany({
    where: { transactionId: input.transactionId, type: input.type, decision: 'PENDING' },
    data: { decision: 'CHANGES_REQUESTED', decidedAt: new Date(), comments: 'Superseded by a newer request.' },
  })

  const approval = await db.approval.create({
    data: {
      transactionId: input.transactionId,
      type: input.type,
      requestedFromOrganizationId: input.requestedFromOrganizationId ?? null,
      requestedFromUserId: input.requestedFromUserId ?? null,
      requestedById: input.requestedById ?? null,
      comments: input.comments ?? null,
    },
    select: { id: true },
  })

  await recordAudit(
    {
      action: AUDIT_ACTIONS.APPROVAL_REQUESTED,
      entityType: 'Approval',
      entityId: approval.id,
      after: { type: input.type, transactionId: input.transactionId },
      organizationId: input.requestedFromOrganizationId ?? undefined,
    },
    db,
  )
  return approval.id
}

export interface DecideApprovalInput {
  transactionId: string
  type: ApprovalType
  decision: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'
  actor: Actor
  comments?: string | null
}

/**
 * Records a decision against the pending approval of this type, creating one
 * retrospectively when the decision was reached out of band (so the trail is
 * never missing a record).
 */
export async function decideApproval(
  input: DecideApprovalInput,
  db: Db = prisma,
): Promise<void> {
  const pending = await db.approval.findFirst({
    where: { transactionId: input.transactionId, type: input.type, decision: 'PENDING' },
    orderBy: { requestedAt: 'desc' },
    select: { id: true },
  })

  const data = {
    decision: input.decision,
    decidedById: input.actor.userId,
    decidedAt: new Date(),
    comments: input.comments ?? null,
  }

  const approvalId = pending
    ? (await db.approval.update({ where: { id: pending.id }, data, select: { id: true } })).id
    : (
        await db.approval.create({
          data: {
            transactionId: input.transactionId,
            type: input.type,
            requestedFromOrganizationId: input.actor.organizationId,
            ...data,
          },
          select: { id: true },
        })
      ).id

  await recordAudit(
    {
      actor: input.actor,
      action: AUDIT_ACTIONS.APPROVAL_DECIDED,
      entityType: 'Approval',
      entityId: approvalId,
      after: { type: input.type, decision: input.decision, comments: input.comments },
    },
    db,
  )
}

/** Pending approvals addressed to the actor's organization. */
export async function pendingApprovalsFor(actor: Actor, limit = 25) {
  return prisma.approval.findMany({
    where: {
      decision: 'PENDING',
      OR: [
        { requestedFromOrganizationId: actor.organizationId },
        { requestedFromUserId: actor.userId },
      ],
    },
    include: {
      transaction: {
        select: {
          id: true,
          number: true,
          stage: true,
          supplier: { select: { legalName: true, tradingName: true } },
          purchaseOrder: { select: { poNumber: true, value: true, currency: true } },
        },
      },
    },
    orderBy: { requestedAt: 'asc' },
    take: limit,
  })
}
