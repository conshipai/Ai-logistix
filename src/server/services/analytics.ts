import { prisma } from '@/lib/db'
import { isStaff, requirePermission, type Actor } from '@/lib/rbac'
import { toNumber } from '@/lib/utils'
import { FUNDING_EXPOSURE_STATUSES, FUNDING_OPEN_STATUSES } from '@/lib/state-machine'
import { transactionScopeWhere } from '@/server/services/access'

/**
 * Programme analytics.
 *
 * Every figure here is computed from stored records. Where the platform holds
 * no data for a metric it is reported as null and rendered as "no data yet" —
 * nothing is estimated, extrapolated or filled in.
 */

export interface ProgrammeMetrics {
  transactionCount: number
  activeTransactionCount: number
  completedTransactionCount: number
  totalPoValue: number
  totalFinancingRequested: number
  totalFinancingApproved: number
  totalFinancingFunded: number
  totalRepaid: number
  outstandingExposure: number
  localProcurementEnabled: number
  importedInputValue: number
  supplierCount: number
  supplierCountries: number
  averageFinancingToPoRatio: number | null
  defaultCount: number
  averageFinancingDurationDays: number | null
  logisticsShipmentCount: number
  shipmentsByMode: Array<{ mode: string; count: number }>
  onTimeDeliveryRate: number | null
  /** Metrics the platform cannot yet compute from stored data. */
  unavailable: string[]
}

export async function programmeMetrics(actor: Actor): Promise<ProgrammeMetrics> {
  requirePermission(actor, 'analytics:read:own')
  const scope = transactionScopeWhere(actor)

  const [transactions, fundingRequests, repayments, shipments, suppliers] = await Promise.all([
    prisma.transaction.findMany({
      where: scope,
      select: {
        id: true,
        stage: true,
        createdAt: true,
        closedAt: true,
        supplierId: true,
        supplier: { select: { country: true } },
        purchaseOrder: {
          select: {
            value: true,
            currency: true,
            importedMaterialComponent: true,
            localLabourComponent: true,
            manufacturingComponent: true,
          },
        },
      },
    }),
    prisma.fundingRequest.findMany({
      where: { transaction: scope },
      select: {
        id: true,
        status: true,
        requestedAmount: true,
        approvedAmount: true,
        currency: true,
        fundedAt: true,
        repaidAt: true,
      },
    }),
    prisma.repayment.findMany({
      where: { fundingRequest: { transaction: scope } },
      select: { amount: true },
    }),
    prisma.shipment.findMany({
      where: { transaction: scope },
      select: { mode: true, estimatedArrival: true, actualArrival: true, deliveryStatus: true },
    }),
    prisma.transaction.findMany({
      where: scope,
      select: { supplierId: true, supplier: { select: { country: true } } },
      distinct: ['supplierId'],
    }),
  ])

  const sum = (values: unknown[]) => values.reduce<number>((acc, v) => acc + (toNumber(v) ?? 0), 0)

  const totalPoValue = sum(transactions.map((t) => t.purchaseOrder.value))
  const totalFinancingRequested = sum(fundingRequests.map((f) => f.requestedAmount))
  const totalFinancingApproved = sum(
    fundingRequests
      .filter((f) => ['APPROVED', 'CONDITIONALLY_APPROVED', 'FUNDED', 'PARTIALLY_REPAID', 'REPAID', 'DEFAULT'].includes(f.status))
      .map((f) => f.approvedAmount),
  )
  const totalFinancingFunded = sum(
    fundingRequests
      .filter((f) => ['FUNDED', 'PARTIALLY_REPAID', 'REPAID', 'DEFAULT'].includes(f.status))
      .map((f) => f.approvedAmount),
  )
  const totalRepaid = sum(repayments.map((r) => r.amount))
  const outstandingExposure = sum(
    fundingRequests
      .filter((f) => FUNDING_EXPOSURE_STATUSES.includes(f.status))
      .map((f) => f.approvedAmount),
  ) - totalRepaid

  const importedInputValue = sum(transactions.map((t) => t.purchaseOrder.importedMaterialComponent))
  const localProcurementEnabled = sum(
    transactions.flatMap((t) => [
      t.purchaseOrder.localLabourComponent,
      t.purchaseOrder.manufacturingComponent,
    ]),
  )

  const durations = fundingRequests
    .filter((f) => f.fundedAt && f.repaidAt)
    .map((f) => (f.repaidAt!.getTime() - f.fundedAt!.getTime()) / 86_400_000)

  const arrivedShipments = shipments.filter((s) => s.actualArrival && s.estimatedArrival)
  const onTime = arrivedShipments.filter((s) => s.actualArrival! <= s.estimatedArrival!)

  const modeCounts = new Map<string, number>()
  for (const shipment of shipments) {
    modeCounts.set(shipment.mode, (modeCounts.get(shipment.mode) ?? 0) + 1)
  }

  const unavailable: string[] = []
  if (arrivedShipments.length === 0) unavailable.push('Supplier on-time delivery')
  if (durations.length === 0) unavailable.push('Average financing duration')
  unavailable.push('Jobs supported')
  unavailable.push('Supplier quality acceptance rate')

  return {
    transactionCount: transactions.length,
    activeTransactionCount: transactions.filter(
      (t) => !['CLOSED', 'CANCELLED'].includes(t.stage),
    ).length,
    completedTransactionCount: transactions.filter((t) => t.stage === 'CLOSED').length,
    totalPoValue,
    totalFinancingRequested,
    totalFinancingApproved,
    totalFinancingFunded,
    totalRepaid,
    outstandingExposure: Math.max(0, outstandingExposure),
    localProcurementEnabled,
    importedInputValue,
    supplierCount: suppliers.length,
    supplierCountries: new Set(suppliers.map((s) => s.supplier.country)).size,
    averageFinancingToPoRatio:
      totalPoValue > 0 && totalFinancingApproved > 0
        ? Math.round((totalFinancingApproved / totalPoValue) * 1000) / 10
        : null,
    defaultCount: fundingRequests.filter((f) => f.status === 'DEFAULT').length,
    averageFinancingDurationDays:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
    logisticsShipmentCount: shipments.length,
    shipmentsByMode: Array.from(modeCounts.entries())
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count),
    onTimeDeliveryRate:
      arrivedShipments.length > 0
        ? Math.round((onTime.length / arrivedShipments.length) * 1000) / 10
        : null,
    unavailable,
  }
}

