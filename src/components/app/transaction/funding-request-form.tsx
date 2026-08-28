'use client'

import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createFundingRequestAction } from '@/app/actions/transaction'
import { ActionForm } from '@/components/app/forms'
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { CURRENCIES } from '@/lib/countries'
import { formatMoney, toNumber } from '@/lib/utils'

/**
 * The financing request.
 *
 * Deliberately plain language: a supplier is asked what they need and what it
 * will be spent on, not for a "facility structure". The use-of-funds lines are
 * what make disbursement to vendors possible later, so the running total is
 * shown live against the amount requested — the server rejects a mismatch, and
 * the form makes that visible before submission.
 */

const PURPOSES = [
  { value: 'RAW_MATERIALS', label: 'Raw materials' },
  { value: 'IMPORTED_COMPONENTS', label: 'Imported components' },
  { value: 'LOCAL_COMPONENTS', label: 'Local components' },
  { value: 'LABOUR', label: 'Labour' },
  { value: 'LOGISTICS', label: 'Logistics and freight' },
  { value: 'CUSTOMS_AND_TAXES', label: 'Customs and taxes' },
  { value: 'OTHER', label: 'Other' },
]

interface Line {
  key: number
  purpose: string
  description: string
  vendorId: string
  amount: string
}

let nextKey = 1

