import { PageHeader } from '@/components/app/shell'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Metric,
  ProgressBar,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { requireActorWith } from '@/lib/session'
import { formatMoney, humanizeEnum } from '@/lib/utils'
import { SHIPMENT_MODE_LABELS } from '@/server/services/logistics'
import { programmeMetrics, supplierSectors, transactionsByProject } from '@/server/services/analytics'

export const metadata = { title: 'Programme analytics' }
export const dynamic = 'force-dynamic'

/**
 * Programme analytics.
 *
 * Every figure on this page is computed from stored records. Metrics the
 * platform cannot yet derive are named explicitly as unavailable rather than
 * estimated or filled with a placeholder number.
 */
export default async function AnalyticsPage() {
  const actor = await requireActorWith('analytics:read:program')
  const [metrics, byProject, sectors] = await Promise.all([
    programmeMetrics(actor),
    transactionsByProject(actor),
    supplierSectors(actor),
  ])

  if (metrics.transactionCount === 0) {
    return (
      <>
        <PageHeader title="Programme analytics" />
        <Card>
          <EmptyState
            title="No data yet"
            description="Analytics are computed from actual transactions. Figures appear here once purchase orders have been submitted."
          />
        </Card>
      </>
    )
  }

  const maxShipmentMode = Math.max(1, ...metrics.shipmentsByMode.map((m) => m.count))

  return (
    <>
      <PageHeader
        title="Programme analytics"
        description="Computed from stored records only. Nothing on this page is estimated."
      />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>Programme totals</CardTitle>
        </CardHeader>
        <CardBody className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
          <Metric
            label="Total PO value"
            value={formatMoney(metrics.totalPoValue, 'USD', { compact: true })}
            sub={`${metrics.transactionCount} transactions`}
          />
          <Metric
            label="Financing requested"
            value={formatMoney(metrics.totalFinancingRequested, 'USD', { compact: true })}
          />
          <Metric
            label="Financing approved"
            value={formatMoney(metrics.totalFinancingApproved, 'USD', { compact: true })}
            tone="accent"
          />
          <Metric
            label="Financing funded"
            value={formatMoney(metrics.totalFinancingFunded, 'USD', { compact: true })}
          />
          <Metric
            label="Repaid"
            value={formatMoney(metrics.totalRepaid, 'USD', { compact: true })}
          />
          <Metric
            label="Outstanding exposure"
            value={formatMoney(metrics.outstandingExposure, 'USD', { compact: true })}
          />
          <Metric
            label="Local suppliers supported"
            value={metrics.supplierCount}
            sub={`across ${metrics.supplierCountries} ${metrics.supplierCountries === 1 ? 'country' : 'countries'}`}
          />
          <Metric
            label="Financing to PO"
            value={
              metrics.averageFinancingToPoRatio === null
                ? 'No data'
                : `${metrics.averageFinancingToPoRatio}%`
            }
            tone={metrics.averageFinancingToPoRatio === null ? 'muted' : 'default'}
          />
        </CardBody>
      </Card>

      <div className="mb-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Local procurement and imported inputs</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5 p-6">
            <Metric
              label="Local procurement enabled"
              value={formatMoney(metrics.localProcurementEnabled, 'USD', { compact: true })}
              sub="Manufacturing and local labour components of purchase orders"
            />
            <Metric
              label="Imported inputs supporting local manufacturing"
              value={formatMoney(metrics.importedInputValue, 'USD', { compact: true })}
              sub="Imported material components — the addressable market for international exporters"
            />
            <div className="border-t border-ink-100 pt-4">
              <ProgressBar
                label="Transactions completed"
                value={
                  metrics.transactionCount > 0
                    ? Math.round((metrics.completedTransactionCount / metrics.transactionCount) * 100)
                    : null
                }
                tone="positive"
              />
              <p className="mt-1.5 text-[12px] text-ink-400">
                {metrics.completedTransactionCount} closed · {metrics.activeTransactionCount} active
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution and logistics</CardTitle>
          </CardHeader>
          <CardBody className="space-y-5 p-6">
            <div className="grid grid-cols-2 gap-5">
              <Metric label="Shipments" value={metrics.logisticsShipmentCount} />
              <Metric
                label="On-time delivery"
                value={
                  metrics.onTimeDeliveryRate === null
                    ? 'No data'
                    : `${metrics.onTimeDeliveryRate}%`
                }
                tone={metrics.onTimeDeliveryRate === null ? 'muted' : 'default'}
              />
              <Metric
                label="Average financing duration"
                value={
                  metrics.averageFinancingDurationDays === null
                    ? 'No data'
                    : `${metrics.averageFinancingDurationDays} days`
                }
                tone={metrics.averageFinancingDurationDays === null ? 'muted' : 'default'}
              />
              <Metric label="Defaults recorded" value={metrics.defaultCount} />
            </div>

            {metrics.shipmentsByMode.length > 0 ? (
              <div className="border-t border-ink-100 pt-4">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
                  Volume by transport mode
                </p>
                <ul className="space-y-2.5">
                  {metrics.shipmentsByMode.map((mode) => (
                    <li key={mode.mode}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[13px] text-ink-700">
                          {SHIPMENT_MODE_LABELS[mode.mode as keyof typeof SHIPMENT_MODE_LABELS] ??
                            humanizeEnum(mode.mode)}
                        </span>
                        <span className="tabular text-[13px] font-medium text-ink-900">
                          {mode.count}
                        </span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full bg-ink-700"
                          style={{ width: `${(mode.count / maxShipmentMode) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>By project</CardTitle>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th className="text-right">Transactions</Th>
                <Th className="text-right">Suppliers</Th>
                <Th className="text-right">Completed</Th>
                <Th className="text-right">PO value</Th>
              </tr>
            </thead>
            <tbody>
              {byProject.map((project) => (
                <tr key={project.id}>
                  <Td className="font-medium">{project.name}</Td>
                  <Td className="tabular text-right">{project.count}</Td>
                  <Td className="tabular text-right">{project.supplierCount}</Td>
                  <Td className="tabular text-right">{project.completed}</Td>
                  <Td className="tabular text-right font-medium">
                    {formatMoney(project.value, 'USD', { compact: true })}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Supplier sectors</CardTitle>
          </CardHeader>
          <Table>
            <thead>
              <tr>
                <Th>Sector</Th>
                <Th className="text-right">Suppliers</Th>
              </tr>
            </thead>
            <tbody>
              {sectors.map((sector) => (
                <tr key={sector.sector}>
                  <Td>{sector.sector}</Td>
                  <Td className="tabular text-right">{sector.count}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      {metrics.unavailable.length > 0 ? (
        <Alert tone="info" title="Metrics not yet available" className="mt-5">
          The platform does not hold the data to compute these, so they are reported as unavailable
          rather than estimated: {metrics.unavailable.join(', ')}. They become available as the
          corresponding records accumulate, or once the relevant fields are captured.
        </Alert>
      ) : null}
    </>
  )
}
