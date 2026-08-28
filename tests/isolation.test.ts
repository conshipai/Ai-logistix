import { PrismaClient } from '@prisma/client'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AuthorizationError, NotFoundError } from '@/lib/rbac'
import { requireTransactionScope, transactionScopeWhere } from '@/server/services/access'
import { listTransactions } from '@/server/services/transactions'
import { getPurchaseOrder, verifyPurchaseOrder } from '@/server/services/purchase-orders'
import { authorizeDownload, listTransactionDocuments } from '@/server/services/documents'
import { financierPipeline } from '@/server/services/funding'
import { truncateAll } from './setup'
import {
  makeOrganization,
  makePurchaseOrder,
  makeTransaction,
  makeUser,
  makeWorld,
} from './factories'

/**
 * Organization isolation.
 *
 * These are the tests that matter most: they assert that one organization
 * cannot reach another's transactions, purchase orders or documents, even when
 * it knows the identifier. Every out-of-scope read must report NotFound rather
 * than Forbidden, so an identifier cannot be probed for existence.
 */

const prisma = new PrismaClient()

let alpha: Awaited<ReturnType<typeof makeWorld>>
let beta: Awaited<ReturnType<typeof makeWorld>>
let alphaTransactionId: string
let betaTransactionId: string
let alphaDocumentId: string

