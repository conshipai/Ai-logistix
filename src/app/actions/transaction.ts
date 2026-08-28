'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/rbac'
import { InvalidTransitionError } from '@/lib/state-machine'
import { RATE_LIMITS, clientIp, rateLimit } from '@/lib/rate-limit'
import { requireActorOrThrow } from '@/lib/session'
import {
  commentSchema,
  deliveryAcceptanceSchema,
  disbursementSchema,
  documentMetadataSchema,
  financierDecisionSchema,
  fieldErrors,
  fundingRequestSchema,
  invoiceSchema,
  milestoneStatusSchema,
  procurementItemSchema,
  procurementStatusSchema,
  purchaseOrderSchema,
  poVerificationSchema,
  recordFundingSchema,
  repaymentSchema,
  rfiSchema,
  rfiStatusSchema,
  shareTransactionSchema,
  shipmentMilestoneSchema,
  shipmentSchema,
  transactionMilestoneSchema,
  uuidSchema,
  vendorSchema,
} from '@/lib/validation'
import type { FormState } from '@/app/actions/public'
import {
  createPurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
  verifyPurchaseOrder,
} from '@/server/services/purchase-orders'
import {
  createDisbursement,
  createFundingRequest,
  recordFinancierDecision,
  recordFunding,
  recordRepayment,
  reviewFundingRequest,
  submitFundingRequest,
  updateDisbursementStatus,
} from '@/server/services/funding'
import {
  createProcurementItem,
  createVendor,
  updateProcurementItemStatus,
} from '@/server/services/procurement'
import { createShipment, recordShipmentMilestone } from '@/server/services/logistics'
import { createMilestone, updateMilestoneStatus } from '@/server/services/milestones'
import { uploadDocument } from '@/server/services/documents'
import { createComment, createRfi, updateRfiStatus } from '@/server/services/communications'
import { createInvoice, recordDeliveryAcceptance, updateInvoice } from '@/server/services/delivery'
import { closeTransaction, shareTransaction } from '@/server/services/transactions'

/**
 * Transaction server actions.
 *
 * Every action here follows the same shape:
 *
 *   1. Resolve the actor from the session (throws if not signed in).
 *   2. Parse the input through a Zod schema.
 *   3. Call a domain service, which performs the capability check AND the
 *      record-scope check independently.
 *
 * No action trusts an organization id, supplier id or status supplied by the
 * client. `run` converts the domain error types into form state so a rejected
 * action never leaks a stack trace or the existence of a record.
 */

async function run<T>(fn: () => Promise<T>): Promise<FormState> {
  try {
    await fn()
    return { ok: true }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, message: error.message, errors: error.fieldErrors }
    }
    if (error instanceof InvalidTransitionError) {
      return { ok: false, message: error.message }
    }
    if (error instanceof AuthorizationError) {
      return { ok: false, message: error.message }
    }
    if (error instanceof NotFoundError) {
      return { ok: false, message: 'That record could not be found.' }
    }
    if (error instanceof z.ZodError) {
      return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(error) }
    }
    // Next's redirect() and notFound() signal through thrown values.
    if (error && typeof error === 'object' && 'digest' in error) throw error
    console.error('[action] unhandled failure', error)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
}

function refresh(transactionId?: string) {
  revalidatePath('/app')
  revalidatePath('/app/transactions')
  if (transactionId) revalidatePath(`/app/transactions/${transactionId}`)
}

// --- Purchase orders --------------------------------------------------------

export async function createPurchaseOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = purchaseOrderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }

  let createdId: string | null = null
  const result = await run(async () => {
    const supplierIdOverride = formData.get('supplierId')
    const created = await createPurchaseOrder(
      actor,
      parsed.data,
      typeof supplierIdOverride === 'string' && supplierIdOverride ? supplierIdOverride : undefined,
    )
    createdId = created.id
  })
  if (!result.ok) return result

  refresh()
  redirect(`/app/purchase-orders/${createdId}`)
}

export async function updatePurchaseOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const id = uuidSchema.parse(formData.get('purchaseOrderId'))
  const parsed = purchaseOrderSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => updatePurchaseOrder(actor, id, parsed.data))
  if (result.ok) {
    revalidatePath(`/app/purchase-orders/${id}`)
    return { ok: true, message: 'Purchase order saved.' }
  }
  return result
}

export async function submitPurchaseOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const id = uuidSchema.parse(formData.get('purchaseOrderId'))

  let transactionId: string | null = null
  const result = await run(async () => {
    const submitted = await submitPurchaseOrder(actor, id)
    transactionId = submitted.transactionId
  })
  if (!result.ok) return result

  refresh(transactionId ?? undefined)
  redirect(`/app/transactions/${transactionId}`)
}

