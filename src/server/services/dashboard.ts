import { prisma } from '@/lib/db'
import { isStaff, type Actor } from '@/lib/rbac'
import { toNumber } from '@/lib/utils'
import { FUNDING_EXPOSURE_STATUSES, FUNDING_OPEN_STATUSES } from '@/lib/state-machine'
import { transactionScopeWhere } from '@/server/services/access'
import { pendingApprovalsFor } from '@/server/services/approvals'
import { openRfisFor } from '@/server/services/communications'
import { overdueMilestones, upcomingMilestones } from '@/server/services/milestones'

/**
 * Dashboard aggregation.
 *
 * One query set per role rather than a generic query the UI filters, so a
 * dashboard never loads rows the actor is not entitled to and then hides them.
 */

export interface DashboardData {
  transactionCount: number
  activeTransactions: number
  awaitingMyAction: number
  totalPoValue: number
  requestedFinancing: number
  approvedFinancing: number
  fundedAmount: number
  repaidAmount: number
  outstandingExposure: number
  openRfiCount: number
  overdueMilestoneCount: number
  pendingApprovalCount: number
  missingDocumentCount: number
  recentTransactions: Awaited<ReturnType<typeof recentTransactions>>
  approvals: Awaited<ReturnType<typeof pendingApprovalsFor>>
  rfis: Awaited<ReturnType<typeof openRfisFor>>
  overdue: Awaited<ReturnType<typeof overdueMilestones>>
  upcoming: Awaited<ReturnType<typeof upcomingMilestones>>
  shipmentsInTransit: number
  suppliersParticipating: number
  buyerPaymentsPending: number
}

async function recentTransactions(actor: Actor, take = 8) {
  return prisma.transaction.findMany({
    where: transactionScopeWhere(actor),
    include: {
      purchaseOrder: { select: { poNumber: true, value: true, currency: true, status: true } },
      supplier: { select: { id: true, legalName: true, tradingName: true } },
      buyer: { select: { id: true, legalName: true, tradingName: true } },
      project: { select: { name: true } },
      fundingRequests: {
        select: { status: true, requestedAmount: true, approvedAmount: true, currency: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { updatedAt: 'desc' },
    take,
  })
}

export async function dashboardData(actor: Actor): Promise<DashboardData> {
  const scope = transactionScopeWhere(actor)

  const [
    transactions,
    fundingRequests,
    repayments,
    approvals,
    rfis,
    overdue,
    upcoming,
    recent,
    shipmentsInTransit,
    invoices,
    documentlessTransactions,
  ] = await Promise.all([
    prisma.transaction.findMany({
      where: scope,
      select: {
        id: true,
        stage: true,
        supplierId: true,
        purchaseOrder: { select: { value: true, status: true } },
      },
    }),
    prisma.fundingRequest.findMany({
      where: { transaction: scope },
      select: { status: true, requestedAmount: true, approvedAmount: true },
    }),
    prisma.repayment.findMany({
      where: { fundingRequest: { transaction: scope } },
      select: { amount: true },
    }),
    pendingApprovalsFor(actor),
    openRfisFor(actor),
    overdueMilestones(actor),
    upcomingMilestones(actor),
    recentTransactions(actor),
    prisma.shipment.count({
      where: { transaction: scope, deliveryStatus: { in: ['IN_TRANSIT'] } },
    }),
    prisma.invoice.findMany({
      where: { transaction: scope, paidAt: null, submittedAt: { not: null } },
      select: { amount: true },
    }),
    // Transactions with no purchase-order document attached: the most common
    // reason a submission stalls.
    prisma.transaction.count({
      where: {
        ...scope,
        documents: { none: { category: 'PURCHASE_ORDER', deletedAt: null } },
      },
    }),
  ])

  const sum = (values: unknown[]) => values.reduce<number>((a, v) => a + (toNumber(v) ?? 0), 0)

  const approvedFinancing = sum(
    fundingRequests
      .filter((f) =>
        ['APPROVED', 'CONDITIONALLY_APPROVED', 'FUNDED', 'PARTIALLY_REPAID', 'REPAID', 'DEFAULT'].includes(f.status),
      )
      .map((f) => f.approvedAmount),
  )
  const fundedAmount = sum(
    fundingRequests
      .filter((f) => ['FUNDED', 'PARTIALLY_REPAID', 'REPAID', 'DEFAULT'].includes(f.status))
      .map((f) => f.approvedAmount),
  )
  const repaidAmount = sum(repayments.map((r) => r.amount))
  const exposure = sum(
    fundingRequests
      .filter((f) => FUNDING_EXPOSURE_STATUSES.includes(f.status))
      .map((f) => f.approvedAmount),
  ) - repaidAmount

  return {
    transactionCount: transactions.length,
    activeTransactions: transactions.filter((t) => !['CLOSED', 'CANCELLED'].includes(t.stage))
      .length,
    awaitingMyAction: approvals.length + rfis.filter((r) => r.status === 'OPEN').length,
    totalPoValue: sum(transactions.map((t) => t.purchaseOrder.value)),
    requestedFinancing: sum(
      fundingRequests
        .filter((f) => FUNDING_OPEN_STATUSES.includes(f.status))
        .map((f) => f.requestedAmount),
    ),
    approvedFinancing,
    fundedAmount,
    repaidAmount,
    outstandingExposure: Math.max(0, exposure),
    openRfiCount: rfis.length,
    overdueMilestoneCount: overdue.length,
    pendingApprovalCount: approvals.length,
    missingDocumentCount: documentlessTransactions,
    recentTransactions: recent,
    approvals,
    rfis,
    overdue,
    upcoming,
    shipmentsInTransit,
    suppliersParticipating: new Set(transactions.map((t) => t.supplierId)).size,
    buyerPaymentsPending: sum(invoices.map((i) => i.amount)),
  }
}

/** Purchase orders awaiting the actor's verification. Drives the EPC dashboard. */
export async function purchaseOrdersAwaitingVerification(actor: Actor) {
  if (actor.organizationType === 'SUPPLIER') return []
  return prisma.purchaseOrder.findMany({
    where: {
      status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_REQUESTED'] },
      ...(isStaff(actor)
        ? {}
        : {
            OR: [
              { buyerId: actor.organizationId },
              { project: { epcId: actor.organizationId } },
              { project: { projectOwnerId: actor.organizationId } },
            ],
          }),
    },
    include: {
      supplier: { select: { id: true, legalName: true, tradingName: true, country: true } },
      project: { select: { name: true } },
      transaction: { select: { id: true, number: true } },
    },
    orderBy: { submittedAt: 'asc' },
    take: 25,
  })
}

/** Financing requests awaiting the actor's decision. Drives the financier dashboard. */
export async function fundingAwaitingDecision(actor: Actor) {
  return prisma.fundingRequest.findMany({
    where: {
      status: isStaff(actor)
        ? { in: ['UNDER_AI_LOGISTIX_REVIEW', 'FINANCIER_REVIEW', 'INFORMATION_REQUESTED'] }
        : { in: ['FINANCIER_REVIEW', 'CONDITIONALLY_APPROVED', 'APPROVED'] },
      ...(isStaff(actor) ? {} : { assignedFinancierId: actor.organizationId }),
    },
    include: {
      transaction: {
        include: {
          purchaseOrder: { select: { poNumber: true, value: true, currency: true, status: true } },
          supplier: { select: { legalName: true, tradingName: true, country: true } },
          project: { select: { name: true } },
        },
      },
    },
    orderBy: { submittedAt: 'asc' },
    take: 25,
  })
}
