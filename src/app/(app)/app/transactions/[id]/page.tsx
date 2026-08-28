import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CircleDot, Clock } from 'lucide-react'
import { LifecycleTrack } from '@/components/app/lifecycle'
import { DemoBadge, FundingStatusBadge, PoStatusBadge, StageBadge } from '@/components/status'
import { Badge, Card, CardBody, CardHeader, CardTitle, Metric, ProgressBar } from '@/components/ui'
import { NotFoundError } from '@/lib/rbac'
import { requireActor } from '@/lib/session'
import { formatMoney, pct, toNumber } from '@/lib/utils'
import { getTransactionDetail } from '@/server/services/transactions'
import { listTransactionDocuments } from '@/server/services/documents'
import { listComments, mentionableUsers } from '@/server/services/communications'
import { listVendorsForTransaction, procurementProgress } from '@/server/services/procurement'
import { logisticsProgress } from '@/server/services/logistics'
import { activeFinanciers } from '@/server/services/organizations'
import { nextActionFor } from '@/server/services/next-action'
import { transactionAuditHistory } from '@/server/services/transactions'
import { TransactionTabs } from '@/components/app/transaction/tabs'
import { NextActionCard } from '@/components/app/transaction/next-action-card'

export const dynamic = 'force-dynamic'

const TABS = [
  'overview',
  'purchase-order',
  'financing',
  'procurement',
  'logistics',
  'milestones',
  'documents',
  'communications',
  'audit',
] as const

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actor = await requireActor()
  try {
    const { transaction } = await getTransactionDetail(actor, id)
    return { title: transaction.number }
  } catch {
    return { title: 'Transaction' }
  }
}

