import {
  FundingRequestStatus,
  ProcurementItemStatus,
  PurchaseOrderStatus,
  TransactionStage,
} from '@prisma/client'

/**
 * Explicit state machines.
 *
 * Every status change in MConnect goes through `assertTransition`. Storing a
 * status the workflow cannot reach (for example moving a funding request
 * straight from SUBMITTED to FUNDED without an approval) is rejected at the
 * service layer, not merely hidden in the UI.
 */

export class InvalidTransitionError extends Error {
  readonly code = 'INVALID_TRANSITION'
  constructor(
    readonly entity: string,
    readonly from: string,
    readonly to: string,
  ) {
    super(`${entity} cannot move from ${from} to ${to}.`)
    this.name = 'InvalidTransitionError'
  }
}

export const PURCHASE_ORDER_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_REVIEW', 'VERIFICATION_REQUESTED', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['VERIFICATION_REQUESTED', 'REJECTED', 'CANCELLED'],
  VERIFICATION_REQUESTED: ['VERIFIED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
  VERIFIED: ['EXPIRED', 'CANCELLED'],
  REJECTED: ['DRAFT', 'CANCELLED'],
  EXPIRED: ['CANCELLED'],
  CANCELLED: [],
}

export const FUNDING_REQUEST_TRANSITIONS: Record<FundingRequestStatus, FundingRequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'CANCELLED'],
  SUBMITTED: ['UNDER_AI_LOGISTIX_REVIEW', 'CANCELLED', 'REJECTED'],
  UNDER_AI_LOGISTIX_REVIEW: [
    'EPC_VERIFICATION_PENDING',
    'FINANCIER_REVIEW',
    'INFORMATION_REQUESTED',
    'REJECTED',
    'CANCELLED',
  ],
  EPC_VERIFICATION_PENDING: [
    'FINANCIER_REVIEW',
    'UNDER_AI_LOGISTIX_REVIEW',
    'INFORMATION_REQUESTED',
    'REJECTED',
    'CANCELLED',
  ],
  FINANCIER_REVIEW: [
    'CONDITIONALLY_APPROVED',
    'APPROVED',
    'INFORMATION_REQUESTED',
    'REJECTED',
    'CANCELLED',
  ],
  INFORMATION_REQUESTED: [
    'UNDER_AI_LOGISTIX_REVIEW',
    'FINANCIER_REVIEW',
    'REJECTED',
    'CANCELLED',
  ],
  CONDITIONALLY_APPROVED: ['APPROVED', 'INFORMATION_REQUESTED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['FUNDED', 'CANCELLED', 'REJECTED'],
  FUNDED: ['PARTIALLY_REPAID', 'REPAID', 'DEFAULT'],
  PARTIALLY_REPAID: ['PARTIALLY_REPAID', 'REPAID', 'DEFAULT'],
  REPAID: [],
  DEFAULT: ['PARTIALLY_REPAID', 'REPAID'],
  REJECTED: ['DRAFT', 'CANCELLED'],
  CANCELLED: [],
}

