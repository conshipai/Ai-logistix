import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { AuthorizationError, NotFoundError, isStaff, type Actor } from '@/lib/rbac'

/**
 * Record scoping — organization isolation.
 *
 * Capability checks (`can`) answer "may this role ever do this?". The functions
 * here answer the second, independent question: "is this specific record within
 * the actor's reach?".
 *
 * An organization reaches a transaction only when it is the supplier, the
 * buyer, the project owner, or has been explicitly granted access through a
 * TransactionAccess row. AI Logistix staff reach everything, by design: they are
 * the transaction coordinator.
 *
 * Out-of-scope records raise NotFoundError rather than AuthorizationError, so
 * an attacker cannot use the error to confirm that an identifier exists.
 */

export interface TransactionScope {
  transactionId: string
  isSupplier: boolean
  isBuyer: boolean
  isProjectOwner: boolean
  isFinancier: boolean
  isStaff: boolean
  isSharedObserver: boolean
  readOnly: boolean
}

/**
 * The Prisma `where` fragment restricting a transaction query to what the actor
 * may see. Composed into every list query rather than filtering after the fact,
 * so an out-of-scope row never leaves the database.
 */
export function transactionScopeWhere(actor: Actor): Prisma.TransactionWhereInput {
  if (isStaff(actor)) return {}
  return {
    OR: [
      { supplierId: actor.organizationId },
      { buyerId: actor.organizationId },
      { project: { projectOwnerId: actor.organizationId } },
      { project: { epcId: actor.organizationId } },
      { access: { some: { organizationId: actor.organizationId, revokedAt: null } } },
    ],
  }
}

/** Same idea for purchase orders, which are reachable before a transaction exists. */
export function purchaseOrderScopeWhere(actor: Actor): Prisma.PurchaseOrderWhereInput {
  if (isStaff(actor)) return {}
  return {
    OR: [
      { supplierId: actor.organizationId },
      { buyerId: actor.organizationId },
      { project: { projectOwnerId: actor.organizationId } },
      { project: { epcId: actor.organizationId } },
      {
        transaction: {
          access: { some: { organizationId: actor.organizationId, revokedAt: null } },
        },
      },
    ],
  }
}

/**
 * Loads a transaction the actor is entitled to see and describes their
 * relationship to it. Throws NotFoundError when the transaction does not exist
 * or is out of scope — the two cases are indistinguishable to the caller.
 */
export async function requireTransactionScope(
  actor: Actor,
  transactionId: string,
): Promise<TransactionScope> {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, ...transactionScopeWhere(actor) },
    select: {
      id: true,
      supplierId: true,
      buyerId: true,
      project: { select: { projectOwnerId: true, epcId: true } },
      access: {
        where: { organizationId: actor.organizationId, revokedAt: null },
        select: { readOnly: true },
      },
    },
  })
  if (!transaction) throw new NotFoundError('Transaction not found.')

  const grant = transaction.access[0]
  const staff = isStaff(actor)
  const isSupplier = transaction.supplierId === actor.organizationId
  const isBuyer =
    transaction.buyerId === actor.organizationId ||
    transaction.project.epcId === actor.organizationId
  const isProjectOwner = transaction.project.projectOwnerId === actor.organizationId
  const isFinancier = actor.organizationType === 'FINANCIAL_INSTITUTION' && Boolean(grant)
  const isSharedObserver = Boolean(grant) && !isSupplier && !isBuyer && !isProjectOwner

  return {
    transactionId: transaction.id,
    isSupplier,
    isBuyer,
    isProjectOwner,
    isFinancier,
    isStaff: staff,
    isSharedObserver,
    readOnly: actor.role === 'VIEWER' || (grant?.readOnly ?? false),
  }
}

/** Asserts the actor may write to the transaction at all. */
export function assertWritable(scope: TransactionScope): void {
  if (scope.readOnly) {
    throw new AuthorizationError('Your access to this transaction is read-only.')
  }
}

/**
 * Organization scoping. An actor reads their own organization freely; reading
 * another organization's record requires staff-level access.
 */
export async function requireOrganizationScope(
  actor: Actor,
  organizationId: string,
): Promise<void> {
  if (organizationId === actor.organizationId) return
  if (isStaff(actor)) {
    const exists = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    })
    if (!exists) throw new NotFoundError('Organization not found.')
    return
  }
  throw new NotFoundError('Organization not found.')
}

/**
 * The counterparties an actor is allowed to name when creating records —
 * for example the buyers a supplier can raise a PO against. Restricting the
 * option list is a convenience; the create paths re-check independently.
 */
export async function selectableBuyers(actor: Actor) {
  if (isStaff(actor)) {
    return prisma.organization.findMany({
      where: { type: { in: ['EPC', 'PROJECT_OWNER'] }, accountStatus: 'ACTIVE' },
      select: { id: true, legalName: true, tradingName: true, type: true },
      orderBy: { legalName: 'asc' },
    })
  }
  return prisma.organization.findMany({
    where: { type: { in: ['EPC', 'PROJECT_OWNER'] }, accountStatus: 'ACTIVE' },
    select: { id: true, legalName: true, tradingName: true, type: true },
    orderBy: { legalName: 'asc' },
  })
}

/** Projects an actor may attach a purchase order to. */
export function projectScopeWhere(actor: Actor): Prisma.ProjectWhereInput {
  if (isStaff(actor)) return {}
  if (actor.organizationType === 'SUPPLIER') {
    // Suppliers see active projects so they can attach an incoming PO. Project
    // records carry no commercially sensitive counterparty data.
    return { status: { in: ['PLANNED', 'ACTIVE'] } }
  }
  return {
    OR: [
      { projectOwnerId: actor.organizationId },
      { epcId: actor.organizationId },
      { purchaseOrders: { some: { supplierId: actor.organizationId } } },
    ],
  }
}

/** Every organization the actor may resolve by id when populating a form. */
export async function organizationOptions(
  actor: Actor,
  types?: Prisma.OrganizationWhereInput['type'],
) {
  if (!isStaff(actor)) throw new AuthorizationError()
  return prisma.organization.findMany({
    where: types ? { type: types } : {},
    select: { id: true, legalName: true, tradingName: true, type: true, accountStatus: true },
    orderBy: { legalName: 'asc' },
  })
}
