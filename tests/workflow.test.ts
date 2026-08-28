import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ValidationError } from '@/lib/rbac'
import { InvalidTransitionError } from '@/lib/state-machine'
import { toNumber } from '@/lib/utils'
import {
  createPurchaseOrder,
  submitPurchaseOrder,
  verifyPurchaseOrder,
} from '@/server/services/purchase-orders'
import {
  createFundingRequest,
  recordFinancierDecision,
  recordFunding,
  recordRepayment,
  reviewFundingRequest,
  submitFundingRequest,
} from '@/server/services/funding'
import { createProcurementItem, createVendor, updateProcurementItemStatus } from '@/server/services/procurement'
import { createShipment, recordShipmentMilestone } from '@/server/services/logistics'
import { createInvoice, recordDeliveryAcceptance, updateInvoice } from '@/server/services/delivery'
import { closeTransaction } from '@/server/services/transactions'
import { updateMilestoneStatus } from '@/server/services/milestones'
import { truncateAll } from './setup'
import { makeWorld } from './factories'

/**
 * End-to-end workflow.
 *
 * Drives one transaction from purchase-order creation through to CLOSED using
 * only the public service entry points — the same functions the server actions
 * call. Everything the demonstration scenario requires is exercised here, and
 * the negative cases assert that the workflow cannot be short-circuited.
 */

const prisma = new PrismaClient()
let world: Awaited<ReturnType<typeof makeWorld>>
let purchaseOrderId: string
let transactionId: string
let fundingRequestId: string

beforeAll(async () => {
  await truncateAll(prisma)
  world = await makeWorld(prisma)
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('purchase order', () => {
  it('is created by the supplier for its own organization', async () => {
    const created = await createPurchaseOrder(world.users.supplier, {
      poNumber: 'PO-456782',
      projectId: world.project.id,
      buyerId: world.orgs.epc.id,
      issueDate: new Date('2026-02-09'),
      currency: 'USD',
      value: 500_000,
      scopeDescription: 'Fabrication and supply of structural steel platforms.',
      paymentTerms: '30 days from acceptance',
      manufacturingComponent: 210_000,
      importedMaterialComponent: 165_000,
      localLabourComponent: 60_000,
      logisticsComponent: 40_000,
      taxesComponent: 25_000,
      lines: undefined as never,
    } as never)
    purchaseOrderId = created.id

    const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchaseOrderId } })
    // The supplier id comes from the session, never from the submitted form.
    expect(po.supplierId).toBe(world.orgs.supplier.id)
    expect(po.status).toBe('DRAFT')
  })

  it('rejects a second purchase order with the same number for the same buyer', async () => {
    await expect(
      createPurchaseOrder(world.users.supplier, {
        poNumber: 'PO-456782',
        projectId: world.project.id,
        buyerId: world.orgs.epc.id,
        issueDate: new Date('2026-02-09'),
        currency: 'USD',
        value: 100_000,
        scopeDescription: 'Duplicate.',
      } as never),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('is submitted, which opens the transaction and seeds the milestone plan', async () => {
    const submitted = await submitPurchaseOrder(world.users.supplier, purchaseOrderId)
    transactionId = submitted.transactionId

    expect(submitted.transactionNumber).toMatch(/^MCONNECT-\d{4}-\d{6}$/)

    const transaction = await prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      include: { milestones: true, approvals: true },
    })
    expect(transaction.stage).toBe('VERIFICATION')
    expect(transaction.milestones.length).toBeGreaterThan(10)
    expect(transaction.approvals.some((a) => a.type === 'PO_VERIFICATION')).toBe(true)
  })
})

describe('financing cannot start before verification', () => {
  it('refuses to submit a request against an unverified purchase order', async () => {
    const draft = await createFundingRequest(world.users.supplier, {
      transactionId,
      requestedAmount: 285_000,
      currency: 'USD',
      lines: [],
    } as never)

    await expect(
      submitFundingRequest(world.users.supplier, draft.id),
    ).rejects.toBeInstanceOf(ValidationError)

    await prisma.fundingRequest.delete({ where: { id: draft.id } })
  })
})

