import type { ProcurementItemStatus } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { NotFoundError, ValidationError, requirePermission, type Actor } from '@/lib/rbac'
import { assertProcurementItemTransition } from '@/lib/state-machine'
import type { procurementItemSchema, vendorSchema } from '@/lib/validation'
import { assertWritable, requireTransactionScope } from '@/server/services/access'
import { completeStandardMilestone } from '@/server/services/milestones'
import { advanceStageIfAhead } from '@/server/services/transactions'

/**
 * Procurement plan.
 *
 * The supplier breaks the transaction into the purchases it needs to make. Each
 * line can name a vendor, which is what makes disbursement to vendors rather
 * than to the supplier possible later in the workflow.
 */

export type ProcurementItemInput = z.infer<typeof procurementItemSchema>
export type VendorInput = z.infer<typeof vendorSchema>

export async function createVendor(actor: Actor, input: VendorInput): Promise<{ id: string }> {
  requirePermission(actor, 'procurement:manage')

  const existing = await prisma.vendor.findFirst({
    where: { organizationId: actor.organizationId, name: input.name },
    select: { id: true },
  })
  if (existing) return existing

  const vendor = await prisma.vendor.create({
    data: {
      organizationId: actor.organizationId,
      name: input.name,
      country: input.country,
      contactName: input.contactName || null,
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      website: input.website || null,
      notes: input.notes || null,
    },
    select: { id: true },
  })
  return vendor
}

/** Vendors the actor may reference. Scoped to the actor's own organization. */
export async function listVendors(actor: Actor) {
  return prisma.vendor.findMany({
    where: { organizationId: actor.organizationId },
    orderBy: { name: 'asc' },
  })
}

/** Vendors visible in the context of a transaction — the supplier's list. */
export async function listVendorsForTransaction(actor: Actor, transactionId: string) {
  await requireTransactionScope(actor, transactionId)
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    select: { supplierId: true },
  })
  if (!transaction) throw new NotFoundError('Transaction not found.')
  return prisma.vendor.findMany({
    where: { organizationId: transaction.supplierId },
    orderBy: { name: 'asc' },
  })
}

export async function createProcurementItem(
  actor: Actor,
  input: ProcurementItemInput,
): Promise<{ id: string }> {
  requirePermission(actor, 'procurement:manage')
  const scope = await requireTransactionScope(actor, input.transactionId)
  assertWritable(scope)
  if (!scope.isSupplier && !scope.isStaff) {
    throw new ValidationError('Only the supplier or AI Logistix can maintain the procurement plan.')
  }

  if (input.vendorId) {
    const transaction = await prisma.transaction.findUnique({
      where: { id: input.transactionId },
      select: { supplierId: true },
    })
    const vendor = await prisma.vendor.findUnique({
      where: { id: input.vendorId },
      select: { organizationId: true },
    })
    // A procurement line can only reference a vendor belonging to the supplier
    // on this transaction, so vendor records cannot leak between organizations.
    if (!vendor || vendor.organizationId !== transaction?.supplierId) {
      throw new NotFoundError('Vendor not found.')
    }
  }

  const item = await prisma.procurementItem.create({
    data: {
      transactionId: input.transactionId,
      vendorId: input.vendorId || null,
      itemName: input.itemName,
      description: input.description || null,
      countryOfOrigin: input.countryOfOrigin || null,
      quantity: input.quantity,
      unit: input.unit || null,
      currency: input.currency,
      amount: input.amount,
      expectedPurchaseDate: input.expectedPurchaseDate ?? null,
      expectedShipDate: input.expectedShipDate ?? null,
      expectedArrivalDate: input.expectedArrivalDate ?? null,
      requiredByDate: input.requiredByDate ?? null,
      logisticsRequired: input.logisticsRequired,
      status: 'PLANNED',
    },
    select: { id: true, itemName: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.PROCUREMENT_ITEM_CREATED,
    entityType: 'ProcurementItem',
    entityId: item.id,
    after: {
      itemName: item.itemName,
      amount: input.amount,
      currency: input.currency,
      transactionId: input.transactionId,
    },
  })
  return { id: item.id }
}

const MILESTONE_FOR_PROCUREMENT_STATUS: Partial<
  Record<ProcurementItemStatus, 'RAW_MATERIAL_ORDERED' | 'RAW_MATERIAL_SHIPPED' | 'RAW_MATERIAL_DELIVERED'>
> = {
  ORDERED: 'RAW_MATERIAL_ORDERED',
  SHIPPED: 'RAW_MATERIAL_SHIPPED',
  DELIVERED: 'RAW_MATERIAL_DELIVERED',
}

export async function updateProcurementItemStatus(
  actor: Actor,
  procurementItemId: string,
  status: ProcurementItemStatus,
): Promise<void> {
  requirePermission(actor, 'procurement:manage')

  const item = await prisma.procurementItem.findUnique({
    where: { id: procurementItemId },
    select: { id: true, transactionId: true, status: true, itemName: true },
  })
  if (!item) throw new NotFoundError('Procurement item not found.')

  const scope = await requireTransactionScope(actor, item.transactionId)
  assertWritable(scope)
  assertProcurementItemTransition(item.status, status)

  await prisma.procurementItem.update({ where: { id: procurementItemId }, data: { status } })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.PROCUREMENT_ITEM_UPDATED,
    entityType: 'ProcurementItem',
    entityId: procurementItemId,
    before: { status: item.status },
    after: { status, itemName: item.itemName },
  })

  const milestoneType = MILESTONE_FOR_PROCUREMENT_STATUS[status]
  if (milestoneType) {
    await completeStandardMilestone(prisma, item.transactionId, milestoneType, actor.userId)
  }
  if (status === 'ORDERED') {
    await advanceStageIfAhead(prisma, item.transactionId, 'PROCUREMENT', actor, 'Procurement started.')
  }
  if (status === 'SHIPPED' || status === 'CUSTOMS') {
    await advanceStageIfAhead(prisma, item.transactionId, 'LOGISTICS', actor, 'Materials in transit.')
  }
}

/** Rolled-up procurement completion, used by the transaction progress bar. */
export function procurementProgress(
  items: Array<{ status: ProcurementItemStatus }>,
): number | null {
  if (items.length === 0) return null
  const weights: Record<ProcurementItemStatus, number> = {
    PLANNED: 0,
    QUOTE_RECEIVED: 0.15,
    APPROVED: 0.3,
    ORDERED: 0.45,
    IN_PRODUCTION: 0.6,
    READY: 0.75,
    SHIPPED: 0.85,
    CUSTOMS: 0.92,
    DELIVERED: 1,
    CANCELLED: 1,
  }
  const total = items.reduce((sum, item) => sum + weights[item.status], 0)
  return Math.round((total / items.length) * 100)
}
