import { LifecycleList } from '@/components/app/lifecycle'
import { ActionButton, ActionForm } from '@/components/app/forms'
import { closeTransactionAction, shareTransactionAction } from '@/app/actions/transaction'
import { Badge, Card, CardBody, CardHeader, CardTitle, Checkbox, DefinitionList, Field, Label, Select } from '@/components/ui'
import { countryName } from '@/lib/countries'
import { formatDate, formatDateTime, formatMoney, humanizeEnum, toNumber } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

export function OverviewPanel({ transaction, funding, scope, financiers }: TransactionPanelProps) {
  const po = transaction.purchaseOrder
  const repaid = funding
    ? funding.repayments.reduce((sum, r) => sum + (toNumber(r.amount) ?? 0), 0)
    : 0
  const fullyRepaid = funding?.status === 'REPAID'

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Transaction summary</CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            <DefinitionList
              columns={3}
              items={[
                { term: 'Transaction', value: <span className="font-mono">{transaction.number}</span> },
                { term: 'Purchase order', value: po.poNumber },
                { term: 'Stage', value: humanizeEnum(transaction.stage) },
                {
                  term: 'Supplier',
                  value: (
                    <>
                      {transaction.supplier.tradingName ?? transaction.supplier.legalName}
                      <span className="ml-1.5 text-[12px] text-ink-400">
                        {countryName(transaction.supplier.country)}
                      </span>
                    </>
                  ),
                },
                {
                  term: 'Buyer',
                  value: transaction.buyer.tradingName ?? transaction.buyer.legalName,
                },
                { term: 'Project', value: transaction.project.name },
                {
                  term: 'Project owner',
                  value:
                    transaction.project.projectOwner.tradingName ??
                    transaction.project.projectOwner.legalName,
                },
                {
                  term: 'EPC',
                  value: transaction.project.epc
                    ? (transaction.project.epc.tradingName ?? transaction.project.epc.legalName)
                    : '—',
                },
                { term: 'Opened', value: formatDate(transaction.createdAt) },
                { term: 'PO value', value: formatMoney(po.value, po.currency) },
                { term: 'Payment terms', value: po.paymentTerms ?? '—' },
                { term: 'Requested delivery', value: formatDate(po.requestedDeliveryDate) },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financing position</CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            {funding ? (
              <DefinitionList
                columns={3}
                items={[
                  { term: 'Reference', value: <span className="font-mono">{funding.reference}</span> },
                  { term: 'Status', value: humanizeEnum(funding.status) },
                  {
                    term: 'Financing partner',
                    value: funding.assignedFinancier
                      ? (funding.assignedFinancier.tradingName ?? funding.assignedFinancier.legalName)
                      : 'Not yet assigned',
                  },
                  {
                    term: 'Requested',
                    value: formatMoney(funding.requestedAmount, funding.currency),
                  },
                  {
                    term: 'Approved',
                    value: funding.approvedAmount
                      ? formatMoney(funding.approvedAmount, funding.approvedCurrency ?? funding.currency)
                      : '—',
                  },
                  {
                    term: 'Repaid to date',
                    value: formatMoney(repaid, funding.approvedCurrency ?? funding.currency),
                  },
                  { term: 'Funded on', value: formatDate(funding.fundedAt) },
                  {
                    term: 'Expected buyer payment',
                    value: formatDate(funding.expectedBuyerPaymentDate),
                  },
                  { term: 'Repaid on', value: formatDate(funding.repaidAt) },
                ]}
              />
            ) : (
              <p className="text-[13.5px] text-ink-400">
                No financing has been requested on this transaction.
              </p>
            )}
          </CardBody>
        </Card>

        {/* Parties with access */}
        <Card>
          <CardHeader>
            <CardTitle>Who can see this transaction</CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            <ul className="space-y-2.5">
              <AccessRow
                name={transaction.supplier.tradingName ?? transaction.supplier.legalName}
                role="Supplier"
              />
              <AccessRow
                name={transaction.buyer.tradingName ?? transaction.buyer.legalName}
                role="Buyer"
              />
              <AccessRow
                name={
                  transaction.project.projectOwner.tradingName ??
                  transaction.project.projectOwner.legalName
                }
                role="Project owner"
              />
              <AccessRow name="AI Logistix" role="Transaction coordinator" />
              {transaction.access.map((grant) => (
                <AccessRow
                  key={grant.id}
                  name={grant.organization.tradingName ?? grant.organization.legalName}
                  role={grant.readOnly ? 'Read-only observer' : humanizeEnum(grant.organization.type)}
                />
              ))}
            </ul>

            {scope.isStaff && financiers.length > 0 ? (
              <div className="mt-6 border-t border-ink-100 pt-5">
                <ActionForm
                  action={shareTransactionAction}
                  submitLabel="Share transaction"
                  pendingLabel="Sharing…"
                  submitVariant="outline"
                  submitSize="sm"
                >
                  <input type="hidden" name="transactionId" value={transaction.id} />
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <Field label="Share with an institution" htmlFor="shareOrg">
                      <Select id="shareOrg" name="organizationId" required defaultValue="">
                        <option value="" disabled>
                          Select an organization
                        </option>
                        {financiers.map((financier) => (
                          <option key={financier.id} value={financier.id}>
                            {financier.tradingName ?? financier.legalName}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Label className="flex items-center gap-2 pb-2.5">
                      <Checkbox name="readOnly" />
                      Read-only
                    </Label>
                  </div>
                </ActionForm>
              </div>
            ) : null}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Lifecycle</CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            <LifecycleList stage={transaction.stage} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stage history</CardTitle>
          </CardHeader>
          <CardBody className="max-h-80 overflow-y-auto p-5">
            {transaction.stageHistory.length === 0 ? (
              <p className="text-[13px] text-ink-400">No stage changes recorded.</p>
            ) : (
              <ol className="space-y-3">
                {[...transaction.stageHistory].reverse().map((event) => (
                  <li key={event.id} className="text-[12.5px]">
                    <p className="font-semibold text-ink-800">
                      {event.fromStage ? `${humanizeEnum(event.fromStage)} → ` : ''}
                      {humanizeEnum(event.toStage)}
                    </p>
                    <p className="text-ink-400">{formatDateTime(event.createdAt)}</p>
                    {event.note ? <p className="mt-0.5 text-ink-500">{event.note}</p> : null}
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>

        {scope.isStaff && transaction.stage !== 'CLOSED' ? (
          <Card>
            <CardHeader>
              <CardTitle>Close transaction</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
                {fullyRepaid || !funding
                  ? 'All financing on this transaction is settled. Closing archives the transaction and marks any outstanding milestones as skipped.'
                  : 'A transaction can only be closed once its financing is repaid, rejected or cancelled.'}
              </p>
              <ActionButton
                action={closeTransactionAction}
                fields={{ transactionId: transaction.id }}
                label="Close transaction"
                pendingLabel="Closing…"
                variant="primary"
                size="sm"
                confirm="Close this transaction? This cannot be undone."
              />
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function AccessRow({ name, role }: { name: string; role: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="text-[13.5px] font-medium text-ink-800">{name}</span>
      <Badge tone="neutral">{role}</Badge>
    </li>
  )
}
