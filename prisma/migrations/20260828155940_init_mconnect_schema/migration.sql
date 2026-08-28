-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('SUPPLIER', 'EPC', 'PROJECT_OWNER', 'FINANCIAL_INSTITUTION', 'AI_LOGISTIX', 'GOVERNMENT', 'AUDITOR', 'INSPECTION_COMPANY', 'OTHER');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPPLIER', 'EPC', 'PROJECT_OWNER', 'FINANCIER', 'AI_LOGISTIX_ADMIN', 'AI_LOGISTIX_OPERATIONS', 'VIEWER');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'VERIFIED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LocalContentClassification" AS ENUM ('NOT_ASSESSED', 'LOCAL', 'LOCAL_JOINT_VENTURE', 'REGIONAL', 'INTERNATIONAL');

-- CreateEnum
CREATE TYPE "RevenueRange" AS ENUM ('UNDER_100K', 'FROM_100K_TO_500K', 'FROM_500K_TO_1M', 'FROM_1M_TO_5M', 'FROM_5M_TO_25M', 'FROM_25M_TO_100M', 'OVER_100M', 'UNDISCLOSED');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'VERIFICATION_REQUESTED', 'VERIFIED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('PLATFORM_REVIEW', 'EMAIL_CONFIRMATION', 'DOCUMENT_REVIEW', 'ERP_LOOKUP', 'PHONE_CONFIRMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "FundingRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_AI_LOGISTIX_REVIEW', 'EPC_VERIFICATION_PENDING', 'FINANCIER_REVIEW', 'INFORMATION_REQUESTED', 'CONDITIONALLY_APPROVED', 'APPROVED', 'REJECTED', 'FUNDED', 'PARTIALLY_REPAID', 'REPAID', 'DEFAULT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FundingPurpose" AS ENUM ('RAW_MATERIALS', 'IMPORTED_COMPONENTS', 'LOCAL_COMPONENTS', 'LABOUR', 'LOGISTICS', 'CUSTOMS_AND_TAXES', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionStage" AS ENUM ('PURCHASE_ORDER', 'VERIFICATION', 'FINANCING_REVIEW', 'APPROVED', 'FUNDED', 'PROCUREMENT', 'LOGISTICS', 'MANUFACTURING', 'DELIVERY', 'BUYER_ACCEPTANCE', 'PAYMENT', 'REPAYMENT', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProcurementItemStatus" AS ENUM ('PLANNED', 'QUOTE_RECEIVED', 'APPROVED', 'ORDERED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'CUSTOMS', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ShipmentMode" AS ENUM ('AIR', 'OCEAN_FCL', 'OCEAN_LCL', 'ROAD', 'RAIL', 'COURIER', 'PROJECT_CARGO', 'OTHER');

-- CreateEnum
CREATE TYPE "ShipmentMilestoneType" AS ENUM ('BOOKED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED_AT_ORIGIN', 'EXPORT_CLEARED', 'DEPARTED', 'ARRIVED', 'IMPORT_CLEARANCE', 'CUSTOMS_RELEASED', 'OUT_FOR_DELIVERY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "CustomsStatus" AS ENUM ('NOT_STARTED', 'DOCUMENTS_SUBMITTED', 'UNDER_INSPECTION', 'DUTIES_ASSESSED', 'CLEARED', 'HELD');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('NOT_STARTED', 'IN_TRANSIT', 'DELIVERED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MilestoneType" AS ENUM ('FUNDING_APPROVED', 'RAW_MATERIAL_ORDERED', 'RAW_MATERIAL_SHIPPED', 'RAW_MATERIAL_DELIVERED', 'FABRICATION_STARTED', 'PROGRESS_25', 'PROGRESS_50', 'PROGRESS_75', 'INSPECTION_SCHEDULED', 'INSPECTION_PASSED', 'READY_FOR_DELIVERY', 'DELIVERED', 'BUYER_ACCEPTED', 'INVOICE_SUBMITTED', 'INVOICE_APPROVED', 'PAYMENT_RECEIVED', 'FINANCE_REPAID', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('COMPANY_REGISTRATION', 'TAX_DOCUMENT', 'KYC', 'BANK_LETTER', 'AUDITED_FINANCIALS', 'MANAGEMENT_ACCOUNTS', 'PURCHASE_ORDER', 'CONTRACT', 'TECHNICAL_SPECIFICATION', 'DRAWING', 'COMMERCIAL_QUOTE', 'VENDOR_QUOTE', 'BILL_OF_MATERIALS', 'PAYMENT_SCHEDULE', 'PURCHASE_INVOICE', 'COMMERCIAL_INVOICE', 'PACKING_LIST', 'BILL_OF_LADING', 'AIR_WAYBILL', 'CUSTOMS_DOCUMENT', 'CERTIFICATE_OF_ORIGIN', 'QUALITY_CERTIFICATE', 'INSPECTION_CERTIFICATE', 'PROOF_OF_DELIVERY', 'BUYER_ACCEPTANCE', 'PAYMENT_CONFIRMATION', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('RESTRICTED', 'TRANSACTION_PARTIES', 'FINANCIERS', 'ALL_PARTIES_AND_AUDITORS');

-- CreateEnum
CREATE TYPE "ApprovalType" AS ENUM ('PO_VERIFICATION', 'AI_LOGISTIX_TRANSACTION_REVIEW', 'FINANCING_APPROVAL', 'DISBURSEMENT_APPROVAL', 'PROCUREMENT_APPROVAL', 'DELIVERY_ACCEPTANCE', 'INVOICE_ACCEPTANCE', 'TRANSACTION_CLOSE');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "RfiStatus" AS ENUM ('OPEN', 'RESPONDED', 'RESOLVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisbursementAuthorizationStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'AUTHORIZED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DisbursementPaymentStatus" AS ENUM ('NOT_PAID', 'SCHEDULED', 'PAID', 'FAILED', 'REVERSED');

-- CreateEnum
CREATE TYPE "RepaymentSource" AS ENUM ('BUYER_PAYMENT', 'SUPPLIER_FUNDS', 'INSURANCE_CLAIM', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "InquiryType" AS ENUM ('SUPPLIER', 'EPC_PROJECT_OWNER', 'FINANCIAL_INSTITUTION', 'GOVERNMENT_DEVELOPMENT_FINANCE');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_REVIEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "country" TEXT NOT NULL,
    "registrationNumber" TEXT,
    "taxId" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "stateProvince" TEXT,
    "postalCode" TEXT,
    "website" TEXT,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "incorporationDate" DATE,
    "industry" TEXT,
    "employeeCount" INTEGER,
    "annualRevenueRange" "RevenueRange",
    "ownershipDescription" TEXT,
    "localContentClass" "LocalContentClassification" NOT NULL DEFAULT 'NOT_ASSESSED',
    "preferredCurrency" TEXT NOT NULL DEFAULT 'USD',
    "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "kycNotes" TEXT,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_profiles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "capabilities" TEXT,
    "certifications" TEXT,
    "qualityCertifications" TEXT,
    "healthSafetyCertifications" TEXT,
    "equipment" TEXT,
    "facilities" TEXT,
    "projectExperience" TEXT,
    "customerReferences" TEXT,
    "maximumContractCapacity" DECIMAL(18,2),
    "maximumContractCurrency" TEXT NOT NULL DEFAULT 'USD',
    "typicalWorkingCapitalNeed" DECIMAL(18,2),
    "hasUsdAccess" BOOLEAN NOT NULL DEFAULT false,
    "hasExistingCreditFacilities" BOOLEAN NOT NULL DEFAULT false,
    "currentLenders" TEXT,
    "insuranceDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banking_relationships" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "institutionName" TEXT NOT NULL,
    "branch" TEXT,
    "accountCurrency" TEXT NOT NULL DEFAULT 'USD',
    "maskedAccountIdentifier" TEXT,
    "relationshipManagerName" TEXT,
    "relationshipManagerEmail" TEXT,
    "relationshipManagerPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banking_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "TokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_requests" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "organizationType" "OrganizationType" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "createdOrganizationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectOwnerId" UUID NOT NULL,
    "epcId" UUID,
    "location" TEXT,
    "country" TEXT NOT NULL,
    "sector" TEXT,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATE,
    "targetCompletionDate" DATE,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "localContentProgram" TEXT,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "poNumber" TEXT NOT NULL,
    "projectId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "issueDate" DATE NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "value" DECIMAL(18,2) NOT NULL,
    "paymentTerms" TEXT,
    "incoterm" TEXT,
    "deliveryTerms" TEXT,
    "requestedDeliveryDate" DATE,
    "scopeDescription" TEXT NOT NULL,
    "manufacturingComponent" DECIMAL(18,2),
    "importedMaterialComponent" DECIMAL(18,2),
    "localLabourComponent" DECIMAL(18,2),
    "logisticsComponent" DECIMAL(18,2),
    "taxesComponent" DECIMAL(18,2),
    "expectedGrossMargin" DECIMAL(5,2),
    "advancePaymentAmount" DECIMAL(18,2),
    "progressPaymentSchedule" TEXT,
    "finalPaymentTerms" TEXT,
    "expiryDate" DATE,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_verifications" (
    "id" UUID NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "verifiedById" UUID NOT NULL,
    "verifiedByOrganizationId" UUID NOT NULL,
    "method" "VerificationMethod" NOT NULL DEFAULT 'PLATFORM_REVIEW',
    "decision" "ApprovalDecision" NOT NULL,
    "valueConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "buyerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "supplierConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "paymentTermsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "poIsActiveConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "purchaseOrderId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    "buyerId" UUID NOT NULL,
    "stage" "TransactionStage" NOT NULL DEFAULT 'PURCHASE_ORDER',
    "closedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_stage_events" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "fromStage" "TransactionStage",
    "toStage" "TransactionStage" NOT NULL,
    "actorUserId" UUID,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_stage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_access" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "readOnly" BOOLEAN NOT NULL DEFAULT false,
    "grantedById" UUID,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_requests" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "transactionId" UUID NOT NULL,
    "requestedAmount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "percentageOfPoValue" DECIMAL(5,2),
    "purposeSummary" TEXT,
    "requiredFundingDate" DATE,
    "proposedRepaymentSource" TEXT,
    "expectedBuyerPaymentDate" DATE,
    "status" "FundingRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "assignedFinancierId" UUID,
    "approvedAmount" DECIMAL(18,2),
    "approvedCurrency" TEXT,
    "interestRatePct" DECIMAL(6,3),
    "feePct" DECIMAL(6,3),
    "conditionsPrecedent" TEXT,
    "financierNotes" TEXT,
    "decisionAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "fundedAt" TIMESTAMP(3),
    "repaidAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funding_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_request_lines" (
    "id" UUID NOT NULL,
    "fundingRequestId" UUID NOT NULL,
    "purpose" "FundingPurpose" NOT NULL,
    "description" TEXT NOT NULL,
    "vendorId" UUID,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funding_request_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursements" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "fundingRequestId" UUID NOT NULL,
    "payeeName" TEXT NOT NULL,
    "payeeVendorId" UUID,
    "payeeBankDetails" TEXT,
    "invoiceId" UUID,
    "approvedAmount" DECIMAL(18,2) NOT NULL,
    "approvedCurrency" TEXT NOT NULL DEFAULT 'USD',
    "purpose" "FundingPurpose" NOT NULL DEFAULT 'OTHER',
    "authorizationStatus" "DisbursementAuthorizationStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "DisbursementPaymentStatus" NOT NULL DEFAULT 'NOT_PAID',
    "paymentDate" DATE,
    "transactionReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repayments" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "fundingRequestId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" "RepaymentSource" NOT NULL DEFAULT 'BUYER_PAYMENT',
    "receivedDate" DATE NOT NULL,
    "reference_external" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repayments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "submittedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paidAmount" DECIMAL(18,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_items" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "vendorId" UUID,
    "itemName" TEXT NOT NULL,
    "description" TEXT,
    "countryOfOrigin" TEXT,
    "quantity" DECIMAL(14,3) NOT NULL DEFAULT 1,
    "unit" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "amount" DECIMAL(18,2) NOT NULL,
    "expectedPurchaseDate" DATE,
    "expectedShipDate" DATE,
    "expectedArrivalDate" DATE,
    "requiredByDate" DATE,
    "logisticsRequired" BOOLEAN NOT NULL DEFAULT false,
    "status" "ProcurementItemStatus" NOT NULL DEFAULT 'PLANNED',
    "quoteDocumentId" UUID,
    "shipmentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "procurement_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "transactionId" UUID NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "mode" "ShipmentMode" NOT NULL,
    "carrier" TEXT,
    "bookingReference" TEXT,
    "masterBill" TEXT,
    "houseBill" TEXT,
    "containerNumber" TEXT,
    "estimatedDeparture" TIMESTAMP(3),
    "actualDeparture" TIMESTAMP(3),
    "estimatedArrival" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "customsStatus" "CustomsStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "deliveryStatus" "DeliveryStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_milestones" (
    "id" UUID NOT NULL,
    "shipmentId" UUID NOT NULL,
    "type" "ShipmentMilestoneType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "sourceSystem" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_milestones" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "type" "MilestoneType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" DATE,
    "completedAt" TIMESTAMP(3),
    "completedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaction_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "transactionId" UUID,
    "milestoneId" UUID,
    "disbursementId" UUID,
    "category" "DocumentCategory" NOT NULL,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'TRANSACTION_PARTIES',
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "checksumSha256" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "supersedesId" UUID,
    "expiresAt" DATE,
    "uploadedById" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approvals" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "type" "ApprovalType" NOT NULL,
    "requestedFromOrganizationId" UUID,
    "requestedFromUserId" UUID,
    "requestedById" UUID,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "authorOrganizationId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "mentionedUserIds" UUID[],
    "rfiId" UUID,
    "internalOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rfis" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "transactionId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "requestedDocumentCategory" "DocumentCategory",
    "raisedById" UUID NOT NULL,
    "raisedByOrganizationId" UUID NOT NULL,
    "assignedToOrganizationId" UUID NOT NULL,
    "assignedToUserId" UUID,
    "status" "RfiStatus" NOT NULL DEFAULT 'OPEN',
    "dueDate" DATE,
    "respondedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rfis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "event" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkPath" TEXT,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "actorEmail" TEXT,
    "organizationId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeData" JSONB,
    "afterData" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "type" "InquiryType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "jobTitle" TEXT,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_counters" (
    "id" UUID NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limit_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_reference_key" ON "organizations"("reference");

-- CreateIndex
CREATE INDEX "organizations_type_idx" ON "organizations"("type");

-- CreateIndex
CREATE INDEX "organizations_country_idx" ON "organizations"("country");

-- CreateIndex
CREATE INDEX "organizations_accountStatus_idx" ON "organizations"("accountStatus");

-- CreateIndex
CREATE INDEX "organizations_createdAt_idx" ON "organizations"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_profiles_organizationId_key" ON "supplier_profiles"("organizationId");

-- CreateIndex
CREATE INDEX "banking_relationships_organizationId_idx" ON "banking_relationships"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- CreateIndex
CREATE INDEX "organization_memberships_organizationId_idx" ON "organization_memberships"("organizationId");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_idx" ON "organization_memberships"("userId");

-- CreateIndex
CREATE INDEX "organization_memberships_role_idx" ON "organization_memberships"("role");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_userId_organizationId_key" ON "organization_memberships"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_tokenHash_key" ON "verification_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "verification_tokens_userId_type_idx" ON "verification_tokens"("userId", "type");

-- CreateIndex
CREATE INDEX "verification_tokens_expiresAt_idx" ON "verification_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "registration_requests_userId_key" ON "registration_requests"("userId");

-- CreateIndex
CREATE INDEX "registration_requests_status_idx" ON "registration_requests"("status");

-- CreateIndex
CREATE INDEX "registration_requests_createdAt_idx" ON "registration_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "projects_reference_key" ON "projects"("reference");

-- CreateIndex
CREATE INDEX "projects_projectOwnerId_idx" ON "projects"("projectOwnerId");

-- CreateIndex
CREATE INDEX "projects_epcId_idx" ON "projects"("epcId");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_country_idx" ON "projects"("country");

-- CreateIndex
CREATE INDEX "purchase_orders_projectId_idx" ON "purchase_orders"("projectId");

-- CreateIndex
CREATE INDEX "purchase_orders_supplierId_idx" ON "purchase_orders"("supplierId");

-- CreateIndex
CREATE INDEX "purchase_orders_buyerId_idx" ON "purchase_orders"("buyerId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "purchase_orders_poNumber_idx" ON "purchase_orders"("poNumber");

-- CreateIndex
CREATE INDEX "purchase_orders_createdAt_idx" ON "purchase_orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_supplierId_buyerId_poNumber_key" ON "purchase_orders"("supplierId", "buyerId", "poNumber");

-- CreateIndex
CREATE INDEX "purchase_order_verifications_purchaseOrderId_idx" ON "purchase_order_verifications"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_verifications_verifiedByOrganizationId_idx" ON "purchase_order_verifications"("verifiedByOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_number_key" ON "transactions"("number");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_purchaseOrderId_key" ON "transactions"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "transactions_supplierId_idx" ON "transactions"("supplierId");

-- CreateIndex
CREATE INDEX "transactions_buyerId_idx" ON "transactions"("buyerId");

-- CreateIndex
CREATE INDEX "transactions_projectId_idx" ON "transactions"("projectId");

-- CreateIndex
CREATE INDEX "transactions_stage_idx" ON "transactions"("stage");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt");

-- CreateIndex
CREATE INDEX "transaction_stage_events_transactionId_createdAt_idx" ON "transaction_stage_events"("transactionId", "createdAt");

-- CreateIndex
CREATE INDEX "transaction_access_organizationId_idx" ON "transaction_access"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_access_transactionId_organizationId_key" ON "transaction_access"("transactionId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "funding_requests_reference_key" ON "funding_requests"("reference");

-- CreateIndex
CREATE INDEX "funding_requests_transactionId_idx" ON "funding_requests"("transactionId");

-- CreateIndex
CREATE INDEX "funding_requests_status_idx" ON "funding_requests"("status");

-- CreateIndex
CREATE INDEX "funding_requests_assignedFinancierId_idx" ON "funding_requests"("assignedFinancierId");

-- CreateIndex
CREATE INDEX "funding_requests_createdAt_idx" ON "funding_requests"("createdAt");

-- CreateIndex
CREATE INDEX "funding_request_lines_fundingRequestId_idx" ON "funding_request_lines"("fundingRequestId");

-- CreateIndex
CREATE INDEX "funding_request_lines_vendorId_idx" ON "funding_request_lines"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "disbursements_reference_key" ON "disbursements"("reference");

-- CreateIndex
CREATE INDEX "disbursements_fundingRequestId_idx" ON "disbursements"("fundingRequestId");

-- CreateIndex
CREATE INDEX "disbursements_authorizationStatus_idx" ON "disbursements"("authorizationStatus");

-- CreateIndex
CREATE INDEX "disbursements_paymentStatus_idx" ON "disbursements"("paymentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "repayments_reference_key" ON "repayments"("reference");

-- CreateIndex
CREATE INDEX "repayments_fundingRequestId_idx" ON "repayments"("fundingRequestId");

-- CreateIndex
CREATE INDEX "repayments_receivedDate_idx" ON "repayments"("receivedDate");

-- CreateIndex
CREATE INDEX "invoices_transactionId_idx" ON "invoices"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_transactionId_invoiceNumber_key" ON "invoices"("transactionId", "invoiceNumber");

-- CreateIndex
CREATE INDEX "vendors_organizationId_idx" ON "vendors"("organizationId");

-- CreateIndex
CREATE INDEX "vendors_country_idx" ON "vendors"("country");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_organizationId_name_key" ON "vendors"("organizationId", "name");

-- CreateIndex
CREATE INDEX "procurement_items_transactionId_idx" ON "procurement_items"("transactionId");

-- CreateIndex
CREATE INDEX "procurement_items_vendorId_idx" ON "procurement_items"("vendorId");

-- CreateIndex
CREATE INDEX "procurement_items_status_idx" ON "procurement_items"("status");

-- CreateIndex
CREATE INDEX "procurement_items_shipmentId_idx" ON "procurement_items"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_reference_key" ON "shipments"("reference");

-- CreateIndex
CREATE INDEX "shipments_transactionId_idx" ON "shipments"("transactionId");

-- CreateIndex
CREATE INDEX "shipments_mode_idx" ON "shipments"("mode");

-- CreateIndex
CREATE INDEX "shipments_deliveryStatus_idx" ON "shipments"("deliveryStatus");

-- CreateIndex
CREATE INDEX "shipment_milestones_shipmentId_occurredAt_idx" ON "shipment_milestones"("shipmentId", "occurredAt");

-- CreateIndex
CREATE INDEX "transaction_milestones_transactionId_sequence_idx" ON "transaction_milestones"("transactionId", "sequence");

-- CreateIndex
CREATE INDEX "transaction_milestones_status_idx" ON "transaction_milestones"("status");

-- CreateIndex
CREATE INDEX "transaction_milestones_dueDate_idx" ON "transaction_milestones"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "documents_storageKey_key" ON "documents"("storageKey");

-- CreateIndex
CREATE INDEX "documents_organizationId_idx" ON "documents"("organizationId");

-- CreateIndex
CREATE INDEX "documents_transactionId_idx" ON "documents"("transactionId");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "documents"("createdAt");

-- CreateIndex
CREATE INDEX "approvals_transactionId_type_idx" ON "approvals"("transactionId", "type");

-- CreateIndex
CREATE INDEX "approvals_requestedFromOrganizationId_decision_idx" ON "approvals"("requestedFromOrganizationId", "decision");

-- CreateIndex
CREATE INDEX "approvals_decision_idx" ON "approvals"("decision");

-- CreateIndex
CREATE INDEX "comments_transactionId_createdAt_idx" ON "comments"("transactionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rfis_reference_key" ON "rfis"("reference");

-- CreateIndex
CREATE INDEX "rfis_transactionId_status_idx" ON "rfis"("transactionId", "status");

-- CreateIndex
CREATE INDEX "rfis_assignedToOrganizationId_status_idx" ON "rfis"("assignedToOrganizationId", "status");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "audit_events_actorUserId_createdAt_idx" ON "audit_events"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_organizationId_createdAt_idx" ON "audit_events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_events_action_idx" ON "audit_events"("action");

-- CreateIndex
CREATE INDEX "audit_events_createdAt_idx" ON "audit_events"("createdAt");

-- CreateIndex
CREATE INDEX "inquiries_type_status_idx" ON "inquiries"("type", "status");

-- CreateIndex
CREATE INDEX "inquiries_createdAt_idx" ON "inquiries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "rate_limit_counters_bucketKey_key" ON "rate_limit_counters"("bucketKey");

-- CreateIndex
CREATE INDEX "rate_limit_counters_windowStart_idx" ON "rate_limit_counters"("windowStart");

-- AddForeignKey
ALTER TABLE "supplier_profiles" ADD CONSTRAINT "supplier_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banking_relationships" ADD CONSTRAINT "banking_relationships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_requests" ADD CONSTRAINT "registration_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_projectOwnerId_fkey" FOREIGN KEY ("projectOwnerId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_epcId_fkey" FOREIGN KEY ("epcId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_verifications" ADD CONSTRAINT "purchase_order_verifications_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_verifications" ADD CONSTRAINT "purchase_order_verifications_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_stage_events" ADD CONSTRAINT "transaction_stage_events_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_access" ADD CONSTRAINT "transaction_access_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_access" ADD CONSTRAINT "transaction_access_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_access" ADD CONSTRAINT "transaction_access_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_requests" ADD CONSTRAINT "funding_requests_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_requests" ADD CONSTRAINT "funding_requests_assignedFinancierId_fkey" FOREIGN KEY ("assignedFinancierId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_request_lines" ADD CONSTRAINT "funding_request_lines_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "funding_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funding_request_lines" ADD CONSTRAINT "funding_request_lines_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "funding_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_payeeVendorId_fkey" FOREIGN KEY ("payeeVendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repayments" ADD CONSTRAINT "repayments_fundingRequestId_fkey" FOREIGN KEY ("fundingRequestId") REFERENCES "funding_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_items" ADD CONSTRAINT "procurement_items_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_items" ADD CONSTRAINT "procurement_items_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_items" ADD CONSTRAINT "procurement_items_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_milestones" ADD CONSTRAINT "shipment_milestones_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_milestones" ADD CONSTRAINT "transaction_milestones_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_milestones" ADD CONSTRAINT "transaction_milestones_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "transaction_milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_disbursementId_fkey" FOREIGN KEY ("disbursementId") REFERENCES "disbursements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requestedFromOrganizationId_fkey" FOREIGN KEY ("requestedFromOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requestedFromUserId_fkey" FOREIGN KEY ("requestedFromUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_rfiId_fkey" FOREIGN KEY ("rfiId") REFERENCES "rfis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rfis" ADD CONSTRAINT "rfis_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
