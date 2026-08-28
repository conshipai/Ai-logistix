import type { FundingRequestStatus, Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { reference } from '@/lib/ids'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  isStaff,
  requirePermission,
  type Actor,
} from '@/lib/rbac'
import { assertFundingRequestTransition } from '@/lib/state-machine'
import { toNumber } from '@/lib/utils'
import type {
  disbursementSchema,
  financierDecisionSchema,
  fundingRequestSchema,
  recordFundingSchema,
  repaymentSchema,
} from '@/lib/validation'
import { assertWritable, requireTransactionScope } from '@/server/services/access'
import { decideApproval, requestApproval } from '@/server/services/approvals'
import { completeStandardMilestone } from '@/server/services/milestones'
import {
  NOTIFICATION_EVENTS,
  aiLogistixStaffUserIds,
  notify,
  usersInOrganization,
} from '@/server/services/notifications'
import { advanceStage, advanceStageIfAhead } from '@/server/services/transactions'

/**
 * Financing.
 *
 * The rule that matters most is enforced in `submitFundingRequest`: an
 * unverified purchase order can never carry a financing request forward, and
 * therefore can never reach FUNDED. The state machine then prevents every other
 * shortcut — an approval must precede funding, and funding must precede
 * repayment.
 */

export type FundingRequestInput = z.infer<typeof fundingRequestSchema>
export type FinancierDecisionInput = z.infer<typeof financierDecisionSchema>
export type DisbursementInput = z.infer<typeof disbursementSchema>
export type RepaymentInput = z.infer<typeof repaymentSchema>
export type RecordFundingInput = z.infer<typeof recordFundingSchema>

export async function createFundingRequest(
  actor: Actor,
  input: FundingRequestInput,
): Promise<{ id: string }> {
  requirePermission(actor, 'funding:create')
  const scope = await requireTransactionScope(actor, input.transactionId)
  assertWritable(scope)

  if (!scope.isSupplier && !scope.isStaff) {
    throw new AuthorizationError('Only the supplier can request financing on this transaction.')
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
    include: { purchaseOrder: { select: { value: true, currency: true, status: true } } },
  })
  if (!transaction) throw new NotFoundError('Transaction not found.')

  const poValue = toNumber(transaction.purchaseOrder.value) ?? 0
  if (input.requestedAmount > poValue) {
    throw new ValidationError('The requested amount cannot exceed the purchase order value.', {
      requestedAmount: ['The requested amount cannot exceed the purchase order value.'],
    })
  }

  const linesTotal = input.lines.reduce((sum, line) => sum + line.amount, 0)
  if (input.lines.length > 0 && Math.abs(linesTotal - input.requestedAmount) > 0.01) {
    throw new ValidationError(
      'The use-of-funds lines must add up to the total amount requested.',
      { lines: [`Lines total ${linesTotal.toFixed(2)} but the request is for ${input.requestedAmount.toFixed(2)}.`] },
    )
  }

  const open = await prisma.fundingRequest.findFirst({
    where: {
      transactionId: input.transactionId,
      status: { notIn: ['REJECTED', 'CANCELLED', 'REPAID'] },
    },
    select: { id: true },
  })
  if (open) {
    throw new ValidationError('This transaction already has an open financing request.')
  }

  const created = await prisma.$transaction(async (tx) => {
    const request = await tx.fundingRequest.create({
      data: {
        reference: reference('FR'),
        transactionId: input.transactionId,
        requestedAmount: input.requestedAmount,
        currency: input.currency,
        percentageOfPoValue: poValue > 0 ? (input.requestedAmount / poValue) * 100 : null,
        purposeSummary: input.purposeSummary || null,
        requiredFundingDate: input.requiredFundingDate ?? null,
        proposedRepaymentSource: input.proposedRepaymentSource || null,
        expectedBuyerPaymentDate: input.expectedBuyerPaymentDate ?? null,
        status: 'DRAFT',
        isDemo: transaction.isDemo,
      },
      select: { id: true, reference: true },
    })

    if (input.lines.length > 0) {
      await tx.fundingRequestLine.createMany({
        data: input.lines.map((line) => ({
          fundingRequestId: request.id,
          purpose: line.purpose,
          description: line.description,
          vendorId: line.vendorId || null,
          amount: line.amount,
          currency: line.currency,
        })),
      })
    }
    return request
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.FUNDING_REQUESTED,
    entityType: 'FundingRequest',
    entityId: created.id,
    after: {
      reference: created.reference,
      requestedAmount: input.requestedAmount,
      currency: input.currency,
      lines: input.lines.length,
    },
  })

  return { id: created.id }
}

