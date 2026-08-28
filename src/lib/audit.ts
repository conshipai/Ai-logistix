import { headers } from 'next/headers'
import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import type { Actor } from '@/lib/rbac'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Immutable audit trail.
 *
 * Audit rows are append-only: no service in the application updates or deletes
 * them. Before/after payloads are passed through `redact` so no password hash,
 * token, secret or bank identifier can reach the trail.
 */

export const AUDIT_ACTIONS = {
  USER_LOGIN: 'user.login',
  USER_LOGIN_FAILED: 'user.login_failed',
  USER_LOGOUT: 'user.logout',
  USER_REGISTERED: 'user.registered',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_PERMISSION_CHANGED: 'user.permission_changed',
  USER_PASSWORD_RESET_REQUESTED: 'user.password_reset_requested',
  USER_PASSWORD_RESET: 'user.password_reset',
  USER_EMAIL_VERIFIED: 'user.email_verified',
  REGISTRATION_APPROVED: 'registration.approved',
  REGISTRATION_REJECTED: 'registration.rejected',
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  ORGANIZATION_STATUS_CHANGED: 'organization.status_changed',
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PO_CREATED: 'purchase_order.created',
  PO_UPDATED: 'purchase_order.updated',
  PO_SUBMITTED: 'purchase_order.submitted',
  PO_VERIFICATION_REQUESTED: 'purchase_order.verification_requested',
  PO_VERIFIED: 'purchase_order.verified',
  PO_REJECTED: 'purchase_order.rejected',
  TRANSACTION_CREATED: 'transaction.created',
  TRANSACTION_STAGE_CHANGED: 'transaction.stage_changed',
  TRANSACTION_SHARED: 'transaction.shared',
  TRANSACTION_ACCESS_REVOKED: 'transaction.access_revoked',
  TRANSACTION_CLOSED: 'transaction.closed',
  FUNDING_REQUESTED: 'funding_request.created',
  FUNDING_SUBMITTED: 'funding_request.submitted',
  FUNDING_STATUS_CHANGED: 'funding_request.status_changed',
  FUNDING_APPROVED: 'funding_request.approved',
  FUNDING_REJECTED: 'funding_request.rejected',
  FUNDING_RECORDED: 'funding_request.funded',
  DISBURSEMENT_RECORDED: 'disbursement.recorded',
  DISBURSEMENT_UPDATED: 'disbursement.updated',
  REPAYMENT_RECORDED: 'repayment.recorded',
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_VIEWED: 'document.viewed',
  DOCUMENT_DELETED: 'document.deleted',
  PROCUREMENT_ITEM_CREATED: 'procurement_item.created',
  PROCUREMENT_ITEM_UPDATED: 'procurement_item.updated',
  SHIPMENT_CREATED: 'shipment.created',
  SHIPMENT_UPDATED: 'shipment.updated',
  SHIPMENT_MILESTONE_RECORDED: 'shipment.milestone_recorded',
  MILESTONE_CREATED: 'transaction_milestone.created',
  MILESTONE_UPDATED: 'transaction_milestone.updated',
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_DECIDED: 'approval.decided',
  COMMENT_CREATED: 'comment.created',
  RFI_CREATED: 'rfi.created',
  RFI_UPDATED: 'rfi.updated',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_UPDATED: 'invoice.updated',
  DELIVERY_ACCEPTED: 'delivery.accepted',
  SETTINGS_UPDATED: 'settings.updated',
} as const

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS]

/** Keys never written to the audit trail, at any nesting depth. */
const REDACTED_KEYS = [
  'password', 'passwordhash', 'passwordconfirmation', 'currentpassword', 'newpassword',
  'token', 'tokenhash', 'secret', 'mfasecret', 'apikey', 'accesskey', 'secretkey',
  'authorization', 'cookie', 'sessiontoken', 'accountnumber', 'iban', 'swift',
  'bankaccount', 'payeebankdetails', 'cardnumber', 'cvv', 'ssn',
]

export function redact(value: unknown, depth = 0): Prisma.InputJsonValue | undefined {
  if (depth > 6) return '[truncated]'
  if (value === null || value === undefined) return undefined
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => redact(v, depth + 1) ?? null) as Prisma.InputJsonValue
  }
  if (typeof value === 'object') {
    // Prisma Decimal and similar value objects.
    if ('toFixed' in (value as object) || 's' in (value as object)) {
      const s = String(value)
      if (/^-?\d+(\.\d+)?$/.test(s)) return s
    }
    const out: Record<string, Prisma.InputJsonValue> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.includes(k.toLowerCase())) {
        out[k] = '[redacted]'
        continue
      }
      const r = redact(v, depth + 1)
      if (r !== undefined) out[k] = r
    }
    return out
  }
  return undefined
}

export interface AuditInput {
  action: AuditAction | string
  entityType: string
  entityId?: string | null
  before?: unknown
  after?: unknown
  metadata?: Record<string, unknown>
  actor?: Actor | null
  actorEmail?: string | null
  organizationId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Records an audit event. Never throws: a logging failure must not roll back a
 * business action the user has already been told succeeded. Failures are
 * reported to stderr so they surface in the Coolify log stream.
 */
export async function recordAudit(input: AuditInput, db: Db = prisma): Promise<void> {
  try {
    let ip = input.ipAddress ?? null
    let ua = input.userAgent ?? null
    if (ip === null || ua === null) {
      try {
        const h = await headers()
        ip = ip ?? (h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip'))
        ua = ua ?? h.get('user-agent')
      } catch {
        // Outside a request scope (seed script, background job).
      }
    }

    await db.auditEvent.create({
      data: {
        actorUserId: input.actor?.userId ?? null,
        actorEmail: input.actorEmail ?? input.actor?.email ?? null,
        organizationId: input.organizationId ?? input.actor?.organizationId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        beforeData: redact(input.before) ?? undefined,
        afterData: redact(input.after) ?? undefined,
        metadata: redact(input.metadata) ?? undefined,
        ipAddress: ip?.slice(0, 100) ?? null,
        userAgent: ua?.slice(0, 500) ?? null,
      },
    })
  } catch (error) {
    console.error('[audit] failed to record event', input.action, error)
  }
}
