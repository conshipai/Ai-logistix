import Link from 'next/link'
import { PageHeader } from '@/components/app/shell'
import { FundingStatusBadge } from '@/components/status'
import { Card, CardBody, CardHeader, CardTitle, EmptyState, Metric, Table, Td, Th } from '@/components/ui'
import { countryName } from '@/lib/countries'
import { requireActor } from '@/lib/session'
import { formatDate, formatMoney, pct, toNumber } from '@/lib/utils'
import { financierExposure } from '@/server/services/analytics'
import { financierPipeline } from '@/server/services/funding'

export const metadata = { title: 'Financing' }
export const dynamic = 'force-dynamic'

export default async function FinancingPage() {
  const actor = await requireActor()
  const [pipeline, exposure] = await Promise.all([
    financierPipeline(actor),
    financierExposure(actor),
  ])

  return (
    <>
      <PageHeader
        title="Financing"
        description="Transactions shared with your institution, your current exposure, and repayment position."
      />

      <Card className="mb-5">
        <CardBody className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
          <Metric label="Awaiting review" value={exposure.awaitingReview} />
          <Metric
            label="Approved"
            value={formatMoney(exposure.approved, 'USD', { compact: true })}
          />
          <Metric
            label="Funded"
            value={formatMoney(exposure.funded, 'USD', { compact: true })}
          />
          <Metric
            label="Current exposure"
            value={formatMoney(exposure.exposure, 'USD', { compact: true })}
            tone="accent"
            sub={`${exposure.lateCount} past expected buyer payment`}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Financing pipeline</CardTitle>
          <span className="text-[12px] text-ink-400">
            Weighted financing-to-PO ratio:{' '}
            {exposure.weightedFinancingToPoRatio === null
              ? 'no data'
              : `${exposure.weightedFinancingToPoRatio}%`}
          </span>
        </CardHeader>
        {pipeline.length === 0 ? (
          <EmptyState
            title="No financing requests"
            description="Transactions shared with your institution will appear here for review."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Transaction</Th>
                <Th>Supplier</Th>
                <Th>Project</Th>
                <Th className="text-right">PO value</Th>
                <Th className="text-right">Requested</Th>
                <Th className="text-right">Approved</Th>
                <Th className="text-right">Repaid</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {pipeline.map((request) => {
                const repaid = request.repayments.reduce(
                  (sum, r) => sum + (toNumber(r.amount) ?? 0),
                  0,
                )
                return (
                  <tr key={request.id} className="hover:bg-ink-50/60">
                    <Td>
                      <Link
                        href={`/app/transactions/${request.transactionId}?tab=financing`}
                        className="font-mono text-[13px] font-semibold text-ink-900 hover:text-accent-600"
                      >
                        {request.transaction.number}
                      </Link>
                      <p className="text-[11.5px] text-ink-400">
                        {request.transaction.purchaseOrder.poNumber}
                        {request.requiredFundingDate
                          ? ` · needed ${formatDate(request.requiredFundingDate)}`
                          : ''}
                      </p>
                    </Td>
                    <Td>
                      {request.transaction.supplier.tradingName ??
                        request.transaction.supplier.legalName}
                      <p className="text-[11.5px] text-ink-400">
                        {countryName(request.transaction.supplier.country)}
                      </p>
                    </Td>
                    <Td className="text-ink-500">{request.transaction.project.name}</Td>
                    <Td className="tabular text-right">
                      {formatMoney(
                        request.transaction.purchaseOrder.value,
                        request.transaction.purchaseOrder.currency,
                      )}
                    </Td>
                    <Td className="tabular text-right font-medium">
                      {formatMoney(request.requestedAmount, request.currency)}
                      <span className="block text-[11px] font-normal text-ink-400">
                        {pct(request.requestedAmount, request.transaction.purchaseOrder.value) ?? '—'}%
                        of PO
                      </span>
                    </Td>
                    <Td className="tabular text-right">
                      {request.approvedAmount
                        ? formatMoney(
                            request.approvedAmount,
                            request.approvedCurrency ?? request.currency,
                          )
                        : '—'}
                    </Td>
                    <Td className="tabular text-right text-ink-600">
                      {repaid > 0
                        ? formatMoney(repaid, request.approvedCurrency ?? request.currency)
                        : '—'}
                    </Td>
                    <Td>
                      <FundingStatusBadge status={request.status} />
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
