import { createShipmentAction, recordShipmentMilestoneAction } from '@/app/actions/transaction'
import { ActionForm } from '@/components/app/forms'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { SHIPMENT_MODE_LABELS } from '@/server/services/logistics'
import { formatDate, formatDateTime, humanizeEnum } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

const MILESTONE_TYPES = [
  'BOOKED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'RECEIVED_AT_ORIGIN',
  'EXPORT_CLEARED',
  'DEPARTED',
  'ARRIVED',
  'IMPORT_CLEARANCE',
  'CUSTOMS_RELEASED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

export function LogisticsPanel({ transaction, scope }: TransactionPanelProps) {
  // Logistics is AI Logistix's operational responsibility as freight forwarder.
  const canManage = scope.isStaff && !scope.readOnly
  const shipments = transaction.shipments

  return (
    <div className="space-y-5">
      {shipments.length === 0 ? (
        <Card>
          <EmptyState
            title="No shipments recorded"
            description={
              canManage
                ? 'Create a shipment to start tracking freight, customs and delivery against this transaction.'
                : 'AI Logistix will record shipments here as freight is booked.'
            }
          />
        </Card>
      ) : (
        shipments.map((shipment) => (
          <Card key={shipment.id}>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle>
                {shipment.reference} · {shipment.origin} → {shipment.destination}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge tone="neutral">{SHIPMENT_MODE_LABELS[shipment.mode]}</Badge>
                <Badge
                  tone={
                    shipment.deliveryStatus === 'DELIVERED'
                      ? 'positive'
                      : shipment.deliveryStatus === 'EXCEPTION'
                        ? 'critical'
                        : 'info'
                  }
                >
                  {humanizeEnum(shipment.deliveryStatus)}
                </Badge>
                <Badge tone={shipment.customsStatus === 'CLEARED' ? 'positive' : 'caution'}>
                  Customs: {humanizeEnum(shipment.customsStatus)}
                </Badge>
              </div>
            </CardHeader>
            <CardBody className="p-6">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
                <Detail term="Carrier" value={shipment.carrier ?? '—'} />
                <Detail term="Booking" value={shipment.bookingReference ?? '—'} />
                <Detail term="Master bill" value={shipment.masterBill ?? '—'} />
                <Detail term="House bill" value={shipment.houseBill ?? '—'} />
                <Detail term="Container" value={shipment.containerNumber ?? '—'} />
                <Detail term="ETD" value={formatDate(shipment.estimatedDeparture)} />
                <Detail term="ATD" value={formatDate(shipment.actualDeparture)} />
                <Detail term="ETA" value={formatDate(shipment.estimatedArrival)} />
                <Detail term="ATA" value={formatDate(shipment.actualArrival)} />
              </div>

              {/* Milestone timeline */}
              <div className="mt-6 border-t border-ink-100 pt-5">
                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
                  Milestones
                </p>
                {shipment.milestones.length === 0 ? (
                  <p className="text-[13px] text-ink-400">No milestone events recorded yet.</p>
                ) : (
                  <ol className="space-y-0">
                    {shipment.milestones.map((milestone, index) => (
                      <li key={milestone.id} className="relative flex gap-3 pb-3.5 last:pb-0">
                        {index < shipment.milestones.length - 1 ? (
                          <span
                            className="absolute left-[4.5px] top-3 h-full w-px bg-ink-200"
                            aria-hidden
                          />
                        ) : null}
                        <span className="relative z-10 mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full bg-ink-900 ring-4 ring-white" />
                        <div>
                          <p className="text-[13.5px] font-medium text-ink-900">
                            {humanizeEnum(milestone.type)}
                          </p>
                          <p className="text-[12px] text-ink-400">
                            {formatDateTime(milestone.occurredAt)}
                            {milestone.location ? ` · ${milestone.location}` : ''}
                            {milestone.sourceSystem !== 'MANUAL'
                              ? ` · via ${milestone.sourceSystem}`
                              : ''}
                          </p>
                          {milestone.notes ? (
                            <p className="mt-0.5 text-[12.5px] text-ink-500">{milestone.notes}</p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {canManage ? (
                <div className="mt-6 border-t border-ink-100 pt-5">
                  <ActionForm
                    action={recordShipmentMilestoneAction}
                    submitLabel="Record milestone"
                    pendingLabel="Recording…"
                    submitVariant="outline"
                    submitSize="sm"
                    successMessage="Milestone recorded."
                  >
                    <div className="grid gap-3 sm:grid-cols-3">
                      <input type="hidden" name="shipmentId" value={shipment.id} />
                      <input type="hidden" name="transactionId" value={transaction.id} />
                      <Field label="Event" htmlFor={`type-${shipment.id}`} required>
                        <Select id={`type-${shipment.id}`} name="type" defaultValue="BOOKED">
                          {MILESTONE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {humanizeEnum(type)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Occurred at" htmlFor={`occurred-${shipment.id}`} required>
                        <Input
                          id={`occurred-${shipment.id}`}
                          name="occurredAt"
                          type="datetime-local"
                          required
                          defaultValue={new Date().toISOString().slice(0, 16)}
                        />
                      </Field>
                      <Field label="Location" htmlFor={`location-${shipment.id}`}>
                        <Input id={`location-${shipment.id}`} name="location" maxLength={200} />
                      </Field>
                    </div>
                  </ActionForm>
                </div>
              ) : null}
            </CardBody>
          </Card>
        ))
      )}

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Create a shipment</CardTitle>
          </CardHeader>
          <CardBody className="p-5">
            <ActionForm
              action={createShipmentAction}
              submitLabel="Create shipment"
              pendingLabel="Creating…"
              successMessage="Shipment created."
            >
              {(state) => (
                <div className="grid gap-4 sm:grid-cols-3">
                  <input type="hidden" name="transactionId" value={transaction.id} />
                  <Field label="Origin" htmlFor="origin" required error={state.errors?.origin}>
                    <Input id="origin" name="origin" required maxLength={200} placeholder="Durban, ZA" />
                  </Field>
                  <Field
                    label="Destination"
                    htmlFor="destination"
                    required
                    error={state.errors?.destination}
                  >
                    <Input
                      id="destination"
                      name="destination"
                      required
                      maxLength={200}
                      placeholder="Maputo, MZ"
                    />
                  </Field>
                  <Field label="Mode" htmlFor="mode" required>
                    <Select id="mode" name="mode" defaultValue="OCEAN_FCL">
                      {Object.entries(SHIPMENT_MODE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Carrier" htmlFor="carrier">
                    <Input id="carrier" name="carrier" maxLength={120} />
                  </Field>
                  <Field label="Booking reference" htmlFor="bookingReference">
                    <Input id="bookingReference" name="bookingReference" maxLength={120} />
                  </Field>
                  <Field label="Container" htmlFor="containerNumber">
                    <Input id="containerNumber" name="containerNumber" maxLength={120} />
                  </Field>
                  <Field label="ETD" htmlFor="estimatedDeparture">
                    <Input id="estimatedDeparture" name="estimatedDeparture" type="date" />
                  </Field>
                  <Field label="ETA" htmlFor="estimatedArrival">
                    <Input id="estimatedArrival" name="estimatedArrival" type="date" />
                  </Field>
                  <Field label="Notes" htmlFor="shipmentNotes" className="sm:col-span-3">
                    <Textarea id="shipmentNotes" name="notes" rows={2} maxLength={2000} />
                  </Field>
                </div>
              )}
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-ink-400">{term}</p>
      <p className="mt-0.5 text-[13.5px] text-ink-800">{value}</p>
    </div>
  )
}
