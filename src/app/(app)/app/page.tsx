import Link from 'next/link'
import { AlertTriangle, ArrowRight, FileCheck2, MessageSquareWarning } from 'lucide-react'
import { PageHeader } from '@/components/app/shell'
import { FundingStatusBadge, PoStatusBadge, StageBadge } from '@/components/status'
import {
  Alert,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Metric,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { isStaff } from '@/lib/rbac'
import { requireActor } from '@/lib/session'
import { formatDate, formatMoney, humanizeEnum } from '@/lib/utils'
import {
  dashboardData,
  fundingAwaitingDecision,
  purchaseOrdersAwaitingVerification,
} from '@/server/services/dashboard'
import { financierExposure } from '@/server/services/analytics'

export const metadata = { title: 'Dashboard' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const data = await dashboardData(actor)

  const isSupplier = actor.organizationType === 'SUPPLIER'
  const isBuyerSide = actor.organizationType === 'EPC' || actor.organizationType === 'PROJECT_OWNER'
  const isFinancier = actor.organizationType === 'FINANCIAL_INSTITUTION'
  const staff = isStaff(actor)

  const [awaitingVerification, awaitingDecision, exposure] = await Promise.all([
    isBuyerSide || staff ? purchaseOrdersAwaitingVerification(actor) : Promise.resolve([]),
    isFinancier || staff ? fundingAwaitingDecision(actor) : Promise.resolve([]),
    isFinancier || staff ? financierExposure(actor) : Promise.resolve(null),
  ])

  return (
    <>
      <PageHeader
        eyebrow={actor.organizationName}
        title={greeting(actor.name)}
        description={roleBlurb(actor.organizationType)}
        actions={
          isSupplier ? (
            <ButtonLink href="/app/purchase-orders/new">Upload a purchase order</ButtonLink>
          ) : null
        }
      />

      {params.denied ? (
        <Alert tone="critical" className="mb-6">
          You do not have permission to open that page.
        </Alert>
      ) : null}

      {/* Things needing attention */}
      {(data.pendingApprovalCount > 0 || data.openRfiCount > 0 || data.overdueMilestoneCount > 0) ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <AttentionCard
            icon={FileCheck2}
            count={data.pendingApprovalCount}
            label="Awaiting your approval"
            href="/app/transactions"
            tone={data.pendingApprovalCount > 0 ? 'accent' : 'neutral'}
          />
          <AttentionCard
            icon={MessageSquareWarning}
            count={data.openRfiCount}
            label="Open information requests"
            href="/app/transactions"
            tone={data.openRfiCount > 0 ? 'caution' : 'neutral'}
          />
          <AttentionCard
            icon={AlertTriangle}
            count={data.overdueMilestoneCount}
            label="Overdue milestones"
            href="/app/transactions"
            tone={data.overdueMilestoneCount > 0 ? 'critical' : 'neutral'}
          />
        </div>
      ) : null}

      {/* Headline figures, chosen by role */}
      <Card className="mb-6">
        <CardBody className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
          {isFinancier && exposure ? (
            <>
              <Metric label="Awaiting review" value={exposure.awaitingReview} />
              <Metric label="Approved" value={formatMoney(exposure.approved, 'USD', { compact: true })} />
              <Metric
                label="Current exposure"
                value={formatMoney(exposure.exposure, 'USD', { compact: true })}
                tone="accent"
              />
              <Metric
                label="Financing to PO"
                value={
                  exposure.weightedFinancingToPoRatio === null
                    ? 'No data'
                    : `${exposure.weightedFinancingToPoRatio}%`
                }
                sub="Weighted across the portfolio"
              />
            </>
          ) : (
            <>
              <Metric
                label="Active transactions"
                value={data.activeTransactions}
                sub={`${data.transactionCount} in total`}
              />
              <Metric
                label="Purchase-order value"
                value={formatMoney(data.totalPoValue, 'USD', { compact: true })}
              />
              <Metric
                label={isSupplier ? 'Financing approved' : 'Financing enabled'}
                value={formatMoney(data.approvedFinancing, 'USD', { compact: true })}
                tone="accent"
              />
              <Metric
                label={isSupplier ? 'Buyer payments pending' : 'Suppliers participating'}
                value={
                  isSupplier
                    ? formatMoney(data.buyerPaymentsPending, 'USD', { compact: true })
                    : data.suppliersParticipating
                }
              />
            </>
          )}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          {/* Buyer-side queue */}
          {awaitingVerification.length > 0 ? (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>Purchase orders awaiting verification</CardTitle>
                <span className="text-[12px] font-semibold text-accent-600">
                  {awaitingVerification.length} outstanding
                </span>
              </CardHeader>
              <Table>
                <thead>
                  <tr>
                    <Th>PO number</Th>
                    <Th>Supplier</Th>
                    <Th>Project</Th>
                    <Th className="text-right">Value</Th>
                    <Th>Submitted</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {awaitingVerification.map((po) => (
                    <tr key={po.id}>
                      <Td className="font-semibold">{po.poNumber}</Td>
                      <Td>{po.supplier.tradingName ?? po.supplier.legalName}</Td>
                      <Td className="text-ink-500">{po.project.name}</Td>
                      <Td className="tabular text-right font-medium">
                        {formatMoney(po.value, po.currency)}
                      </Td>
                      <Td className="text-ink-500">{formatDate(po.submittedAt)}</Td>
                      <Td className="text-right">
                        {po.transaction ? (
                          <Link
                            href={`/app/transactions/${po.transaction.id}?tab=purchase-order`}
                            className="text-[13px] font-semibold text-accent-600 hover:text-accent-700"
                          >
                            Verify
                          </Link>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ) : null}

          {/* Financier queue */}
          {awaitingDecision.length > 0 ? (
            <Card>
              <CardHeader className="flex items-center justify-between">
                <CardTitle>
                  {staff ? 'Financing requests in review' : 'Opportunities awaiting your review'}
                </CardTitle>
                <span className="text-[12px] font-semibold text-accent-600">
                  {awaitingDecision.length} open
                </span>
              </CardHeader>
              <Table>
                <thead>
                  <tr>
                    <Th>Transaction</Th>
                    <Th>Supplier</Th>
                    <Th className="text-right">PO value</Th>
                    <Th className="text-right">Requested</Th>
                    <Th>Status</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {awaitingDecision.map((request) => (
                    <tr key={request.id}>
                      <Td className="font-semibold">{request.transaction.number}</Td>
                      <Td>
                        {request.transaction.supplier.tradingName ??
                          request.transaction.supplier.legalName}
                      </Td>
                      <Td className="tabular text-right">
                        {formatMoney(
                          request.transaction.purchaseOrder.value,
                          request.transaction.purchaseOrder.currency,
                        )}
                      </Td>
                      <Td className="tabular text-right font-medium">
                        {formatMoney(request.requestedAmount, request.currency)}
                      </Td>
                      <Td>
                        <FundingStatusBadge status={request.status} />
                      </Td>
                      <Td className="text-right">
                        <Link
                          href={`/app/transactions/${request.transactionId}?tab=financing`}
                          className="text-[13px] font-semibold text-accent-600 hover:text-accent-700"
                        >
                          Review
                        </Link>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          ) : null}

          {/* Transactions */}
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Recent transactions</CardTitle>
              <Link
                href="/app/transactions"
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-500 hover:text-ink-900"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            {data.recentTransactions.length === 0 ? (
              <EmptyState
                title="No transactions yet"
                description={
                  isSupplier
                    ? 'Upload the purchase order you have received to open your first transaction.'
                    : 'Transactions will appear here as they are created.'
                }
                action={
                  isSupplier ? (
                    <ButtonLink href="/app/purchase-orders/new">Upload a purchase order</ButtonLink>
                  ) : null
                }
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Transaction</Th>
                    <Th>{isSupplier ? 'Buyer' : 'Supplier'}</Th>
                    <Th className="text-right">PO value</Th>
                    <Th>PO</Th>
                    <Th>Stage</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map((transaction) => {
                    const counterparty = isSupplier ? transaction.buyer : transaction.supplier
                    return (
                      <tr key={transaction.id} className="hover:bg-ink-50/60">
                        <Td>
                          <Link
                            href={`/app/transactions/${transaction.id}`}
                            className="font-semibold text-ink-900 hover:text-accent-600"
                          >
                            {transaction.number}
                          </Link>
                          <span className="ml-2 text-[12px] text-ink-400">
                            {transaction.purchaseOrder.poNumber}
                          </span>
                        </Td>
                        <Td>{counterparty.tradingName ?? counterparty.legalName}</Td>
                        <Td className="tabular text-right font-medium">
                          {formatMoney(
                            transaction.purchaseOrder.value,
                            transaction.purchaseOrder.currency,
                          )}
                        </Td>
                        <Td>
                          <PoStatusBadge status={transaction.purchaseOrder.status} />
                        </Td>
                        <Td>
                          <StageBadge stage={transaction.stage} />
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {/* Open requests for information */}
          <Card>
            <CardHeader>
              <CardTitle>Information requests</CardTitle>
            </CardHeader>
            {data.rfis.length === 0 ? (
              <CardBody>
                <p className="text-[13px] text-ink-400">Nothing outstanding.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.rfis.slice(0, 6).map((rfi) => (
                  <li key={rfi.id}>
                    <Link
                      href={`/app/transactions/${rfi.transactionId}?tab=communications`}
                      className="block px-5 py-3 transition-colors hover:bg-ink-50/60"
                    >
                      <p className="text-[13.5px] font-semibold text-ink-900">{rfi.subject}</p>
                      <p className="mt-0.5 text-[12px] text-ink-400">
                        {rfi.transaction.number} · raised by {rfi.raisedBy.name}
                        {rfi.dueDate ? ` · due ${formatDate(rfi.dueDate)}` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Upcoming milestones */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming milestones</CardTitle>
            </CardHeader>
            {data.upcoming.length === 0 ? (
              <CardBody>
                <p className="text-[13px] text-ink-400">No milestones outstanding.</p>
              </CardBody>
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.upcoming.slice(0, 7).map((milestone) => (
                  <li key={milestone.id} className="px-5 py-2.5">
                    <Link
                      href={`/app/transactions/${milestone.transactionId}?tab=milestones`}
                      className="block"
                    >
                      <p className="text-[13px] font-medium text-ink-800">{milestone.title}</p>
                      <p className="text-[11.5px] text-ink-400">
                        {milestone.transaction.number}
                        {milestone.dueDate ? ` · due ${formatDate(milestone.dueDate)}` : ''}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Logistics / financing summary */}
          <Card>
            <CardHeader>
              <CardTitle>{isFinancier ? 'Portfolio' : 'Execution'}</CardTitle>
            </CardHeader>
            <CardBody className="grid grid-cols-2 gap-5">
              {isFinancier && exposure ? (
                <>
                  <Metric label="Funded" value={formatMoney(exposure.funded, 'USD', { compact: true })} />
                  <Metric label="Repaid" value={formatMoney(exposure.repaid, 'USD', { compact: true })} />
                  <Metric label="Late" value={exposure.lateCount} />
                  <Metric
                    label="Underlying PO"
                    value={formatMoney(exposure.underlyingPoValue, 'USD', { compact: true })}
                  />
                </>
              ) : (
                <>
                  <Metric label="Shipments in transit" value={data.shipmentsInTransit} />
                  <Metric
                    label="Funding drawn"
                    value={formatMoney(data.fundedAmount, 'USD', { compact: true })}
                  />
                  <Metric
                    label="Repaid"
                    value={formatMoney(data.repaidAmount, 'USD', { compact: true })}
                  />
                  <Metric label="Missing PO documents" value={data.missingDocumentCount} />
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  )
}

function AttentionCard({
  icon: Icon,
  count,
  label,
  href,
  tone,
}: {
  icon: typeof AlertTriangle
  count: number
  label: string
  href: string
  tone: 'neutral' | 'accent' | 'caution' | 'critical'
}) {
  const tones = {
    neutral: 'border-ink-200 text-ink-400',
    accent: 'border-accent-500/40 bg-accent-50/60 text-accent-700',
    caution: 'border-caution-500/40 bg-caution-50/60 text-caution-700',
    critical: 'border-critical-500/40 bg-critical-50/60 text-critical-700',
  }
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg border bg-white px-4 py-3 transition-colors hover:border-ink-400 ${tones[tone]}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      <div>
        <p className="tabular text-xl font-semibold leading-none">{count}</p>
        <p className="mt-1 text-[12.5px] font-medium text-ink-600">{label}</p>
      </div>
    </Link>
  )
}

function greeting(name: string): string {
  const first = name.split(/\s+/)[0] ?? name
  return `Good day, ${first}`
}

function roleBlurb(type: string): string {
  switch (type) {
    case 'SUPPLIER':
      return 'Your purchase orders, financing requests and what needs your attention next.'
    case 'EPC':
      return 'Purchase orders awaiting your verification, and how your suppliers are executing.'
    case 'PROJECT_OWNER':
      return 'Local-content participation and execution across your projects.'
    case 'FINANCIAL_INSTITUTION':
      return 'Transactions shared with your institution, your exposure and repayment position.'
    case 'AI_LOGISTIX':
      return 'Every transaction on the platform, and the operational exceptions that need work.'
    default:
      return `Transactions you have been granted visibility of. ${humanizeEnum(type)}.`
  }
}