export default async function TransactionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const actor = await requireActor()
  const { id } = await params
  const { tab: rawTab } = await searchParams
  const tab = (TABS as readonly string[]).includes(rawTab ?? '') ? rawTab! : 'overview'

  let detail
  try {
    detail = await getTransactionDetail(actor, id)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }
  const { transaction, scope } = detail

  const funding = transaction.fundingRequests[0] ?? null
  const [documents, comments, mentionable, vendors, financiers, auditEvents] = await Promise.all([
    listTransactionDocuments(actor, id),
    tab === 'communications' ? listComments(actor, id) : Promise.resolve([]),
    tab === 'communications' ? mentionableUsers(actor, id) : Promise.resolve([]),
    tab === 'procurement' || tab === 'financing'
      ? listVendorsForTransaction(actor, id)
      : Promise.resolve([]),
    scope.isStaff ? activeFinanciers(actor) : Promise.resolve([]),
    tab === 'audit' ? transactionAuditHistory(actor, id) : Promise.resolve([]),
  ])

  const supplierProfile = await (async () => {
    const { prisma } = await import('@/lib/db')
    return prisma.supplierProfile.findUnique({
      where: { organizationId: transaction.supplierId },
      select: { capabilities: true },
    })
  })()

  const repaidTotal = funding
    ? funding.repayments.reduce((sum, r) => sum + (toNumber(r.amount) ?? 0), 0)
    : 0
  const openRfiForActor = transaction.rfis.some(
    (rfi) => rfi.status === 'OPEN' && rfi.assignedToOrganizationId === actor.organizationId,
  )

  const nextAction = nextActionFor(actor, scope, {
    id: transaction.id,
    stage: transaction.stage,
    purchaseOrderStatus: transaction.purchaseOrder.status,
    hasPoDocument: documents.some((d) => d.category === 'PURCHASE_ORDER'),
    fundingStatus: funding?.status ?? null,
    hasFundingLines: (funding?.lines.length ?? 0) > 0,
    hasVendorQuotes: documents.some((d) => d.category === 'VENDOR_QUOTE'),
    openRfiForActor,
    procurementItemCount: transaction.procurementItems.length,
    procurementAllDelivered:
      transaction.procurementItems.length > 0 &&
      transaction.procurementItems.every((p) => ['DELIVERED', 'CANCELLED'].includes(p.status)),
    deliveryAccepted: transaction.milestones.some(
      (m) => m.type === 'BUYER_ACCEPTED' && m.status === 'COMPLETED',
    ),
    invoiceSubmitted: transaction.invoices.some((i) => i.submittedAt !== null),
    paymentRecorded: transaction.invoices.some((i) => i.paidAt !== null),
    fullyRepaid: funding?.status === 'REPAID',
    supplierProfileComplete: Boolean(supplierProfile?.capabilities),
  })

  const procurementPct = procurementProgress(transaction.procurementItems)
  const logisticsPct = logisticsProgress(transaction.shipments)
  const milestonePct =
    transaction.milestones.length > 0
      ? Math.round(
          (transaction.milestones.filter((m) => m.status === 'COMPLETED').length /
            transaction.milestones.length) *
            100,
        )
      : null

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <Link
          href="/app/transactions"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All transactions
        </Link>
      </div>

      <Card className="mb-5">
        <CardBody className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-mono text-[22px] font-semibold tracking-tight text-ink-900">
                  {transaction.number}
                </h1>
                <StageBadge stage={transaction.stage} />
                {transaction.isDemo ? <DemoBadge /> : null}
              </div>
              <p className="mt-2 text-[14px] text-ink-500">
                <span className="font-medium text-ink-800">
                  {transaction.supplier.tradingName ?? transaction.supplier.legalName}
                </span>
                {' → '}
                <span className="font-medium text-ink-800">
                  {transaction.buyer.tradingName ?? transaction.buyer.legalName}
                </span>
                {' · '}
                {transaction.project.name}
                {' · PO '}
                <span className="font-medium text-ink-800">{transaction.purchaseOrder.poNumber}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PoStatusBadge status={transaction.purchaseOrder.status} />
              {funding ? <FundingStatusBadge status={funding.status} /> : null}
              {scope.readOnly ? <Badge tone="neutral">Read-only</Badge> : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-5 border-t border-ink-100 pt-5 lg:grid-cols-4">
            <Metric
              label="PO value"
              value={formatMoney(transaction.purchaseOrder.value, transaction.purchaseOrder.currency)}
            />
            <Metric
              label="Requested financing"
              value={
                funding ? formatMoney(funding.requestedAmount, funding.currency) : 'Not requested'
              }
              sub={
                funding?.percentageOfPoValue
                  ? `${toNumber(funding.percentageOfPoValue)?.toFixed(1)}% of PO`
                  : undefined
              }
              tone={funding ? 'default' : 'muted'}
            />
            <Metric
              label="Approved financing"
              value={
                funding?.approvedAmount
                  ? formatMoney(funding.approvedAmount, funding.approvedCurrency ?? funding.currency)
                  : 'No decision yet'
              }
              tone={funding?.approvedAmount ? 'accent' : 'muted'}
              sub={
                funding?.approvedAmount
                  ? `${pct(funding.approvedAmount, transaction.purchaseOrder.value) ?? '—'}% of PO`
                  : undefined
              }
            />
            <Metric
              label="Repaid"
              value={
                funding?.approvedAmount
                  ? formatMoney(repaidTotal, funding.approvedCurrency ?? funding.currency)
                  : '—'
              }
              tone={funding?.status === 'REPAID' ? 'default' : 'muted'}
              sub={
                funding?.approvedAmount
                  ? `${pct(repaidTotal, funding.approvedAmount) ?? 0}% of facility`
                  : undefined
              }
            />
          </div>
        </CardBody>
      </Card>

      {/* Lifecycle + next action */}
      <div className="mb-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Transaction lifecycle</CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            <LifecycleTrack stage={transaction.stage} />
            <div className="mt-7 grid gap-4 border-t border-ink-100 pt-5 sm:grid-cols-3">
              <ProgressBar label="Procurement" value={procurementPct} />
              <ProgressBar label="Logistics" value={logisticsPct} />
              <ProgressBar label="Execution milestones" value={milestonePct} tone="accent" />
            </div>
          </CardBody>
        </Card>

        <NextActionCard action={nextAction} />
      </div>

      {/* Tabs */}
      <TransactionTabs
        actor={actor}
        scope={scope}
        transaction={transaction}
        funding={funding}
        documents={documents}
        comments={comments}
        mentionable={mentionable}
        vendors={vendors}
        financiers={financiers}
        auditEvents={auditEvents}
        activeTab={tab}
      />
    </>
  )
}

export { CircleDot, Clock }
