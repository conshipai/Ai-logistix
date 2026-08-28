import { OrganizationType, Role } from '@prisma/client'

/**
 * Role-based access control.
 *
 * Two independent checks gate every server action and route handler:
 *
 *  1. `can(actor, permission)` — does this role hold the capability at all?
 *  2. a scope check (see `src/server/services/access.ts`) — is this specific
 *     record within the actor's organization or explicitly shared with it?
 *
 * Passing (1) alone is never sufficient. Hiding a button in the UI is never
 * sufficient either; the server repeats both checks on every mutation.
 */

export type Permission =
  // organizations & users
  | 'organization:read:own'
  | 'organization:read:any'
  | 'organization:update:own'
  | 'organization:manage:any'
  | 'user:manage:own-org'
  | 'user:manage:any'
  | 'registration:review'
  // projects
  | 'project:read'
  | 'project:manage'
  // purchase orders
  | 'po:create'
  | 'po:update:own'
  | 'po:submit'
  | 'po:verify'
  | 'po:read'
  // transactions
  | 'transaction:read'
  | 'transaction:review'
  | 'transaction:share'
  | 'transaction:close'
  // financing
  | 'funding:create'
  | 'funding:submit'
  | 'funding:review:internal'
  | 'funding:decide'
  | 'funding:record-funding'
  | 'funding:record-repayment'
  | 'disbursement:manage'
  // execution
  | 'procurement:manage'
  | 'shipment:manage'
  | 'milestone:manage'
  | 'delivery:accept'
  | 'invoice:manage'
  // collaboration
  | 'document:upload'
  | 'document:read'
  | 'document:delete'
  | 'comment:create'
  | 'rfi:create'
  | 'rfi:respond'
  | 'rfi:resolve'
  // platform
  | 'audit:read'
  | 'analytics:read:own'
  | 'analytics:read:program'
  | 'settings:manage'

const SUPPLIER: Permission[] = [
  'organization:read:own',
  'organization:update:own',
  'user:manage:own-org',
  'project:read',
  'po:create',
  'po:update:own',
  'po:submit',
  'po:read',
  'transaction:read',
  'funding:create',
  'funding:submit',
  'procurement:manage',
  'milestone:manage',
  'invoice:manage',
  'document:upload',
  'document:read',
  'comment:create',
  'rfi:respond',
  'analytics:read:own',
]

const EPC: Permission[] = [
  'organization:read:own',
  'organization:update:own',
  'user:manage:own-org',
  'project:read',
  'po:read',
  'po:verify',
  'transaction:read',
  'delivery:accept',
  // Accepting and paying a supplier invoice is the buyer's action; the invoice
  // service separately refuses to let a supplier certify its own invoice.
  'invoice:manage',
  'document:upload',
  'document:read',
  'comment:create',
  'rfi:create',
  'rfi:resolve',
  'analytics:read:own',
]

const PROJECT_OWNER: Permission[] = [
  ...EPC,
  'project:manage',
  'analytics:read:program',
]

const FINANCIER: Permission[] = [
  'organization:read:own',
  'organization:update:own',
  'user:manage:own-org',
  'transaction:read',
  'po:read',
  'funding:decide',
  'funding:record-funding',
  'funding:record-repayment',
  'document:read',
  'document:upload',
  'comment:create',
  'rfi:create',
  'rfi:resolve',
  'analytics:read:own',
]

const AI_LOGISTIX_OPERATIONS: Permission[] = [
  'organization:read:any',
  'organization:read:own',
  'organization:update:own',
  'organization:manage:any',
  'user:manage:own-org',
  'registration:review',
  'project:read',
  'project:manage',
  'po:read',
  'po:create',
  'po:update:own',
  'po:submit',
  'transaction:read',
  'transaction:review',
  'transaction:share',
  'transaction:close',
  'funding:review:internal',
  'funding:record-funding',
  'funding:record-repayment',
  'disbursement:manage',
  'procurement:manage',
  'shipment:manage',
  'milestone:manage',
  'invoice:manage',
  'document:upload',
  'document:read',
  'comment:create',
  'rfi:create',
  'rfi:respond',
  'rfi:resolve',
  'audit:read',
  'analytics:read:own',
  'analytics:read:program',
]

/**
 * Full administration. The only capabilities an administrator holds beyond
 * operations are the ones that change security posture: user administration
 * across organizations, document deletion, and platform settings.
 */
const AI_LOGISTIX_ADMIN: Permission[] = [
  ...AI_LOGISTIX_OPERATIONS,
  'user:manage:any',
  'document:delete',
  'settings:manage',
]

const VIEWER: Permission[] = [
  'organization:read:own',
  'transaction:read',
  'po:read',
  'document:read',
  'analytics:read:own',
]

export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  SUPPLIER: new Set(SUPPLIER),
  EPC: new Set(EPC),
  PROJECT_OWNER: new Set(PROJECT_OWNER),
  FINANCIER: new Set(FINANCIER),
  AI_LOGISTIX_OPERATIONS: new Set(AI_LOGISTIX_OPERATIONS),
  AI_LOGISTIX_ADMIN: new Set(AI_LOGISTIX_ADMIN),
  VIEWER: new Set(VIEWER),
}

export interface Actor {
  userId: string
  email: string
  name: string
  role: Role
  organizationId: string
  organizationType: OrganizationType
  organizationName: string
}

export function can(actor: Pick<Actor, 'role'>, permission: Permission): boolean {
  return ROLE_PERMISSIONS[actor.role]?.has(permission) ?? false
}

export function isStaff(actor: Pick<Actor, 'role'>): boolean {
  return actor.role === 'AI_LOGISTIX_ADMIN' || actor.role === 'AI_LOGISTIX_OPERATIONS'
}

export function isAdmin(actor: Pick<Actor, 'role'>): boolean {
  return actor.role === 'AI_LOGISTIX_ADMIN'
}

/** Read-only observers (auditors, embassies, programme sponsors). */
export function isReadOnly(actor: Pick<Actor, 'role'>): boolean {
  return actor.role === 'VIEWER'
}

/** The organization types a role is allowed to be attached to. */
export const ROLE_FOR_ORG_TYPE: Record<OrganizationType, Role> = {
  SUPPLIER: 'SUPPLIER',
  EPC: 'EPC',
  PROJECT_OWNER: 'PROJECT_OWNER',
  FINANCIAL_INSTITUTION: 'FINANCIER',
  AI_LOGISTIX: 'AI_LOGISTIX_OPERATIONS',
  GOVERNMENT: 'VIEWER',
  AUDITOR: 'VIEWER',
  INSPECTION_COMPANY: 'VIEWER',
  OTHER: 'VIEWER',
}

/** Thrown by service functions when a check fails. Never leaks record details. */
export class AuthorizationError extends Error {
  readonly code = 'FORBIDDEN'
  constructor(message = 'You do not have permission to perform this action.') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

/** Thrown when a record does not exist *or* is out of scope — deliberately
 *  indistinguishable, so identifiers cannot be probed for existence. */
export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND'
  constructor(message = 'Not found.') {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends Error {
  readonly code = 'VALIDATION'
  readonly fieldErrors: Record<string, string[]>
  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ValidationError'
    this.fieldErrors = fieldErrors
  }
}

export function requirePermission(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw new AuthorizationError()
}