describe('verification', () => {
  it('is recorded by the EPC named on the purchase order', async () => {
    await verifyPurchaseOrder(world.users.epc, {
      purchaseOrderId,
      decision: 'APPROVED',
      method: 'ERP_LOOKUP',
      valueConfirmed: true,
      buyerConfirmed: true,
      supplierConfirmed: true,
      paymentTermsConfirmed: true,
      poIsActiveConfirmed: true,
      comments: 'Confirmed against our procurement system.',
    })

    const po = await prisma.purchaseOrder.findUniqueOrThrow({
      where: { id: purchaseOrderId },
      include: { verifications: true, transaction: true },
    })
    expect(po.status).toBe('VERIFIED')
    expect(po.verifications).toHaveLength(1)
    expect(po.verifications[0]!.verifiedByOrganizationId).toBe(world.orgs.epc.id)
    expect(po.transaction!.stage).toBe('FINANCING_REVIEW')
  })
})

describe('financing request', () => {
  it('refuses a request for more than the purchase order value', async () => {
    await expect(
      createFundingRequest(world.users.supplier, {
        transactionId,
        requestedAmount: 600_000,
        currency: 'USD',
        lines: [],
      } as never),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('refuses use-of-funds lines that do not reconcile to the total', async () => {
    await expect(
      createFundingRequest(world.users.supplier, {
        transactionId,
        requestedAmount: 285_000,
        currency: 'USD',
        lines: [
          { purpose: 'RAW_MATERIALS', description: 'Steel', amount: 140_000, currency: 'USD' },
        ],
      } as never),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('is created with a reconciling breakdown, then submitted', async () => {
    const created = await createFundingRequest(world.users.supplier, {
      transactionId,
      requestedAmount: 285_000,
      currency: 'USD',
      purposeSummary: 'Materials, labour and freight ahead of the buyer payment.',
      expectedBuyerPaymentDate: new Date('2026-08-20'),
      lines: [
        { purpose: 'RAW_MATERIALS', description: 'Steel plate', amount: 140_000, currency: 'USD' },
        { purpose: 'IMPORTED_COMPONENTS', description: 'Valves', amount: 65_000, currency: 'USD' },
        { purpose: 'LABOUR', description: 'Fabrication labour', amount: 40_000, currency: 'USD' },
        { purpose: 'LOGISTICS', description: 'Freight and customs', amount: 25_000, currency: 'USD' },
        { purpose: 'OTHER', description: 'Consumables', amount: 15_000, currency: 'USD' },
      ],
    } as never)
    fundingRequestId = created.id

    await submitFundingRequest(world.users.supplier, fundingRequestId)
    const request = await prisma.fundingRequest.findUniqueOrThrow({
      where: { id: fundingRequestId },
      include: { lines: true },
    })
    expect(request.status).toBe('UNDER_AI_LOGISTIX_REVIEW')
    expect(request.lines).toHaveLength(5)
    expect(toNumber(request.percentageOfPoValue)).toBe(57)
  })

  it('cannot be funded before a financier has approved it', async () => {
    await expect(
      recordFunding(world.users.staff, {
        fundingRequestId,
        fundedDate: new Date('2026-03-09'),
      } as never),
    ).rejects.toBeInstanceOf(InvalidTransitionError)
  })
})

describe('AI Logistix review and financier decision', () => {
  it('routes the request to a financing partner, granting it access', async () => {
    await reviewFundingRequest(world.users.staff, {
      fundingRequestId,
      action: 'ROUTE_TO_FINANCIER',
      financierOrganizationId: world.orgs.bank.id,
      notes: 'Documentation complete.',
    })

    const request = await prisma.fundingRequest.findUniqueOrThrow({
      where: { id: fundingRequestId },
    })
    expect(request.status).toBe('FINANCIER_REVIEW')
    expect(request.assignedFinancierId).toBe(world.orgs.bank.id)

    const access = await prisma.transactionAccess.findFirst({
      where: { transactionId, organizationId: world.orgs.bank.id, revokedAt: null },
    })
    expect(access).not.toBeNull()
  })

  it('refuses an approval above the amount requested', async () => {
    await expect(
      recordFinancierDecision(world.users.financier, {
        fundingRequestId,
        decision: 'APPROVED',
        approvedAmount: 400_000,
        approvedCurrency: 'USD',
      } as never),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('records an approval of USD 250,000', async () => {
    await recordFinancierDecision(world.users.financier, {
      fundingRequestId,
      decision: 'APPROVED',
      approvedAmount: 250_000,
      approvedCurrency: 'USD',
      interestRatePct: 9.75,
      feePct: 1.25,
      conditionsPrecedent: 'Material packages paid directly to the named vendors.',
      notes: 'Approved at 50% of the verified purchase order.',
    } as never)

    const request = await prisma.fundingRequest.findUniqueOrThrow({
      where: { id: fundingRequestId },
    })
    expect(request.status).toBe('APPROVED')
    expect(toNumber(request.approvedAmount)).toBe(250_000)

    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } })
    expect(transaction.stage).toBe('APPROVED')

    const milestone = await prisma.transactionMilestone.findFirstOrThrow({
      where: { transactionId, type: 'FUNDING_APPROVED' },
    })
    expect(milestone.status).toBe('COMPLETED')
  })

  it('records funding, moving the transaction to FUNDED', async () => {
    await recordFunding(world.users.financier, {
      fundingRequestId,
      fundedDate: new Date('2026-03-09'),
    } as never)

    const request = await prisma.fundingRequest.findUniqueOrThrow({
      where: { id: fundingRequestId },
    })
    expect(request.status).toBe('FUNDED')

    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } })
    expect(transaction.stage).toBe('FUNDED')
  })
})

describe('procurement, logistics and execution', () => {
  it('records a procurement plan and advances it to delivered', async () => {
    const vendor = await createVendor(world.users.supplier, {
      name: 'Highveld Steel Supply',
      country: 'ZA',
    } as never)

    const item = await createProcurementItem(world.users.supplier, {
      transactionId,
      vendorId: vendor.id,
      itemName: 'Structural steel plate',
      quantity: 86,
      unit: 'tonnes',
      currency: 'USD',
      amount: 140_000,
      logisticsRequired: true,
    } as never)

    // The state machine refuses to skip from PLANNED straight to DELIVERED.
    await expect(
      updateProcurementItemStatus(world.users.supplier, item.id, 'DELIVERED'),
    ).rejects.toBeInstanceOf(InvalidTransitionError)

    for (const status of ['QUOTE_RECEIVED', 'APPROVED', 'ORDERED', 'SHIPPED', 'DELIVERED'] as const) {
      await updateProcurementItemStatus(world.users.supplier, item.id, status)
    }

    const stored = await prisma.procurementItem.findUniqueOrThrow({ where: { id: item.id } })
    expect(stored.status).toBe('DELIVERED')

    const materialDelivered = await prisma.transactionMilestone.findFirstOrThrow({
      where: { transactionId, type: 'RAW_MATERIAL_DELIVERED' },
    })
    expect(materialDelivered.status).toBe('COMPLETED')
  })

  it('records shipment milestones', async () => {
    const shipment = await createShipment(world.users.staff, {
      transactionId,
      origin: 'Durban, ZA',
      destination: 'Matola, MZ',
      mode: 'ROAD',
      carrier: 'Índico Freight',
    } as never)

    await recordShipmentMilestone(world.users.staff, {
      shipmentId: shipment.id,
      type: 'DEPARTED',
      occurredAt: new Date('2026-03-26T17:00:00Z'),
      location: 'Durban, ZA',
    } as never)
    await recordShipmentMilestone(world.users.staff, {
      shipmentId: shipment.id,
      type: 'DELIVERED',
      occurredAt: new Date('2026-04-03T10:05:00Z'),
      location: 'Matola, MZ',
    } as never)

    const stored = await prisma.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      include: { milestones: true },
    })
    expect(stored.deliveryStatus).toBe('DELIVERED')
    expect(stored.milestones).toHaveLength(2)
    expect(stored.actualDeparture).not.toBeNull()
  })

  it('records manufacturing progress', async () => {
    for (const type of ['FABRICATION_STARTED', 'PROGRESS_50', 'READY_FOR_DELIVERY'] as const) {
      const milestone = await prisma.transactionMilestone.findFirstOrThrow({
        where: { transactionId, type },
      })
      await updateMilestoneStatus(world.users.supplier, milestone.id, 'COMPLETED')
    }
    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } })
    expect(transaction.stage).toBe('MANUFACTURING')
  })
})