export const TRANSACTION_STAGE_TRANSITIONS: Record<TransactionStage, TransactionStage[]> = {
  PURCHASE_ORDER: ['VERIFICATION', 'CANCELLED'],
  VERIFICATION: ['FINANCING_REVIEW', 'PURCHASE_ORDER', 'CANCELLED'],
  FINANCING_REVIEW: ['APPROVED', 'VERIFICATION', 'CANCELLED'],
  APPROVED: ['FUNDED', 'FINANCING_REVIEW', 'CANCELLED'],
  FUNDED: ['PROCUREMENT', 'CANCELLED'],
  PROCUREMENT: ['LOGISTICS', 'MANUFACTURING', 'CANCELLED'],
  LOGISTICS: ['MANUFACTURING', 'PROCUREMENT', 'DELIVERY', 'CANCELLED'],
  MANUFACTURING: ['DELIVERY', 'LOGISTICS', 'CANCELLED'],
  DELIVERY: ['BUYER_ACCEPTANCE', 'MANUFACTURING', 'CANCELLED'],
  BUYER_ACCEPTANCE: ['PAYMENT', 'DELIVERY', 'CANCELLED'],
  PAYMENT: ['REPAYMENT', 'BUYER_ACCEPTANCE', 'CANCELLED'],
  REPAYMENT: ['CLOSED', 'PAYMENT', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
}

export const PROCUREMENT_ITEM_TRANSITIONS: Record<ProcurementItemStatus, ProcurementItemStatus[]> = {
  PLANNED: ['QUOTE_RECEIVED', 'CANCELLED'],
  QUOTE_RECEIVED: ['APPROVED', 'PLANNED', 'CANCELLED'],
  APPROVED: ['ORDERED', 'QUOTE_RECEIVED', 'CANCELLED'],
  // A purchased commodity ships straight from the vendor with no in-house
  // production step, so ORDERED reaches SHIPPED directly.
  ORDERED: ['IN_PRODUCTION', 'READY', 'SHIPPED', 'CANCELLED'],
  IN_PRODUCTION: ['READY', 'SHIPPED', 'CANCELLED'],
  READY: ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED: ['CUSTOMS', 'DELIVERED', 'CANCELLED'],
  CUSTOMS: ['DELIVERED', 'CANCELLED'],
  DELIVERED: [],
  CANCELLED: [],
}

function assert<T extends string>(
  entity: string,
  map: Record<T, T[]>,
  from: T,
  to: T,
): void {
  if (from === to) return
  const allowed = map[from]
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError(entity, from, to)
  }
}

export function assertPurchaseOrderTransition(
  from: PurchaseOrderStatus,
  to: PurchaseOrderStatus,
): void {
  assert('Purchase order', PURCHASE_ORDER_TRANSITIONS, from, to)
}

export function assertFundingRequestTransition(
  from: FundingRequestStatus,
  to: FundingRequestStatus,
): void {
  assert('Funding request', FUNDING_REQUEST_TRANSITIONS, from, to)
}

export function assertTransactionStageTransition(
  from: TransactionStage,
  to: TransactionStage,
): void {
  assert('Transaction', TRANSACTION_STAGE_TRANSITIONS, from, to)
}

export function assertProcurementItemTransition(
  from: ProcurementItemStatus,
  to: ProcurementItemStatus,
): void {
  assert('Procurement item', PROCUREMENT_ITEM_TRANSITIONS, from, to)
}

export function canTransition<T extends string>(map: Record<T, T[]>, from: T, to: T): boolean {
  if (from === to) return true
  return map[from]?.includes(to) ?? false
}

/** The lifecycle rendered on the transaction page, in order. */
export const TRANSACTION_LIFECYCLE: TransactionStage[] = [
  'PURCHASE_ORDER',
  'VERIFICATION',
  'FINANCING_REVIEW',
  'APPROVED',
  'FUNDED',
  'PROCUREMENT',
  'LOGISTICS',
  'MANUFACTURING',
  'DELIVERY',
  'BUYER_ACCEPTANCE',
  'PAYMENT',
  'REPAYMENT',
  'CLOSED',
]

export function stageIndex(stage: TransactionStage): number {
  const i = TRANSACTION_LIFECYCLE.indexOf(stage)
  return i === -1 ? TRANSACTION_LIFECYCLE.length : i
}

/** Statuses in which a funding request is still awaiting a decision. */
export const FUNDING_OPEN_STATUSES: FundingRequestStatus[] = [
  'SUBMITTED',
  'UNDER_AI_LOGISTIX_REVIEW',
  'EPC_VERIFICATION_PENDING',
  'FINANCIER_REVIEW',
  'INFORMATION_REQUESTED',
  'CONDITIONALLY_APPROVED',
]

/** Statuses where money is committed and therefore counted as exposure. */
export const FUNDING_EXPOSURE_STATUSES: FundingRequestStatus[] = [
  'FUNDED',
  'PARTIALLY_REPAID',
  'DEFAULT',
]