/** Per-project roll-up for the project-owner dashboard. */
export async function transactionsByProject(actor: Actor) {
  requirePermission(actor, 'analytics:read:own')
  const rows = await prisma.transaction.findMany({
    where: transactionScopeWhere(actor),
    select: {
      stage: true,
      project: { select: { id: true, name: true } },
      purchaseOrder: { select: { value: true, currency: true } },
      supplierId: true,
    },
  })

  const byProject = new Map<
    string,
    { id: string; name: string; count: number; value: number; suppliers: Set<string>; completed: number }
  >()
  for (const row of rows) {
    const entry = byProject.get(row.project.id) ?? {
      id: row.project.id,
      name: row.project.name,
      count: 0,
      value: 0,
      suppliers: new Set<string>(),
      completed: 0,
    }
    entry.count += 1
    entry.value += toNumber(row.purchaseOrder.value) ?? 0
    entry.suppliers.add(row.supplierId)
    if (row.stage === 'CLOSED') entry.completed += 1
    byProject.set(row.project.id, entry)
  }

  return Array.from(byProject.values())
    .map((e) => ({ ...e, supplierCount: e.suppliers.size, suppliers: undefined }))
    .sort((a, b) => b.value - a.value)
}

/** Supplier sector breakdown, from stored industry values only. */
export async function supplierSectors(actor: Actor) {
  requirePermission(actor, 'analytics:read:own')
  const rows = await prisma.transaction.findMany({
    where: transactionScopeWhere(actor),
    select: { supplier: { select: { id: true, industry: true } } },
    distinct: ['supplierId'],
  })
  const counts = new Map<string, number>()
  for (const row of rows) {
    const key = row.supplier.industry?.trim() || 'Not recorded'
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count)
}

/** Financier exposure summary. */
export async function financierExposure(actor: Actor) {
  const where = isStaff(actor)
    ? {}
    : { assignedFinancierId: actor.organizationId }

  const requests = await prisma.fundingRequest.findMany({
    where,
    select: {
      status: true,
      approvedAmount: true,
      requestedAmount: true,
      currency: true,
      expectedBuyerPaymentDate: true,
      repayments: { select: { amount: true } },
      transaction: { select: { purchaseOrder: { select: { value: true } } } },
    },
  })

  const approved = requests
    .filter((r) => ['APPROVED', 'CONDITIONALLY_APPROVED', 'FUNDED', 'PARTIALLY_REPAID', 'REPAID', 'DEFAULT'].includes(r.status))
    .reduce((sum, r) => sum + (toNumber(r.approvedAmount) ?? 0), 0)
  const funded = requests
    .filter((r) => ['FUNDED', 'PARTIALLY_REPAID', 'REPAID', 'DEFAULT'].includes(r.status))
    .reduce((sum, r) => sum + (toNumber(r.approvedAmount) ?? 0), 0)
  const repaid = requests.reduce(
    (sum, r) => sum + r.repayments.reduce((s, p) => s + (toNumber(p.amount) ?? 0), 0),
    0,
  )
  const underlyingPoValue = requests.reduce(
    (sum, r) => sum + (toNumber(r.transaction.purchaseOrder.value) ?? 0),
    0,
  )
  const now = new Date()
  const late = requests.filter(
    (r) =>
      ['FUNDED', 'PARTIALLY_REPAID'].includes(r.status) &&
      r.expectedBuyerPaymentDate &&
      r.expectedBuyerPaymentDate < now,
  ).length

  return {
    awaitingReview: requests.filter((r) => FUNDING_OPEN_STATUSES.includes(r.status)).length,
    approved,
    funded,
    repaid,
    exposure: Math.max(0, funded - repaid),
    underlyingPoValue,
    weightedFinancingToPoRatio:
      underlyingPoValue > 0 ? Math.round((approved / underlyingPoValue) * 1000) / 10 : null,
    lateCount: late,
  }
}
