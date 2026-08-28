import { describe, expect, it } from 'vitest'
import {
  FUNDING_REQUEST_TRANSITIONS,
  InvalidTransitionError,
  PURCHASE_ORDER_TRANSITIONS,
  TRANSACTION_LIFECYCLE,
  assertFundingRequestTransition,
  assertProcurementItemTransition,
  assertPurchaseOrderTransition,
  assertTransactionStageTransition,
  stageIndex,
} from '@/lib/state-machine'

describe('purchase-order state machine', () => {
  it('allows the happy path', () => {
    expect(() => assertPurchaseOrderTransition('DRAFT', 'SUBMITTED')).not.toThrow()
    expect(() => assertPurchaseOrderTransition('SUBMITTED', 'VERIFICATION_REQUESTED')).not.toThrow()
    expect(() => assertPurchaseOrderTransition('VERIFICATION_REQUESTED', 'VERIFIED')).not.toThrow()
  })

  it('refuses to jump straight from draft to verified', () => {
    expect(() => assertPurchaseOrderTransition('DRAFT', 'VERIFIED')).toThrow(InvalidTransitionError)
  })

  it('refuses to reopen a cancelled purchase order', () => {
    expect(() => assertPurchaseOrderTransition('CANCELLED', 'DRAFT')).toThrow(InvalidTransitionError)
    expect(PURCHASE_ORDER_TRANSITIONS.CANCELLED).toHaveLength(0)
  })

  it('treats a no-op transition as valid', () => {
    expect(() => assertPurchaseOrderTransition('VERIFIED', 'VERIFIED')).not.toThrow()
  })
})

describe('funding-request state machine', () => {
  it('allows the happy path through to repayment', () => {
    const path = [
      ['DRAFT', 'SUBMITTED'],
      ['SUBMITTED', 'UNDER_AI_LOGISTIX_REVIEW'],
      ['UNDER_AI_LOGISTIX_REVIEW', 'FINANCIER_REVIEW'],
      ['FINANCIER_REVIEW', 'APPROVED'],
      ['APPROVED', 'FUNDED'],
      ['FUNDED', 'PARTIALLY_REPAID'],
      ['PARTIALLY_REPAID', 'REPAID'],
    ] as const
    for (const [from, to] of path) {
      expect(() => assertFundingRequestTransition(from, to)).not.toThrow()
    }
  })

  it('refuses to fund without an approval', () => {
    expect(() => assertFundingRequestTransition('DRAFT', 'FUNDED')).toThrow(InvalidTransitionError)
    expect(() => assertFundingRequestTransition('SUBMITTED', 'FUNDED')).toThrow(InvalidTransitionError)
    expect(() => assertFundingRequestTransition('UNDER_AI_LOGISTIX_REVIEW', 'FUNDED')).toThrow(
      InvalidTransitionError,
    )
    expect(() => assertFundingRequestTransition('FINANCIER_REVIEW', 'FUNDED')).toThrow(
      InvalidTransitionError,
    )
  })

  it('refuses to repay financing that was never funded', () => {
    expect(() => assertFundingRequestTransition('APPROVED', 'REPAID')).toThrow(InvalidTransitionError)
  })

  it('makes REPAID terminal', () => {
    expect(FUNDING_REQUEST_TRANSITIONS.REPAID).toHaveLength(0)
    expect(() => assertFundingRequestTransition('REPAID', 'FUNDED')).toThrow(InvalidTransitionError)
  })

  it('refuses to revive a rejected request without returning it to draft', () => {
    expect(() => assertFundingRequestTransition('REJECTED', 'APPROVED')).toThrow(
      InvalidTransitionError,
    )
    expect(() => assertFundingRequestTransition('REJECTED', 'DRAFT')).not.toThrow()
  })
})

describe('transaction lifecycle', () => {
  it('refuses to skip verification and financing', () => {
    expect(() => assertTransactionStageTransition('PURCHASE_ORDER', 'FUNDED')).toThrow(
      InvalidTransitionError,
    )
    expect(() => assertTransactionStageTransition('VERIFICATION', 'FUNDED')).toThrow(
      InvalidTransitionError,
    )
  })

  it('refuses to close before repayment', () => {
    expect(() => assertTransactionStageTransition('PAYMENT', 'CLOSED')).toThrow(
      InvalidTransitionError,
    )
    expect(() => assertTransactionStageTransition('REPAYMENT', 'CLOSED')).not.toThrow()
  })

  it('makes CLOSED terminal', () => {
    expect(() => assertTransactionStageTransition('CLOSED', 'PAYMENT')).toThrow(
      InvalidTransitionError,
    )
  })

  it('orders the lifecycle for the progress banner', () => {
    expect(stageIndex('PURCHASE_ORDER')).toBe(0)
    expect(stageIndex('CLOSED')).toBe(TRANSACTION_LIFECYCLE.length - 1)
    expect(stageIndex('FUNDED')).toBeGreaterThan(stageIndex('VERIFICATION'))
  })
})

describe('procurement state machine', () => {
  it('refuses to deliver an item that was never ordered', () => {
    expect(() => assertProcurementItemTransition('PLANNED', 'DELIVERED')).toThrow(
      InvalidTransitionError,
    )
  })

  it('allows ready items to ship or be delivered directly', () => {
    expect(() => assertProcurementItemTransition('READY', 'SHIPPED')).not.toThrow()
    expect(() => assertProcurementItemTransition('READY', 'DELIVERED')).not.toThrow()
  })
})
