import type { Prisma } from '@prisma/client'
import type { z } from 'zod'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { reference } from '@/lib/ids'
import { NotFoundError, isStaff, requirePermission, type Actor } from '@/lib/rbac'
import type {
  bankingRelationshipSchema,
  organizationProfileSchema,
  organizationStatusSchema,
  supplierProfileSchema,
} from '@/lib/validation'
import { requireOrganizationScope } from '@/server/services/access'

export type OrganizationProfileInput = z.infer<typeof organizationProfileSchema>
export type SupplierProfileInput = z.infer<typeof supplierProfileSchema>
export type BankingRelationshipInput = z.infer<typeof bankingRelationshipSchema>
export type OrganizationStatusInput = z.infer<typeof organizationStatusSchema>

export async function getOrganization(actor: Actor, organizationId?: string) {
  const id = organizationId ?? actor.organizationId
  await requireOrganizationScope(actor, id)

  const organization = await prisma.organization.findUnique({
    where: { id },
    include: {
      supplierProfile: true,
      bankingRelationships: { orderBy: { createdAt: 'asc' } },
      memberships: {
        where: { isActive: true },
        include: { user: { select: { id: true, name: true, email: true, jobTitle: true, status: true, lastLoginAt: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!organization) throw new NotFoundError('Organization not found.')
  return organization
}

export async function updateOrganizationProfile(
  actor: Actor,
  organizationId: string,
  input: OrganizationProfileInput,
): Promise<void> {
  const ownOrganization = organizationId === actor.organizationId
  requirePermission(actor, ownOrganization ? 'organization:update:own' : 'organization:manage:any')
  await requireOrganizationScope(actor, organizationId)

  const before = await prisma.organization.findUnique({ where: { id: organizationId } })
  if (!before) throw new NotFoundError('Organization not found.')

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      legalName: input.legalName,
      tradingName: input.tradingName || null,
      country: input.country,
      registrationNumber: input.registrationNumber || null,
      taxId: input.taxId || null,
      addressLine1: input.addressLine1 || null,
      addressLine2: input.addressLine2 || null,
      city: input.city || null,
      stateProvince: input.stateProvince || null,
      postalCode: input.postalCode || null,
      website: input.website || null,
      primaryContactName: input.primaryContactName || null,
      primaryContactEmail: input.primaryContactEmail || null,
      phone: input.phone || null,
      email: input.email || null,
      incorporationDate: input.incorporationDate ?? null,
      industry: input.industry || null,
      employeeCount: input.employeeCount ?? null,
      annualRevenueRange: input.annualRevenueRange ?? null,
      ownershipDescription: input.ownershipDescription || null,
      localContentClass: input.localContentClass ?? undefined,
      preferredCurrency: input.preferredCurrency ?? undefined,
    },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
    entityType: 'Organization',
    entityId: organizationId,
    before: { legalName: before.legalName, country: before.country, industry: before.industry },
    after: { legalName: input.legalName, country: input.country, industry: input.industry },
  })
}

export async function updateSupplierProfile(
  actor: Actor,
  organizationId: string,
  input: SupplierProfileInput,
): Promise<void> {
  const ownOrganization = organizationId === actor.organizationId
  requirePermission(actor, ownOrganization ? 'organization:update:own' : 'organization:manage:any')
  await requireOrganizationScope(actor, organizationId)

  const data = {
    capabilities: input.capabilities || null,
    certifications: input.certifications || null,
    qualityCertifications: input.qualityCertifications || null,
    healthSafetyCertifications: input.healthSafetyCertifications || null,
    equipment: input.equipment || null,
    facilities: input.facilities || null,
    projectExperience: input.projectExperience || null,
    customerReferences: input.customerReferences || null,
    maximumContractCapacity: input.maximumContractCapacity ?? null,
    maximumContractCurrency: input.maximumContractCurrency ?? 'USD',
    typicalWorkingCapitalNeed: input.typicalWorkingCapitalNeed ?? null,
    hasUsdAccess: input.hasUsdAccess ?? false,
    hasExistingCreditFacilities: input.hasExistingCreditFacilities ?? false,
    currentLenders: input.currentLenders || null,
    insuranceDescription: input.insuranceDescription || null,
  }

  await prisma.supplierProfile.upsert({
    where: { organizationId },
    create: { organizationId, ...data },
    update: data,
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
    entityType: 'SupplierProfile',
    entityId: organizationId,
    after: { capabilitiesProvided: Boolean(input.capabilities) },
  })
}

export async function addBankingRelationship(
  actor: Actor,
  organizationId: string,
  input: BankingRelationshipInput,
): Promise<void> {
  const ownOrganization = organizationId === actor.organizationId
  requirePermission(actor, ownOrganization ? 'organization:update:own' : 'organization:manage:any')
  await requireOrganizationScope(actor, organizationId)

  await prisma.bankingRelationship.create({
    data: {
      organizationId,
      institutionName: input.institutionName,
      branch: input.branch || null,
      accountCurrency: input.accountCurrency,
      maskedAccountIdentifier: input.maskedAccountIdentifier || null,
      relationshipManagerName: input.relationshipManagerName || null,
      relationshipManagerEmail: input.relationshipManagerEmail || null,
      relationshipManagerPhone: input.relationshipManagerPhone || null,
    },
  })

  // Deliberately records only the institution name — never the identifier.
  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
    entityType: 'BankingRelationship',
    entityId: organizationId,
    after: { institutionName: input.institutionName, accountCurrency: input.accountCurrency },
  })
}

export async function removeBankingRelationship(actor: Actor, id: string): Promise<void> {
  const relationship = await prisma.bankingRelationship.findUnique({
    where: { id },
    select: { organizationId: true, institutionName: true },
  })
  if (!relationship) throw new NotFoundError('Banking relationship not found.')

  const ownOrganization = relationship.organizationId === actor.organizationId
  requirePermission(actor, ownOrganization ? 'organization:update:own' : 'organization:manage:any')
  await requireOrganizationScope(actor, relationship.organizationId)

  await prisma.bankingRelationship.delete({ where: { id } })
  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.ORGANIZATION_UPDATED,
    entityType: 'BankingRelationship',
    entityId: relationship.organizationId,
    before: { institutionName: relationship.institutionName },
    metadata: { removed: true },
  })
}