/**
 * Submits a financing request into review.
 *
 * The gate: the underlying purchase order must be VERIFIED. Without it the
 * request cannot leave DRAFT, so no path exists from an unverified PO to a
 * funded transaction.
 */
export async function submitFundingRequest(actor: Actor, fundingRequestId: string): Promise<void> {
  requirePermission(actor, 'funding:submit')

  const request = await prisma.fundingRequest.findUnique({
    where: { id: fundingRequestId },
    include: {
      transaction: {
        select: {
          id: true,
          number: true,
          supplierId: true,
          buyerId: true,
          purchaseOrder: { select: { id: true, poNumber: true, status: true } },
        },
      },
      lines: true,
    },
  })
  if (!request) throw new NotFoundError('Financing request not found.')

  const scope = await requireTransactionScope(actor, request.transactionId)
  assertWritable(scope)
  if (!scope.isSupplier && !scope.isStaff) {
    throw new AuthorizationError('Only the supplier can submit this financing request.')
  }

  if (request.transaction.purchaseOrder.status !== 'VERIFIED') {
    throw new ValidationError(
      'The purchase order must be verified by the buyer before financing can be requested.',
    )
  }

  assertFundingRequestTransition(request.status, 'SUBMITTED')

  await prisma.$transaction(async (tx) => {
    await tx.fundingRequest.update({
      where: { id: fundingRequestId },
      data: { status: 'UNDER_AI_LOGISTIX_REVIEW', submittedAt: new Date() },
    })
    await requestApproval(
      {
        transactionId: request.transactionId,
        type: 'AI_LOGISTIX_TRANSACTION_REVIEW',
        requestedById: actor.userId,
        comments: 'Review the transaction and route it to a financing partner.',
      },
      tx,
    )
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.FUNDING_SUBMITTED,
    entityType: 'FundingRequest',
    entityId: fundingRequestId,
    before: { status: request.status },
    after: { status: 'UNDER_AI_LOGISTIX_REVIEW' },
  })

  await notify({
    userIds: await aiLogistixStaffUserIds(),
    event: NOTIFICATION_EVENTS.FINANCING_SUBMITTED,
    subject: `Financing request on ${request.transaction.number} awaiting review`,
    body:
      `A financing request of ${request.currency} ${toNumber(request.requestedAmount)?.toLocaleString()} ` +
      `was submitted against verified purchase order ${request.transaction.purchaseOrder.poNumber}.`,
    linkPath: `/app/transactions/${request.transactionId}`,
  })
}

/**
 * AI Logistix review step: routes a submitted request to a financing partner,
 * returns it for more information, or rejects it.
 */
