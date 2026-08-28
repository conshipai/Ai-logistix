import type { Prisma } from '@prisma/client'
import { z } from 'zod'
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
import { assertPurchaseOrderTransition } from '@/lib/state-machine'
import { poVerificationSchema, purchaseOrderSchema } from '@/lib/validation'
import { purchaseOrderScopeWhere } from '@/server/services/access'
import { decideApproval, requestApproval } from '@/server/services/approvals'
import {
  NOTIFICATION_EVENTS,
  aiLogistixStaffUserIds,
  notify,
  usersInOrganization,
} from '@/server/services/notifications'
import {
  advanceStage,
  createTransactionForPurchaseOrder,
} from '@/server/services/transactions'
import { seedStandardMilestones } from '@/server/services/milestones'

/**
 * Purchase orders.
 *
 * The PO is the object the whole platform hangs from. Two rules are absolute
 * and are enforced here rather than in the UI:
 *
 *  * A supplier may only ever raise a PO on behalf of its own organization.
 *  * A supplier may never verify its own PO. Verification is reserved for the
 *    buyer organization named on the PO (or the project's EPC/owner), and for
 *    AI Logistix acting as coordinator.
 */

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>

export async function createPurchaseOrder(
  actor: Actor,
  input: PurchaseOrderInput,
  supplierIdOverride?: string,
): Promise<{ id: string }> {
  requirePermission(actor, 'po:create')

  // Staff may raise a PO on a supplier's behalf; everyone else is pinned to
  // their own organization, so the supplier id can never be spoofed by input.
  const supplierId = isStaff(actor) && supplierIdOverride ? supplierIdOverride : actor.organizationId

  const supplier = await prisma.organization.findUnique({
    where: { id: supplierId },
    select: { id: true, type: true, accountStatus: true, isDemo: true },
  })
  if (!supplier) throw new NotFoundError('Supplier organization not found.')
  if (supplier.type !== 'SUPPLIER') {
    throw new ValidationError('Purchase orders can only be raised for supplier organizations.')
  }
  if (supplier.accountStatus !== 'ACTIVE') {
    throw new AuthorizationError('Your organization is not yet active on the platform.')
  }

  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { id: true, projectOwnerId: true, epcId: true, status: true },
  })
  if (!project) throw new NotFoundError('Project not found.')
  if (!['PLANNED', 'ACTIVE'].includes(project.status)) {
    throw new ValidationError('That project is not accepting new purchase orders.')
  }

  const buyer = await prisma.organization.findUnique({
    where: { id: input.buyerId },
    select: { id: true, type: true, accountStatus: true },
  })
  if (!buyer) throw new NotFoundError('Buyer organization not found.')
  if (!['EPC', 'PROJECT_OWNER'].includes(buyer.type)) {
    throw new ValidationError('The buyer must be an EPC contractor or a project owner.')
  }
  if (buyer.id === supplierId) {
    throw new ValidationError('A supplier cannot issue a purchase order to itself.')
  }

  const duplicate = await prisma.purchaseOrder.findFirst({
    where: { supplierId, buyerId: input.buyerId, poNumber: input.poNumber },
    select: { id: true },
  })
  if (duplicate) {
    throw new ValidationError('A purchase order with this number already exists for this buyer.', {
      poNumber: ['A purchase order with this number already exists for this buyer.'],
    })
  }

  const po = await prisma.purchaseOrder.create({
    data: {
      poNumber: input.poNumber,
      projectId: input.projectId,
      supplierId,
      buyerId: input.buyerId,
      issueDate: input.issueDate,
      currency: input.currency,
      value: input.value,
      paymentTerms: input.paymentTerms || null,
      incoterm: input.incoterm || null,
      deliveryTerms: input.deliveryTerms || null,
      requestedDeliveryDate: input.requestedDeliveryDate ?? null,
      scopeDescription: input.scopeDescription,
      manufacturingComponent: input.manufacturingComponent ?? null,
      importedMaterialComponent: input.importedMaterialComponent ?? null,
      localLabourComponent: input.localLabourComponent ?? null,
      logisticsComponent: input.logisticsComponent ?? null,
      taxesComponent: input.taxesComponent ?? null,
      expectedGrossMargin: input.expectedGrossMargin ?? null,
      advancePaymentAmount: input.advancePaymentAmount ?? null,
      progressPaymentSchedule: input.progressPaymentSchedule || null,
      finalPaymentTerms: input.finalPaymentTerms || null,
      expiryDate: input.expiryDate ?? null,
      status: 'DRAFT',
      isDemo: supplier.isDemo,
    },
    select: { id: true, poNumber: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.PO_CREATED,
    entityType: 'PurchaseOrder',
    entityId: po.id,
    after: { poNumber: po.poNumber, value: input.value, currency: input.currency, supplierId },
  })

  return { id: po.id }
}

