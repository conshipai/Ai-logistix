import type {
  FundingRequestStatus,
  MilestoneStatus,
  ProcurementItemStatus,
  PurchaseOrderStatus,
  TransactionStage,
} from '@prisma/client'
import { Badge } from '@/components/ui'
import { humanizeEnum } from '@/lib/utils'

/**
 * Status presentation.
 *
 * Colour carries meaning consistently across the platform: green is a settled
 * good outcome, amber is waiting on somebody, red is a stop, navy is in flight.
 */

type Tone = 'neutral' | 'info' | 'positive' | 'caution' | 'critical' | 'accent'

const PO_TONES: Record<PurchaseOrderStatus, Tone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'caution',
  UNDER_REVIEW: 'caution',
  VERIFICATION_REQUESTED: 'caution',
  VERIFIED: 'positive',
  REJECTED: 'critical',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
}

const FUNDING_TONES: Record<FundingRequestStatus, Tone> = {
  DRAFT: 'neutral',
  SUBMITTED: 'caution',
  UNDER_AI_LOGISTIX_REVIEW: 'caution',
  EPC_VERIFICATION_PENDING: 'caution',
  FINANCIER_REVIEW: 'caution',
  INFORMATION_REQUESTED: 'accent',
  CONDITIONALLY_APPROVED: 'info',
  APPROVED: 'positive',
  REJECTED: 'critical',
  FUNDED: 'positive',
  PARTIALLY_REPAID: 'info',
  REPAID: 'positive',
  DEFAULT: 'critical',
  CANCELLED: 'neutral',
}

const STAGE_TONES: Record<TransactionStage, Tone> = {
  PURCHASE_ORDER: 'neutral',
  VERIFICATION: 'caution',
  FINANCING_REVIEW: 'caution',
  APPROVED: 'info',
  FUNDED: 'info',
  PROCUREMENT: 'info',
  LOGISTICS: 'info',
  MANUFACTURING: 'info',
  DELIVERY: 'info',
  BUYER_ACCEPTANCE: 'caution',
  PAYMENT: 'caution',
  REPAYMENT: 'caution',
  CLOSED: 'positive',
  CANCELLED: 'neutral',
}

const PROCUREMENT_TONES: Record<ProcurementItemStatus, Tone> = {
  PLANNED: 'neutral',
  QUOTE_RECEIVED: 'neutral',
  APPROVED: 'info',
  ORDERED: 'info',
  IN_PRODUCTION: 'info',
  READY: 'info',
  SHIPPED: 'info',
  CUSTOMS: 'caution',
  DELIVERED: 'positive',
  CANCELLED: 'neutral',
}

const MILESTONE_TONES: Record<MilestoneStatus, Tone> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'positive',
  BLOCKED: 'critical',
  SKIPPED: 'neutral',
}

/** Longer statuses read better with a shorter label in a table cell. */
const FUNDING_LABELS: Partial<Record<FundingRequestStatus, string>> = {
  UNDER_AI_LOGISTIX_REVIEW: 'AI Logistix review',
  EPC_VERIFICATION_PENDING: 'EPC verification',
  FINANCIER_REVIEW: 'Financier review',
  INFORMATION_REQUESTED: 'Information needed',
  CONDITIONALLY_APPROVED: 'Conditional',
  PARTIALLY_REPAID: 'Partly repaid',
}

const STAGE_LABELS: Partial<Record<TransactionStage, string>> = {
  PURCHASE_ORDER: 'Purchase order',
  FINANCING_REVIEW: 'Financing review',
  BUYER_ACCEPTANCE: 'Buyer acceptance',
}

export function PoStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge tone={PO_TONES[status]}>{humanizeEnum(status)}</Badge>
}

export function FundingStatusBadge({ status }: { status: FundingRequestStatus }) {
  return <Badge tone={FUNDING_TONES[status]}>{FUNDING_LABELS[status] ?? humanizeEnum(status)}</Badge>
}

export function StageBadge({ stage }: { stage: TransactionStage }) {
  return <Badge tone={STAGE_TONES[stage]}>{STAGE_LABELS[stage] ?? humanizeEnum(stage)}</Badge>
}

export function ProcurementStatusBadge({ status }: { status: ProcurementItemStatus }) {
  return <Badge tone={PROCUREMENT_TONES[status]}>{humanizeEnum(status)}</Badge>
}

export function MilestoneStatusBadge({ status }: { status: MilestoneStatus }) {
  return <Badge tone={MILESTONE_TONES[status]}>{humanizeEnum(status)}</Badge>
}

export function DemoBadge() {
  return (
    <Badge tone="accent" title="This record is fictional demonstration data.">
      Demo
    </Badge>
  )
}
