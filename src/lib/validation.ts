import { z } from 'zod'
import {
  DocumentCategory,
  DocumentVisibility,
  FundingPurpose,
  InquiryType,
  LocalContentClassification,
  MilestoneStatus,
  MilestoneType,
  OrganizationType,
  ProcurementItemStatus,
  ProjectStatus,
  RepaymentSource,
  RevenueRange,
  Role,
  ShipmentMilestoneType,
  ShipmentMode,
  VerificationMethod,
} from '@prisma/client'
import { isDisposableEmail, passwordSchema } from '@/lib/password'

/**
 * Input validation.
 *
 * Every server action parses its input through one of these schemas before
 * touching the database. Client-side validation is a convenience only; these
 * schemas are the authority.
 */

export const uuidSchema = z.string().uuid('Invalid identifier.')
const trimmed = (max: number) => z.string().trim().max(max)
const requiredText = (max: number, label = 'This field') =>
  z.string().trim().min(1, `${label} is required.`).max(max)

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254)

export const countrySchema = z
  .string()
  .trim()
  .length(2, 'Select a country.')
  .toUpperCase()

export const currencySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Currency must be a three-letter ISO code, e.g. USD.')

/** Money arrives from HTML forms as a string; coerce, then bound it. */
export const moneySchema = z.coerce
  .number({ invalid_type_error: 'Enter a valid amount.' })
  .nonnegative('Amount cannot be negative.')
  .max(1_000_000_000_000, 'Amount is out of range.')
  .refine((v) => Number.isFinite(v), 'Enter a valid amount.')

export const positiveMoneySchema = moneySchema.refine((v) => v > 0, 'Amount must be greater than zero.')

export const optionalMoneySchema = z
  .union([z.literal(''), z.coerce.number()])
  .optional()
  .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
  .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), 'Enter a valid amount.')

export const optionalDateSchema = z
  .union([z.literal(''), z.string(), z.date()])
  .optional()
  .transform((v) => {
    if (!v || v === '') return undefined
    const d = v instanceof Date ? v : new Date(v)
    return Number.isNaN(d.getTime()) ? undefined : d
  })

export const dateSchema = z.coerce.date({ invalid_type_error: 'Enter a valid date.' })

// ---------------------------------------------------------------------------
// Authentication & registration
// ---------------------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password.'),
})

