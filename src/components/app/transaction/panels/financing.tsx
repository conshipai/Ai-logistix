import {
  createDisbursementAction,
  createInvoiceAction,
  financierDecisionAction,
  recordFundingAction,
  recordRepaymentAction,
  reviewFundingRequestAction,
  submitFundingRequestAction,
  updateDisbursementAction,
  updateInvoiceAction,
} from '@/app/actions/transaction'
import { ActionButton, ActionForm } from '@/components/app/forms'
import { FundingRequestForm } from '@/components/app/transaction/funding-request-form'
import { FundingStatusBadge } from '@/components/status'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DefinitionList,
  EmptyState,
  Field,
  Input,
  Select,
  Table,
  Td,
  Textarea,
  Th,
  Badge,
} from '@/components/ui'
import { CURRENCIES } from '@/lib/countries'
import { formatDate, formatMoney, humanizeEnum, pct, toNumber } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

const PURPOSES = [
  { value: 'RAW_MATERIALS', label: 'Raw materials' },
  { value: 'IMPORTED_COMPONENTS', label: 'Imported components' },
  { value: 'LOCAL_COMPONENTS', label: 'Local components' },
  { value: 'LABOUR', label: 'Labour' },
  { value: 'LOGISTICS', label: 'Logistics' },
  { value: 'CUSTOMS_AND_TAXES', label: 'Customs and taxes' },
  { value: 'OTHER', label: 'Other' },
]

