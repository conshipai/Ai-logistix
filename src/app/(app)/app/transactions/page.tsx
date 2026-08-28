import Link from 'next/link'
import { PageHeader } from '@/components/app/shell'
import { DemoBadge, FundingStatusBadge, PoStatusBadge, StageBadge } from '@/components/status'
import { ButtonLink, Card, EmptyState, Input, Table, Td, Th } from '@/components/ui'
import { can } from '@/lib/rbac'
import { requireActor } from '@/lib/session'
import { formatDate, formatMoney } from '@/lib/utils'
import { TRANSACTION_LIFECYCLE } from '@/lib/state-machine'
import { humanizeEnum } from '@/lib/utils'
import { listTransactions } from '@/server/services/transactions'

export const metadata = { title: 'Transactions' }
export const dynamic = 'force-dynamic'

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; page?: string }>
}) {
  const actor = await requireActor()
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const pageSize = 50

  const stage = (TRANSACTION_LIFECYCLE as readonly string[]).includes(params.stage ?? '')
    ? (params.stage as (typeof TRANSACTION_LIFECYCLE)[number])
    : undefined

  const { rows, total } = await listTransactions(actor, {
    search: params.q?.trim() || undefined,
    stage,
    take: pageSize,
    skip: (page - 1) * pageSize,
  })

  const isSupplier = actor.organizationType === 'SUPPLIER'
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <>
      <PageHeader
        title="Transactions"
        description={`${total} transaction${total === 1 ? '' : 's'} your organization can see.`}
        actions={
          can(actor, 'po:create') ? (
            <ButtonLink href="/app/purchase-orders/new">Upload a purchase order</ButtonLink>
          ) : null
        }
      />

      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3 p-4" method="get">
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="q"
              className="mb-1 block text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400"
            >
              Search
            </label>
            <Input
              id="q"
              name="q"
              defaultValue={params.q ?? ''}
              placeholder="Transaction number, PO number, supplier or project"
            />
          </div>
          <div>
            <label
              htmlFor="stage"
              className="mb-1 block text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400"
            >
              Stage
            </label>
            <select
              id="stage"
              name="stage"
              defaultValue={params.stage ?? ''}
              className="h-10 rounded border border-ink-200 bg-white px-3 text-sm text-ink-900"
            >
              <option value="">All stages</option>
              {TRANSACTION_LIFECYCLE.map((value) => (
                <option key={value} value={value}>
                  {humanizeEnum(value)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-10 rounded bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-800"
          >
            Apply
          </button>
          {params.q || params.stage ? (
            <Link
              href="/app/transactions"
              className="h-10 rounded px-3 py-2.5 text-sm font-medium text-ink-500 hover:text-ink-900"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No transactions found"
            description={
              params.q || params.stage
                ? 'No transactions match those filters.'
                : isSupplier
                  ? 'Upload the purchase order you have received to open your first transaction.'
                  : 'Transactions appear here once purchase orders are submitted.'
            }
            action={
              can(actor, 'po:create') && !params.q ? (
                <ButtonLink href="/app/purchase-orders/new">Upload a purchase order</ButtonLink>
              ) : null
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Transaction</Th>
                <Th>Supplier</Th>
                <Th>Buyer</Th>
                <Th>Project</Th>
                <Th className="text-right">PO value</Th>
                <Th className="text-right">Financing</Th>
                <Th>PO</Th>
                <Th>Stage</Th>
                <Th>Opened</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((transaction) => {
                const funding = transaction.fundingRequests[0]
                return (
                  <tr key={transaction.id} className="hover:bg-ink-50/60">
                    <Td>
                      <Link
                        href={`/app/transactions/${transaction.id}`}
                        className="font-mono text-[13px] font-semibold text-ink-900 hover:text-accent-600"
                      >
                        {transaction.number}
                      </Link>
                      <p className="text-[11.5px] text-ink-400">
                        {transaction.purchaseOrder.poNumber}
                        {transaction.isDemo ? ' · ' : ''}
                        {transaction.isDemo ? <DemoBadge /> : null}
                      </p>
                    </Td>
                    <Td>{transaction.supplier.tradingName ?? transaction.supplier.legalName}</Td>
                    <Td className="text-ink-600">
                      {transaction.buyer.tradingName ?? transaction.buyer.legalName}
                    </Td>
                    <Td className="text-ink-500">{transaction.project.name}</Td>
                    <Td className="tabular text-right font-medium">
                      {formatMoney(
                        transaction.purchaseOrder.value,
                        transaction.purchaseOrder.currency,
                      )}
                    </Td>
                    <Td className="tabular text-right">
                      {funding ? (
                        <>
                          <span className="font-medium">
                            {formatMoney(
                              funding.approvedAmount ?? funding.requestedAmount,
                              funding.currency,
                            )}
                          </span>
                          <span className="ml-1.5 block text-[11px] text-ink-400">
                            {funding.approvedAmount ? 'approved' : 'requested'}
                          </span>
                        </>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <PoStatusBadge status={transaction.purchaseOrder.status} />
                    </Td>
                    <Td>
                      <div className="flex flex-col items-start gap-1">
                        <StageBadge stage={transaction.stage} />
                        {funding ? <FundingStatusBadge status={funding.status} /> : null}
                      </div>
                    </Td>
                    <Td className="text-[12.5px] text-ink-500">
                      {formatDate(transaction.createdAt)}
                    </Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
          <p className="text-[13px] text-ink-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/app/transactions?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="rounded border border-ink-200 px-3 py-1.5 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/app/transactions?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="rounded border border-ink-200 px-3 py-1.5 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  )
}
