'use client'

import { useState } from 'react'
import {
  addBankingRelationshipAction,
  inviteUserAction,
  removeBankingRelationshipAction,
  updateOrganizationAction,
  updateSupplierProfileAction,
} from '@/app/actions/organization'
import { ActionButton, ActionForm } from '@/components/app/forms'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,

  Checkbox,
  Field,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui'
import { COUNTRY_OPTIONS, CURRENCIES } from '@/lib/countries'
import { toNumber } from '@/lib/utils'

/**
 * Company profile editing.
 *
 * Split into sections a supplier can complete in stages. The banking section
 * deliberately asks for a masked identifier only; the server rejects anything
 * that looks like a full account number, so one cannot be stored by mistake.
 */

const REVENUE_RANGES = [
  { value: 'UNDER_100K', label: 'Under USD 100,000' },
  { value: 'FROM_100K_TO_500K', label: 'USD 100,000 – 500,000' },
  { value: 'FROM_500K_TO_1M', label: 'USD 500,000 – 1 million' },
  { value: 'FROM_1M_TO_5M', label: 'USD 1 – 5 million' },
  { value: 'FROM_5M_TO_25M', label: 'USD 5 – 25 million' },
  { value: 'FROM_25M_TO_100M', label: 'USD 25 – 100 million' },
  { value: 'OVER_100M', label: 'Over USD 100 million' },
  { value: 'UNDISCLOSED', label: 'Prefer not to say' },
]

const LOCAL_CONTENT = [
  { value: 'NOT_ASSESSED', label: 'Not assessed' },
  { value: 'LOCAL', label: 'Locally owned and established' },
  { value: 'LOCAL_JOINT_VENTURE', label: 'Local joint venture' },
  { value: 'REGIONAL', label: 'Regional' },
  { value: 'INTERNATIONAL', label: 'International' },
]

const ROLES = [
  { value: 'SUPPLIER', label: 'Supplier user' },
  { value: 'EPC', label: 'EPC user' },
  { value: 'PROJECT_OWNER', label: 'Project-owner user' },
  { value: 'FINANCIER', label: 'Financing partner user' },
  { value: 'VIEWER', label: 'Read-only observer' },
]

interface OrganizationValues {
  id: string
  legalName: string
  tradingName: string | null
  country: string
  registrationNumber: string | null
  taxId: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  stateProvince: string | null
  postalCode: string | null
  website: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  phone: string | null
  email: string | null
  incorporationDate: Date | null
  industry: string | null
  employeeCount: number | null
  annualRevenueRange: string | null
  ownershipDescription: string | null
  localContentClass: string
  preferredCurrency: string
}

interface SupplierValues {
  capabilities: string | null
  certifications: string | null
  qualityCertifications: string | null
  healthSafetyCertifications: string | null
  equipment: string | null
  facilities: string | null
  projectExperience: string | null
  customerReferences: string | null
  maximumContractCapacity: unknown
  maximumContractCurrency: string
  typicalWorkingCapitalNeed: unknown
  hasUsdAccess: boolean
  hasExistingCreditFacilities: boolean
  currentLenders: string | null
  insuranceDescription: string | null
}

interface BankingValues {
  id: string
  institutionName: string
  branch: string | null
  accountCurrency: string
  maskedAccountIdentifier: string | null
  relationshipManagerName: string | null
}

const SECTIONS = [
  { id: 'company', label: 'Company details' },
  { id: 'capability', label: 'Capability' },
  { id: 'banking', label: 'Banking' },
  { id: 'people', label: 'People' },
] as const