export function FinancingPanel(props: TransactionPanelProps) {
  const { transaction, funding, scope, vendors, financiers } = props
  const po = transaction.purchaseOrder
  const poVerified = po.status === 'VERIFIED'

  // No request yet: the supplier can create one, once the PO is verified.
  if (!funding) {
    if (!poVerified) {
      return (
        <Alert tone="caution" title="The purchase order must be verified first">
          Financing cannot be requested until{' '}
          {transaction.buyer.tradingName ?? transaction.buyer.legalName} has confirmed this purchase
          order. This rule is enforced by the platform, not just hidden here.
        </Alert>
      )
    }
    if ((scope.isSupplier || scope.isStaff) && !scope.readOnly) {
      return <FundingRequestForm transactionId={transaction.id} poValue={po.value} poCurrency={po.currency} vendors={vendors} />
    }
    return (
      <EmptyState
        title="No financing request"
        description="The supplier has not yet requested financing against this purchase order."
      />
    )
  }

  const repaid = funding.repayments.reduce((sum, r) => sum + (toNumber(r.amount) ?? 0), 0)
  const facility = toNumber(funding.approvedAmount) ?? 0
  const outstanding = Math.max(0, facility - repaid)
  const disbursed = funding.disbursements
    .filter((d) => d.authorizationStatus !== 'REJECTED')
    .reduce((sum, d) => sum + (toNumber(d.approvedAmount) ?? 0), 0)

  const canSubmit = (scope.isSupplier || scope.isStaff) && !scope.readOnly && funding.status === 'DRAFT'
  const canReviewInternally =
    scope.isStaff &&
    ['UNDER_AI_LOGISTIX_REVIEW', 'EPC_VERIFICATION_PENDING', 'INFORMATION_REQUESTED'].includes(
      funding.status,
    )
  const canDecide =
    (scope.isFinancier || scope.isStaff) &&
    !scope.readOnly &&
    ['FINANCIER_REVIEW', 'INFORMATION_REQUESTED', 'CONDITIONALLY_APPROVED'].includes(funding.status)
  const canRecordFunding =
    (scope.isFinancier || scope.isStaff) && !scope.readOnly && funding.status === 'APPROVED'
  const canRecordRepayment =
    (scope.isFinancier || scope.isStaff) &&
    !scope.readOnly &&
    ['FUNDED', 'PARTIALLY_REPAID', 'DEFAULT'].includes(funding.status)
  const canManageDisbursements =
    scope.isStaff &&
    ['APPROVED', 'CONDITIONALLY_APPROVED', 'FUNDED', 'PARTIALLY_REPAID'].includes(funding.status)

  return (
    <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Financing request {funding.reference}</CardTitle>
            <FundingStatusBadge status={funding.status} />
          </CardHeader>
          <CardBody className="p-6">
            <DefinitionList
              columns={3}
              items={[
                {
                  term: 'Requested',
                  value: formatMoney(funding.requestedAmount, funding.currency),
                },
                {
                  term: 'Percentage of PO',
                  value: funding.percentageOfPoValue
                    ? `${toNumber(funding.percentageOfPoValue)?.toFixed(1)}%`
                    : '—',
                },
                { term: 'Required by', value: formatDate(funding.requiredFundingDate) },
                {
                  term: 'Approved',
                  value: funding.approvedAmount
                    ? formatMoney(funding.approvedAmount, funding.approvedCurrency ?? funding.currency)
                    : 'No decision yet',
                },
                {
                  term: 'Rate',
                  value: funding.interestRatePct ? `${toNumber(funding.interestRatePct)}%` : '—',
                },
                { term: 'Fee', value: funding.feePct ? `${toNumber(funding.feePct)}%` : '—' },
                {
                  term: 'Financing partner',
                  value: funding.assignedFinancier
                    ? (funding.assignedFinancier.tradingName ?? funding.assignedFinancier.legalName)
                    : 'Not yet assigned',
                },
                { term: 'Funded on', value: formatDate(funding.fundedAt) },
                {
                  term: 'Expected buyer payment',
                  value: formatDate(funding.expectedBuyerPaymentDate),
                },
              ]}
            />

            {funding.purposeSummary ? (
              <div className="mt-6 border-t border-ink-100 pt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
                  Purpose
                </p>
                <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
                  {funding.purposeSummary}
                </p>
              </div>
            ) : null}

            {funding.proposedRepaymentSource ? (
              <div className="mt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
                  Proposed repayment source
                </p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-700">
                  {funding.proposedRepaymentSource}
                </p>
              </div>
            ) : null}

            {funding.conditionsPrecedent ? (
              <Alert tone="caution" title="Conditions precedent" className="mt-5">
                <p className="whitespace-pre-line">{funding.conditionsPrecedent}</p>
              </Alert>
            ) : null}

            {funding.financierNotes ? (
              <div className="mt-5 border-t border-ink-100 pt-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
                  Reviewer notes
                </p>
                <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
                  {funding.financierNotes}
                </p>
              </div>
            ) : null}
          </CardBody>
        </Card>

        {/* Use of funds */}
        <Card>
          <CardHeader>
            <CardTitle>Use of funds</CardTitle>
          </CardHeader>
          {funding.lines.length === 0 ? (
            <CardBody>
              <p className="text-[13.5px] text-ink-400">No breakdown has been provided.</p>
            </CardBody>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Purpose</Th>
                  <Th>Description</Th>
                  <Th>Vendor</Th>
                  <Th className="text-right">Amount</Th>
                  <Th className="text-right">Share</Th>
                </tr>
              </thead>
              <tbody>
                {funding.lines.map((line) => (
                  <tr key={line.id}>
                    <Td>
                      <Badge tone="neutral">{humanizeEnum(line.purpose)}</Badge>
                    </Td>
                    <Td>{line.description}</Td>
                    <Td className="text-ink-500">{line.vendor?.name ?? '—'}</Td>
                    <Td className="tabular text-right font-medium">
                      {formatMoney(line.amount, line.currency)}
                    </Td>
                    <Td className="tabular text-right text-ink-500">
                      {pct(line.amount, funding.requestedAmount) ?? '—'}%
                    </Td>
                  </tr>
                ))}
                <tr className="bg-ink-50">
                  <Td colSpan={3} className="font-semibold">
                    Total requested
                  </Td>
                  <Td className="tabular text-right font-semibold">
                    {formatMoney(funding.requestedAmount, funding.currency)}
                  </Td>
                  <Td className="tabular text-right text-ink-500">
                    {pct(funding.requestedAmount, po.value) ?? '—'}% of PO
                  </Td>
                </tr>
              </tbody>
            </Table>
          )}
        </Card>

        {/* Disbursements */}
        {funding.disbursements.length > 0 || canManageDisbursements ? (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Disbursements</CardTitle>
              <span className="text-[12px] text-ink-400">
                Record keeping only — MConnect does not move money
              </span>
            </CardHeader>
            {funding.disbursements.length > 0 ? (
              <Table>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Payee</Th>
                    <Th>Purpose</Th>
                    <Th className="text-right">Amount</Th>
                    <Th>Authorization</Th>
                    <Th>Payment</Th>
                    {canManageDisbursements ? <Th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {funding.disbursements.map((disbursement) => (
                    <tr key={disbursement.id}>
                      <Td className="font-mono text-[12.5px]">{disbursement.reference}</Td>
                      <Td>{disbursement.payeeName}</Td>
                      <Td className="text-ink-500">{humanizeEnum(disbursement.purpose)}</Td>
                      <Td className="tabular text-right font-medium">
                        {formatMoney(disbursement.approvedAmount, disbursement.approvedCurrency)}
                      </Td>
                      <Td>
                        <Badge
                          tone={
                            disbursement.authorizationStatus === 'AUTHORIZED'
                              ? 'positive'
                              : disbursement.authorizationStatus === 'REJECTED'
                                ? 'critical'
                                : 'caution'
                          }
                        >
                          {humanizeEnum(disbursement.authorizationStatus)}
                        </Badge>
                      </Td>
                      <Td>
                        <Badge
                          tone={disbursement.paymentStatus === 'PAID' ? 'positive' : 'neutral'}
                        >
                          {humanizeEnum(disbursement.paymentStatus)}
                        </Badge>
                      </Td>
                      {canManageDisbursements ? (
                        <Td className="text-right">
                          <div className="flex justify-end gap-2">
                            {disbursement.authorizationStatus === 'PENDING_APPROVAL' ? (
                              <ActionButton
                                action={updateDisbursementAction}
                                fields={{
                                  disbursementId: disbursement.id,
                                  authorizationStatus: 'AUTHORIZED',
                                  transactionId: transaction.id,
                                }}
                                label="Authorize"
                              />
                            ) : null}
                            {disbursement.authorizationStatus === 'AUTHORIZED' &&
                            disbursement.paymentStatus !== 'PAID' ? (
                              <ActionButton
                                action={updateDisbursementAction}
                                fields={{
                                  disbursementId: disbursement.id,
                                  paymentStatus: 'PAID',
                                  transactionId: transaction.id,
                                }}
                                label="Mark paid"
                              />
                            ) : null}
                          </div>
                        </Td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : null}

            {canManageDisbursements ? (
              <CardBody className="border-t border-ink-100 bg-ink-50/40 p-5">
                <ActionForm
                  action={createDisbursementAction}
                  submitLabel="Record disbursement"
                  pendingLabel="Recording…"
                  submitVariant="outline"
                  submitSize="sm"
                >
                  {(state) => (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <input type="hidden" name="fundingRequestId" value={funding.id} />
                      <input type="hidden" name="transactionId" value={transaction.id} />

                      <Field label="Payee" htmlFor="payeeName" required error={state.errors?.payeeName}>
                        <Input id="payeeName" name="payeeName" required maxLength={200} />
                      </Field>
                      <Field label="Vendor" htmlFor="payeeVendorId">
                        <Select id="payeeVendorId" name="payeeVendorId" defaultValue="">
                          <option value="">Not a listed vendor</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label="Amount"
                        htmlFor="approvedAmount"
                        required
                        error={state.errors?.approvedAmount}
                      >
                        <Input
                          id="approvedAmount"
                          name="approvedAmount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          required
                        />
                      </Field>
                      <Field label="Currency" htmlFor="approvedCurrency" required>
                        <Select
                          id="approvedCurrency"
                          name="approvedCurrency"
                          defaultValue={funding.approvedCurrency ?? funding.currency}
                        >
                          {CURRENCIES.map((currency) => (
                            <option key={currency.code} value={currency.code}>
                              {currency.code} — {currency.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Purpose" htmlFor="purpose" required>
                        <Select id="purpose" name="purpose" defaultValue="RAW_MATERIALS">
                          {PURPOSES.map((purpose) => (
                            <option key={purpose.value} value={purpose.value}>
                              {purpose.label}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field
                        label="Bank reference"
                        htmlFor="payeeBankDetails"
                        error={state.errors?.payeeBankDetails}
                        help="Masked reference only, e.g. Standard Bank ****4821. Never enter a full account number."
                      >
                        <Input id="payeeBankDetails" name="payeeBankDetails" maxLength={200} />
                      </Field>
                    </div>
                  )}
                </ActionForm>
              </CardBody>
            ) : null}
          </Card>
        ) : null}

        {/* Repayments */}
        {funding.repayments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Repayments</CardTitle>
            </CardHeader>
            <Table>
              <thead>
                <tr>
                  <Th>Reference</Th>
                  <Th>Received</Th>
                  <Th>Source</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {funding.repayments.map((repayment) => (
                  <tr key={repayment.id}>
                    <Td className="font-mono text-[12.5px]">{repayment.reference}</Td>
                    <Td>{formatDate(repayment.receivedDate)}</Td>
                    <Td className="text-ink-500">{humanizeEnum(repayment.source)}</Td>
                    <Td className="tabular text-right font-medium">
                      {formatMoney(repayment.amount, repayment.currency)}
                    </Td>
                  </tr>
                ))}
                <tr className="bg-ink-50">
                  <Td colSpan={3} className="font-semibold">
                    Outstanding
                  </Td>
                  <Td className="tabular text-right font-semibold">
                    {formatMoney(outstanding, funding.approvedCurrency ?? funding.currency)}
                  </Td>
                </tr>
              </tbody>
            </Table>
          </Card>
        ) : null}

        {/* Invoices */}
        <InvoiceSection {...props} />
      </div>

      {/* Action column */}
      <div className="space-y-5">
        {canSubmit ? (
          <Card className="border-accent-500/40">
            <CardHeader>
              <CardTitle>Submit for review</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
                Your request is a draft. Submitting sends it to AI Logistix, who will review the
                documentation and route it to a financing partner.
              </p>
              <ActionButton
                action={submitFundingRequestAction}
                fields={{ fundingRequestId: funding.id, transactionId: transaction.id }}
                label="Submit financing request"
                pendingLabel="Submitting…"
                variant="accent"
                size="md"
              />
            </CardBody>
          </Card>
        ) : null}

        {canReviewInternally ? (
          <Card className="border-accent-500/40">
            <CardHeader>
              <CardTitle>AI Logistix review</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <ActionForm
                action={reviewFundingRequestAction}
                submitLabel="Record review"
                pendingLabel="Recording…"
              >
                {(state) => (
                  <div className="space-y-4">
                    <input type="hidden" name="fundingRequestId" value={funding.id} />
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <Field label="Decision" htmlFor="reviewAction" required>
                      <Select id="reviewAction" name="action" defaultValue="ROUTE_TO_FINANCIER">
                        <option value="ROUTE_TO_FINANCIER">Route to a financing partner</option>
                        <option value="REQUEST_INFORMATION">Request more information</option>
                        <option value="REJECT">Do not take forward</option>
                      </Select>
                    </Field>
                    <Field
                      label="Financing partner"
                      htmlFor="financierOrganizationId"
                      error={state.errors?.financierOrganizationId}
                      help="Required when routing. The institution gains access to this transaction."
                    >
                      <Select
                        id="financierOrganizationId"
                        name="financierOrganizationId"
                        defaultValue=""
                      >
                        <option value="">Select an institution</option>
                        {financiers.map((financier) => (
                          <option key={financier.id} value={financier.id}>
                            {financier.tradingName ?? financier.legalName}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Notes" htmlFor="reviewNotes" error={state.errors?.notes}>
                      <Textarea id="reviewNotes" name="notes" rows={3} maxLength={4000} />
                    </Field>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        ) : null}

        {canDecide ? (
          <Card className="border-accent-500/40">
            <CardHeader>
              <CardTitle>Financing decision</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <ActionForm
                action={financierDecisionAction}
                submitLabel="Record decision"
                pendingLabel="Recording…"
              >
                {(state) => (
                  <div className="space-y-4">
                    <input type="hidden" name="fundingRequestId" value={funding.id} />
                    <input type="hidden" name="transactionId" value={transaction.id} />

                    <Field label="Decision" htmlFor="financierDecision" required>
                      <Select id="financierDecision" name="decision" defaultValue="APPROVED">
                        <option value="APPROVED">Approve</option>
                        <option value="CONDITIONALLY_APPROVED">
                          Approve subject to conditions
                        </option>
                        <option value="INFORMATION_REQUESTED">Request more information</option>
                        <option value="REJECTED">Decline</option>
                      </Select>
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Approved amount"
                        htmlFor="approvedAmount"
                        error={state.errors?.approvedAmount}
                        help={`Requested: ${formatMoney(funding.requestedAmount, funding.currency)}`}
                      >
                        <Input
                          id="approvedAmount"
                          name="approvedAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          max={toNumber(funding.requestedAmount) ?? undefined}
                        />
                      </Field>
                      <Field label="Currency" htmlFor="approvedCurrency">
                        <Select
                          id="approvedCurrency"
                          name="approvedCurrency"
                          defaultValue={funding.currency}
                        >
                          {CURRENCIES.map((currency) => (
                            <option key={currency.code} value={currency.code}>
                              {currency.code}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Rate (% p.a.)" htmlFor="interestRatePct">
                        <Input
                          id="interestRatePct"
                          name="interestRatePct"
                          type="number"
                          step="0.001"
                          min="0"
                        />
                      </Field>
                      <Field label="Fee (%)" htmlFor="feePct">
                        <Input id="feePct" name="feePct" type="number" step="0.001" min="0" />
                      </Field>
                    </div>

                    <Field label="Conditions precedent" htmlFor="conditionsPrecedent">
                      <Textarea
                        id="conditionsPrecedent"
                        name="conditionsPrecedent"
                        rows={3}
                        maxLength={4000}
                      />
                    </Field>

                    <Field label="Notes" htmlFor="financierNotes" error={state.errors?.notes}>
                      <Textarea id="financierNotes" name="notes" rows={3} maxLength={4000} />
                    </Field>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        ) : null}

        {canRecordFunding ? (
          <Card className="border-positive-500/40">
            <CardHeader>
              <CardTitle>Record funding</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
                Record that the approved facility of{' '}
                {formatMoney(funding.approvedAmount, funding.approvedCurrency ?? funding.currency)}{' '}
                has been advanced.
              </p>
              <ActionForm
                action={recordFundingAction}
                submitLabel="Record funding"
                pendingLabel="Recording…"
              >
                <input type="hidden" name="fundingRequestId" value={funding.id} />
                <input type="hidden" name="transactionId" value={transaction.id} />
                <div className="space-y-3">
                  <Field label="Funded on" htmlFor="fundedDate" required>
                    <Input
                      id="fundedDate"
                      name="fundedDate"
                      type="date"
                      required
                      defaultValue={new Date().toISOString().slice(0, 10)}
                    />
                  </Field>
                  <Field label="Notes" htmlFor="fundingNotes">
                    <Textarea id="fundingNotes" name="notes" rows={2} maxLength={2000} />
                  </Field>
                </div>
              </ActionForm>
            </CardBody>
          </Card>
        ) : null}

        {canRecordRepayment ? (
          <Card>
            <CardHeader>
              <CardTitle>Record repayment</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <p className="mb-4 text-[13px] text-ink-500">
                Outstanding:{' '}
                <span className="tabular font-semibold text-ink-900">
                  {formatMoney(outstanding, funding.approvedCurrency ?? funding.currency)}
                </span>
              </p>
              <ActionForm
                action={recordRepaymentAction}
                submitLabel="Record repayment"
                pendingLabel="Recording…"
              >
                {(state) => (
                  <div className="space-y-3">
                    <input type="hidden" name="fundingRequestId" value={funding.id} />
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <Field label="Amount" htmlFor="repaymentAmount" required error={state.errors?.amount}>
                      <Input
                        id="repaymentAmount"
                        name="amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        max={outstanding || undefined}
                        required
                        defaultValue={outstanding || undefined}
                      />
                    </Field>
                    <Field label="Currency" htmlFor="repaymentCurrency" required>
                      <Select
                        id="repaymentCurrency"
                        name="currency"
                        defaultValue={funding.approvedCurrency ?? funding.currency}
                      >
                        {CURRENCIES.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.code}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Received on" htmlFor="receivedDate" required>
                      <Input
                        id="receivedDate"
                        name="receivedDate"
                        type="date"
                        required
                        defaultValue={new Date().toISOString().slice(0, 10)}
                      />
                    </Field>
                    <Field label="Source" htmlFor="repaymentSource" required>
                      <Select id="repaymentSource" name="source" defaultValue="BUYER_PAYMENT">
                        <option value="BUYER_PAYMENT">Buyer payment</option>
                        <option value="SUPPLIER_FUNDS">Supplier funds</option>
                        <option value="INSURANCE_CLAIM">Insurance claim</option>
                        <option value="OTHER">Other</option>
                      </Select>
                    </Field>
                    <Field label="External reference" htmlFor="externalReference">
                      <Input id="externalReference" name="externalReference" maxLength={120} />
                    </Field>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Facility position</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3 p-5 text-[13.5px]">
            <PositionRow label="Purchase order value" value={formatMoney(po.value, po.currency)} />
            <PositionRow
              label="Requested"
              value={formatMoney(funding.requestedAmount, funding.currency)}
            />
            <PositionRow
              label="Approved"
              value={
                funding.approvedAmount
                  ? formatMoney(funding.approvedAmount, funding.approvedCurrency ?? funding.currency)
                  : '—'
              }
            />
            <PositionRow
              label="Disbursed"
              value={formatMoney(disbursed, funding.approvedCurrency ?? funding.currency)}
            />
            <PositionRow
              label="Repaid"
              value={formatMoney(repaid, funding.approvedCurrency ?? funding.currency)}
            />
            <div className="border-t border-ink-100 pt-3">
              <PositionRow
                label="Outstanding"
                value={formatMoney(outstanding, funding.approvedCurrency ?? funding.currency)}
                strong
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

function PositionRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className={strong ? 'font-semibold text-ink-900' : 'text-ink-500'}>{label}</span>
      <span className={`tabular ${strong ? 'font-bold text-ink-900' : 'font-medium text-ink-800'}`}>
        {value}
      </span>
    </div>
  )
}

function InvoiceSection({ transaction, scope }: TransactionPanelProps) {
  const canRaise = (scope.isSupplier || scope.isStaff) && !scope.readOnly
  const canSettle = (scope.isBuyer || scope.isProjectOwner || scope.isStaff) && !scope.readOnly

  if (transaction.invoices.length === 0 && !canRaise) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoices</CardTitle>
      </CardHeader>
      {transaction.invoices.length > 0 ? (
        <Table>
          <thead>
            <tr>
              <Th>Invoice</Th>
              <Th>Issued</Th>
              <Th>Due</Th>
              <Th className="text-right">Amount</Th>
              <Th>Status</Th>
              {canSettle ? <Th /> : null}
            </tr>
          </thead>
          <tbody>
            {transaction.invoices.map((invoice) => (
              <tr key={invoice.id}>
                <Td className="font-semibold">{invoice.invoiceNumber}</Td>
                <Td>{formatDate(invoice.issueDate)}</Td>
                <Td className="text-ink-500">{formatDate(invoice.dueDate)}</Td>
                <Td className="tabular text-right font-medium">
                  {formatMoney(invoice.amount, invoice.currency)}
                </Td>
                <Td>
                  <Badge
                    tone={
                      invoice.paidAt ? 'positive' : invoice.acceptedAt ? 'info' : 'caution'
                    }
                  >
                    {invoice.paidAt ? 'Paid' : invoice.acceptedAt ? 'Accepted' : 'Submitted'}
                  </Badge>
                </Td>
                {canSettle ? (
                  <Td className="text-right">
                    <div className="flex justify-end gap-2">
                      {!invoice.acceptedAt ? (
                        <ActionButton
                          action={updateInvoiceAction}
                          fields={{
                            invoiceId: invoice.id,
                            accepted: 'true',
                            transactionId: transaction.id,
                          }}
                          label="Accept"
                        />
                      ) : null}
                      {invoice.acceptedAt && !invoice.paidAt ? (
                        <ActionButton
                          action={updateInvoiceAction}
                          fields={{
                            invoiceId: invoice.id,
                            paidAmount: String(toNumber(invoice.amount) ?? 0),
                            transactionId: transaction.id,
                          }}
                          label="Record payment"
                        />
                      ) : null}
                    </div>
                  </Td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </Table>
      ) : null}

      {canRaise ? (
        <CardBody className="border-t border-ink-100 bg-ink-50/40 p-5">
          <ActionForm
            action={createInvoiceAction}
            submitLabel="Submit invoice"
            pendingLabel="Submitting…"
            submitVariant="outline"
            submitSize="sm"
          >
            {(state) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="transactionId" value={transaction.id} />
                <Field
                  label="Invoice number"
                  htmlFor="invoiceNumber"
                  required
                  error={state.errors?.invoiceNumber}
                >
                  <Input id="invoiceNumber" name="invoiceNumber" required maxLength={80} />
                </Field>
                <Field label="Amount" htmlFor="invoiceAmount" required error={state.errors?.amount}>
                  <Input
                    id="invoiceAmount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                  />
                </Field>
                <Field label="Issue date" htmlFor="issueDate" required>
                  <Input
                    id="issueDate"
                    name="issueDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </Field>
                <Field label="Due date" htmlFor="dueDate">
                  <Input id="dueDate" name="dueDate" type="date" />
                </Field>
                <Field label="Currency" htmlFor="invoiceCurrency" required>
                  <Select
                    id="invoiceCurrency"
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
                <Field label="Description" htmlFor="invoiceDescription" className="sm:col-span-2">
                  <Textarea id="invoiceDescription" name="description" rows={2} maxLength={2000} />
                </Field>
              </div>
            )}
          </ActionForm>
        </CardBody>
      ) : null}
    </Card>
  )
}