export const registrationSchema = z.object({
  name: requiredText(120, 'Your name'),
  email: emailSchema.refine(
    (v) => !isDisposableEmail(v),
    'Please register with your work email address.',
  ),
  companyName: requiredText(200, 'Company name'),
  jobTitle: trimmed(120).optional(),
  phone: trimmed(40).optional(),
  country: countrySchema,
  organizationType: z.enum([
    OrganizationType.SUPPLIER,
    OrganizationType.EPC,
    OrganizationType.PROJECT_OWNER,
    OrganizationType.FINANCIAL_INSTITUTION,
  ]),
  reason: requiredText(2000, 'Reason for registration'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
})

export const requestPasswordResetSchema = z.object({ email: emailSchema })

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const inviteUserSchema = z.object({
  name: requiredText(120, 'Name'),
  email: emailSchema,
  jobTitle: trimmed(120).optional(),
  phone: trimmed(40).optional(),
  role: z.nativeEnum(Role),
  organizationId: uuidSchema,
})

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export const organizationProfileSchema = z.object({
  legalName: requiredText(200, 'Legal name'),
  tradingName: trimmed(200).optional(),
  country: countrySchema,
  registrationNumber: trimmed(80).optional(),
  taxId: trimmed(80).optional(),
  addressLine1: trimmed(200).optional(),
  addressLine2: trimmed(200).optional(),
  city: trimmed(120).optional(),
  stateProvince: trimmed(120).optional(),
  postalCode: trimmed(40).optional(),
  website: z.union([z.literal(''), z.string().url('Enter a valid URL.')]).optional(),
  primaryContactName: trimmed(120).optional(),
  primaryContactEmail: z.union([z.literal(''), emailSchema]).optional(),
  phone: trimmed(40).optional(),
  email: z.union([z.literal(''), emailSchema]).optional(),
  incorporationDate: optionalDateSchema,
  industry: trimmed(120).optional(),
  employeeCount: z
    .union([z.literal(''), z.coerce.number().int().nonnegative().max(10_000_000)])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
  annualRevenueRange: z.nativeEnum(RevenueRange).optional(),
  ownershipDescription: trimmed(4000).optional(),
  localContentClass: z.nativeEnum(LocalContentClassification).optional(),
  preferredCurrency: currencySchema.optional(),
})

export const supplierProfileSchema = z.object({
  capabilities: trimmed(4000).optional(),
  certifications: trimmed(2000).optional(),
  qualityCertifications: trimmed(2000).optional(),
  healthSafetyCertifications: trimmed(2000).optional(),
  equipment: trimmed(4000).optional(),
  facilities: trimmed(4000).optional(),
  projectExperience: trimmed(4000).optional(),
  customerReferences: trimmed(4000).optional(),
  maximumContractCapacity: optionalMoneySchema,
  maximumContractCurrency: currencySchema.optional(),
  typicalWorkingCapitalNeed: optionalMoneySchema,
  hasUsdAccess: z.coerce.boolean().optional(),
  hasExistingCreditFacilities: z.coerce.boolean().optional(),
  currentLenders: trimmed(2000).optional(),
  insuranceDescription: trimmed(2000).optional(),
})

/**
 * Banking data is deliberately minimal. A full account number is rejected here
 * so it cannot be stored even if a user pastes one.
 */
export const bankingRelationshipSchema = z.object({
  institutionName: requiredText(200, 'Institution name'),
  branch: trimmed(120).optional(),
  accountCurrency: currencySchema.default('USD'),
  maskedAccountIdentifier: trimmed(40)
    .optional()
    .refine(
      (v) => !v || /^[*x•\s-]*[0-9]{2,4}$/i.test(v),
      'Enter a masked identifier only, for example ****4821. Never enter a full account number.',
    ),
  relationshipManagerName: trimmed(120).optional(),
  relationshipManagerEmail: z.union([z.literal(''), emailSchema]).optional(),
  relationshipManagerPhone: trimmed(40).optional(),
})

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const projectSchema = z.object({
  name: requiredText(200, 'Project name'),
  projectOwnerId: uuidSchema,
  epcId: z.union([z.literal(''), uuidSchema]).optional(),
  location: trimmed(200).optional(),
  country: countrySchema,
  sector: trimmed(120).optional(),
  description: trimmed(4000).optional(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.ACTIVE),
  startDate: optionalDateSchema,
  targetCompletionDate: optionalDateSchema,
  currency: currencySchema.default('USD'),
  localContentProgram: trimmed(200).optional(),
  primaryContactName: trimmed(120).optional(),
  primaryContactEmail: z.union([z.literal(''), emailSchema]).optional(),
})

// ---------------------------------------------------------------------------
// Purchase orders
// ---------------------------------------------------------------------------

export const purchaseOrderSchema = z
  .object({
    poNumber: requiredText(80, 'PO number'),
    projectId: uuidSchema,
    buyerId: uuidSchema,
    issueDate: dateSchema,
    currency: currencySchema.default('USD'),
    value: positiveMoneySchema,
    paymentTerms: trimmed(400).optional(),
    incoterm: trimmed(40).optional(),
    deliveryTerms: trimmed(400).optional(),
    requestedDeliveryDate: optionalDateSchema,
    scopeDescription: requiredText(4000, 'Scope description'),
    manufacturingComponent: optionalMoneySchema,
    importedMaterialComponent: optionalMoneySchema,
    localLabourComponent: optionalMoneySchema,
    logisticsComponent: optionalMoneySchema,
    taxesComponent: optionalMoneySchema,
    expectedGrossMargin: z
      .union([z.literal(''), z.coerce.number().min(-100).max(100)])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
    advancePaymentAmount: optionalMoneySchema,
    progressPaymentSchedule: trimmed(2000).optional(),
    finalPaymentTerms: trimmed(2000).optional(),
    expiryDate: optionalDateSchema,
  })
  .refine(
    (d) => (d.advancePaymentAmount ?? 0) <= d.value,
    { message: 'Advance payment cannot exceed the PO value.', path: ['advancePaymentAmount'] },
  )
  .refine(
    (d) => {
      const parts = [
        d.manufacturingComponent,
        d.importedMaterialComponent,
        d.localLabourComponent,
        d.logisticsComponent,
        d.taxesComponent,
      ].filter((v): v is number => typeof v === 'number')
      if (parts.length === 0) return true
      // Allow a small tolerance: components are estimates, not an invoice.
      return parts.reduce((a, b) => a + b, 0) <= d.value * 1.05
    },
    { message: 'Cost components add up to more than the PO value.', path: ['manufacturingComponent'] },
  )

export const poVerificationSchema = z
  .object({
    purchaseOrderId: uuidSchema,
    decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
    method: z.nativeEnum(VerificationMethod).default(VerificationMethod.PLATFORM_REVIEW),
    valueConfirmed: z.coerce.boolean().default(false),
    buyerConfirmed: z.coerce.boolean().default(false),
    supplierConfirmed: z.coerce.boolean().default(false),
    paymentTermsConfirmed: z.coerce.boolean().default(false),
    poIsActiveConfirmed: z.coerce.boolean().default(false),
    comments: trimmed(4000).optional(),
  })
  .refine(
    (d) =>
      d.decision !== 'APPROVED' ||
      (d.valueConfirmed &&
        d.buyerConfirmed &&
        d.supplierConfirmed &&
        d.paymentTermsConfirmed &&
        d.poIsActiveConfirmed),
    {
      message: 'Confirm every checklist item before verifying this purchase order.',
      path: ['valueConfirmed'],
    },
  )
  .refine((d) => d.decision === 'APPROVED' || (d.comments && d.comments.length > 0), {
    message: 'Explain why the purchase order is being rejected or returned.',
    path: ['comments'],
  })

// ---------------------------------------------------------------------------
// Financing
// ---------------------------------------------------------------------------

export const fundingLineSchema = z.object({
  purpose: z.nativeEnum(FundingPurpose),
  description: requiredText(300, 'Description'),
  vendorId: z.union([z.literal(''), uuidSchema]).optional(),
  amount: positiveMoneySchema,
  currency: currencySchema.default('USD'),
})

export const fundingRequestSchema = z.object({
  transactionId: uuidSchema,
  requestedAmount: positiveMoneySchema,
  currency: currencySchema.default('USD'),
  purposeSummary: trimmed(4000).optional(),
  requiredFundingDate: optionalDateSchema,
  proposedRepaymentSource: trimmed(2000).optional(),
  expectedBuyerPaymentDate: optionalDateSchema,
  lines: z.array(fundingLineSchema).max(50).default([]),
})

export const financierDecisionSchema = z
  .object({
    fundingRequestId: uuidSchema,
    decision: z.enum(['APPROVED', 'CONDITIONALLY_APPROVED', 'REJECTED', 'INFORMATION_REQUESTED']),
    approvedAmount: optionalMoneySchema,
    approvedCurrency: currencySchema.optional(),
    interestRatePct: z
      .union([z.literal(''), z.coerce.number().min(0).max(200)])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
    feePct: z
      .union([z.literal(''), z.coerce.number().min(0).max(100)])
      .optional()
      .transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
    conditionsPrecedent: trimmed(4000).optional(),
    notes: trimmed(4000).optional(),
  })
  .refine(
    (d) =>
      !['APPROVED', 'CONDITIONALLY_APPROVED'].includes(d.decision) ||
      (typeof d.approvedAmount === 'number' && d.approvedAmount > 0),
    { message: 'Enter the amount being approved.', path: ['approvedAmount'] },
  )
  .refine((d) => d.decision !== 'REJECTED' || (d.notes && d.notes.length > 0), {
    message: 'Record the reason for the decision.',
    path: ['notes'],
  })

export const recordFundingSchema = z.object({
  fundingRequestId: uuidSchema,
  fundedDate: dateSchema,
  notes: trimmed(2000).optional(),
})

export const disbursementSchema = z.object({
  fundingRequestId: uuidSchema,
  payeeName: requiredText(200, 'Payee name'),
  payeeVendorId: z.union([z.literal(''), uuidSchema]).optional(),
  payeeBankDetails: trimmed(200)
    .optional()
    .refine(
      (v) => !v || !/\b\d{7,}\b/.test(v.replace(/[\s-]/g, '')),
      'Do not enter a full account number. Use a masked reference such as ****4821.',
    ),
  approvedAmount: positiveMoneySchema,
  approvedCurrency: currencySchema.default('USD'),
  purpose: z.nativeEnum(FundingPurpose).default(FundingPurpose.OTHER),
  invoiceId: z.union([z.literal(''), uuidSchema]).optional(),
  notes: trimmed(2000).optional(),
})

export const repaymentSchema = z.object({
  fundingRequestId: uuidSchema,
  amount: positiveMoneySchema,
  currency: currencySchema.default('USD'),
  source: z.nativeEnum(RepaymentSource).default(RepaymentSource.BUYER_PAYMENT),
  receivedDate: dateSchema,
  externalReference: trimmed(120).optional(),
  notes: trimmed(2000).optional(),
})

// ---------------------------------------------------------------------------
// Procurement, logistics & milestones
// ---------------------------------------------------------------------------

export const vendorSchema = z.object({
  name: requiredText(200, 'Vendor name'),
  country: countrySchema,
  contactName: trimmed(120).optional(),
  contactEmail: z.union([z.literal(''), emailSchema]).optional(),
  contactPhone: trimmed(40).optional(),
  website: z.union([z.literal(''), z.string().url('Enter a valid URL.')]).optional(),
  notes: trimmed(2000).optional(),
})

export const procurementItemSchema = z.object({
  transactionId: uuidSchema,
  vendorId: z.union([z.literal(''), uuidSchema]).optional(),
  itemName: requiredText(200, 'Item'),
  description: trimmed(2000).optional(),
  countryOfOrigin: z.union([z.literal(''), countrySchema]).optional(),
  quantity: z.coerce.number().positive('Quantity must be greater than zero.').max(1_000_000_000),
  unit: trimmed(40).optional(),
  currency: currencySchema.default('USD'),
  amount: positiveMoneySchema,
  expectedPurchaseDate: optionalDateSchema,
  expectedShipDate: optionalDateSchema,
  expectedArrivalDate: optionalDateSchema,
  requiredByDate: optionalDateSchema,
  logisticsRequired: z.coerce.boolean().default(false),
})

export const procurementStatusSchema = z.object({
  procurementItemId: uuidSchema,
  status: z.nativeEnum(ProcurementItemStatus),
})

export const shipmentSchema = z.object({
  transactionId: uuidSchema,
  origin: requiredText(200, 'Origin'),
  destination: requiredText(200, 'Destination'),
  mode: z.nativeEnum(ShipmentMode),
  carrier: trimmed(120).optional(),
  bookingReference: trimmed(120).optional(),
  masterBill: trimmed(120).optional(),
  houseBill: trimmed(120).optional(),
  containerNumber: trimmed(120).optional(),
  estimatedDeparture: optionalDateSchema,
  actualDeparture: optionalDateSchema,
  estimatedArrival: optionalDateSchema,
  actualArrival: optionalDateSchema,
  notes: trimmed(2000).optional(),
})

export const shipmentMilestoneSchema = z.object({
  shipmentId: uuidSchema,
  type: z.nativeEnum(ShipmentMilestoneType),
  occurredAt: z.coerce.date(),
  location: trimmed(200).optional(),
  notes: trimmed(1000).optional(),
})

export const transactionMilestoneSchema = z.object({
  transactionId: uuidSchema,
  type: z.nativeEnum(MilestoneType).default(MilestoneType.CUSTOM),
  title: requiredText(200, 'Title'),
  description: trimmed(2000).optional(),
  dueDate: optionalDateSchema,
})

export const milestoneStatusSchema = z.object({
  milestoneId: uuidSchema,
  status: z.nativeEnum(MilestoneStatus),
  note: trimmed(2000).optional(),
})

// ---------------------------------------------------------------------------
// Documents & communications
// ---------------------------------------------------------------------------

export const documentMetadataSchema = z.object({
  category: z.nativeEnum(DocumentCategory),
  visibility: z.nativeEnum(DocumentVisibility).default(DocumentVisibility.TRANSACTION_PARTIES),
  transactionId: z.union([z.literal(''), uuidSchema]).optional(),
  milestoneId: z.union([z.literal(''), uuidSchema]).optional(),
  expiresAt: optionalDateSchema,
})

export const commentSchema = z.object({
  transactionId: uuidSchema,
  body: requiredText(8000, 'Message'),
  rfiId: z.union([z.literal(''), uuidSchema]).optional(),
  internalOnly: z.coerce.boolean().default(false),
  mentionedUserIds: z.array(uuidSchema).max(25).default([]),
})

export const rfiSchema = z.object({
  transactionId: uuidSchema,
  subject: requiredText(200, 'Subject'),
  body: requiredText(4000, 'Details'),
  assignedToOrganizationId: uuidSchema,
  assignedToUserId: z.union([z.literal(''), uuidSchema]).optional(),
  requestedDocumentCategory: z.union([z.literal(''), z.nativeEnum(DocumentCategory)]).optional(),
  dueDate: optionalDateSchema,
})

export const rfiStatusSchema = z.object({
  rfiId: uuidSchema,
  status: z.enum(['RESPONDED', 'RESOLVED', 'CANCELLED']),
})

export const invoiceSchema = z.object({
  transactionId: uuidSchema,
  invoiceNumber: requiredText(80, 'Invoice number'),
  issueDate: dateSchema,
  dueDate: optionalDateSchema,
  amount: positiveMoneySchema,
  currency: currencySchema.default('USD'),
  description: trimmed(2000).optional(),
})

export const deliveryAcceptanceSchema = z.object({
  transactionId: uuidSchema,
  accepted: z.coerce.boolean(),
  comments: trimmed(4000).optional(),
})

export const shareTransactionSchema = z.object({
  transactionId: uuidSchema,
  organizationId: uuidSchema,
  readOnly: z.coerce.boolean().default(false),
})

// ---------------------------------------------------------------------------
// Public site
// ---------------------------------------------------------------------------

export const inquirySchema = z.object({
  type: z.nativeEnum(InquiryType),
  name: requiredText(120, 'Name'),
  email: emailSchema,
  company: requiredText(200, 'Company'),
  jobTitle: trimmed(120).optional(),
  phone: trimmed(40).optional(),
  country: countrySchema,
  message: requiredText(4000, 'Message'),
  // Honeypot: a real person never fills this in.
  website: z.string().max(0, 'Submission rejected.').optional(),
})

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export const registrationDecisionSchema = z.object({
  registrationRequestId: uuidSchema,
  decision: z.enum(['APPROVE', 'REJECT']),
  notes: trimmed(2000).optional(),
  /** Optional: attach the new user to an organization that already exists. */
  existingOrganizationId: z.union([z.literal(''), uuidSchema]).optional(),
  role: z.nativeEnum(Role).optional(),
})

export const organizationStatusSchema = z.object({
  organizationId: uuidSchema,
  accountStatus: z.enum(['PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'CLOSED']),
  kycStatus: z
    .enum(['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'EXPIRED', 'REJECTED'])
    .optional(),
  notes: trimmed(2000).optional(),
})

export const membershipUpdateSchema = z.object({
  membershipId: uuidSchema,
  role: z.nativeEnum(Role).optional(),
  isActive: z.coerce.boolean().optional(),
})

export const transactionStageSchema = z.object({
  transactionId: uuidSchema,
  stage: z.enum([
    'PURCHASE_ORDER', 'VERIFICATION', 'FINANCING_REVIEW', 'APPROVED', 'FUNDED',
    'PROCUREMENT', 'LOGISTICS', 'MANUFACTURING', 'DELIVERY', 'BUYER_ACCEPTANCE',
    'PAYMENT', 'REPAYMENT', 'CLOSED', 'CANCELLED',
  ]),
  note: trimmed(2000).optional(),
})

/** Flattens a Zod error into the shape server actions return to forms. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const flat = error.flatten()
  const out: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(flat.fieldErrors)) {
    if (value && value.length) out[key] = value as string[]
  }
  if (flat.formErrors.length) out._form = flat.formErrors
  return out
}