export async function verifyPurchaseOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const raw = Object.fromEntries(formData)
  const parsed = poVerificationSchema.safeParse({
    ...raw,
    valueConfirmed: formData.get('valueConfirmed') === 'on',
    buyerConfirmed: formData.get('buyerConfirmed') === 'on',
    supplierConfirmed: formData.get('supplierConfirmed') === 'on',
    paymentTermsConfirmed: formData.get('paymentTermsConfirmed') === 'on',
    poIsActiveConfirmed: formData.get('poIsActiveConfirmed') === 'on',
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }

  const result = await run(() => verifyPurchaseOrder(actor, parsed.data))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Your verification decision has been recorded.' }
  }
  return result
}

// --- Financing --------------------------------------------------------------

export async function createFundingRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = fundingRequestSchema.safeParse({
    ...Object.fromEntries(formData),
    lines: parseLines(formData),
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createFundingRequest(actor, parsed.data))
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Financing request saved as a draft.' }
  }
  return result
}

/** Use-of-funds lines arrive as repeated `lines[n][field]` form entries. */
function parseLines(formData: FormData) {
  const byIndex = new Map<string, Record<string, string>>()
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^lines\[(\d+)\]\[(\w+)\]$/)
    if (!match) continue
    const [, index, field] = match
    const entry = byIndex.get(index!) ?? {}
    entry[field!] = String(value)
    byIndex.set(index!, entry)
  }
  return Array.from(byIndex.values()).filter((line) => line.description && line.amount)
}

export async function submitFundingRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const id = uuidSchema.parse(formData.get('fundingRequestId'))
  const result = await run(() => submitFundingRequest(actor, id))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Your financing request has been submitted for review.' }
  }
  return result
}

export async function reviewFundingRequestAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const schema = z.object({
    fundingRequestId: uuidSchema,
    action: z.enum(['ROUTE_TO_FINANCIER', 'REQUEST_INFORMATION', 'REJECT']),
    financierOrganizationId: z.union([z.literal(''), uuidSchema]).optional(),
    notes: z.string().trim().max(4000).optional(),
  })
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }

  const result = await run(() =>
    reviewFundingRequest(actor, {
      fundingRequestId: parsed.data.fundingRequestId,
      action: parsed.data.action,
      financierOrganizationId: parsed.data.financierOrganizationId || undefined,
      notes: parsed.data.notes,
    }),
  )
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Review recorded.' }
  }
  return result
}

export async function financierDecisionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = financierDecisionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => recordFinancierDecision(actor, parsed.data))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Your financing decision has been recorded.' }
  }
  return result
}

export async function recordFundingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = recordFundingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => recordFunding(actor, parsed.data))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Funding recorded.' }
  }
  return result
}

export async function createDisbursementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = disbursementSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createDisbursement(actor, parsed.data))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Disbursement recorded.' }
  }
  return result
}

export async function updateDisbursementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const schema = z.object({
    disbursementId: uuidSchema,
    authorizationStatus: z.enum(['AUTHORIZED', 'REJECTED', 'CANCELLED']).optional(),
    paymentStatus: z.enum(['SCHEDULED', 'PAID', 'FAILED', 'REVERSED']).optional(),
    transactionReference: z.string().trim().max(120).optional(),
  })
  const parsed = schema.safeParse(
    Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => v !== '')),
  )
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() =>
    updateDisbursementStatus(actor, parsed.data.disbursementId, {
      authorizationStatus: parsed.data.authorizationStatus,
      paymentStatus: parsed.data.paymentStatus,
      paymentDate: parsed.data.paymentStatus === 'PAID' ? new Date() : undefined,
      transactionReference: parsed.data.transactionReference,
    }),
  )
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Disbursement updated.' }
  }
  return result
}

export async function recordRepaymentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = repaymentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => recordRepayment(actor, parsed.data))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Repayment recorded.' }
  }
  return result
}

// --- Procurement & logistics ------------------------------------------------

export async function createVendorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = vendorSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createVendor(actor, parsed.data))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Vendor added.' }
  }
  return result
}

export async function createProcurementItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = procurementItemSchema.safeParse({
    ...Object.fromEntries(formData),
    logisticsRequired: formData.get('logisticsRequired') === 'on',
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createProcurementItem(actor, parsed.data))
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Procurement line added.' }
  }
  return result
}

export async function updateProcurementStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = procurementStatusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: 'Select a valid status.' }
  const result = await run(() =>
    updateProcurementItemStatus(actor, parsed.data.procurementItemId, parsed.data.status),
  )
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Procurement updated.' }
  }
  return result
}

export async function createShipmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = shipmentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createShipment(actor, parsed.data))
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Shipment created.' }
  }
  return result
}

export async function recordShipmentMilestoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = shipmentMilestoneSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => recordShipmentMilestone(actor, parsed.data))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Shipment milestone recorded.' }
  }
  return result
}

// --- Milestones -------------------------------------------------------------

