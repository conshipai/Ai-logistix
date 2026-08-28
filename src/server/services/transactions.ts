import type { Prisma, PrismaClient, TransactionStage } from '@prisma/client'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { nextTransactionNumber } from '@/lib/ids'
import { AuthorizationError, NotFoundError, isStaff, requirePermission, type Actor } from '@/lib/rbac'
import {
  TRANSACTION_LIFECYCLE,
  assertTransactionStageTransition,
  stageIndex,
} from '@/lib/state-machine'
import { requireTransactionScope, transactionScopeWhere } from '@/server/services/access'
import { notify, NOTIFICATION_EVENTS, usersInOrganization } from '@/server/services/notifications'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Transactions.
 *
 * A transaction is created when a purchase order is submitted, and is the
 * record everything else attaches to. Its stage is advanced only through
 * `advanceStage`, which enforces the lifecycle state machine and writes both a
 * stage-history row and an audit event.
 */

export async function createTransactionForPurchaseOrder(
  db: Db,
  purchaseOrderId: string,
  actor: Actor,
): Promise<{ id: string; number: string }> {
  const po = await db.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: { id: true, projectId: true, supplierId: true, buyerId: true, isDemo: true },
  })
  if (!po) throw new NotFoundError('Purchase order not found.')

  const existing = await db.transaction.findUnique({
    where: { purchaseOrderId },
    select: { id: true, number: true },
  })
  if (existing) return existing

  const number = await nextTransactionNumber(db)
  const transaction = await db.transaction.create({
    data: {
      number,
      purchaseOrderId: po.id,
      projectId: po.projectId,
      supplierId: po.supplierId,
      buyerId: po.buyerId,
      stage: 'PURCHASE_ORDER',
      isDemo: po.isDemo,
    },
    select: { id: true, number: true },
  })

  await db.transactionStageEvent.create({
    data: {
      transactionId: transaction.id,
      fromStage: null,
      toStage: 'PURCHASE_ORDER',
      actorUserId: actor.userId,
      note: 'Transaction opened on purchase-order submission.',
    },
  })

  await recordAudit(
    {
      actor,
      action: AUDIT_ACTIONS.TRANSACTION_CREATED,
      entityType: 'Transaction',
      entityId: transaction.id,
      after: { number: transaction.number, purchaseOrderId },
    },
    db,
  )

  return transaction
}

export interface AdvanceStageOptions {
  /** Skips the audit/notification pair when the caller already wrote one. */
  silent?: boolean
  note?: string
}

/**
 * Moves a transaction to a new stage, refusing transitions the lifecycle does
 * not allow. Backward moves are permitted where the machine allows them (a
 * rejected verification returns the transaction to PURCHASE_ORDER, for example).
 */
export async function advanceStage(
  db: Db,
  transactionId: string,
  toStage: TransactionStage,
  actor: Actor,
  options: AdvanceStageOptions = {},
): Promise<void> {
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    select: { id: true, stage: true, number: true, supplierId: true, buyerId: true },
  })
  if (!transaction) throw new NotFoundError('Transaction not found.')
  if (transaction.stage === toStage) return

  assertTransactionStageTransition(transaction.stage, toStage)

  await db.transaction.update({
    where: { id: transactionId },
    data: { stage: toStage, closedAt: toStage === 'CLOSED' ? new Date() : null },
  })

  await db.transactionStageEvent.create({
    data: {
      transactionId,
      fromStage: transaction.stage,
      toStage,
      actorUserId: actor.userId,
      note: options.note ?? null,
    },
  })

  if (!options.silent) {
    await recordAudit(
      {
        actor,
        action: AUDIT_ACTIONS.TRANSACTION_STAGE_CHANGED,
        entityType: 'Transaction',
        entityId: transactionId,
        before: { stage: transaction.stage },
        after: { stage: toStage },
        metadata: { number: transaction.number, note: options.note },
      },
      db,
    )
  }
}

/**
 * Advances to a stage that is ahead of the current one, walking the lifecycle
 * one step at a time.
 *
 * Real transactions skip explicit steps: a buyer confirming acceptance implies
 * delivery happened, even if nobody recorded a DELIVERY stage. Rather than
 * silently refusing such an update — which would leave the lifecycle banner
 * showing a stale stage — each intervening stage is recorded in turn, so the
 * stage history stays a complete and honest account of how the transaction
 * reached where it is.
 *
 * A target that is behind the current stage is ignored: progress is never
 * rolled back by a late-arriving update.
 */
