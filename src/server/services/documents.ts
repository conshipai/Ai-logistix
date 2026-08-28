import type { DocumentCategory, DocumentVisibility, Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { env } from '@/lib/env'
import { storageKey } from '@/lib/ids'
import {
  AuthorizationError,
  NotFoundError,
  ValidationError,
  isStaff,
  requirePermission,
  type Actor,
} from '@/lib/rbac'
import { isAllowedUpload, storage } from '@/lib/storage'
import { requireTransactionScope, transactionScopeWhere } from '@/server/services/access'

/**
 * Document management.
 *
 * Rules enforced here, on the server, on every request:
 *
 *  * Uploads are limited by MIME type, extension and size. Executables and
 *    scripts are rejected outright.
 *  * Storage keys are unguessable and are never rendered into a page. A
 *    download always passes through `authorizeDownload`, which re-checks the
 *    transaction scope and the document's visibility before minting a
 *    short-lived signed URL.
 *  * Every view and every deletion is audited.
 */

export interface UploadInput {
  file: File
  category: DocumentCategory
  visibility: DocumentVisibility
  transactionId?: string | null
  milestoneId?: string | null
  disbursementId?: string | null
  expiresAt?: Date | null
}

export async function uploadDocument(actor: Actor, input: UploadInput): Promise<{ id: string }> {
  requirePermission(actor, 'document:upload')

  const config = env()
  const file = input.file
  if (!file || file.size === 0) throw new ValidationError('Select a file to upload.')
  if (file.size > config.MAX_UPLOAD_BYTES) {
    throw new ValidationError(
      `Files must be ${Math.round(config.MAX_UPLOAD_BYTES / (1024 * 1024))} MB or smaller.`,
    )
  }
  if (!isAllowedUpload(file.type, file.name)) {
    throw new ValidationError(
      'That file type is not accepted. Upload a PDF, image, Office document or CSV.',
    )
  }

  if (input.transactionId) {
    const scope = await requireTransactionScope(actor, input.transactionId)
    if (scope.readOnly) {
      throw new AuthorizationError('Your access to this transaction is read-only.')
    }
  }

  if (input.milestoneId) {
    const milestone = await prisma.transactionMilestone.findUnique({
      where: { id: input.milestoneId },
      select: { transactionId: true },
    })
    if (!milestone || milestone.transactionId !== input.transactionId) {
      throw new NotFoundError('Milestone not found.')
    }
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const key = storageKey(actor.organizationId, file.name)
  const stored = await storage().put(key, bytes, file.type)

  // Versioning: a later upload of the same category on the same transaction
  // supersedes the previous one rather than silently sitting alongside it.
  const previous = input.transactionId
    ? await prisma.document.findFirst({
        where: {
          transactionId: input.transactionId,
          category: input.category,
          organizationId: actor.organizationId,
          deletedAt: null,
        },
        orderBy: { version: 'desc' },
        select: { id: true, version: true },
      })
    : null

  const document = await prisma.document.create({
    data: {
      organizationId: actor.organizationId,
      transactionId: input.transactionId || null,
      milestoneId: input.milestoneId || null,
      disbursementId: input.disbursementId || null,
      category: input.category,
      visibility: input.visibility,
      fileName: file.name.slice(0, 255),
      contentType: file.type,
      sizeBytes: stored.sizeBytes,
      storageKey: stored.key,
      checksumSha256: stored.checksumSha256,
      version: (previous?.version ?? 0) + 1,
      supersedesId: previous?.id ?? null,
      expiresAt: input.expiresAt ?? null,
      uploadedById: actor.userId,
    },
    select: { id: true, fileName: true, version: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.DOCUMENT_UPLOADED,
    entityType: 'Document',
    entityId: document.id,
    after: {
      fileName: document.fileName,
      category: input.category,
      visibility: input.visibility,
      sizeBytes: stored.sizeBytes,
      version: document.version,
      transactionId: input.transactionId,
    },
  })

  return { id: document.id }
}

/**
 * Decides whether an actor may read a specific document, then returns a signed
 * URL (S3) or a marker to stream it through the application (local driver).
 *
 * This is the single choke point for document access. Nothing else in the
 * application hands out a storage key.
 */
export async function authorizeDownload(
  actor: Actor,
  documentId: string,
): Promise<{ document: { id: string; fileName: string; contentType: string; storageKey: string }; signedUrl: string | null }> {
  requirePermission(actor, 'document:read')

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      fileName: true,
      contentType: true,
      storageKey: true,
      organizationId: true,
      transactionId: true,
      visibility: true,
      deletedAt: true,
    },
  })
  // A deleted or non-existent document is reported identically, so identifiers
  // cannot be probed.
  if (!document || document.deletedAt) throw new NotFoundError('Document not found.')

  const permitted = await canRead(actor, document)
  if (!permitted) throw new NotFoundError('Document not found.')

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.DOCUMENT_VIEWED,
    entityType: 'Document',
    entityId: document.id,
    metadata: { fileName: document.fileName, transactionId: document.transactionId },
  })

  const signedUrl = await storage().signedUrl(
    document.storageKey,
    document.fileName,
    env().SIGNED_URL_TTL_SECONDS,
  )
  return { document, signedUrl }
}

