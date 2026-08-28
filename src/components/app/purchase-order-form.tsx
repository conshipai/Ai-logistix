'use client'

import { createPurchaseOrderAction, updatePurchaseOrderAction } from '@/app/actions/transaction'
import { ActionForm } from '@/components/app/forms'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
  Textarea,
} from '@/components/ui'
import { CURRENCIES, INCOTERMS } from '@/lib/countries'
import { toNumber } from '@/lib/utils'

/**
 * Purchase-order entry.
 *
 * Grouped so a supplier meets the required fields first and the analytical
 * breakdown second — the cost composition drives local-content reporting but
 * must never block someone from recording the order they have in hand.
 */

interface Option {
  id: string
  label: string
}

export interface PurchaseOrderDefaults {
  id?: string
  poNumber?: string
  projectId?: string
  buyerId?: string
  issueDate?: Date | string | null
  currency?: string
  value?: unknown
  paymentTerms?: string | null
  incoterm?: string | null
  deliveryTerms?: string | null
  requestedDeliveryDate?: Date | string | null
  scopeDescription?: string
  manufacturingComponent?: unknown
  importedMaterialComponent?: unknown
  localLabourComponent?: unknown
  logisticsComponent?: unknown
  taxesComponent?: unknown
  expectedGrossMargin?: unknown
  advancePaymentAmount?: unknown
  progressPaymentSchedule?: string | null
  finalPaymentTerms?: string | null
  expiryDate?: Date | string | null
}

function dateValue(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined
  const d = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10)
}

function numberValue(value: unknown): string | undefined {
  const n = toNumber(value)
  return n === null ? undefined : String(n)
}