beforeAll(async () => {
  await truncateAll(prisma)

  alpha = await makeWorld(prisma)
  beta = await makeWorld(prisma)

  const alphaPo = await makePurchaseOrder(prisma, {
    projectId: alpha.project.id,
    supplierId: alpha.orgs.supplier.id,
    buyerId: alpha.orgs.epc.id,
    status: 'VERIFICATION_REQUESTED',
  })
  const betaPo = await makePurchaseOrder(prisma, {
    projectId: beta.project.id,
    supplierId: beta.orgs.supplier.id,
    buyerId: beta.orgs.epc.id,
    status: 'VERIFICATION_REQUESTED',
  })

  alphaTransactionId = (await makeTransaction(prisma, alphaPo.id, 'VERIFICATION')).id
  betaTransactionId = (await makeTransaction(prisma, betaPo.id, 'VERIFICATION')).id

  const document = await prisma.document.create({
    data: {
      organizationId: alpha.orgs.supplier.id,
      transactionId: alphaTransactionId,
      category: 'PURCHASE_ORDER',
      visibility: 'TRANSACTION_PARTIES',
      fileName: 'alpha-po.pdf',
      contentType: 'application/pdf',
      sizeBytes: 1024,
      storageKey: `org/${alpha.orgs.supplier.id}/alpha/po.pdf`,
      uploadedById: alpha.users.supplier.userId,
    },
  })
  alphaDocumentId = document.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('a supplier cannot see another supplier’s transactions', () => {
  it('excludes them from the list', async () => {
    const { rows } = await listTransactions(beta.users.supplier)
    expect(rows.map((r) => r.id)).toContain(betaTransactionId)
    expect(rows.map((r) => r.id)).not.toContain(alphaTransactionId)
  })

  it('reports NotFound — never Forbidden — when the id is guessed', async () => {
    await expect(
      requireTransactionScope(beta.users.supplier, alphaTransactionId),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('composes a scope predicate that excludes them at the database', async () => {
    const rows = await prisma.transaction.findMany({
      where: { id: alphaTransactionId, ...transactionScopeWhere(beta.users.supplier) },
    })
    expect(rows).toHaveLength(0)
  })
})

describe('a supplier cannot see another supplier’s purchase order', () => {
  it('reports NotFound for an out-of-scope purchase order', async () => {
    const alphaPo = await prisma.purchaseOrder.findFirstOrThrow({
      where: { supplierId: alpha.orgs.supplier.id },
    })
    await expect(getPurchaseOrder(beta.users.supplier, alphaPo.id)).rejects.toBeInstanceOf(
      NotFoundError,
    )
    await expect(getPurchaseOrder(alpha.users.supplier, alphaPo.id)).resolves.toBeTruthy()
  })
})

describe('a supplier cannot verify a purchase order', () => {
  it('refuses even its own purchase order', async () => {
    const po = await prisma.purchaseOrder.findFirstOrThrow({
      where: { supplierId: alpha.orgs.supplier.id },
    })
    await expect(
      verifyPurchaseOrder(alpha.users.supplier, {
        purchaseOrderId: po.id,
        decision: 'APPROVED',
        method: 'PLATFORM_REVIEW',
        valueConfirmed: true,
        buyerConfirmed: true,
        supplierConfirmed: true,
        paymentTermsConfirmed: true,
        poIsActiveConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })

  it('refuses even when the supplier organization holds a verifying role', async () => {
    // A supplier organization whose user was mistakenly given the EPC role
    // still cannot verify: the check is on the PO's supplier, not the role.
    const rogue = await makeUser(prisma, alpha.orgs.supplier.id, 'EPC')
    const po = await prisma.purchaseOrder.findFirstOrThrow({
      where: { supplierId: alpha.orgs.supplier.id },
    })
    await expect(
      verifyPurchaseOrder(rogue, {
        purchaseOrderId: po.id,
        decision: 'APPROVED',
        method: 'PLATFORM_REVIEW',
        valueConfirmed: true,
        buyerConfirmed: true,
        supplierConfirmed: true,
        paymentTermsConfirmed: true,
        poIsActiveConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(AuthorizationError)
  })
})

describe('an EPC can only verify purchase orders assigned to it', () => {
  it('reports NotFound for another EPC’s purchase order', async () => {
    const alphaPo = await prisma.purchaseOrder.findFirstOrThrow({
      where: { supplierId: alpha.orgs.supplier.id },
    })
    await expect(
      verifyPurchaseOrder(beta.users.epc, {
        purchaseOrderId: alphaPo.id,
        decision: 'APPROVED',
        method: 'PLATFORM_REVIEW',
        valueConfirmed: true,
        buyerConfirmed: true,
        supplierConfirmed: true,
        paymentTermsConfirmed: true,
        poIsActiveConfirmed: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('permits the EPC named on the purchase order', async () => {
    const alphaPo = await prisma.purchaseOrder.findFirstOrThrow({
      where: { supplierId: alpha.orgs.supplier.id },
    })
    await expect(
      verifyPurchaseOrder(alpha.users.epc, {
        purchaseOrderId: alphaPo.id,
        decision: 'APPROVED',
        method: 'PLATFORM_REVIEW',
        valueConfirmed: true,
        buyerConfirmed: true,
        supplierConfirmed: true,
        paymentTermsConfirmed: true,
        poIsActiveConfirmed: true,
      }),
    ).resolves.toBeUndefined()
  })
})

describe('a financier sees only transactions shared with it', () => {
  it('sees nothing before a share is granted', async () => {
    const { rows } = await listTransactions(beta.users.financier)
    expect(rows).toHaveLength(0)
    await expect(
      requireTransactionScope(beta.users.financier, betaTransactionId),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('sees the transaction once shared, and only that one', async () => {
    await prisma.transactionAccess.create({
      data: { transactionId: betaTransactionId, organizationId: beta.orgs.bank.id },
    })

    const { rows } = await listTransactions(beta.users.financier)
    expect(rows.map((r) => r.id)).toEqual([betaTransactionId])
    await expect(
      requireTransactionScope(beta.users.financier, alphaTransactionId),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('loses access again when the share is revoked', async () => {
    await prisma.transactionAccess.updateMany({
      where: { transactionId: betaTransactionId, organizationId: beta.orgs.bank.id },
      data: { revokedAt: new Date() },
    })
    const { rows } = await listTransactions(beta.users.financier)
    expect(rows).toHaveLength(0)

    // Restore for the pipeline assertion below.
    await prisma.transactionAccess.updateMany({
      where: { transactionId: betaTransactionId, organizationId: beta.orgs.bank.id },
      data: { revokedAt: null },
    })
  })

  it('shows only its own institution’s pipeline', async () => {
    const pipeline = await financierPipeline(beta.users.financier)
    for (const request of pipeline) {
      expect(request.transactionId).toBe(betaTransactionId)
    }
  })
})

describe('unauthorized document downloads fail', () => {
  it('refuses a document on a transaction the actor cannot reach', async () => {
    await expect(
      authorizeDownload(beta.users.supplier, alphaDocumentId),
    ).rejects.toBeInstanceOf(NotFoundError)
  })

  it('refuses a RESTRICTED document to a counterparty on the same transaction', async () => {
    const restricted = await prisma.document.create({
      data: {
        organizationId: alpha.orgs.supplier.id,
        transactionId: alphaTransactionId,
        category: 'AUDITED_FINANCIALS',
        visibility: 'RESTRICTED',
        fileName: 'alpha-financials.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
        storageKey: `org/${alpha.orgs.supplier.id}/alpha/financials.pdf`,
        uploadedById: alpha.users.supplier.userId,
      },
    })

    // The EPC is a party to this transaction but must not see a restricted doc.
    await expect(authorizeDownload(alpha.users.epc, restricted.id)).rejects.toBeInstanceOf(
      NotFoundError,
    )
    const visible = await listTransactionDocuments(alpha.users.epc, alphaTransactionId)
    expect(visible.map((d) => d.id)).not.toContain(restricted.id)
  })

  it('refuses a soft-deleted document even to its owner', async () => {
    const deleted = await prisma.document.create({
      data: {
        organizationId: alpha.orgs.supplier.id,
        transactionId: alphaTransactionId,
        category: 'OTHER',
        visibility: 'TRANSACTION_PARTIES',
        fileName: 'removed.pdf',
        contentType: 'application/pdf',
        sizeBytes: 10,
        storageKey: `org/${alpha.orgs.supplier.id}/alpha/removed.pdf`,
        uploadedById: alpha.users.supplier.userId,
        deletedAt: new Date(),
      },
    })
    await expect(authorizeDownload(alpha.users.supplier, deleted.id)).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('records an audit event when a permitted download is authorized', async () => {
    await authorizeDownload(alpha.users.epc, alphaDocumentId)
    const events = await prisma.auditEvent.findMany({
      where: { action: 'document.viewed', entityId: alphaDocumentId },
    })
    expect(events.length).toBeGreaterThan(0)
    expect(events[0]!.actorUserId).toBe(alpha.users.epc.userId)
  })
})

describe('AI Logistix staff can reach every transaction', () => {
  it('lists transactions from both isolated worlds', async () => {
    const { rows } = await listTransactions(alpha.users.staff)
    const ids = rows.map((r) => r.id)
    expect(ids).toContain(alphaTransactionId)
    expect(ids).toContain(betaTransactionId)
  })

  it('resolves scope for a transaction from an unrelated world', async () => {
    const scope = await requireTransactionScope(alpha.users.staff, betaTransactionId)
    expect(scope.isStaff).toBe(true)
  })
})

describe('organization membership enforcement', () => {
  it('is what determines reach, not the role alone', async () => {
    // A user with the SUPPLIER role in an organization that is party to no
    // transaction reaches nothing, despite holding every supplier capability.
    const strandedOrg = await makeOrganization(prisma, 'SUPPLIER')
    const stranded = await makeUser(prisma, strandedOrg.id, 'SUPPLIER')
    const { rows } = await listTransactions(stranded)
    expect(rows).toHaveLength(0)
  })
})
