import Link from 'next/link'
import { PageHeader } from '@/components/app/shell'
import { Badge, Card, CardHeader, CardTitle, EmptyState, Table, Td, Th } from '@/components/ui'
import { requireActorWith } from '@/lib/session'
import { formatDate, humanizeEnum } from '@/lib/utils'
import { SHIPMENT_MODE_LABELS, listShipments } from '@/server/services/logistics'

export const metadata = { title: 'Logistics' }
export const dynamic = 'force-dynamic'

export default async function LogisticsPage() {
  const actor = await requireActorWith('shipment:manage')
  const shipments = await listShipments(actor, 200)

  const inTransit = shipments.filter((s) => s.deliveryStatus === 'IN_TRANSIT').length
  const delivered = shipments.filter((s) => s.deliveryStatus === 'DELIVERED').length

  return (
    <>
      <PageHeader
        title="Logistics"
        description={`${shipments.length} shipment${shipments.length === 1 ? '' : 's'} · ${inTransit} in transit · ${delivered} delivered.`}
      />

      <Card>
        <CardHeader>
          <CardTitle>All shipments</CardTitle>
        </CardHeader>
        {shipments.length === 0 ? (
          <EmptyState
            title="No shipments"
            description="Shipments created against transactions appear here. Create one from a transaction's Logistics tab."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Transaction</Th>
                <Th>Route</Th>
                <Th>Mode</Th>
                <Th>Carrier</Th>
                <Th>ETA</Th>
                <Th>Latest event</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-ink-50/60">
                  <Td className="font-mono text-[12.5px] font-semibold">{shipment.reference}</Td>
                  <Td>
                    <Link
                      href={`/app/transactions/${shipment.transactionId}?tab=logistics`}
                      className="font-mono text-[12.5px] font-semibold text-ink-700 hover:text-accent-600"
                    >
                      {shipment.transaction.number}
                    </Link>
                  </Td>
                  <Td className="text-[13px]">
                    {shipment.origin} → {shipment.destination}
                  </Td>
                  <Td className="text-ink-500">{SHIPMENT_MODE_LABELS[shipment.mode]}</Td>
                  <Td className="text-ink-500">{shipment.carrier ?? '—'}</Td>
                  <Td className="text-[12.5px] text-ink-500">
                    {formatDate(shipment.actualArrival ?? shipment.estimatedArrival)}
                  </Td>
                  <Td className="text-[12.5px] text-ink-500">
                    {shipment.milestones[0] ? humanizeEnum(shipment.milestones[0].type) : '—'}
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        shipment.deliveryStatus === 'DELIVERED'
                          ? 'positive'
                          : shipment.deliveryStatus === 'EXCEPTION'
                            ? 'critical'
                            : shipment.deliveryStatus === 'IN_TRANSIT'
                              ? 'info'
                              : 'neutral'
                      }
                    >
                      {humanizeEnum(shipment.deliveryStatus)}
                    </Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
