import type { Actor } from '@/lib/rbac'
import type { TransactionScope } from '@/server/services/access'

/**
 * "What do I need to do next?"
 *
 * The transaction page leads with this. It is deliberately role-aware: the same
 * transaction shows the supplier "upload your vendor quotations" while showing
 * the EPC "verify this purchase order". Suppliers never see banking jargon.
 */

export interface NextAction {
  title: string
  description: string
  href?: string
  /** 'you' — the actor can act now. 'other' — waiting on somebody else. */
  owner: 'you' | 'other'
  waitingOn?: string
}

export interface TransactionSnapshot {
  id: string
  stage: string
  purchaseOrderStatus: string
  hasPoDocument: boolean
  fundingStatus: string | null
  hasFundingLines: boolean
  hasVendorQuotes: boolean
  openRfiForActor: boolean
  procurementItemCount: number
  procurementAllDelivered: boolean
  deliveryAccepted: boolean
  invoiceSubmitted: boolean
  paymentRecorded: boolean
  fullyRepaid: boolean
  supplierProfileComplete: boolean
}

export function nextActionFor(
  actor: Actor,
  scope: TransactionScope,
  snapshot: TransactionSnapshot,
): NextAction {
  const base = `/app/transactions/${snapshot.id}`

  if (snapshot.openRfiForActor) {
    return {
      title: 'Respond to an information request',
      description: 'Somebody on this transaction has asked you a question or requested a document.',
      href: `${base}?tab=communications`,
      owner: 'you',
    }
  }

  // --- Supplier -----------------------------------------------------------
  if (scope.isSupplier) {
    if (!snapshot.supplierProfileComplete) {
      return {
        title: 'Complete your company profile',
        description:
          'Financing partners review your company details before they review a transaction. ' +
          'Adding your capabilities and certifications takes a few minutes.',
        href: '/app/organization',
        owner: 'you',
      }
    }
    if (snapshot.purchaseOrderStatus === 'DRAFT') {
      if (!snapshot.hasPoDocument) {
        return {
          title: 'Upload the purchase order document',
          description: 'Attach a copy of the signed purchase order so your buyer can confirm it.',
          href: `${base}?tab=documents`,
          owner: 'you',
        }
      }
      return {
        title: 'Submit the purchase order',
        description: 'Send the purchase order to your buyer to be confirmed.',
        href: `${base}?tab=purchase-order`,
        owner: 'you',
      }
    }
    if (['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_REQUESTED'].includes(snapshot.purchaseOrderStatus)) {
      return {
        title: 'Waiting for your buyer to confirm the purchase order',
        description: 'Your buyer has been asked to confirm this order. Nothing is needed from you.',
        owner: 'other',
        waitingOn: 'Buyer',
      }
    }
    if (snapshot.purchaseOrderStatus === 'REJECTED') {
      return {
        title: 'Update the purchase order',
        description: 'Your buyer returned this order with comments. Review them and resubmit.',
        href: `${base}?tab=purchase-order`,
        owner: 'you',
      }
    }
    if (snapshot.purchaseOrderStatus === 'VERIFIED' && !snapshot.fundingStatus) {
      return {
        title: 'Request working capital',
        description:
          'Your purchase order is confirmed. Tell us how much you need and what it will be spent on.',
        href: `${base}?tab=financing`,
        owner: 'you',
      }
    }
    if (snapshot.fundingStatus === 'DRAFT') {
      if (!snapshot.hasFundingLines) {
        return {
          title: 'Explain how the funds will be used',
          description: 'Break the amount down by material, labour and logistics.',
          href: `${base}?tab=financing`,
          owner: 'you',
        }
      }
      if (!snapshot.hasVendorQuotes) {
        return {
          title: 'Provide vendor quotations',
          description: 'Attach the quotes behind each line so the request can be reviewed.',
          href: `${base}?tab=documents`,
          owner: 'you',
        }
      }
      return {
        title: 'Submit your financing request',
        description: 'Your request is ready to send to AI Logistix for review.',
        href: `${base}?tab=financing`,
        owner: 'you',
      }
    }
    if (snapshot.fundingStatus === 'INFORMATION_REQUESTED') {
      return {
        title: 'Provide the information requested',
        description: 'Your request is on hold until the outstanding items are supplied.',
        href: `${base}?tab=communications`,
        owner: 'you',
      }
    }
    if (['UNDER_AI_LOGISTIX_REVIEW', 'EPC_VERIFICATION_PENDING', 'SUBMITTED'].includes(snapshot.fundingStatus ?? '')) {
      return {
        title: 'AI Logistix is reviewing your request',
        description: 'We will come back to you if anything further is needed.',
        owner: 'other',
        waitingOn: 'AI Logistix',
      }
    }
    if (snapshot.fundingStatus === 'FINANCIER_REVIEW') {
      return {
        title: 'A financing partner is reviewing your request',
        description: 'Nothing is needed from you while the institution completes its review.',
        owner: 'other',
        waitingOn: 'Financing partner',
      }
    }
    if (['APPROVED', 'CONDITIONALLY_APPROVED'].includes(snapshot.fundingStatus ?? '')) {
      return {
        title: 'Waiting for funding to be released',
        description: 'Your request has been approved. Funding will be recorded once advanced.',
        owner: 'other',
        waitingOn: 'Financing partner',
      }
    }
    if (snapshot.fundingStatus === 'FUNDED') {
      if (snapshot.procurementItemCount === 0) {
        return {
          title: 'Add your procurement plan',
          description: 'List the materials and services you need to buy to fulfil this order.',
          href: `${base}?tab=procurement`,
          owner: 'you',
        }
      }
      if (!snapshot.procurementAllDelivered) {
        return {
          title: 'Track your procurement',
          description: 'Update each purchase as it is ordered, shipped and delivered.',
          href: `${base}?tab=procurement`,
          owner: 'you',
        }
      }
      if (!snapshot.deliveryAccepted) {
        return {
          title: 'Record your manufacturing progress',
          description: 'Mark milestones as you complete them so your buyer can follow along.',
          href: `${base}?tab=milestones`,
          owner: 'you',
        }
      }
      if (!snapshot.invoiceSubmitted) {
        return {
          title: 'Submit your invoice',
          description: 'Your buyer has accepted delivery. Raise your invoice to be paid.',
          href: `${base}?tab=financing`,
          owner: 'you',
        }
      }
    }
    if (snapshot.fullyRepaid) {
      return {
        title: 'Nothing further is needed',
        description: 'Financing has been repaid. AI Logistix will close this transaction.',
        owner: 'other',
        waitingOn: 'AI Logistix',
      }
    }
    return {
      title: 'Nothing needs your attention',
      description: 'This transaction is progressing. You will be notified when something is needed.',
      owner: 'other',
    }
  }

  // --- EPC / project owner ------------------------------------------------
  if (scope.isBuyer || scope.isProjectOwner) {
    if (['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_REQUESTED'].includes(snapshot.purchaseOrderStatus)) {
      return {
        title: 'Verify this purchase order',
        description:
          'Confirm the order value, the supplier, the payment terms, and that the order is active.',
        href: `${base}?tab=purchase-order`,
        owner: 'you',
      }
    }
    if (snapshot.procurementAllDelivered && !snapshot.deliveryAccepted) {
      return {
        title: 'Confirm delivery and acceptance',
        description: 'The supplier has recorded delivery. Confirm receipt and acceptance.',
        href: `${base}?tab=milestones`,
        owner: 'you',
      }
    }
    if (snapshot.deliveryAccepted && !snapshot.paymentRecorded) {
      return {
        title: 'Buyer payment outstanding',
        description: 'Delivery is accepted. Payment against the supplier invoice is now due.',
        href: `${base}?tab=financing`,
        owner: 'you',
      }
    }
    return {
      title: 'Nothing needs your attention',
      description: 'You will be notified when this transaction needs your organization.',
      owner: 'other',
    }
  }

  // --- Financier ----------------------------------------------------------
  if (scope.isFinancier) {
    if (snapshot.fundingStatus === 'FINANCIER_REVIEW') {
      return {
        title: 'Review this financing request',
        description:
          'The purchase order is verified and supporting documents are available for review.',
        href: `${base}?tab=financing`,
        owner: 'you',
      }
    }
    if (['APPROVED', 'CONDITIONALLY_APPROVED'].includes(snapshot.fundingStatus ?? '')) {
      return {
        title: 'Record funding',
        description: 'Record the advance once funds have been released.',
        href: `${base}?tab=financing`,
        owner: 'you',
      }
    }
    if (['FUNDED', 'PARTIALLY_REPAID'].includes(snapshot.fundingStatus ?? '')) {
      return {
        title: 'Monitor repayment',
        description: 'Record repayments as they are received from the buyer payment.',
        href: `${base}?tab=financing`,
        owner: 'you',
      }
    }
    return {
      title: 'No action required',
      description: 'This transaction is being progressed by the other parties.',
      owner: 'other',
    }
  }

  // --- AI Logistix --------------------------------------------------------
  if (scope.isStaff) {
    if (snapshot.fundingStatus === 'UNDER_AI_LOGISTIX_REVIEW') {
      return {
        title: 'Review and route this financing request',
        description: 'Check the documentation and route the request to a financing partner.',
        href: `${base}?tab=financing`,
        owner: 'you',
      }
    }
    if (['SUBMITTED', 'VERIFICATION_REQUESTED'].includes(snapshot.purchaseOrderStatus)) {
      return {
        title: 'Buyer verification outstanding',
        description: 'Follow up with the buyer if verification is taking too long.',
        href: `${base}?tab=purchase-order`,
        owner: 'other',
        waitingOn: 'Buyer',
      }
    }
    if (snapshot.fullyRepaid && snapshot.stage !== 'CLOSED') {
      return {
        title: 'Close this transaction',
        description: 'Financing has been repaid in full. The transaction can now be closed.',
        href: `${base}?tab=overview`,
        owner: 'you',
      }
    }
    if (snapshot.fundingStatus === 'FUNDED' && !snapshot.procurementAllDelivered) {
      return {
        title: 'Coordinate procurement and logistics',
        description: 'Keep procurement and shipment milestones current for the financing partner.',
        href: `${base}?tab=logistics`,
        owner: 'you',
      }
    }
    return {
      title: 'Monitoring',
      description: 'No coordinator action is outstanding on this transaction.',
      owner: 'other',
    }
  }

  return {
    title: 'Read-only access',
    description: 'You have been granted visibility of this transaction. No action is required.',
    owner: 'other',
  }
}