export function OrganizationForms({
  organization,
  supplierProfile,
  bankingRelationships,
  canManageUsers,
}: {
  organization: OrganizationValues
  supplierProfile: SupplierValues | null
  bankingRelationships: BankingValues[]
  canManageUsers: boolean
}) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]['id']>('company')
  const sections = SECTIONS.filter(
    (s) => (s.id !== 'capability' || supplierProfile) && (s.id !== 'people' || canManageUsers),
  )

  return (
    <Card>
      <CardHeader className="p-0">
        <nav className="flex gap-1 overflow-x-auto px-3 pt-2" aria-label="Profile sections">
          {sections.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              aria-current={section === item.id ? 'true' : undefined}
              className={`-mb-px shrink-0 border-b-2 px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                section === item.id
                  ? 'border-accent-500 text-ink-900'
                  : 'border-transparent text-ink-500 hover:text-ink-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </CardHeader>

      <CardBody className="p-6">
        {section === 'company' ? (
          <ActionForm
            action={updateOrganizationAction}
            submitLabel="Save company details"
            pendingLabel="Saving…"
          >
            {(state) => (
              <div className="grid gap-4 sm:grid-cols-2">
                <input type="hidden" name="organizationId" value={organization.id} />

                <Field label="Legal name" htmlFor="legalName" required error={state.errors?.legalName}>
                  <Input
                    id="legalName"
                    name="legalName"
                    required
                    maxLength={200}
                    defaultValue={organization.legalName}
                  />
                </Field>
                <Field label="Trading name" htmlFor="tradingName">
                  <Input
                    id="tradingName"
                    name="tradingName"
                    maxLength={200}
                    defaultValue={organization.tradingName ?? ''}
                  />
                </Field>

                <Field label="Country" htmlFor="orgCountry" required error={state.errors?.country}>
                  <Select id="orgCountry" name="country" required defaultValue={organization.country}>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Industry" htmlFor="industry">
                  <Input
                    id="industry"
                    name="industry"
                    maxLength={120}
                    defaultValue={organization.industry ?? ''}
                    placeholder="e.g. Steel fabrication"
                  />
                </Field>

                <Field label="Company registration number" htmlFor="registrationNumber">
                  <Input
                    id="registrationNumber"
                    name="registrationNumber"
                    maxLength={80}
                    defaultValue={organization.registrationNumber ?? ''}
                  />
                </Field>
                <Field label="Tax ID" htmlFor="taxId">
                  <Input
                    id="taxId"
                    name="taxId"
                    maxLength={80}
                    defaultValue={organization.taxId ?? ''}
                  />
                </Field>

                <Field label="Incorporation date" htmlFor="incorporationDate">
                  <Input
                    id="incorporationDate"
                    name="incorporationDate"
                    type="date"
                    defaultValue={organization.incorporationDate?.toISOString().slice(0, 10) ?? ''}
                  />
                </Field>
                <Field label="Employees" htmlFor="employeeCount">
                  <Input
                    id="employeeCount"
                    name="employeeCount"
                    type="number"
                    min="0"
                    defaultValue={organization.employeeCount ?? ''}
                  />
                </Field>

                <Field label="Annual revenue" htmlFor="annualRevenueRange">
                  <Select
                    id="annualRevenueRange"
                    name="annualRevenueRange"
                    defaultValue={organization.annualRevenueRange ?? 'UNDISCLOSED'}
                  >
                    {REVENUE_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Local-content classification" htmlFor="localContentClass">
                  <Select
                    id="localContentClass"
                    name="localContentClass"
                    defaultValue={organization.localContentClass}
                  >
                    {LOCAL_CONTENT.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Address" htmlFor="addressLine1" className="sm:col-span-2">
                  <Input
                    id="addressLine1"
                    name="addressLine1"
                    maxLength={200}
                    defaultValue={organization.addressLine1 ?? ''}
                  />
                </Field>
                <Field label="Address line 2" htmlFor="addressLine2">
                  <Input
                    id="addressLine2"
                    name="addressLine2"
                    maxLength={200}
                    defaultValue={organization.addressLine2 ?? ''}
                  />
                </Field>
                <Field label="City" htmlFor="city">
                  <Input id="city" name="city" maxLength={120} defaultValue={organization.city ?? ''} />
                </Field>
                <Field label="Province / state" htmlFor="stateProvince">
                  <Input
                    id="stateProvince"
                    name="stateProvince"
                    maxLength={120}
                    defaultValue={organization.stateProvince ?? ''}
                  />
                </Field>
                <Field label="Postal code" htmlFor="postalCode">
                  <Input
                    id="postalCode"
                    name="postalCode"
                    maxLength={40}
                    defaultValue={organization.postalCode ?? ''}
                  />
                </Field>

                <Field label="Primary contact" htmlFor="primaryContactName">
                  <Input
                    id="primaryContactName"
                    name="primaryContactName"
                    maxLength={120}
                    defaultValue={organization.primaryContactName ?? ''}
                  />
                </Field>
                <Field
                  label="Contact email"
                  htmlFor="primaryContactEmail"
                  error={state.errors?.primaryContactEmail}
                >
                  <Input
                    id="primaryContactEmail"
                    name="primaryContactEmail"
                    type="email"
                    maxLength={254}
                    defaultValue={organization.primaryContactEmail ?? ''}
                  />
                </Field>
                <Field label="Phone" htmlFor="orgPhone">
                  <Input
                    id="orgPhone"
                    name="phone"
                    type="tel"
                    maxLength={40}
                    defaultValue={organization.phone ?? ''}
                  />
                </Field>
                <Field label="Website" htmlFor="website" error={state.errors?.website}>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    defaultValue={organization.website ?? ''}
                    placeholder="https://"
                  />
                </Field>
                <Field label="Company email" htmlFor="orgEmail" error={state.errors?.email}>
                  <Input
                    id="orgEmail"
                    name="email"
                    type="email"
                    maxLength={254}
                    defaultValue={organization.email ?? ''}
                  />
                </Field>
                <Field label="Preferred currency" htmlFor="preferredCurrency">
                  <Select
                    id="preferredCurrency"
                    name="preferredCurrency"
                    defaultValue={organization.preferredCurrency}
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} — {currency.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Ownership"
                  htmlFor="ownershipDescription"
                  className="sm:col-span-2"
                  help="Who owns the company. Financing partners routinely ask for this."
                >
                  <Textarea
                    id="ownershipDescription"
                    name="ownershipDescription"
                    rows={3}
                    maxLength={4000}
                    defaultValue={organization.ownershipDescription ?? ''}
                  />
                </Field>
              </div>
            )}
          </ActionForm>
        ) : null}

        {section === 'capability' && supplierProfile ? (
          <ActionForm
            action={updateSupplierProfileAction}
            submitLabel="Save capability profile"
            pendingLabel="Saving…"
          >
            <div className="space-y-4">
              <input type="hidden" name="organizationId" value={organization.id} />
              <p className="text-[13.5px] leading-relaxed text-ink-500">
                This is what a project owner or financing partner reads first. Being specific about
                what you can make, what equipment you have and what you have delivered before is the
                single most useful thing you can do here.
              </p>

              <Field
                label="What can your company make or do?"
                htmlFor="capabilities"
                help="Manufacturing and service capabilities, in your own words."
              >
                <Textarea
                  id="capabilities"
                  name="capabilities"
                  rows={4}
                  maxLength={4000}
                  defaultValue={supplierProfile.capabilities ?? ''}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Equipment" htmlFor="equipment">
                  <Textarea
                    id="equipment"
                    name="equipment"
                    rows={3}
                    maxLength={4000}
                    defaultValue={supplierProfile.equipment ?? ''}
                  />
                </Field>
                <Field label="Facilities" htmlFor="facilities">
                  <Textarea
                    id="facilities"
                    name="facilities"
                    rows={3}
                    maxLength={4000}
                    defaultValue={supplierProfile.facilities ?? ''}
                  />
                </Field>
                <Field label="Project experience" htmlFor="projectExperience">
                  <Textarea
                    id="projectExperience"
                    name="projectExperience"
                    rows={3}
                    maxLength={4000}
                    defaultValue={supplierProfile.projectExperience ?? ''}
                  />
                </Field>
                <Field label="Customer references" htmlFor="customerReferences">
                  <Textarea
                    id="customerReferences"
                    name="customerReferences"
                    rows={3}
                    maxLength={4000}
                    defaultValue={supplierProfile.customerReferences ?? ''}
                  />
                </Field>
                <Field label="Certifications" htmlFor="certifications">
                  <Textarea
                    id="certifications"
                    name="certifications"
                    rows={2}
                    maxLength={2000}
                    defaultValue={supplierProfile.certifications ?? ''}
                  />
                </Field>
                <Field label="Quality certifications" htmlFor="qualityCertifications">
                  <Textarea
                    id="qualityCertifications"
                    name="qualityCertifications"
                    rows={2}
                    maxLength={2000}
                    defaultValue={supplierProfile.qualityCertifications ?? ''}
                    placeholder="e.g. ISO 9001:2015"
                  />
                </Field>
                <Field label="Health and safety certifications" htmlFor="healthSafetyCertifications">
                  <Textarea
                    id="healthSafetyCertifications"
                    name="healthSafetyCertifications"
                    rows={2}
                    maxLength={2000}
                    defaultValue={supplierProfile.healthSafetyCertifications ?? ''}
                  />
                </Field>
                <Field label="Insurance" htmlFor="insuranceDescription">
                  <Textarea
                    id="insuranceDescription"
                    name="insuranceDescription"
                    rows={2}
                    maxLength={2000}
                    defaultValue={supplierProfile.insuranceDescription ?? ''}
                  />
                </Field>
              </div>

              <div className="grid gap-4 border-t border-ink-100 pt-4 sm:grid-cols-3">
                <Field
                  label="Largest contract you can take on"
                  htmlFor="maximumContractCapacity"
                >
                  <Input
                    id="maximumContractCapacity"
                    name="maximumContractCapacity"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={toNumber(supplierProfile.maximumContractCapacity) ?? ''}
                  />
                </Field>
                <Field label="Currency" htmlFor="maximumContractCurrency">
                  <Select
                    id="maximumContractCurrency"
                    name="maximumContractCurrency"
                    defaultValue={supplierProfile.maximumContractCurrency}
                  >
                    {CURRENCIES.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Typical working-capital need"
                  htmlFor="typicalWorkingCapitalNeed"
                >
                  <Input
                    id="typicalWorkingCapitalNeed"
                    name="typicalWorkingCapitalNeed"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={toNumber(supplierProfile.typicalWorkingCapitalNeed) ?? ''}
                  />
                </Field>
              </div>

              <div className="space-y-2.5">
                <Label className="flex items-center gap-2.5 font-normal">
                  <Checkbox name="hasUsdAccess" defaultChecked={supplierProfile.hasUsdAccess} />
                  <span className="text-[13.5px] text-ink-700">
                    We can hold and pay in US dollars
                  </span>
                </Label>
                <Label className="flex items-center gap-2.5 font-normal">
                  <Checkbox
                    name="hasExistingCreditFacilities"
                    defaultChecked={supplierProfile.hasExistingCreditFacilities}
                  />
                  <span className="text-[13.5px] text-ink-700">
                    We have existing credit facilities with a bank
                  </span>
                </Label>
              </div>

              <Field label="Current lenders" htmlFor="currentLenders">
                <Textarea
                  id="currentLenders"
                  name="currentLenders"
                  rows={2}
                  maxLength={2000}
                  defaultValue={supplierProfile.currentLenders ?? ''}
                />
              </Field>
            </div>
          </ActionForm>
        ) : null}

        {section === 'banking' ? (
          <div className="space-y-6">
            <Alert tone="info" title="We deliberately store very little">
              MConnect records the institution, the currency and a masked identifier only — enough to
              identify a banking relationship. Never enter a full account number, and never enter
              online banking credentials. The platform rejects them.
            </Alert>

            {bankingRelationships.length > 0 ? (
              <ul className="divide-y divide-ink-100 rounded border border-ink-200">
                {bankingRelationships.map((relationship) => (
                  <li
                    key={relationship.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-ink-900">
                        {relationship.institutionName}
                      </p>
                      <p className="text-[12px] text-ink-400">
                        {[
                          relationship.branch,
                          relationship.accountCurrency,
                          relationship.maskedAccountIdentifier,
                          relationship.relationshipManagerName,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                    <ActionButton
                      action={removeBankingRelationshipAction}
                      fields={{ bankingRelationshipId: relationship.id }}
                      label="Remove"
                      variant="ghost"
                      confirm={`Remove the relationship with ${relationship.institutionName}?`}
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            <ActionForm
              action={addBankingRelationshipAction}
              submitLabel="Add banking relationship"
              pendingLabel="Adding…"
              submitVariant="outline"
              submitSize="sm"
            >
              {(state) => (
                <div className="grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="organizationId" value={organization.id} />
                  <Field
                    label="Institution"
                    htmlFor="institutionName"
                    required
                    error={state.errors?.institutionName}
                  >
                    <Input id="institutionName" name="institutionName" required maxLength={200} />
                  </Field>
                  <Field label="Branch" htmlFor="branch">
                    <Input id="branch" name="branch" maxLength={120} />
                  </Field>
                  <Field label="Account currency" htmlFor="accountCurrency" required>
                    <Select id="accountCurrency" name="accountCurrency" defaultValue="USD">
                      {CURRENCIES.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.code} — {currency.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label="Masked account identifier"
                    htmlFor="maskedAccountIdentifier"
                    error={state.errors?.maskedAccountIdentifier}
                    help="Last four digits only, e.g. ****4821."
                  >
                    <Input
                      id="maskedAccountIdentifier"
                      name="maskedAccountIdentifier"
                      maxLength={40}
                      placeholder="****4821"
                    />
                  </Field>
                  <Field label="Relationship manager" htmlFor="relationshipManagerName">
                    <Input
                      id="relationshipManagerName"
                      name="relationshipManagerName"
                      maxLength={120}
                    />
                  </Field>
                  <Field
                    label="Manager email"
                    htmlFor="relationshipManagerEmail"
                    error={state.errors?.relationshipManagerEmail}
                  >
                    <Input
                      id="relationshipManagerEmail"
                      name="relationshipManagerEmail"
                      type="email"
                      maxLength={254}
                    />
                  </Field>
                </div>
              )}
            </ActionForm>
          </div>
        ) : null}

        {section === 'people' && canManageUsers ? (
          <ActionForm
            action={inviteUserAction}
            submitLabel="Add colleague"
            pendingLabel="Adding…"
            successMessage="User added. They have been emailed a link to set their own password."
          >
            {(state) => (
              <div className="space-y-4">
                <input type="hidden" name="organizationId" value={organization.id} />
                <p className="text-[13.5px] leading-relaxed text-ink-500">
                  Colleagues you add here can sign in and work on your organization&rsquo;s
                  transactions. They are emailed a link to set their own password — no password is
                  ever sent to them or shown to you.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" htmlFor="inviteName" required error={state.errors?.name}>
                    <Input id="inviteName" name="name" required maxLength={120} />
                  </Field>
                  <Field label="Work email" htmlFor="inviteEmail" required error={state.errors?.email}>
                    <Input id="inviteEmail" name="email" type="email" required maxLength={254} />
                  </Field>
                  <Field label="Job title" htmlFor="inviteTitle">
                    <Input id="inviteTitle" name="jobTitle" maxLength={120} />
                  </Field>
                  <Field label="Role" htmlFor="inviteRole" required>
                    <Select id="inviteRole" name="role" required defaultValue="">
                      <option value="" disabled>
                        Select a role
                      </option>
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              </div>
            )}
          </ActionForm>
        ) : null}
      </CardBody>
    </Card>
  )
}