export async function reviewFundingRequest(
  actor: Actor,
  input: {
    fundingRequestId: string
    action: 'ROUTE_TO_FINANCIER' | 'REQUEST_INFORMATION' | 'REJECT'
    financierOrganizationId?: string
    notes?: string
  },
): Promise<void> {
  requirePermission(actor, 'funding:review:internal')

  const request = await prisma.fundingRequest.findUnique({
    where: { id: input.fundingRequestId },
    include: { transaction: { select: { id: true, number: true, supplierId: true } } },
  })
  if (!request) throw new NotFoundError('Financing request not found.')
  await requireTransactionScope(actor, request.transactionId)

  const nextStatus: FundingRequestStatus =
    input.action === 'ROUTE_TO_FINANCIER'
      ? 'FINANCIER_REVIEW'
      : input.action === 'REQUEST_INFORMATION'
        ? 'INFORMATION_REQUESTED'
        : 'REJECTED'
  assertFundingRequestTransition(request.status, nextStatus)

  if (input.action === 'ROUTE_TO_FINANCIER') {
    if (!input.financierOrganizationId) {
      throw new ValidationError('Select the financing institution to route this request to.')
    }
    const financier = await prisma.organization.findUnique({
      where: { id: input.financierOrganizationId },
      select: { id: true, type: true, accountStatus: true, legalName: true },
    })
    if (!financier || financier.type !== 'FINANCIAL_INSTITUTION') {
      throw new ValidationError('Select a financial institution.')
    }
    if (financier.accountStatus !== 'ACTIVE') {
      throw new ValidationError('That institution is not active on the platform.')
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.fundingRequest.update({
      where: { id: input.fundingRequestId },
      data: {
        status: nextStatus,
        assignedFinancierId:
          input.action === 'ROUTE_TO_FINANCIER' ? input.financierOrganizationId : undefined,
        financierNotes: input.notes || undefined,
        decisionAt: input.action === 'REJECT' ? new Date() : undefined,
      },
    })

    await decideApproval(
      {
        transactionId: request.transactionId,
        type: 'AI_LOGISTIX_TRANSACTION_REVIEW',
        decision:
          input.action === 'ROUTE_TO_FINANCIER'
            ? 'APPROVED'
            : input.action === 'REJECT'
              ? 'REJECTED'
              : 'CHANGES_REQUESTED',
        actor,
        comments: input.notes ?? null,
      },
      tx,
    )

    if (input.action === 'ROUTE_TO_FINANCIER' && input.financierOrganizationId) {
      await tx.transactionAccess.upsert({
        where: {
          transactionId_organizationId: {
            transactionId: request.transactionId,
            organizationId: input.financierOrganizationId,
          },
        },
        create: {
          transactionId: request.transactionId,
          organizationId: input.financierOrganizationId,
          readOnly: false,
          grantedById: actor.userId,
        },
        update: { revokedAt: null, readOnly: false },
      })

      await requestApproval(
        {
          transactionId: request.transactionId,
          type: 'FINANCING_APPROVAL',
          requestedFromOrganizationId: input.financierOrganizationId,
          requestedById: actor.userId,
          comments: input.notes ?? null,
        },
        tx,
      )
    }
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.FUNDING_STATUS_CHANGED,
    entityType: 'FundingRequest',
    entityId: input.fundingRequestId,
    before: { status: request.status },
    after: { status: nextStatus, financierOrganizationId: input.financierOrganizationId, notes: input.notes },
  })

  if (input.action === 'ROUTE_TO_FINANCIER' && input.financierOrganizationId) {
    await notify({
      userIds: await usersInOrganization(input.financierOrganizationId),
      event: NOTIFICATION_EVENTS.FINANCING_SHARED,
      subject: `Financing opportunity on transaction ${request.transaction.number}`,
      body: `AI Logistix has shared a reviewed financing request with your institution.`,
      linkPath: `/app/transactions/${request.transactionId}`,
    })
  } else {
    await notify({
      userIds: await usersInOrganization(request.transaction.supplierId),
      event:
        input.action === 'REJECT'
          ? NOTIFICATION_EVENTS.FINANCING_REJECTED
          : NOTIFICATION_EVENTS.INFORMATION_REQUESTED,
      subject:
        input.action === 'REJECT'
          ? `Financing request on ${request.transaction.number} was not taken forward`
          : `More information needed on ${request.transaction.number}`,
      body: input.notes ?? 'Please review the transaction in MConnect.',
      linkPath: `/app/transactions/${request.transactionId}`,
    })
  }
}