async function canRead(
  actor: Actor,
  document: {
    organizationId: string
    transactionId: string | null
    visibility: DocumentVisibility
  },
): Promise<boolean> {
  if (isStaff(actor)) return true
  if (document.organizationId === actor.organizationId) return true
  if (!document.transactionId) return false

  let scope
  try {
    scope = await requireTransactionScope(actor, document.transactionId)
  } catch {
    return false
  }

  switch (document.visibility) {
    case 'RESTRICTED':
      // Owning organization and AI Logistix only — both handled above.
      return false
    case 'TRANSACTION_PARTIES':
      return scope.isSupplier || scope.isBuyer || scope.isProjectOwner
    case 'FINANCIERS':
      return scope.isSupplier || scope.isBuyer || scope.isProjectOwner || scope.isFinancier
    case 'ALL_PARTIES_AND_AUDITORS':
      return true
    default:
      return false
  }
}

/** Documents on a transaction that the actor is entitled to see. */
export async function listTransactionDocuments(actor: Actor, transactionId: string) {
  requirePermission(actor, 'document:read')
  const scope = await requireTransactionScope(actor, transactionId)

  const documents = await prisma.document.findMany({
    where: { transactionId, deletedAt: null },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      organization: { select: { id: true, legalName: true, tradingName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (scope.isStaff) return documents
  return documents.filter(
    (d) =>
      d.organizationId === actor.organizationId ||
      (d.visibility === 'TRANSACTION_PARTIES' &&
        (scope.isSupplier || scope.isBuyer || scope.isProjectOwner)) ||
      (d.visibility === 'FINANCIERS' &&
        (scope.isSupplier || scope.isBuyer || scope.isProjectOwner || scope.isFinancier)) ||
      d.visibility === 'ALL_PARTIES_AND_AUDITORS',
  )
}

/** An organization's own compliance documents (KYC, registration, financials). */
export async function listOrganizationDocuments(actor: Actor, organizationId?: string) {
  requirePermission(actor, 'document:read')
  const target = organizationId ?? actor.organizationId
  if (target !== actor.organizationId && !isStaff(actor)) {
    throw new NotFoundError('Organization not found.')
  }
  return prisma.document.findMany({
    where: { organizationId: target, transactionId: null, deletedAt: null },
    include: { uploadedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

/**
 * Soft-deletes a document. Administrators only. The row and the audit trail are
 * retained; only the object is removed from storage.
 */
export async function deleteDocument(actor: Actor, documentId: string): Promise<void> {
  requirePermission(actor, 'document:delete')

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, fileName: true, storageKey: true, organizationId: true, transactionId: true, deletedAt: true },
  })
  if (!document || document.deletedAt) throw new NotFoundError('Document not found.')

  await prisma.document.update({ where: { id: documentId }, data: { deletedAt: new Date() } })
  await storage().delete(document.storageKey).catch((error) => {
    console.error('[documents] object removal failed', document.storageKey, error)
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.DOCUMENT_DELETED,
    entityType: 'Document',
    entityId: documentId,
    before: {
      fileName: document.fileName,
      organizationId: document.organizationId,
      transactionId: document.transactionId,
    },
  })
}

/** Recent documents across everything the actor can reach, for the dashboard. */
export async function recentDocuments(actor: Actor, limit = 10) {
  const where: Prisma.DocumentWhereInput = isStaff(actor)
    ? { deletedAt: null }
    : {
        deletedAt: null,
        OR: [
          { organizationId: actor.organizationId },
          { transaction: transactionScopeWhere(actor) },
        ],
      }
  return prisma.document.findMany({
    where,
    include: {
      transaction: { select: { id: true, number: true } },
      uploadedBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  COMPANY_REGISTRATION: 'Company registration',
  TAX_DOCUMENT: 'Tax document',
  KYC: 'KYC',
  BANK_LETTER: 'Bank letter',
  AUDITED_FINANCIALS: 'Audited financials',
  MANAGEMENT_ACCOUNTS: 'Management accounts',
  PURCHASE_ORDER: 'Purchase order',
  CONTRACT: 'Contract',
  TECHNICAL_SPECIFICATION: 'Technical specification',
  DRAWING: 'Drawing',
  COMMERCIAL_QUOTE: 'Commercial quote',
  VENDOR_QUOTE: 'Vendor quote',
  BILL_OF_MATERIALS: 'Bill of materials',
  PAYMENT_SCHEDULE: 'Payment schedule',
  PURCHASE_INVOICE: 'Purchase invoice',
  COMMERCIAL_INVOICE: 'Commercial invoice',
  PACKING_LIST: 'Packing list',
  BILL_OF_LADING: 'Bill of lading',
  AIR_WAYBILL: 'Air waybill',
  CUSTOMS_DOCUMENT: 'Customs document',
  CERTIFICATE_OF_ORIGIN: 'Certificate of origin',
  QUALITY_CERTIFICATE: 'Quality certificate',
  INSPECTION_CERTIFICATE: 'Inspection certificate',
  PROOF_OF_DELIVERY: 'Proof of delivery',
  BUYER_ACCEPTANCE: 'Buyer acceptance',
  PAYMENT_CONFIRMATION: 'Payment confirmation',
  OTHER: 'Other',
}

export const DOCUMENT_VISIBILITY_LABELS: Record<DocumentVisibility, string> = {
  RESTRICTED: 'My organization and AI Logistix only',
  TRANSACTION_PARTIES: 'All transaction parties',
  FINANCIERS: 'Transaction parties and financing partners',
  ALL_PARTIES_AND_AUDITORS: 'All parties, financing partners and auditors',
}