export async function updatePurchaseOrder(
  actor: Actor,
  purchaseOrderId: string,
  input: PurchaseOrderInput,
): Promise<void> {
  requirePermission(actor, 'po:update:own')

  const existing = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, ...purchaseOrderScopeWhere(actor) },
  })
  if (!existing) throw new NotFoundError('Purchase order not found.')
  if (!isStaff(actor) && existing.supplierId !== actor.organizationId) {
    throw new AuthorizationError('Only the supplier named on this purchase order can edit it.')
  }
  if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
    throw new ValidationError('Only a draft or returned purchase order can be edited.')
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: purchaseOrderId },
    data: {
      poNumber: input.poNumber,
      projectId: input.projectId,
      buyerId: input.buyerId,
      issueDate: input.issueDate,
      currency: input.currency,
      value: input.value,
      paymentTerms: input.paymentTerms || null,
      incoterm: input.incoterm || null,
      deliveryTerms: input.deliveryTerms || null,
      requestedDeliveryDate: input.requestedDeliveryDate ?? null,
      scopeDescription: input.scopeDescription,
      manufacturingComponent: input.manufacturingComponent ?? null,
      importedMaterialComponent: input.importedMaterialComponent ?? null,
      localLabourComponent: input.localLabourComponent ?? null,
      logisticsComponent: input.logisticsComponent ?? null,
      taxesComponent: input.taxesComponent ?? null,
      expectedGrossMargin: input.expectedGrossMargin ?? null,
      advancePaymentAmount: input.advancePaymentAmount ?? null,
      progressPaymentSchedule: input.progressPaymentSchedule || null,
      finalPaymentTerms: input.finalPaymentTerms || null,
      expiryDate: input.expiryDate ?? null,
    },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.PO_UPDATED,
    entityType: 'PurchaseOrder',
    entityId: purchaseOrderId,
    before: { value: existing.value, poNumber: existing.poNumber, status: existing.status },
    after: { value: updated.value, poNumber: updated.poNumber },
  })
}

/**
 * Submits a PO for verification. Opens the transaction, seeds its milestone
 * plan, and raises the PO_VERIFICATION approval against the buyer.
 */
export async function submitPurchaseOrder(
  actor: Actor,
  purchaseOrderId: string,
): Promise<{ transactionId: string; transactionNumber: string }> {
  requirePermission(actor, 'po:submit')

  const po = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, ...purchaseOrderScopeWhere(actor) },
    include: { project: { select: { epcId: true, projectOwnerId: true, name: true } } },
  })
  if (!po) throw new NotFoundError('Purchase order not found.')
  if (!isStaff(actor) && po.supplierId !== actor.organizationId) {
    throw new AuthorizationError('Only the supplier named on this purchase order can submit it.')
  }

  assertPurchaseOrderTransition(po.status, 'SUBMITTED')

  const documentCount = await prisma.document.count({
    where: { transaction: { purchaseOrderId }, category: 'PURCHASE_ORDER', deletedAt: null },
  })

  const result = await prisma.$transaction(async (tx) => {
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: 'VERIFICATION_REQUESTED', submittedAt: new Date() },
    })

    const transaction = await createTransactionForPurchaseOrder(tx, purchaseOrderId, actor)
    await seedStandardMilestones(tx, transaction.id)
    await advanceStage(tx, transaction.id, 'VERIFICATION', actor, {
      note: 'Purchase order submitted for buyer verification.',
    })

    await requestApproval(
      {
        transactionId: transaction.id,
        type: 'PO_VERIFICATION',
        requestedFromOrganizationId: po.buyerId,
        requestedById: actor.userId,
        comments: 'Confirm this purchase order was issued and remains active.',
      },
      tx,
    )

    return transaction
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.PO_SUBMITTED,
    entityType: 'PurchaseOrder',
    entityId: purchaseOrderId,
    before: { status: po.status },
    after: { status: 'VERIFICATION_REQUESTED', transactionNumber: result.number },
    metadata: { supportingPoDocuments: documentCount },
  })
  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.PO_VERIFICATION_REQUESTED,
    entityType: 'PurchaseOrder',
    entityId: purchaseOrderId,
    after: { requestedFromOrganizationId: po.buyerId },
  })

  await notify({
    userIds: await usersInOrganization(po.buyerId),
    event: NOTIFICATION_EVENTS.PO_VERIFICATION_REQUESTED,
    subject: `Purchase order ${po.poNumber} awaiting your verification`,
    body:
      `A supplier has submitted purchase order ${po.poNumber} on project ${po.project.name} ` +
      `and is asking your organization to confirm it. Transaction ${result.number}.`,
    linkPath: `/app/transactions/${result.id}`,
  })
  await notify({
    userIds: await aiLogistixStaffUserIds(),
    event: NOTIFICATION_EVENTS.PO_SUBMITTED,
    subject: `New transaction ${result.number} submitted`,
    body: `Purchase order ${po.poNumber} was submitted and is awaiting buyer verification.`,
    linkPath: `/app/transactions/${result.id}`,
  })

  return { transactionId: result.id, transactionNumber: result.number }
}

export type PoVerificationInput = z.infer<typeof poVerificationSchema>