export function PurchaseOrderForm({
  projects,
  buyers,
  defaults,
  mode,
}: {
  projects: Option[]
  buyers: Option[]
  defaults?: PurchaseOrderDefaults
  mode: 'create' | 'edit'
}) {
  const editing = mode === 'edit'

  return (
    <ActionForm
      action={editing ? updatePurchaseOrderAction : createPurchaseOrderAction}
      submitLabel={editing ? 'Save changes' : 'Create purchase order'}
      pendingLabel="Saving…"
      successMessage={editing ? 'Purchase order saved.' : undefined}
    >
      {(state) => (
        <div className="space-y-5">
          {editing && defaults?.id ? (
            <input type="hidden" name="purchaseOrderId" value={defaults.id} />
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>The order</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 p-6 sm:grid-cols-2">
              <Field
                label="Purchase order number"
                htmlFor="poNumber"
                required
                error={state.errors?.poNumber}
                help="Exactly as it appears on the document from your buyer."
              >
                <Input
                  id="poNumber"
                  name="poNumber"
                  required
                  maxLength={80}
                  defaultValue={defaults?.poNumber}
                />
              </Field>

              <Field
                label="Issue date"
                htmlFor="issueDate"
                required
                error={state.errors?.issueDate}
              >
                <Input
                  id="issueDate"
                  name="issueDate"
                  type="date"
                  required
                  defaultValue={dateValue(defaults?.issueDate)}
                />
              </Field>

              <Field
                label="Who issued this order?"
                htmlFor="buyerId"
                required
                error={state.errors?.buyerId}
                help="The EPC contractor or project owner named on the purchase order."
              >
                <Select id="buyerId" name="buyerId" required defaultValue={defaults?.buyerId ?? ''}>
                  <option value="" disabled>
                    Select the buying organization
                  </option>
                  {buyers.map((buyer) => (
                    <option key={buyer.id} value={buyer.id}>
                      {buyer.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Project"
                htmlFor="projectId"
                required
                error={state.errors?.projectId}
              >
                <Select
                  id="projectId"
                  name="projectId"
                  required
                  defaultValue={defaults?.projectId ?? ''}
                >
                  <option value="" disabled>
                    Select the project
                  </option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Order value" htmlFor="value" required error={state.errors?.value}>
                <Input
                  id="value"
                  name="value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  defaultValue={numberValue(defaults?.value)}
                />
              </Field>

              <Field label="Currency" htmlFor="currency" required error={state.errors?.currency}>
                <Select id="currency" name="currency" defaultValue={defaults?.currency ?? 'USD'}>
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} — {currency.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="What is being supplied?"
                htmlFor="scopeDescription"
                required
                error={state.errors?.scopeDescription}
                className="sm:col-span-2"
              >
                <Textarea
                  id="scopeDescription"
                  name="scopeDescription"
                  rows={4}
                  required
                  maxLength={4000}
                  defaultValue={defaults?.scopeDescription}
                  placeholder="Describe the goods or services covered by this order."
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Terms and delivery</CardTitle>
            </CardHeader>
            <CardBody className="grid gap-4 p-6 sm:grid-cols-2">
              <Field
                label="Payment terms"
                htmlFor="paymentTerms"
                help="For example: 30 days from acceptance of delivery."
              >
                <Input
                  id="paymentTerms"
                  name="paymentTerms"
                  maxLength={400}
                  defaultValue={defaults?.paymentTerms ?? ''}
                />
              </Field>
              <Field label="Incoterm" htmlFor="incoterm">
                <Select id="incoterm" name="incoterm" defaultValue={defaults?.incoterm ?? ''}>
                  <option value="">Not specified</option>
                  {INCOTERMS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Requested delivery date" htmlFor="requestedDeliveryDate">
                <Input
                  id="requestedDeliveryDate"
                  name="requestedDeliveryDate"
                  type="date"
                  defaultValue={dateValue(defaults?.requestedDeliveryDate)}
                />
              </Field>
              <Field label="Order expires" htmlFor="expiryDate">
                <Input
                  id="expiryDate"
                  name="expiryDate"
                  type="date"
                  defaultValue={dateValue(defaults?.expiryDate)}
                />
              </Field>
              <Field
                label="Advance payment"
                htmlFor="advancePaymentAmount"
                error={state.errors?.advancePaymentAmount}
                help="If your buyer pays anything up front."
              >
                <Input
                  id="advancePaymentAmount"
                  name="advancePaymentAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={numberValue(defaults?.advancePaymentAmount)}
                />
              </Field>
              <Field label="Delivery terms" htmlFor="deliveryTerms">
                <Input
                  id="deliveryTerms"
                  name="deliveryTerms"
                  maxLength={400}
                  defaultValue={defaults?.deliveryTerms ?? ''}
                />
              </Field>
              <Field label="Progress payments" htmlFor="progressPaymentSchedule">
                <Textarea
                  id="progressPaymentSchedule"
                  name="progressPaymentSchedule"
                  rows={2}
                  maxLength={2000}
                  defaultValue={defaults?.progressPaymentSchedule ?? ''}
                />
              </Field>
              <Field label="Final payment terms" htmlFor="finalPaymentTerms">
                <Textarea
                  id="finalPaymentTerms"
                  name="finalPaymentTerms"
                  rows={2}
                  maxLength={2000}
                  defaultValue={defaults?.finalPaymentTerms ?? ''}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cost composition (optional)</CardTitle>
            </CardHeader>
            <CardBody className="p-6">
              <p className="mb-5 max-w-2xl text-[13.5px] leading-relaxed text-ink-500">
                Breaking the order value down helps a financing partner understand what the money is
                for, and is what makes local-content reporting possible. You can add this later.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field
                  label="Manufacturing"
                  htmlFor="manufacturingComponent"
                  error={state.errors?.manufacturingComponent}
                >
                  <Input
                    id="manufacturingComponent"
                    name="manufacturingComponent"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={numberValue(defaults?.manufacturingComponent)}
                  />
                </Field>
                <Field label="Imported material" htmlFor="importedMaterialComponent">
                  <Input
                    id="importedMaterialComponent"
                    name="importedMaterialComponent"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={numberValue(defaults?.importedMaterialComponent)}
                  />
                </Field>
                <Field label="Local labour" htmlFor="localLabourComponent">
                  <Input
                    id="localLabourComponent"
                    name="localLabourComponent"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={numberValue(defaults?.localLabourComponent)}
                  />
                </Field>
                <Field label="Logistics" htmlFor="logisticsComponent">
                  <Input
                    id="logisticsComponent"
                    name="logisticsComponent"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={numberValue(defaults?.logisticsComponent)}
                  />
                </Field>
                <Field label="Taxes and duties" htmlFor="taxesComponent">
                  <Input
                    id="taxesComponent"
                    name="taxesComponent"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={numberValue(defaults?.taxesComponent)}
                  />
                </Field>
                <Field label="Expected gross margin (%)" htmlFor="expectedGrossMargin">
                  <Input
                    id="expectedGrossMargin"
                    name="expectedGrossMargin"
                    type="number"
                    step="0.01"
                    min="-100"
                    max="100"
                    defaultValue={numberValue(defaults?.expectedGrossMargin)}
                  />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Alert tone="info">
            Creating a purchase order does not submit it. You will be able to attach the signed
            order document and review the details before sending it to your buyer for verification.
          </Alert>
        </div>
      )}
    </ActionForm>
  )
}