export async function createMilestoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = transactionMilestoneSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() =>
    createMilestone(actor, {
      transactionId: parsed.data.transactionId,
      type: parsed.data.type,
      title: parsed.data.title,
      description: parsed.data.description,
      dueDate: parsed.data.dueDate,
    }),
  )
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Milestone added.' }
  }
  return result
}

export async function updateMilestoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = milestoneStatusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: 'Select a valid status.' }
  const result = await run(() =>
    updateMilestoneStatus(actor, parsed.data.milestoneId, parsed.data.status, parsed.data.note),
  )
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Milestone updated.' }
  }
  return result
}

// --- Documents --------------------------------------------------------------

export async function uploadDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()

  const limit = await rateLimit(
    `upload:${actor.userId}`,
    RATE_LIMITS.upload.limit,
    RATE_LIMITS.upload.windowSeconds,
  )
  if (!limit.allowed) {
    return { ok: false, message: 'Too many uploads. Please try again later.' }
  }

  const parsed = documentMetadataSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }

  const file = formData.get('file')
  if (!(file instanceof File)) return { ok: false, message: 'Select a file to upload.' }

  const result = await run(() =>
    uploadDocument(actor, {
      file,
      category: parsed.data.category,
      visibility: parsed.data.visibility,
      transactionId: parsed.data.transactionId || null,
      milestoneId: parsed.data.milestoneId || null,
      expiresAt: parsed.data.expiresAt ?? null,
    }),
  )
  if (result.ok) {
    revalidatePath('/app/documents')
    revalidatePath('/app/organization')
    refresh(parsed.data.transactionId || undefined)
    return { ok: true, message: 'Document uploaded.' }
  }
  return result
}

export async function deleteDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const id = uuidSchema.parse(formData.get('documentId'))
  const { deleteDocument } = await import('@/server/services/documents')
  const result = await run(() => deleteDocument(actor, id))
  if (result.ok) {
    revalidatePath('/app/documents')
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Document removed.' }
  }
  return result
}

// --- Communications ---------------------------------------------------------

export async function createCommentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = commentSchema.safeParse({
    ...Object.fromEntries(formData),
    internalOnly: formData.get('internalOnly') === 'on',
    mentionedUserIds: formData.getAll('mentionedUserIds').map(String).filter(Boolean),
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createComment(actor, parsed.data))
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Message posted.' }
  }
  return result
}

export async function createRfiAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = rfiSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createRfi(actor, parsed.data))
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Information request sent.' }
  }
  return result
}

export async function updateRfiAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = rfiStatusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, message: 'Select a valid status.' }
  const result = await run(() => updateRfiStatus(actor, parsed.data.rfiId, parsed.data.status))
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Request updated.' }
  }
  return result
}

// --- Delivery, invoicing, closing -------------------------------------------

export async function deliveryAcceptanceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = deliveryAcceptanceSchema.safeParse({
    ...Object.fromEntries(formData),
    accepted: formData.get('accepted') === 'true',
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => recordDeliveryAcceptance(actor, parsed.data))
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Delivery decision recorded.' }
  }
  return result
}

export async function createInvoiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = invoiceSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createInvoice(actor, parsed.data))
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Invoice submitted.' }
  }
  return result
}

export async function updateInvoiceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const schema = z.object({
    invoiceId: uuidSchema,
    accepted: z.coerce.boolean().optional(),
    paidAmount: z
      .union([z.literal(''), z.coerce.number().positive()])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
  })
  const parsed = schema.safeParse({
    ...Object.fromEntries(formData),
    accepted: formData.get('accepted') === 'true' ? true : undefined,
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() =>
    updateInvoice(actor, parsed.data.invoiceId, {
      accepted: parsed.data.accepted,
      paidAmount: parsed.data.paidAmount,
    }),
  )
  if (result.ok) {
    refresh(String(formData.get('transactionId') ?? ''))
    return { ok: true, message: 'Invoice updated.' }
  }
  return result
}

export async function shareTransactionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = shareTransactionSchema.safeParse({
    ...Object.fromEntries(formData),
    readOnly: formData.get('readOnly') === 'on',
  })
  if (!parsed.success) {
    return { ok: false, message: 'Select an organization to share with.' }
  }
  const result = await run(() =>
    shareTransaction(actor, parsed.data.transactionId, parsed.data.organizationId, parsed.data.readOnly),
  )
  if (result.ok) {
    refresh(parsed.data.transactionId)
    return { ok: true, message: 'Transaction shared.' }
  }
  return result
}

export async function closeTransactionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const id = uuidSchema.parse(formData.get('transactionId'))
  const result = await run(() => closeTransaction(actor, id))
  if (result.ok) {
    refresh(id)
    return { ok: true, message: 'Transaction closed.' }
  }
  return result
}

/** Exposed for the audit trail on actions that need the caller's address. */
export async function callerIp(): Promise<string> {
  return clientIp(await headers())
}