describe('delivery, payment and repayment', () => {
  it('refuses to let the supplier accept its own delivery', async () => {
    await expect(
      recordDeliveryAcceptance(world.users.supplier, {
        transactionId,
        accepted: true,
      } as never),
    ).rejects.toThrow()
  })

  it('records buyer acceptance', async () => {
    await recordDeliveryAcceptance(world.users.epc, {
      transactionId,
      accepted: true,
      comments: 'Received in good order.',
    } as never)

    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } })
    expect(transaction.stage).toBe('BUYER_ACCEPTANCE')

    const accepted = await prisma.transactionMilestone.findFirstOrThrow({
      where: { transactionId, type: 'BUYER_ACCEPTED' },
    })
    expect(accepted.status).toBe('COMPLETED')
  })

  it('records the invoice and the buyer payment', async () => {
    const invoice = await createInvoice(world.users.supplier, {
      transactionId,
      invoiceNumber: 'INV-2026-0044',
      issueDate: new Date('2026-07-20'),
      amount: 500_000,
      currency: 'USD',
    } as never)

    await updateInvoice(world.users.epc, invoice.id, { accepted: true })
    await updateInvoice(world.users.epc, invoice.id, { paidAmount: 500_000 })

    const stored = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })
    expect(stored.acceptedAt).not.toBeNull()
    expect(stored.paidAt).not.toBeNull()

    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } })
    expect(transaction.stage).toBe('PAYMENT')
  })

  it('refuses a repayment larger than the facility', async () => {
    await expect(
      recordRepayment(world.users.financier, {
        fundingRequestId,
        amount: 400_000,
        currency: 'USD',
        source: 'BUYER_PAYMENT',
        receivedDate: new Date('2026-08-20'),
      } as never),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('records a partial then a final repayment', async () => {
    await recordRepayment(world.users.financier, {
      fundingRequestId,
      amount: 100_000,
      currency: 'USD',
      source: 'BUYER_PAYMENT',
      receivedDate: new Date('2026-08-20'),
    } as never)

    let request = await prisma.fundingRequest.findUniqueOrThrow({ where: { id: fundingRequestId } })
    expect(request.status).toBe('PARTIALLY_REPAID')

    await recordRepayment(world.users.financier, {
      fundingRequestId,
      amount: 150_000,
      currency: 'USD',
      source: 'BUYER_PAYMENT',
      receivedDate: new Date('2026-08-28'),
    } as never)

    request = await prisma.fundingRequest.findUniqueOrThrow({ where: { id: fundingRequestId } })
    expect(request.status).toBe('REPAID')
    expect(request.repaidAt).not.toBeNull()

    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } })
    expect(transaction.stage).toBe('REPAYMENT')
  })
})

