import { submitPurchaseOrderAction, verifyPurchaseOrderAction } from '@/app/actions/transaction'
import { ActionButton, ActionForm } from '@/components/app/forms'
import { PoStatusBadge } from '@/components/status'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  DefinitionList,
  Field,
  Label,
  Select,
  Textarea,
} from '@/components/ui'
import { formatDate, formatDateTime, formatMoney, humanizeEnum, toNumber } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

const VERIFICATION_METHODS = [
  { value: 'PLATFORM_REVIEW', label: 'Reviewed on the platform' },
  { value: 'DOCUMENT_REVIEW', label: 'Reviewed against our copy of the document' },
  { value: 'ERP_LOOKUP', label: 'Confirmed against our procurement system' },
  { value: 'EMAIL_CONFIRMATION', label: 'Confirmed by email with the issuing team' },
  { value: 'PHONE_CONFIRMATION', label: 'Confirmed by phone with the issuing team' },
  { value: 'OTHER', label: 'Other' },
]

const CHECKLIST = [
  { name: 'poIsActiveConfirmed', label: 'This purchase order was issued by us and remains active' },
  { name: 'valueConfirmed', label: 'The order value shown is correct' },
  { name: 'supplierConfirmed', label: 'The supplier named is the supplier we contracted' },
  { name: 'buyerConfirmed', label: 'The buying entity and project shown are correct' },
  { name: 'paymentTermsConfirmed', label: 'The payment terms shown are correct' },
]

