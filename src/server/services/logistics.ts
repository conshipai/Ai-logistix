import type { ShipmentMilestoneType, ShipmentMode } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { reference } from '@/lib/ids'
import { NotFoundError, requirePermission, type Actor } from '@/lib/rbac'
import type { shipmentMilestoneSchema, shipmentSchema } from '@/lib/validation'
import { assertWritable, requireTransactionScope, transactionScopeWhere } from '@/server/services/access'
import { advanceStageIfAhead } from '@/server/services/transactions'

/**
 * Logistics.
 *
 * Shipments carry the milestone events that a carrier integration will populate
 * later. `sourceSystem` on each milestone is 'MANUAL' today; an integration
 * writes its own identifier there, so automatic and manual events coexist
 * without a schema change.
 */

export type ShipmentInput = z.infer<typeof shipmentSchema>
export type ShipmentMilestoneInput = z.infer<typeof shipmentMilestoneSchema>

/** Milestone events that imply a customs or delivery state change. */
const CUSTOMS_STATUS_FOR_MILESTONE: Partial<
  Record<ShipmentMilestoneType, 'DOCUMENTS_SUBMITTED' | 'UNDER_INSPECTION' | 'CLEARED'>
> = {
  EXPORT_CLEARED: 'CLEARED',
  IMPORT_CLEARANCE: 'UNDER_INSPECTION',
  CUSTOMS_RELEASED: 'CLEARED',
}

export async function createShipment(actor: Actor, input: ShipmentInput): Promise<{ id: string }> {
  requirePermission(actor, 'shipment:manage')
  const scope = await requireTransactionScope(actor, input.transactionId)
  assertWritable(scope)

  const shipment = await prisma.shipment.create({
    data: {
      reference: reference('SHP'),
      transactionId: input.transactionId,
      origin: input.origin,
      destination: input.destination,
      mode: input.mode,
      carrier: input.carrier || null,
      bookingReference: input.bookingReference || null,
      masterBill: input.masterBill || null,
      houseBill: input.houseBill || null,
      containerNumber: input.containerNumber || null,
      estimatedDeparture: input.estimatedDeparture ?? null,
      actualDeparture: input.actualDeparture ?? null,
      estimatedArrival: input.estimatedArrival ?? null,
      actualArrival: input.actualArrival ?? null,
      notes: input.notes || null,
    },
    select: { id: true, reference: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.SHIPMENT_CREATED,
    entityType: 'Shipment',
    entityId: shipment.id,
    after: {
      reference: shipment.reference,
      origin: input.origin,
      destination: input.destination,
      mode: input.mode,
      transactionId: input.transactionId,
    },
  })

  await advanceStageIfAhead(prisma, input.transactionId, 'LOGISTICS', actor, 'Shipment booked.')
  return { id: shipment.id }
}

export async function recordShipmentMilestone(
  actor: Actor,
  input: ShipmentMilestoneInput,
): Promise<void> {
  requirePermission(actor, 'shipment:manage')

  const shipment = await prisma.shipment.findUnique({
    where: { id: input.shipmentId },
    select: { id: true, transactionId: true, reference: true, deliveryStatus: true },
  })
  if (!shipment) throw new NotFoundError('Shipment not found.')

  const scope = await requireTransactionScope(actor, shipment.transactionId)
  assertWritable(scope)

  await prisma.$transaction(async (tx) => {
    await tx.shipmentMilestone.create({
      data: {
        shipmentId: input.shipmentId,
        type: input.type,
        occurredAt: input.occurredAt,
        location: input.location || null,
        notes: input.notes || null,
        sourceSystem: 'MANUAL',
      },
    })

    const customsStatus = CUSTOMS_STATUS_FOR_MILESTONE[input.type]
    await tx.shipment.update({
      where: { id: input.shipmentId },
      data: {
        customsStatus: customsStatus ?? undefined,
        deliveryStatus:
          input.type === 'DELIVERED'
            ? 'DELIVERED'
            : ['DEPARTED', 'ARRIVED', 'OUT_FOR_DELIVERY'].includes(input.type)
              ? 'IN_TRANSIT'
              : undefined,
        actualDeparture: input.type === 'DEPARTED' ? input.occurredAt : undefined,
        actualArrival: input.type === 'ARRIVED' ? input.occurredAt : undefined,
      },
    })
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.SHIPMENT_MILESTONE_RECORDED,
    entityType: 'Shipment',
    entityId: input.shipmentId,
    after: {
      type: input.type,
      occurredAt: input.occurredAt,
      location: input.location,
      reference: shipment.reference,
    },
  })
}

export async function updateShipment(
  actor: Actor,
  shipmentId: string,
  input: Partial<ShipmentInput> & { customsStatus?: string; deliveryStatus?: string },
): Promise<void> {
  requirePermission(actor, 'shipment:manage')

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, transactionId: true, carrier: true, mode: true },
  })
  if (!shipment) throw new NotFoundError('Shipment not found.')
  const scope = await requireTransactionScope(actor, shipment.transactionId)
  assertWritable(scope)

  await prisma.shipment.update({
    where: { id: shipmentId },
    data: {
      carrier: input.carrier ?? undefined,
      bookingReference: input.bookingReference ?? undefined,
      masterBill: input.masterBill ?? undefined,
      houseBill: input.houseBill ?? undefined,
      containerNumber: input.containerNumber ?? undefined,
      estimatedDeparture: input.estimatedDeparture ?? undefined,
      estimatedArrival: input.estimatedArrival ?? undefined,
      notes: input.notes ?? undefined,
    },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.SHIPMENT_UPDATED,
    entityType: 'Shipment',
    entityId: shipmentId,
    after: input,
  })
}

export async function listShipments(actor: Actor, limit = 50) {
  return prisma.shipment.findMany({
    where: { transaction: transactionScopeWhere(actor) },
    include: {
      transaction: { select: { id: true, number: true } },
      milestones: { orderBy: { occurredAt: 'desc' }, take: 1 },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/** Rolled-up logistics completion for the transaction progress bar. */
export function logisticsProgress(
  shipments: Array<{ deliveryStatus: string; milestones: Array<{ type: ShipmentMilestoneType }> }>,
): number | null {
  if (shipments.length === 0) return null
  const order: ShipmentMilestoneType[] = [
    'BOOKED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED_AT_ORIGIN', 'EXPORT_CLEARED',
    'DEPARTED', 'ARRIVED', 'IMPORT_CLEARANCE', 'CUSTOMS_RELEASED', 'OUT_FOR_DELIVERY', 'DELIVERED',
  ]
  const total = shipments.reduce((sum, shipment) => {
    const furthest = shipment.milestones.reduce(
      (max, m) => Math.max(max, order.indexOf(m.type)),
      -1,
    )
    return sum + (furthest + 1) / order.length
  }, 0)
  return Math.round((total / shipments.length) * 100)
}

export const SHIPMENT_MODE_LABELS: Record<ShipmentMode, string> = {
  AIR: 'Air',
  OCEAN_FCL: 'Ocean — FCL',
  OCEAN_LCL: 'Ocean — LCL',
  ROAD: 'Road',
  RAIL: 'Rail',
  COURIER: 'Courier',
  PROJECT_CARGO: 'Project cargo',
  OTHER: 'Other',
}