/**
 * Records a verification decision.
 *
 * The identity rule lives here: the acting organization must be the buyer named
 * on the PO, the project's EPC, the project owner, or AI Logistix. A supplier
 * is rejected even when it holds the `po:verify` capability through some other
 * membership, and an EPC is rejected on POs that are not assigned to it.
 */
export async function verifyPurchaseOrder(
  actor: Actor,
  input: PoVerificationInput,
): Promise<void> {
  requirePermission(actor, 'po:verify')

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: input.purchaseOrderId },
    include: {
      project: { select: { epcId: true, projectOwnerId: true, name: true } },
      transaction: { select: { id: true, number: true } },
    },
  })
  if (!po) throw new NotFoundError('Purchase order not found.')

  if (po.supplierId === actor.organizationId) {
    throw new AuthorizationError('A supplier cannot verify its own purchase order.')
  }

  const permitted =
    isStaff(actor) ||
    po.buyerId === actor.organizationId ||
    po.project.epcId === actor.organizationId ||
    po.project.projectOwnerId === actor.organizationId
  if (!permitted) {
    throw new NotFoundError('Purchase order not found.')
  }

  if (!['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_REQUESTED'].includes(po.status)) {
    throw new ValidationError('This purchase order is not awaiting verification.')
  }
  if (!po.transaction) throw new ValidationError('This purchase order has no open transaction.')

  const approved = input.decision === 'APPROVED'
  const nextStatus = approved ? 'VERIFIED' : 'REJECTED'
  assertPurchaseOrderTransition(po.status, nextStatus)

  await prisma.$transaction(async (tx) => {
    await tx.purchaseOrderVerification.create({
      data: {
        purchaseOrderId: po.id,
        verifiedById: actor.userId,
        verifiedByOrganizationId: actor.organizationId,
        method: input.method,
        decision: input.decision === 'CHANGES_REQUESTED' ? 'CHANGES_REQUESTED' : input.decision,
        valueConfirmed: input.valueConfirmed,
        buyerConfirmed: input.buyerConfirmed,
        supplierConfirmed: input.supplierConfirmed,
        paymentTermsConfirmed: input.paymentTermsConfirmed,
        poIsActiveConfirmed: input.poIsActiveConfirmed,
        comments: input.comments || null,
      },
    })

    await tx.purchaseOrder.update({ where: { id: po.id }, data: { status: nextStatus } })

    await decideApproval(
      {
        transactionId: po.transaction!.id,
        type: 'PO_VERIFICATION',
        decision: approved ? 'APPROVED' : input.decision,
        actor,
        comments: input.comments ?? null,
      },
      tx,
    )

    await advanceStage(
      tx,
      po.transaction!.id,
      approved ? 'FINANCING_REVIEW' : 'PURCHASE_ORDER',
      actor,
      {
        note: approved
          ? 'Purchase order verified by the buyer.'
          : 'Purchase order returned to the supplier.',
      },
    )
  })

  await recordAudit({
    actor,
    action: approved ? AUDIT_ACTIONS.PO_VERIFIED : AUDIT_ACTIONS.PO_REJECTED,
    entityType: 'PurchaseOrder',
    entityId: po.id,
    before: { status: po.status },
    after: {
      status: nextStatus,
      method: input.method,
      comments: input.comments,
      verifiedByOrganizationId: actor.organizationId,
    },
  })

  await notify({
    userIds: [
      ...(await usersInOrganization(po.supplierId)),
      ...(await aiLogistixStaffUserIds()),
    ],
    event: approved ? NOTIFICATION_EVENTS.PO_VERIFIED : NOTIFICATION_EVENTS.PO_REJECTED,
    subject: approved
      ? `Purchase order ${po.poNumber} verified`
      : `Purchase order ${po.poNumber} returned`,
    body: approved
      ? `${actor.organizationName} has verified purchase order ${po.poNumber}. You can now submit a financing request.`
      : `${actor.organizationName} returned purchase order ${po.poNumber}. ${input.comments ?? ''}`,
    linkPath: `/app/transactions/${po.transaction.id}`,
  })
}

export async function listPurchaseOrders(
  actor: Actor,
  options: { status?: Prisma.PurchaseOrderWhereInput['status']; take?: number } = {},
) {
  requirePermission(actor, 'po:read')
  return prisma.purchaseOrder.findMany({
    where: {
      ...purchaseOrderScopeWhere(actor),
      ...(options.status ? { status: options.status } : {}),
    },
    include: {
      supplier: { select: { id: true, legalName: true, tradingName: true } },
      buyer: { select: { id: true, legalName: true, tradingName: true } },
      project: { select: { id: true, name: true } },
      transaction: { select: { id: true, number: true, stage: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: options.take ?? 100,
  })
}

export async function getPurchaseOrder(actor: Actor, purchaseOrderId: string) {
  requirePermission(actor, 'po:read')
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: purchaseOrderId, ...purchaseOrderScopeWhere(actor) },
    include: {
      supplier: true,
      buyer: true,
      project: true,
      transaction: { select: { id: true, number: true, stage: true } },
      verifications: {
        include: { verifiedBy: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!po) throw new NotFoundError('Purchase order not found.')
  return po
}