/** The financier's decision. Only the assigned institution may record one. */
export async function recordFinancierDecision(
  actor: Actor,
  input: FinancierDecisionInput,
): Promise<void> {
  requirePermission(actor, 'funding:decide')

  const request = await prisma.fundingRequest.findUnique({
    where: { id: input.fundingRequestId },
    include: {
      transaction: {
        select: { id: true, number: true, supplierId: true, purchaseOrder: { select: { status: true, value: true } } },
      },
    },
  })
  if (!request) throw new NotFoundError('Financing request not found.')

  const scope = await requireTransactionScope(actor, request.transactionId)
  assertWritable(scope)

  if (!isStaff(actor)) {
    if (request.assignedFinancierId !== actor.organizationId) {
      throw new NotFoundError('Financing request not found.')
    }
  }

  if (request.transaction.purchaseOrder.status !== 'VERIFIED') {
    throw new ValidationError('The purchase order must be verified before a financing decision.')
  }

  const nextStatus: FundingRequestStatus =
    input.decision === 'APPROVED'
      ? 'APPROVED'
      : input.decision === 'CONDITIONALLY_APPROVED'
        ? 'CONDITIONALLY_APPROVED'
        : input.decision === 'REJECTED'
          ? 'REJECTED'
          : 'INFORMATION_REQUESTED'
  assertFundingRequestTransition(request.status, nextStatus)

  const requested = toNumber(request.requestedAmount) ?? 0
  if (typeof input.approvedAmount === 'number' && input.approvedAmount > requested) {
    throw new ValidationError('The approved amount cannot exceed the amount requested.', {
      approvedAmount: ['The approved amount cannot exceed the amount requested.'],
    })
  }

  await prisma.$transaction(async (tx) => {
    await tx.fundingRequest.update({
      where: { id: input.fundingRequestId },
      data: {
        status: nextStatus,
        approvedAmount: input.approvedAmount ?? null,
        approvedCurrency: input.approvedCurrency ?? request.currency,
        interestRatePct: input.interestRatePct ?? null,
        feePct: input.feePct ?? null,
        conditionsPrecedent: input.conditionsPrecedent || null,
        financierNotes: input.notes || null,
        decisionAt: new Date(),
        assignedFinancierId: request.assignedFinancierId ?? (isStaff(actor) ? null : actor.organizationId),
      },
    })

    await decideApproval(
      {
        transactionId: request.transactionId,
        type: 'FINANCING_APPROVAL',
        decision:
          input.decision === 'REJECTED'
            ? 'REJECTED'
            : input.decision === 'INFORMATION_REQUESTED'
              ? 'CHANGES_REQUESTED'
              : 'APPROVED',
        actor,
        comments: input.notes ?? null,
      },
      tx,
    )

    if (nextStatus === 'APPROVED') {
      await advanceStageIfAhead(tx, request.transactionId, 'APPROVED', actor, 'Financing approved.')
      await completeStandardMilestone(tx, request.transactionId, 'FUNDING_APPROVED', actor.userId)
    }
  })

  await recordAudit({
    actor,
    action:
      input.decision === 'REJECTED' ? AUDIT_ACTIONS.FUNDING_REJECTED : AUDIT_ACTIONS.FUNDING_APPROVED,
    entityType: 'FundingRequest',
    entityId: input.fundingRequestId,
    before: { status: request.status },
    after: {
      status: nextStatus,
      approvedAmount: input.approvedAmount,
      interestRatePct: input.interestRatePct,
      feePct: input.feePct,
      conditionsPrecedent: input.conditionsPrecedent,
    },
  })

  await notify({
    userIds: [
      ...(await usersInOrganization(request.transaction.supplierId)),
      ...(await aiLogistixStaffUserIds()),
    ],
    event:
      input.decision === 'REJECTED'
        ? NOTIFICATION_EVENTS.FINANCING_REJECTED
        : NOTIFICATION_EVENTS.FINANCING_APPROVED,
    subject: `Financing decision recorded on ${request.transaction.number}`,
    body:
      input.decision === 'REJECTED'
        ? `The financing request was declined. ${input.notes ?? ''}`
        : `${input.decision === 'CONDITIONALLY_APPROVED' ? 'Conditional approval' : 'Approval'} recorded for ` +
          `${input.approvedCurrency ?? request.currency} ${input.approvedAmount?.toLocaleString()}.`,
    linkPath: `/app/transactions/${request.transactionId}`,
  })
}

/** Records that approved financing has actually been advanced. */
export async function recordFunding(actor: Actor, input: RecordFundingInput): Promise<void> {
  requirePermission(actor, 'funding:record-funding')

  const request = await prisma.fundingRequest.findUnique({
    where: { id: input.fundingRequestId },
    include: { transaction: { select: { id: true, number: true, supplierId: true } } },
  })
  if (!request) throw new NotFoundError('Financing request not found.')
  await requireTransactionScope(actor, request.transactionId)

  if (!isStaff(actor) && request.assignedFinancierId !== actor.organizationId) {
    throw new NotFoundError('Financing request not found.')
  }

  assertFundingRequestTransition(request.status, 'FUNDED')
  if (!request.approvedAmount) {
    throw new ValidationError('Record the approved amount before recording funding.')
  }

  await prisma.$transaction(async (tx) => {
    await tx.fundingRequest.update({
      where: { id: input.fundingRequestId },
      data: { status: 'FUNDED', fundedAt: input.fundedDate },
    })
    await advanceStageIfAhead(tx, request.transactionId, 'FUNDED', actor, 'Financing funded.')
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.FUNDING_RECORDED,
    entityType: 'FundingRequest',
    entityId: input.fundingRequestId,
    before: { status: request.status },
    after: { status: 'FUNDED', fundedDate: input.fundedDate, notes: input.notes },
  })

  await notify({
    userIds: [
      ...(await usersInOrganization(request.transaction.supplierId)),
      ...(await aiLogistixStaffUserIds()),
    ],
    event: NOTIFICATION_EVENTS.FUNDING_RECORDED,
    subject: `Funding recorded on ${request.transaction.number}`,
    body: `Funding of ${request.approvedCurrency ?? request.currency} ${toNumber(request.approvedAmount)?.toLocaleString()} has been recorded. Procurement can begin.`,
    linkPath: `/app/transactions/${request.transactionId}`,
  })
}

