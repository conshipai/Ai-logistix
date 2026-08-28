import {
  createProcurementItemAction,
  createVendorAction,
  updateProcurementStatusAction,
} from '@/app/actions/transaction'
import { ActionForm, StatusSelect } from '@/components/app/forms'
import { ProcurementStatusBadge } from '@/components/status'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Label,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from '@/components/ui'
import { COUNTRY_OPTIONS, CURRENCIES, countryName } from '@/lib/countries'
import { PROCUREMENT_ITEM_TRANSITIONS } from '@/lib/state-machine'
import { formatDate, formatMoney, humanizeEnum, toNumber } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

export function ProcurementPanel({ transaction, scope, vendors }: TransactionPanelProps) {
  const canManage = (scope.isSupplier || scope.isStaff) && !scope.readOnly
  const items = transaction.procurementItems
  const total = items.reduce((sum, item) => sum + (toNumber(item.amount) ?? 0), 0)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Procurement plan</CardTitle>
          {items.length > 0 ? (
            <span className="tabular text-[13px] font-semibold text-ink-700">
              {formatMoney(total, items[0]!.currency)} across {items.length} line
              {items.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </CardHeader>

        {items.length === 0 ? (
          <EmptyState
            title="No procurement lines yet"
            description={
              canManage
                ? 'List the materials, components and services you need to buy to fulfil this order.'
                : 'The supplier has not yet added a procurement plan.'
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Item</Th>
                <Th>Vendor</Th>
                <Th>Origin</Th>
                <Th className="text-right">Quantity</Th>
                <Th className="text-right">Amount</Th>
                <Th>Required by</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <p className="font-medium">{item.itemName}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-[12px] text-ink-400">{item.description}</p>
                    ) : null}
                  </Td>
                  <Td className="text-ink-600">{item.vendor?.name ?? '—'}</Td>
                  <Td className="text-ink-500">{countryName(item.countryOfOrigin)}</Td>
                  <Td className="tabular text-right">
                    {toNumber(item.quantity)?.toLocaleString()} {item.unit ?? ''}
                  </Td>
                  <Td className="tabular text-right font-medium">
                    {formatMoney(item.amount, item.currency)}
                  </Td>
                  <Td className="text-ink-500">{formatDate(item.requiredByDate)}</Td>
                  <Td>
                    {canManage ? (
                      <StatusSelect
                        action={updateProcurementStatusAction}
                        fields={{ procurementItemId: item.id, transactionId: transaction.id }}
                        name="status"
                        value={item.status}
                        ariaLabel={`Status for ${item.itemName}`}
                        options={[
                          { value: item.status, label: humanizeEnum(item.status) },
                          ...PROCUREMENT_ITEM_TRANSITIONS[item.status].map((next) => ({
                            value: next,
                            label: humanizeEnum(next),
                          })),
                        ]}
                      />
                    ) : (
                      <ProcurementStatusBadge status={item.status} />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {canManage ? (
        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Add a procurement line</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <ActionForm
                action={createProcurementItemAction}
                submitLabel="Add line"
                pendingLabel="Adding…"
                successMessage="Procurement line added."
              >
                {(state) => (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <input type="hidden" name="transactionId" value={transaction.id} />

                    <Field label="Item" htmlFor="itemName" required error={state.errors?.itemName}>
                      <Input
                        id="itemName"
                        name="itemName"
                        required
                        maxLength={200}
                        placeholder="e.g. Structural steel plate, S355"
                      />
                    </Field>
                    <Field label="Vendor" htmlFor="procVendorId">
                      <Select id="procVendorId" name="vendorId" defaultValue="">
                        <option value="">Not yet chosen</option>
                        {vendors.map((vendor) => (
                          <option key={vendor.id} value={vendor.id}>
                            {vendor.name} — {countryName(vendor.country)}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field
                      label="Quantity"
                      htmlFor="quantity"
                      required
                      error={state.errors?.quantity}
                    >
                      <Input
                        id="quantity"
                        name="quantity"
                        type="number"
                        step="0.001"
                        min="0.001"
                        required
                        defaultValue="1"
                      />
                    </Field>
                    <Field label="Unit" htmlFor="unit">
                      <Input id="unit" name="unit" maxLength={40} placeholder="tonnes, each, m" />
                    </Field>

                    <Field label="Amount" htmlFor="procAmount" required error={state.errors?.amount}>
                      <Input
                        id="procAmount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                      />
                    </Field>
                    <Field label="Currency" htmlFor="procCurrency" required>
                      <Select
                        id="procCurrency"
                        name="currency"
                        defaultValue={transaction.purchaseOrder.currency}
                      >
                        {CURRENCIES.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field label="Country of origin" htmlFor="countryOfOrigin">
                      <Select id="countryOfOrigin" name="countryOfOrigin" defaultValue="">
                        <option value="">Not known</option>
                        {COUNTRY_OPTIONS.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Required by" htmlFor="requiredByDate">
                      <Input id="requiredByDate" name="requiredByDate" type="date" />
                    </Field>

                    <Field label="Expected purchase" htmlFor="expectedPurchaseDate">
                      <Input id="expectedPurchaseDate" name="expectedPurchaseDate" type="date" />
                    </Field>
                    <Field label="Expected arrival" htmlFor="expectedArrivalDate">
                      <Input id="expectedArrivalDate" name="expectedArrivalDate" type="date" />
                    </Field>

                    <Field label="Description" htmlFor="procDescription" className="sm:col-span-2">
                      <Textarea id="procDescription" name="description" rows={2} maxLength={2000} />
                    </Field>

                    <Label className="flex items-center gap-2 font-normal sm:col-span-2">
                      <Checkbox name="logisticsRequired" />
                      <span className="text-[13px] text-ink-700">
                        This item needs freight forwarding — AI Logistix will coordinate it
                      </span>
                    </Label>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add a vendor</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
                Vendors you add here can be named on procurement lines and on your use-of-funds
                breakdown, which is what allows funds to be paid to them directly.
              </p>
              <ActionForm
                action={createVendorAction}
                submitLabel="Add vendor"
                pendingLabel="Adding…"
                submitVariant="outline"
                submitSize="sm"
                successMessage="Vendor added."
              >
                {(state) => (
                  <div className="space-y-4">
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <Field label="Vendor name" htmlFor="vendorName" required error={state.errors?.name}>
                      <Input id="vendorName" name="name" required maxLength={200} />
                    </Field>
                    <Field label="Country" htmlFor="vendorCountry" required error={state.errors?.country}>
                      <Select id="vendorCountry" name="country" required defaultValue="">
                        <option value="" disabled>
                          Select a country
                        </option>
                        {COUNTRY_OPTIONS.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Contact name" htmlFor="vendorContact">
                      <Input id="vendorContact" name="contactName" maxLength={120} />
                    </Field>
                    <Field label="Contact email" htmlFor="vendorEmail" error={state.errors?.contactEmail}>
                      <Input id="vendorEmail" name="contactEmail" type="email" maxLength={254} />
                    </Field>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
