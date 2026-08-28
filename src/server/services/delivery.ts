import type { z } from 'zod'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  isStaff,
  requirePermission,
  type Actor,
} from '@/lib/rbac'
import type { deliveryAcceptanceSchema, invoiceSchema } from '@/lib/validation'
import { assertWritable, requireTransactionScope } from '@/server/services/access'
import { decideApproval } from '@/server/services/approvals'
import { completeStandardMilestone } from '@/server/services/milestones'
import {
  NOTIFICATION_EVENTS,
  aiLogistixStaffUserIds,
  notify,
  usersInOrganization,
} from '@/server/services/notifications'
import { advanceStageIfAhead } from '@/server/services/transactions'

/**
 * Delivery acceptance, invoicing and buyer payment.
 *
 * Acceptance is the buyer's decision alone (or AI Logistix acting as
 * coordinator). A supplier can record delivery, but never acceptance of its own
 * delivery.
 */

export type DeliveryAcceptanceInput = z.infer<typeof deliveryAcceptanceSchema>
export type InvoiceInput = z.infer<typeof invoiceSchema>

export async function recordDeliveryAcceptance(
  actor: Actor,
  input: DeliveryAcceptanceInput,
): Promise<void> {
  requirePermission(actor, 'delivery:accept')
  const scope = await requireTransactionScope(actor, input.transactionId)
  assertWritable(scope)

  if (scope.isSupplier && !isStaff(actor)) {
    throw new AuthorizationError('A supplier cannot accept its own delivery.')
  }
  if (!scope.isBuyer && !scope.isProjectOwner && !scope.isStaff) {
    throw new AuthorizationError('Only the buyer organization can confirm acceptance.')
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: input.transactionId },
    select: { id: true, number: true, supplierId: true, stage: true },
  })
  if (!transaction) throw new NotFoundError('Transaction not found.')

  await prisma.$transaction(async (tx) => {
    await decideApproval(
      {
        transactionId: input.transactionId,
        type: 'DELIVERY_ACCEPTANCE',
        decision: input.accepted ? 'APPROVED' : 'CHANGES_REQUESTED',
        actor,
        comments: input.comments ?? null,
      },
      tx,
    )

    if (input.accepted) {
      await completeStandardMilestone(tx, input.transactionId, 'DELIVERED', actor.userId)
      await completeStandardMilestone(tx, input.transactionId, 'BUYER_ACCEPTED', actor.userId)
      await advanceStageIfAhead(
        tx,
        input.transactionId,
        'BUYER_ACCEPTANCE',
        actor,
        'Buyer confirmed delivery and acceptance.',
      )
    }
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.DELIVERY_ACCEPTED,
    entityType: 'Transaction',
    entityId: input.transactionId,
    after: { accepted: input.accepted, comments: input.comments },
  })

  await notify({
    userIds: [
      ...(await usersInOrganization(transaction.supplierId)),
      ...(await aiLogistixStaffUserIds()),
    ],
    event: NOTIFICATION_EVENTS.DELIVERY_ACCEPTED,
    subject: input.accepted
      ? `Delivery accepted on ${transaction.number}`
      : `Delivery returned on ${transaction.number}`,
    body: input.accepted
      ? `${actor.organizationName} has confirmed delivery and acceptance. You can now submit your invoice.`
      : `${actor.organizationName} did not accept delivery. ${input.comments ?? ''}`,
    linkPath: `/app/transactions/${input.transactionId}`,
  })
}

export async function createInvoice(actor: Actor, input: InvoiceInput): Promise<{ id: string }> {
  requirePermission(actor, 'invoice:manage')
  const scope = await requireTransactionScope(actor, input.transactionId)
  assertWritable(scope)
  if (!scope.isSupplier && !scope.isStaff) {
    throw new AuthorizationError('Only the supplier can raise an invoice on this transaction.')
  }

  const duplicate = await prisma.invoice.findFirst({
    where: { transactionId: input.transactionId, invoiceNumber: input.invoiceNumber },
    select: { id: true },
  })
  if (duplicate) {
    throw new ValidationError('An invoice with this number already exists on this transaction.', {
      invoiceNumber: ['An invoice with this number already exists on this transaction.'],
    })
  }

  const invoice = await prisma.invoice.create({
    data: {
      transactionId: input.transactionId,
      invoiceNumber: input.invoiceNumber,
      issueDate: input.issueDate,
      dueDate: input.dueDate ?? null,
      amount: input.amount,
      currency: input.currency,
      description: input.description || null,
      submittedAt: new Date(),
    },
    select: { id: true, invoiceNumber: true },
  })

  await completeStandardMilestone(prisma, input.transactionId, 'INVOICE_SUBMITTED', actor.userId)

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.INVOICE_CREATED,
    entityType: 'Invoice',
    entityId: invoice.id,
    after: {
      invoiceNumber: invoice.invoiceNumber,
      amount: input.amount,
      currency: input.currency,
      transactionId: input.transactionId,
    },
  })
  return { id: invoice.id }
}

/** Records buyer acceptance of an invoice, or the payment received against it. */
export async function updateInvoice(
  actor: Actor,
  invoiceId: string,
  update: { accepted?: boolean; paidAmount?: number; paidDate?: Date },
): Promise<void> {
  requirePermission(actor, 'invoice:manage')

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      transactionId: true,
      invoiceNumber: true,
      amount: true,
      acceptedAt: true,
      paidAt: true,
    },
  })
  if (!invoice) throw new NotFoundError('Invoice not found.')

  const scope = await requireTransactionScope(actor, invoice.transactionId)
  assertWritable(scope)

  // Only the buyer side (or AI Logistix) can mark an invoice accepted or paid;
  // a supplier cannot certify its own invoice.
  if (update.accepted !== undefined || update.paidAmount !== undefined) {
    if (!scope.isBuyer && !scope.isProjectOwner && !scope.isStaff) {
      throw new AuthorizationError('Only the buyer organization can accept or pay an invoice.')
    }
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      acceptedAt: update.accepted ? new Date() : undefined,
      paidAmount: update.paidAmount ?? undefined,
      paidAt: update.paidDate ?? (update.paidAmount !== undefined ? new Date() : undefined),
    },
  })

  if (update.accepted) {
    await completeStandardMilestone(prisma, invoice.transactionId, 'INVOICE_APPROVED', actor.userId)
    await decideApproval({
      transactionId: invoice.transactionId,
      type: 'INVOICE_ACCEPTANCE',
      decision: 'APPROVED',
      actor,
    })
  }
  if (update.paidAmount !== undefined) {
    await completeStandardMilestone(prisma, invoice.transactionId, 'PAYMENT_RECEIVED', actor.userId)
    await advanceStageIfAhead(prisma, invoice.transactionId, 'PAYMENT', actor, 'Buyer payment recorded.')
  }

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.INVOICE_UPDATED,
    entityType: 'Invoice',
    entityId: invoiceId,
    before: { acceptedAt: invoice.acceptedAt, paidAt: invoice.paidAt },
    after: update,
  })

  if (update.paidAmount !== undefined) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: invoice.transactionId },
      select: { number: true, supplierId: true },
    })
    await notify({
      userIds: [
        ...(await usersInOrganization(transaction!.supplierId)),
        ...(await aiLogistixStaffUserIds()),
      ],
      event: NOTIFICATION_EVENTS.PAYMENT_RECORDED,
      subject: `Buyer payment recorded on ${transaction?.number}`,
      body: `A payment against invoice ${invoice.invoiceNumber} has been recorded.`,
      linkPath: `/app/transactions/${invoice.transactionId}`,
    })
  }
}