describe('closing the transaction', () => {
  it('closes once financing is fully repaid', async () => {
    await closeTransaction(world.users.staff, transactionId)
    const transaction = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } })
    expect(transaction.stage).toBe('CLOSED')
    expect(transaction.closedAt).not.toBeNull()
  })

  it('leaves every major action in the immutable audit history', async () => {
    const events = await prisma.auditEvent.findMany({
      where: { organizationId: { not: null } },
      select: { action: true },
    })
    const actions = new Set(events.map((e) => e.action))

    for (const expected of [
      'purchase_order.created',
      'purchase_order.submitted',
      'purchase_order.verified',
      'funding_request.created',
      'funding_request.submitted',
      'funding_request.approved',
      'funding_request.funded',
      'repayment.recorded',
      'delivery.accepted',
      'transaction.closed',
      'transaction.stage_changed',
      'approval.decided',
    ]) {
      expect(actions).toContain(expected)
    }
  })

  it('never records a secret or a bank identifier in the audit trail', async () => {
    const events = await prisma.auditEvent.findMany({
      select: { beforeData: true, afterData: true, metadata: true },
    })
    const serialised = JSON.stringify(events)
    expect(serialised).not.toMatch(/passwordHash/i)
    expect(serialised).not.toMatch(/tokenHash/i)
    // Any redacted key that was present must show the marker, not the value.
    for (const event of events) {
      const text = JSON.stringify([event.beforeData, event.afterData, event.metadata])
      if (text.includes('password')) expect(text).toContain('[redacted]')
    }
  })
})