export function FundingRequestForm({
  transactionId,
  poValue,
  poCurrency,
  vendors,
}: {
  transactionId: string
  poValue: unknown
  poCurrency: string
  vendors: Array<{ id: string; name: string; country: string }>
}) {
  const [requestedAmount, setRequestedAmount] = useState('')
  const [lines, setLines] = useState<Line[]>([
    { key: 0, purpose: 'RAW_MATERIALS', description: '', vendorId: '', amount: '' },
  ])

  const linesTotal = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0),
    [lines],
  )
  const requested = Number(requestedAmount) || 0
  const poAmount = toNumber(poValue) ?? 0
  const mismatch = lines.some((l) => l.amount) && Math.abs(linesTotal - requested) > 0.01
  const overPo = requested > poAmount

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request working capital</CardTitle>
      </CardHeader>
      <CardBody className="p-6">
        <p className="mb-6 max-w-2xl text-[14px] leading-relaxed text-ink-600">
          Your purchase order has been verified. Tell us how much you need and what it will be spent
          on. Breaking the amount down by material, labour and logistics lets funds be paid to your
          vendors directly where that is appropriate.
        </p>

        <ActionForm
          action={createFundingRequestAction}
          submitLabel="Save as draft"
          pendingLabel="Saving…"
          successMessage="Your financing request has been saved. Attach vendor quotations, then submit it for review."
        >
          {(state) => (
            <div className="space-y-6">
              <input type="hidden" name="transactionId" value={transactionId} />

              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Amount needed"
                  htmlFor="requestedAmount"
                  required
                  error={state.errors?.requestedAmount}
                  help={`Purchase order value: ${formatMoney(poValue, poCurrency)}`}
                >
                  <Input
                    id="requestedAmount"
                    name="requestedAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={poAmount || undefined}
                    required
                    value={requestedAmount}
                    onChange={(event) => setRequestedAmount(event.target.value)}
                  />
                </Field>
                <Field label="Currency" htmlFor="currency" required>
                  <Select id="currency" name="currency" defaultValue={poCurrency}>
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} — {currency.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Needed by" htmlFor="requiredFundingDate">
                  <Input id="requiredFundingDate" name="requiredFundingDate" type="date" />
                </Field>
              </div>

              {overPo ? (
                <Alert tone="critical">
                  The amount needed cannot be more than the purchase order value of{' '}
                  {formatMoney(poValue, poCurrency)}.
                </Alert>
              ) : null}

              {/* Use of funds */}
              <div>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-[13px] font-bold uppercase tracking-[0.07em] text-ink-500">
                      What the money will be spent on
                    </h3>
                    <p className="mt-0.5 text-[12.5px] text-ink-400">
                      Add a line for each vendor or cost category. The lines must add up to the
                      amount you are asking for.
                    </p>
                  </div>
                  <p
                    className={`tabular shrink-0 text-[13px] font-semibold ${
                      mismatch ? 'text-critical-600' : 'text-ink-600'
                    }`}
                  >
                    {formatMoney(linesTotal, poCurrency)}
                    {requested > 0 ? ` of ${formatMoney(requested, poCurrency)}` : ''}
                  </p>
                </div>

                <div className="space-y-3">
                  {lines.map((line, index) => (
                    <div
                      key={line.key}
                      className="grid gap-3 rounded border border-ink-200 bg-ink-50/40 p-3 sm:grid-cols-[1fr_1.4fr_1fr_auto_auto]"
                    >
                      <Field label="Category" htmlFor={`purpose-${line.key}`}>
                        <Select
                          id={`purpose-${line.key}`}
                          name={`lines[${index}][purpose]`}
                          value={line.purpose}
                          onChange={(event) => updateLine(line.key, { purpose: event.target.value })}
                        >
                          {PURPOSES.map((purpose) => (
                            <option key={purpose.value} value={purpose.value}>
                              {purpose.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Description" htmlFor={`description-${line.key}`}>
                        <Input
                          id={`description-${line.key}`}
                          name={`lines[${index}][description]`}
                          placeholder="e.g. Structural steel plate"
                          maxLength={300}
                          value={line.description}
                          onChange={(event) =>
                            updateLine(line.key, { description: event.target.value })
                          }
                        />
                      </Field>
                      <Field label="Vendor" htmlFor={`vendor-${line.key}`}>
                        <Select
                          id={`vendor-${line.key}`}
                          name={`lines[${index}][vendorId]`}
                          value={line.vendorId}
                          onChange={(event) => updateLine(line.key, { vendorId: event.target.value })}
                        >
                          <option value="">Not yet chosen</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Amount" htmlFor={`amount-${line.key}`}>
                        <Input
                          id={`amount-${line.key}`}
                          name={`lines[${index}][amount]`}
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-32"
                          value={line.amount}
                          onChange={(event) => updateLine(line.key, { amount: event.target.value })}
                        />
                      </Field>
                      <input type="hidden" name={`lines[${index}][currency]`} value={poCurrency} />
                      <div className="flex items-end pb-1">
                        <button
                          type="button"
                          onClick={() =>
                            setLines((current) =>
                              current.length > 1
                                ? current.filter((l) => l.key !== line.key)
                                : current,
                            )
                          }
                          className="rounded p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-critical-600 disabled:opacity-30"
                          disabled={lines.length === 1}
                          aria-label="Remove this line"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() =>
                    setLines((current) => [
                      ...current,
                      {
                        key: nextKey++,
                        purpose: 'RAW_MATERIALS',
                        description: '',
                        vendorId: '',
                        amount: '',
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add a line
                </Button>

                {mismatch ? (
                  <Alert tone="caution" className="mt-3">
                    Your lines add up to {formatMoney(linesTotal, poCurrency)} but you are asking for{' '}
                    {formatMoney(requested, poCurrency)}. These must match before the request can be
                    saved.
                  </Alert>
                ) : null}
                {state.errors?.lines ? (
                  <Alert tone="critical" className="mt-3">
                    {state.errors.lines.join(' ')}
                  </Alert>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="How will this be repaid?"
                  htmlFor="proposedRepaymentSource"
                  help="Usually the payment you expect from your buyer."
                >
                  <Textarea
                    id="proposedRepaymentSource"
                    name="proposedRepaymentSource"
                    rows={3}
                    maxLength={2000}
                    defaultValue="Payment from the buyer on acceptance of delivery under this purchase order."
                  />
                </Field>
                <Field label="When do you expect the buyer to pay?" htmlFor="expectedBuyerPaymentDate">
                  <Input
                    id="expectedBuyerPaymentDate"
                    name="expectedBuyerPaymentDate"
                    type="date"
                  />
                </Field>
              </div>

              <Field
                label="Anything else the reviewer should know?"
                htmlFor="purposeSummary"
                error={state.errors?.purposeSummary}
              >
                <Textarea id="purposeSummary" name="purposeSummary" rows={3} maxLength={4000} />
              </Field>

              <Alert tone="info">
                Saving creates a draft. You can attach vendor quotations before submitting it.
                Submitting a request does not create any commitment to provide financing — every
                request is reviewed independently by a participating institution.
              </Alert>
            </div>
          )}
        </ActionForm>
      </CardBody>
    </Card>
  )
}