export function PurchaseOrderPanel({ transaction, scope, documents }: TransactionPanelProps) {
  const po = transaction.purchaseOrder
  const canVerify =
    (scope.isBuyer || scope.isProjectOwner || scope.isStaff) &&
    !scope.isSupplier &&
    !scope.readOnly &&
    ['SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_REQUESTED'].includes(po.status)
  const canSubmit =
    (scope.isSupplier || scope.isStaff) && !scope.readOnly && ['DRAFT', 'REJECTED'].includes(po.status)
  const hasPoDocument = documents.some((d) => d.category === 'PURCHASE_ORDER')

  const components = [
    ['Manufacturing', po.manufacturingComponent],
    ['Imported material', po.importedMaterialComponent],
    ['Local labour', po.localLabourComponent],
    ['Logistics', po.logisticsComponent],
    ['Taxes and duties', po.taxesComponent],
  ].filter(([, value]) => toNumber(value) !== null) as Array<[string, unknown]>

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Purchase order {po.poNumber}</CardTitle>
            <PoStatusBadge status={po.status} />
          </CardHeader>
          <CardBody className="p-6">
            <DefinitionList
              columns={3}
              items={[
                { term: 'PO number', value: po.poNumber },
                { term: 'Issue date', value: formatDate(po.issueDate) },
                { term: 'Value', value: formatMoney(po.value, po.currency) },
                { term: 'Currency', value: po.currency },
                { term: 'Payment terms', value: po.paymentTerms ?? '—' },
                { term: 'Incoterm', value: po.incoterm ?? '—' },
                { term: 'Delivery terms', value: po.deliveryTerms ?? '—' },
                { term: 'Requested delivery', value: formatDate(po.requestedDeliveryDate) },
                { term: 'Expiry', value: formatDate(po.expiryDate) },
                {
                  term: 'Advance payment',
                  value: po.advancePaymentAmount
                    ? formatMoney(po.advancePaymentAmount, po.currency)
                    : 'None',
                },
                {
                  term: 'Expected gross margin',
                  value: po.expectedGrossMargin ? `${toNumber(po.expectedGrossMargin)}%` : '—',
                },
                { term: 'Submitted', value: formatDate(po.submittedAt) },
              ]}
            />

            <div className="mt-6 border-t border-ink-100 pt-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
                Scope of supply
              </p>
              <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-700">
                {po.scopeDescription}
              </p>
            </div>

            {po.progressPaymentSchedule || po.finalPaymentTerms ? (
              <div className="mt-6 grid gap-5 border-t border-ink-100 pt-5 sm:grid-cols-2">
                {po.progressPaymentSchedule ? (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
                      Progress payments
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
                      {po.progressPaymentSchedule}
                    </p>
                  </div>
                ) : null}
                {po.finalPaymentTerms ? (
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
                      Final payment
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
                      {po.finalPaymentTerms}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardBody>
        </Card>

        {components.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Cost composition</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <ul className="space-y-2.5">
                {components.map(([label, value]) => {
                  const amount = toNumber(value) ?? 0
                  const share = (toNumber(po.value) ?? 0) > 0 ? (amount / (toNumber(po.value) ?? 1)) * 100 : 0
                  return (
                    <li key={label}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[13.5px] text-ink-700">{label}</span>
                        <span className="tabular text-[13.5px] font-medium text-ink-900">
                          {formatMoney(amount, po.currency)}
                          <span className="ml-2 text-[12px] font-normal text-ink-400">
                            {share.toFixed(0)}%
                          </span>
                        </span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-100">
                        <div className="h-full bg-ink-700" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardBody>
          </Card>
        ) : null}

        {/* Verification history */}
        <Card>
          <CardHeader>
            <CardTitle>Verification history</CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            {po.verifications.length === 0 ? (
              <p className="text-[13.5px] text-ink-400">
                No verification has been recorded on this purchase order.
              </p>
            ) : (
              <ol className="space-y-4">
                {po.verifications.map((verification) => (
                  <li key={verification.id} className="border-l-2 border-ink-200 pl-4">
                    <p className="text-[13.5px] font-semibold text-ink-900">
                      {humanizeEnum(verification.decision)} by {verification.verifiedBy.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-400">
                      {formatDateTime(verification.createdAt)} ·{' '}
                      {humanizeEnum(verification.method)}
                    </p>
                    {verification.comments ? (
                      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">
                        {verification.comments}
                      </p>
                    ) : null}
                    {verification.decision === 'APPROVED' ? (
                      <p className="mt-1.5 text-[12px] text-ink-400">
                        Confirmed: order active, value, supplier, buying entity and payment terms.
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        {canSubmit ? (
          <Card>
            <CardHeader>
              <CardTitle>Submit for verification</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              {!hasPoDocument ? (
                <Alert tone="caution" className="mb-4">
                  No purchase-order document has been attached. Buyers verify faster when a copy of
                  the signed order is available.
                </Alert>
              ) : null}
              <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
                Submitting sends this order to{' '}
                {transaction.buyer.tradingName ?? transaction.buyer.legalName} to confirm. You will
                be able to request financing once it is verified.
              </p>
              <ActionButton
                action={submitPurchaseOrderAction}
                fields={{ purchaseOrderId: po.id }}
                label="Submit purchase order"
                pendingLabel="Submitting…"
                variant="primary"
                size="md"
              />
            </CardBody>
          </Card>
        ) : null}

        {canVerify ? (
          <Card className="border-accent-500/40">
            <CardHeader>
              <CardTitle>Verify this purchase order</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <ActionForm
                action={verifyPurchaseOrderAction}
                submitLabel="Record decision"
                pendingLabel="Recording…"
                successMessage="Your verification decision has been recorded."
              >
                {(state) => (
                  <div className="space-y-4">
                    <input type="hidden" name="purchaseOrderId" value={po.id} />
                    <input type="hidden" name="transactionId" value={transaction.id} />

                    <Field label="Decision" htmlFor="decision" required>
                      <Select id="decision" name="decision" defaultValue="APPROVED">
                        <option value="APPROVED">Verify — this order is genuine and active</option>
                        <option value="CHANGES_REQUESTED">
                          Return to the supplier for correction
                        </option>
                        <option value="REJECTED">Reject — we did not issue this order</option>
                      </Select>
                    </Field>

                    <Field label="How was this confirmed?" htmlFor="method" required>
                      <Select id="method" name="method" defaultValue="PLATFORM_REVIEW">
                        {VERIFICATION_METHODS.map((method) => (
                          <option key={method.value} value={method.value}>
                            {method.label}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <fieldset>
                      <legend className="text-[13px] font-semibold text-ink-800">
                        Confirmation checklist
                      </legend>
                      <p className="mt-0.5 text-[12px] text-ink-400">
                        All items must be confirmed to verify. Each is recorded permanently against
                        your name.
                      </p>
                      <div className="mt-3 space-y-2.5">
                        {CHECKLIST.map((item) => (
                          <Label key={item.name} className="flex items-start gap-2.5 font-normal">
                            <Checkbox name={item.name} className="mt-0.5" />
                            <span className="text-[13px] leading-snug text-ink-700">
                              {item.label}
                            </span>
                          </Label>
                        ))}
                      </div>
                      {state.errors?.valueConfirmed ? (
                        <p className="mt-2 text-[12px] font-medium text-critical-600">
                          {state.errors.valueConfirmed.join(' ')}
                        </p>
                      ) : null}
                    </fieldset>

                    <Field
                      label="Comments"
                      htmlFor="comments"
                      error={state.errors?.comments}
                      help="Required when returning or rejecting an order."
                    >
                      <Textarea id="comments" name="comments" rows={3} maxLength={4000} />
                    </Field>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        ) : null}

        {scope.isSupplier && po.status === 'VERIFIED' ? (
          <Alert tone="positive" title="Purchase order verified">
            Your buyer has confirmed this order. You can now request working capital against it from
            the Financing tab.
          </Alert>
        ) : null}

        {scope.isSupplier && po.status === 'REJECTED' ? (
          <Alert tone="critical" title="Returned by the buyer">
            Review the comments in the verification history, correct the purchase order, and submit
            it again.
          </Alert>
        ) : null}
      </div>
    </div>
  )
}