export async function advanceStageIfAhead(
  db: Db,
  transactionId: string,
  toStage: TransactionStage,
  actor: Actor,
  note?: string,
): Promise<void> {
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    select: { stage: true },
  })
  if (!transaction) return

  const from = stageIndex(transaction.stage)
  const target = stageIndex(toStage)
  if (target <= from || target >= TRANSACTION_LIFECYCLE.length) return

  for (let index = from + 1; index <= target; index += 1) {
    const step = TRANSACTION_LIFECYCLE[index]!
    await advanceStage(db, transactionId, step, actor, {
      note: step === toStage ? note : `Implied by "${note ?? humanizeStage(toStage)}".`,
    })
  }
}

function humanizeStage(stage: TransactionStage): string {
  const lower = stage.toLowerCase().replace(/_/g, ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

export interface ListTransactionsOptions {
  stage?: TransactionStage
  search?: string
  take?: number
  skip?: number
}

export async function listTransactions(actor: Actor, options: ListTransactionsOptions = {}) {
  requirePermission(actor, 'transaction:read')
  const where: Prisma.TransactionWhereInput = {
    ...transactionScopeWhere(actor),
    ...(options.stage ? { stage: options.stage } : {}),
    ...(options.search
      ? {
          OR: [
            { number: { contains: options.search, mode: 'insensitive' } },
            { purchaseOrder: { poNumber: { contains: options.search, mode: 'insensitive' } } },
            { supplier: { legalName: { contains: options.search, mode: 'insensitive' } } },
            { project: { name: { contains: options.search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        purchaseOrder: { select: { poNumber: true, value: true, currency: true, status: true } },
        supplier: { select: { id: true, legalName: true, tradingName: true } },
        buyer: { select: { id: true, legalName: true, tradingName: true } },
        project: { select: { id: true, name: true } },
        fundingRequests: {
          select: { id: true, requestedAmount: true, approvedAmount: true, currency: true, status: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: options.take ?? 50,
      skip: options.skip ?? 0,
    }),
    prisma.transaction.count({ where }),
  ])

  return { rows, total }
}

/** Full transaction detail, already scoped. Throws NotFoundError when out of reach. */
export async function getTransactionDetail(actor: Actor, transactionId: string) {
  requirePermission(actor, 'transaction:read')
  const scope = await requireTransactionScope(actor, transactionId)

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      purchaseOrder: {
        include: {
          verifications: {
            include: { verifiedBy: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      },
      project: {
        include: {
          projectOwner: { select: { id: true, legalName: true, tradingName: true } },
          epc: { select: { id: true, legalName: true, tradingName: true } },
        },
      },
      supplier: true,
      buyer: true,
      fundingRequests: {
        include: {
          lines: { include: { vendor: { select: { id: true, name: true, country: true } } } },
          disbursements: { orderBy: { createdAt: 'asc' } },
          repayments: { orderBy: { receivedDate: 'asc' } },
          assignedFinancier: { select: { id: true, legalName: true, tradingName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      procurementItems: {
        include: { vendor: { select: { id: true, name: true, country: true } } },
        orderBy: { createdAt: 'asc' },
      },
      shipments: {
        include: { milestones: { orderBy: { occurredAt: 'asc' } } },
        orderBy: { createdAt: 'asc' },
      },
      milestones: { orderBy: [{ sequence: 'asc' }, { createdAt: 'asc' }] },
      invoices: { orderBy: { issueDate: 'asc' } },
      approvals: {
        include: {
          requestedFromOrganization: { select: { legalName: true, tradingName: true } },
          decidedBy: { select: { name: true, email: true } },
        },
        orderBy: { requestedAt: 'desc' },
      },
      rfis: {
        include: { raisedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      access: {
        where: { revokedAt: null },
        include: { organization: { select: { id: true, legalName: true, tradingName: true, type: true } } },
      },
      stageHistory: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!transaction) throw new NotFoundError('Transaction not found.')

  return { transaction, scope }
}

/** Shares a transaction with a financier or read-only observer. */
export async function shareTransaction(
  actor: Actor,
  transactionId: string,
  organizationId: string,
  readOnly: boolean,
): Promise<void> {
  requirePermission(actor, 'transaction:share')
  await requireTransactionScope(actor, transactionId)

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, type: true, legalName: true, accountStatus: true },
  })
  if (!organization) throw new NotFoundError('Organization not found.')
  if (organization.accountStatus !== 'ACTIVE') {
    throw new AuthorizationError('That organization is not active on the platform.')
  }

  await prisma.transactionAccess.upsert({
    where: { transactionId_organizationId: { transactionId, organizationId } },
    create: { transactionId, organizationId, readOnly, grantedById: actor.userId },
    update: { readOnly, revokedAt: null, grantedById: actor.userId },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.TRANSACTION_SHARED,
    entityType: 'Transaction',
    entityId: transactionId,
    after: { organizationId, organizationName: organization.legalName, readOnly },
  })

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { number: true },
  })
  await notify({
    userIds: await usersInOrganization(organizationId),
    event: NOTIFICATION_EVENTS.FINANCING_SHARED,
    subject: `Transaction ${transaction?.number} shared with your institution`,
    body: `AI Logistix has shared transaction ${transaction?.number} with your organization for review.`,
    linkPath: `/app/transactions/${transactionId}`,
  })
}

export async function revokeTransactionAccess(
  actor: Actor,
  transactionId: string,
  organizationId: string,
): Promise<void> {
  requirePermission(actor, 'transaction:share')
  if (!isStaff(actor)) throw new AuthorizationError()

  await prisma.transactionAccess.updateMany({
    where: { transactionId, organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.TRANSACTION_ACCESS_REVOKED,
    entityType: 'Transaction',
    entityId: transactionId,
    after: { organizationId },
  })
}

/** Closes a transaction. Only reachable once financing is fully repaid. */
export async function closeTransaction(actor: Actor, transactionId: string): Promise<void> {
  requirePermission(actor, 'transaction:close')
  await requireTransactionScope(actor, transactionId)

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      id: true,
      number: true,
      stage: true,
      supplierId: true,
      buyerId: true,
      fundingRequests: { select: { status: true } },
    },
  })
  if (!transaction) throw new NotFoundError('Transaction not found.')

  const unresolved = transaction.fundingRequests.filter(
    (f) => !['REPAID', 'REJECTED', 'CANCELLED', 'DRAFT'].includes(f.status),
  )
  if (unresolved.length > 0) {
    throw new AuthorizationError(
      'This transaction still has financing that is not fully repaid, rejected or cancelled.',
    )
  }

  await prisma.$transaction(async (tx) => {
    await advanceStageIfAhead(tx, transactionId, 'CLOSED', actor, 'Transaction closed.')
    await tx.transactionMilestone.updateMany({
      where: { transactionId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      data: { status: 'SKIPPED' },
    })
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.TRANSACTION_CLOSED,
    entityType: 'Transaction',
    entityId: transactionId,
    after: { number: transaction.number },
  })

  await notify({
    userIds: [
      ...(await usersInOrganization(transaction.supplierId)),
      ...(await usersInOrganization(transaction.buyerId)),
    ],
    event: NOTIFICATION_EVENTS.TRANSACTION_CLOSED,
    subject: `Transaction ${transaction.number} closed`,
    body: `Transaction ${transaction.number} has been completed and closed.`,
    linkPath: `/app/transactions/${transactionId}`,
  })
}

export async function transactionAuditHistory(actor: Actor, transactionId: string) {
  await requireTransactionScope(actor, transactionId)

  const related = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: {
      purchaseOrderId: true,
      fundingRequests: { select: { id: true } },
      documents: { select: { id: true } },
      milestones: { select: { id: true } },
      shipments: { select: { id: true } },
      approvals: { select: { id: true } },
      rfis: { select: { id: true } },
      procurementItems: { select: { id: true } },
      invoices: { select: { id: true } },
    },
  })
  if (!related) throw new NotFoundError('Transaction not found.')

  const ids = [
    transactionId,
    related.purchaseOrderId,
    ...related.fundingRequests.map((f) => f.id),
    ...related.documents.map((d) => d.id),
    ...related.milestones.map((m) => m.id),
    ...related.shipments.map((s) => s.id),
    ...related.approvals.map((a) => a.id),
    ...related.rfis.map((r) => r.id),
    ...related.procurementItems.map((p) => p.id),
    ...related.invoices.map((i) => i.id),
  ]

  return prisma.auditEvent.findMany({
    where: { entityId: { in: ids } },
    include: {
      actorUser: { select: { name: true, email: true } },
      organization: { select: { legalName: true, tradingName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 300,
  })
}
