import type { OrganizationType, PrismaClient, Role } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import type { Actor } from '@/lib/rbac'

/**
 * Test fixtures.
 *
 * Deliberately thin: each factory writes real rows so the tests exercise the
 * same queries, constraints and scope predicates the application uses.
 */

let counter = 0
function unique(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}-${randomUUID().slice(0, 8)}`
}

export async function makeOrganization(
  prisma: PrismaClient,
  type: OrganizationType,
  overrides: Partial<{ legalName: string; country: string; accountStatus: 'ACTIVE' | 'PENDING_REVIEW' | 'SUSPENDED' }> = {},
) {
  return prisma.organization.create({
    data: {
      reference: unique('ORG'),
      type,
      legalName: overrides.legalName ?? unique(`${type} Ltd`),
      country: overrides.country ?? 'MZ',
      accountStatus: overrides.accountStatus ?? 'ACTIVE',
      kycStatus: 'VERIFIED',
    },
  })
}

export async function makeUser(
  prisma: PrismaClient,
  organizationId: string,
  role: Role,
): Promise<Actor> {
  const email = `${unique('user')}@test.example`
  const user = await prisma.user.create({
    data: {
      email,
      name: `Test ${role}`,
      // Never a real password: these accounts are never signed in to.
      passwordHash: 'not-a-usable-hash',
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      memberships: { create: { organizationId, role, isPrimary: true } },
    },
  })

  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: { type: true, legalName: true },
  })

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role,
    organizationId,
    organizationType: organization.type,
    organizationName: organization.legalName,
  }
}

export async function makeProject(
  prisma: PrismaClient,
  projectOwnerId: string,
  epcId?: string,
) {
  return prisma.project.create({
    data: {
      reference: unique('PRJ'),
      name: unique('Project'),
      projectOwnerId,
      epcId: epcId ?? null,
      country: 'MZ',
      status: 'ACTIVE',
      currency: 'USD',
    },
  })
}

export interface PurchaseOrderFixture {
  projectId: string
  supplierId: string
  buyerId: string
  value?: number
  status?: 'DRAFT' | 'VERIFIED' | 'SUBMITTED' | 'VERIFICATION_REQUESTED' | 'REJECTED'
}

export async function makePurchaseOrder(prisma: PrismaClient, fixture: PurchaseOrderFixture) {
  return prisma.purchaseOrder.create({
    data: {
      poNumber: unique('PO'),
      projectId: fixture.projectId,
      supplierId: fixture.supplierId,
      buyerId: fixture.buyerId,
      issueDate: new Date('2026-01-15'),
      currency: 'USD',
      value: fixture.value ?? 500_000,
      scopeDescription: 'Fabrication and supply of structural steel.',
      status: fixture.status ?? 'DRAFT',
    },
  })
}

let transactionSeq = 0

export async function makeTransaction(
  prisma: PrismaClient,
  purchaseOrderId: string,
  stage: 'PURCHASE_ORDER' | 'VERIFICATION' | 'FINANCING_REVIEW' | 'FUNDED' = 'PURCHASE_ORDER',
) {
  const po = await prisma.purchaseOrder.findUniqueOrThrow({ where: { id: purchaseOrderId } })
  transactionSeq += 1
  return prisma.transaction.create({
    data: {
      number: `MCONNECT-2026-${String(900_000 + transactionSeq).padStart(6, '0')}`,
      purchaseOrderId,
      projectId: po.projectId,
      supplierId: po.supplierId,
      buyerId: po.buyerId,
      stage,
    },
  })
}

/** A complete, isolated world: one supplier, one EPC, one owner, one bank. */
export async function makeWorld(prisma: PrismaClient) {
  const [supplierOrg, epcOrg, ownerOrg, bankOrg, aiOrg] = await Promise.all([
    makeOrganization(prisma, 'SUPPLIER'),
    makeOrganization(prisma, 'EPC'),
    makeOrganization(prisma, 'PROJECT_OWNER'),
    makeOrganization(prisma, 'FINANCIAL_INSTITUTION'),
    makeOrganization(prisma, 'AI_LOGISTIX'),
  ])

  const [supplier, epc, owner, financier, staff] = await Promise.all([
    makeUser(prisma, supplierOrg.id, 'SUPPLIER'),
    makeUser(prisma, epcOrg.id, 'EPC'),
    makeUser(prisma, ownerOrg.id, 'PROJECT_OWNER'),
    makeUser(prisma, bankOrg.id, 'FINANCIER'),
    makeUser(prisma, aiOrg.id, 'AI_LOGISTIX_ADMIN'),
  ])

  const project = await makeProject(prisma, ownerOrg.id, epcOrg.id)

  return {
    orgs: { supplier: supplierOrg, epc: epcOrg, owner: ownerOrg, bank: bankOrg, ai: aiOrg },
    users: { supplier, epc, owner, financier, staff },
    project,
  }
}