export async function createDisbursement(
  actor: Actor,
  input: DisbursementInput,
): Promise<{ id: string }> {
  requirePermission(actor, 'disbursement:manage')

  const request = await prisma.fundingRequest.findUnique({
    where: { id: input.fundingRequestId },
    select: { id: true, transactionId: true, status: true, approvedAmount: true, approvedCurrency: true, currency: true },
  })
  if (!request) throw new NotFoundError('Financing request not found.')
  await requireTransactionScope(actor, request.transactionId)

  if (!['APPROVED', 'CONDITIONALLY_APPROVED', 'FUNDED', 'PARTIALLY_REPAID'].includes(request.status)) {
    throw new ValidationError('Financing must be approved before disbursements can be recorded.')
  }

  const existing = await prisma.disbursement.aggregate({
    where: { fundingRequestId: request.id, authorizationStatus: { not: 'REJECTED' } },
    _sum: { approvedAmount: true },
  })
  const already = toNumber(existing._sum.approvedAmount) ?? 0
  const approved = toNumber(request.approvedAmount) ?? 0
  if (approved > 0 && already + input.approvedAmount > approved + 0.01) {
    throw new ValidationError(
      `Disbursements would exceed the approved facility of ${approved.toLocaleString()}.`,
      { approvedAmount: ['This would exceed the approved facility.'] },
    )
  }

  const disbursement = await prisma.disbursement.create({
    data: {
      reference: reference('DSB'),
      fundingRequestId: input.fundingRequestId,
      payeeName: input.payeeName,
      payeeVendorId: input.payeeVendorId || null,
      payeeBankDetails: input.payeeBankDetails || null,
      approvedAmount: input.approvedAmount,
      approvedCurrency: input.approvedCurrency,
      purpose: input.purpose,
      invoiceId: input.invoiceId || null,
      notes: input.notes || null,
      authorizationStatus: 'PENDING_APPROVAL',
      paymentStatus: 'NOT_PAID',
    },
    select: { id: true, reference: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.DISBURSEMENT_RECORDED,
    entityType: 'Disbursement',
    entityId: disbursement.id,
    after: {
      reference: disbursement.reference,
      payeeName: input.payeeName,
      approvedAmount: input.approvedAmount,
      currency: input.approvedCurrency,
      purpose: input.purpose,
    },
  })
  return { id: disbursement.id }
}

export async function updateDisbursementStatus(
  actor: Actor,
  disbursementId: string,
  update: {
    authorizationStatus?: 'AUTHORIZED' | 'REJECTED' | 'CANCELLED'
    paymentStatus?: 'SCHEDULED' | 'PAID' | 'FAILED' | 'REVERSED'
    paymentDate?: Date
    transactionReference?: string
  },
): Promise<void> {
  requirePermission(actor, 'disbursement:manage')

  const disbursement = await prisma.disbursement.findUnique({
    where: { id: disbursementId },
    include: { fundingRequest: { select: { transactionId: true } } },
  })
  if (!disbursement) throw new NotFoundError('Disbursement not found.')
  await requireTransactionScope(actor, disbursement.fundingRequest.transactionId)

  if (update.paymentStatus === 'PAID' && disbursement.authorizationStatus !== 'AUTHORIZED') {
    throw new ValidationError('Authorize the disbursement before recording payment.')
  }

  await prisma.disbursement.update({
    where: { id: disbursementId },
    data: {
      authorizationStatus: update.authorizationStatus,
      paymentStatus: update.paymentStatus,
      paymentDate: update.paymentDate ?? undefined,
      transactionReference: update.transactionReference || undefined,
    },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.DISBURSEMENT_UPDATED,
    entityType: 'Disbursement',
    entityId: disbursementId,
    before: {
      authorizationStatus: disbursement.authorizationStatus,
      paymentStatus: disbursement.paymentStatus,
    },
    after: update,
  })
}

/** Records a repayment and moves the facility to PARTIALLY_REPAID or REPAID. */
export async function recordRepayment(actor: Actor, input: RepaymentInput): Promise<void> {
  requirePermission(actor, 'funding:record-repayment')

  const request = await prisma.fundingRequest.findUnique({
    where: { id: input.fundingRequestId },
    include: {
      repayments: { select: { amount: true } },
      transaction: { select: { id: true, number: true, supplierId: true } },
    },
  })
  if (!request) throw new NotFoundError('Financing request not found.')
  await requireTransactionScope(actor, request.transactionId)

  if (!isStaff(actor) && request.assignedFinancierId !== actor.organizationId) {
    throw new NotFoundError('Financing request not found.')
  }
  if (!['FUNDED', 'PARTIALLY_REPAID', 'DEFAULT'].includes(request.status)) {
    throw new ValidationError('Only funded financing can be repaid.')
  }

  const alreadyRepaid = request.repayments.reduce((sum, r) => sum + (toNumber(r.amount) ?? 0), 0)
  const facility = toNumber(request.approvedAmount) ?? 0
  const totalAfter = alreadyRepaid + input.amount
  if (facility > 0 && totalAfter > facility + 0.01) {
    throw new ValidationError(
      `Repayments would exceed the facility of ${facility.toLocaleString()}.`,
      { amount: ['This would exceed the outstanding balance.'] },
    )
  }

  const fullyRepaid = facility > 0 && totalAfter >= facility - 0.01
  const nextStatus: FundingRequestStatus = fullyRepaid ? 'REPAID' : 'PARTIALLY_REPAID'
  assertFundingRequestTransition(request.status, nextStatus)

  await prisma.$transaction(async (tx) => {
    await tx.repayment.create({
      data: {
        reference: reference('RPY'),
        fundingRequestId: input.fundingRequestId,
        amount: input.amount,
        currency: input.currency,
        source: input.source,
        receivedDate: input.receivedDate,
        reference_external: input.externalReference || null,
        notes: input.notes || null,
      },
    })
    await tx.fundingRequest.update({
      where: { id: input.fundingRequestId },
      data: { status: nextStatus, repaidAt: fullyRepaid ? input.receivedDate : null },
    })
    await advanceStageIfAhead(tx, request.transactionId, 'REPAYMENT', actor, 'Repayment recorded.')
    if (fullyRepaid) {
      await completeStandardMilestone(tx, request.transactionId, 'FINANCE_REPAID', actor.userId)
    }
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.REPAYMENT_RECORDED,
    entityType: 'FundingRequest',
    entityId: input.fundingRequestId,
    before: { status: request.status, repaidToDate: alreadyRepaid },
    after: {
      status: nextStatus,
      amount: input.amount,
      currency: input.currency,
      source: input.source,
      receivedDate: input.receivedDate,
      repaidToDate: totalAfter,
    },
  })

  await notify({
    userIds: [
      ...(await usersInOrganization(request.transaction.supplierId)),
      ...(await aiLogistixStaffUserIds()),
    ],
    event: NOTIFICATION_EVENTS.REPAYMENT_RECORDED,
    subject: `Repayment recorded on ${request.transaction.number}`,
    body: fullyRepaid
      ? 'The financing facility has been repaid in full. The transaction is ready to close.'
      : `A repayment of ${input.currency} ${input.amount.toLocaleString()} was recorded.`,
    linkPath: `/app/transactions/${request.transactionId}`,
  })
}

/** Funding requests a financier institution may act on. */
export async function financierPipeline(actor: Actor) {
  requirePermission(actor, 'transaction:read')
  const where: Prisma.FundingRequestWhereInput = isStaff(actor)
    ? {}
    : {
        OR: [
          { assignedFinancierId: actor.organizationId },
          {
            transaction: {
              access: { some: { organizationId: actor.organizationId, revokedAt: null } },
            },
          },
        ],
      }

  return prisma.fundingRequest.findMany({
    where,
    include: {
      transaction: {
        include: {
          purchaseOrder: { select: { poNumber: true, value: true, currency: true, status: true } },
          supplier: { select: { id: true, legalName: true, tradingName: true, country: true } },
          project: { select: { name: true } },
        },
      },
      repayments: { select: { amount: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
}