export async function updateOrganizationStatus(
  actor: Actor,
  input: OrganizationStatusInput,
): Promise<void> {
  requirePermission(actor, 'organization:manage:any')

  const before = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, accountStatus: true, kycStatus: true, legalName: true },
  })
  if (!before) throw new NotFoundError('Organization not found.')

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      accountStatus: input.accountStatus,
      kycStatus: input.kycStatus ?? undefined,
      kycNotes: input.notes ?? undefined,
    },
  })

  // Suspending an organization takes its users offline on their next request.
  if (input.accountStatus !== 'ACTIVE') {
    await prisma.user.updateMany({
      where: { memberships: { some: { organizationId: input.organizationId } }, status: 'ACTIVE' },
      data: { status: input.accountStatus === 'SUSPENDED' ? 'SUSPENDED' : 'PENDING_REVIEW' },
    })
  }

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.ORGANIZATION_STATUS_CHANGED,
    entityType: 'Organization',
    entityId: input.organizationId,
    before: { accountStatus: before.accountStatus, kycStatus: before.kycStatus },
    after: { accountStatus: input.accountStatus, kycStatus: input.kycStatus, notes: input.notes },
  })
}

export async function listOrganizations(
  actor: Actor,
  options: { type?: Prisma.OrganizationWhereInput['type']; search?: string; take?: number } = {},
) {
  requirePermission(actor, 'organization:read:any')
  return prisma.organization.findMany({
    where: {
      ...(options.type ? { type: options.type } : {}),
      ...(options.search
        ? {
            OR: [
              { legalName: { contains: options.search, mode: 'insensitive' } },
              { tradingName: { contains: options.search, mode: 'insensitive' } },
              { reference: { contains: options.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: {
      _count: { select: { memberships: true, transactionsAsSupplier: true } },
    },
    orderBy: [{ accountStatus: 'asc' }, { legalName: 'asc' }],
    take: options.take ?? 200,
  })
}

/** Active financial institutions AI Logistix can route a request to. */
export async function activeFinanciers(actor: Actor) {
  if (!isStaff(actor)) return []
  return prisma.organization.findMany({
    where: { type: 'FINANCIAL_INSTITUTION', accountStatus: 'ACTIVE' },
    select: { id: true, legalName: true, tradingName: true, country: true },
    orderBy: { legalName: 'asc' },
  })
}

export function newOrganizationReference(): string {
  return reference('ORG')
}
