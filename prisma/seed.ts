import { randomBytes } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

/**
 * Demonstration data.
 *
 * Every organization, person and project below is FICTIONAL and is flagged
 * `isDemo: true` in the database and badged "Demo" in the interface. Nothing
 * here represents a real company, and no real company is portrayed as
 * participating in the programme.
 *
 * Passwords are generated at seed time and written to `.seed-credentials.txt`,
 * which is gitignored. No password is ever committed. Set SEED_PASSWORD to pin
 * a single shared password for a demonstration environment.
 */

const prisma = new PrismaClient()

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? null

function password(): string {
  if (DEMO_PASSWORD) return DEMO_PASSWORD
  // Readable but not guessable; regenerated on every seed run.
  return `Mc-${randomBytes(9).toString('base64url')}-2026`
}

interface SeededUser {
  email: string
  name: string
  role: string
  organization: string
  password: string
}

const credentials: SeededUser[] = []

async function createUser(input: {
  email: string
  name: string
  jobTitle: string
  phone?: string
  country: string
  organizationId: string
  organizationName: string
  role: 'SUPPLIER' | 'EPC' | 'PROJECT_OWNER' | 'FINANCIER' | 'AI_LOGISTIX_ADMIN' | 'AI_LOGISTIX_OPERATIONS' | 'VIEWER'
}) {
  const plain = password()
  const user = await prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name,
      jobTitle: input.jobTitle,
      phone: input.phone,
      country: input.country,
      passwordHash: await bcrypt.hash(plain, 12),
      status: 'ACTIVE',
      emailVerifiedAt: new Date(),
      isDemo: true,
    },
    update: { passwordHash: await bcrypt.hash(plain, 12), status: 'ACTIVE' },
    select: { id: true, email: true },
  })

  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: input.organizationId } },
    create: {
      userId: user.id,
      organizationId: input.organizationId,
      role: input.role,
      isPrimary: true,
    },
    update: { role: input.role, isActive: true },
  })

  credentials.push({
    email: input.email,
    name: input.name,
    role: input.role,
    organization: input.organizationName,
    password: plain,
  })

  return user
}

async function main() {
  console.info('Seeding MConnect demonstration data…')

  // --- Organizations ------------------------------------------------------
  // All fictional. See the note at the top of this file.

  const aiLogistix = await prisma.organization.upsert({
    where: { reference: 'ORG-AILOGISTIX' },
    create: {
      reference: 'ORG-AILOGISTIX',
      type: 'AI_LOGISTIX',
      legalName: 'AI Logistix LLC',
      tradingName: 'AI Logistix',
      country: 'US',
      industry: 'Freight forwarding and supply-chain services',
      website: 'https://ailogistix.co',
      accountStatus: 'ACTIVE',
      kycStatus: 'VERIFIED',
      preferredCurrency: 'USD',
      isDemo: true,
    },
    update: {},
  })

  const projectOwner = await prisma.organization.upsert({
    where: { reference: 'ORG-GEDC' },
    create: {
      reference: 'ORG-GEDC',
      type: 'PROJECT_OWNER',
      legalName: 'Global Energy Development Corporation',
      tradingName: 'Global Energy Development',
      country: 'US',
      registrationNumber: 'DEMO-GEDC-4417',
      industry: 'Upstream oil and gas',
      city: 'Houston',
      stateProvince: 'Texas',
      primaryContactName: 'Helena Okafor',
      primaryContactEmail: 'helena.okafor@demo-gedc.example',
      accountStatus: 'ACTIVE',
      kycStatus: 'VERIFIED',
      localContentClass: 'INTERNATIONAL',
      annualRevenueRange: 'OVER_100M',
      employeeCount: 4200,
      isDemo: true,
    },
    update: {},
  })

  const epc = await prisma.organization.upsert({
    where: { reference: 'ORG-ATLANTICEPC' },
    create: {
      reference: 'ORG-ATLANTICEPC',
      type: 'EPC',
      legalName: 'Atlantic EPC International Ltd',
      tradingName: 'Atlantic EPC International',
      country: 'GB',
      registrationNumber: 'DEMO-AEI-88201',
      industry: 'Engineering, procurement and construction',
      city: 'London',
      primaryContactName: 'Daniel Vermeulen',
      primaryContactEmail: 'daniel.vermeulen@demo-atlanticepc.example',
      accountStatus: 'ACTIVE',
      kycStatus: 'VERIFIED',
      localContentClass: 'INTERNATIONAL',
      annualRevenueRange: 'OVER_100M',
      employeeCount: 11500,
      isDemo: true,
    },
    update: {},
  })

  const supplier = await prisma.organization.upsert({
    where: { reference: 'ORG-MAPUTOIND' },
    create: {
      reference: 'ORG-MAPUTOIND',
      type: 'SUPPLIER',
      legalName: 'Maputo Industrial Fabrication LDA',
      tradingName: 'Maputo Industrial Fabrication',
      country: 'MZ',
      registrationNumber: 'DEMO-MIF-2019-3341',
      taxId: 'DEMO-NUIT-400318772',
      addressLine1: 'Parque Industrial da Matola, Lote 42',
      city: 'Matola',
      stateProvince: 'Maputo Province',
      industry: 'Steel fabrication and industrial services',
      primaryContactName: 'Amélia Chirindza',
      primaryContactEmail: 'amelia.chirindza@demo-maputofab.example',
      phone: '+258 84 000 0000',
      incorporationDate: new Date('2014-03-11'),
      employeeCount: 148,
      annualRevenueRange: 'FROM_5M_TO_25M',
      ownershipDescription:
        'Privately held. 100% Mozambican ownership, held by three founding shareholders.',
      localContentClass: 'LOCAL',
      accountStatus: 'ACTIVE',
      kycStatus: 'VERIFIED',
      preferredCurrency: 'USD',
      isDemo: true,
    },
    update: {},
  })

  const bank = await prisma.organization.upsert({
    where: { reference: 'ORG-IDBANK' },
    create: {
      reference: 'ORG-IDBANK',
      type: 'FINANCIAL_INSTITUTION',
      legalName: 'International Development Bank',
      tradingName: 'International Development Bank',
      country: 'ZA',
      registrationNumber: 'DEMO-IDB-77120',
      industry: 'Trade and development finance',
      city: 'Johannesburg',
      primaryContactName: 'Rui Bettencourt',
      primaryContactEmail: 'rui.bettencourt@demo-idbank.example',
      accountStatus: 'ACTIVE',
      kycStatus: 'VERIFIED',
      annualRevenueRange: 'OVER_100M',
      isDemo: true,
    },
    update: {},
  })

  const observer = await prisma.organization.upsert({
    where: { reference: 'ORG-PROGRAMOBS' },
    create: {
      reference: 'ORG-PROGRAMOBS',
      type: 'AUDITOR',
      legalName: 'Programme Observer Office (demonstration)',
      tradingName: 'Programme Observer Office',
      country: 'US',
      accountStatus: 'ACTIVE',
      kycStatus: 'VERIFIED',
      isDemo: true,
    },
    update: {},
  })

  await prisma.supplierProfile.upsert({
    where: { organizationId: supplier.id },
    create: {
      organizationId: supplier.id,
      capabilities:
        'Heavy steel fabrication to AWS D1.1, pressure-vessel and skid assembly, pipe spooling ' +
        'up to 24", structural platforms, industrial painting and blasting, and on-site ' +
        'installation and maintenance crews.',
      equipment:
        'Two 20-tonne overhead cranes, CNC plasma cutting to 40 mm, submerged-arc welding, ' +
        '8 m x 4 m blast and paint booth, plate rolling to 25 mm.',
      facilities: '9,400 m² covered workshop and 3 ha laydown yard at Matola Industrial Park.',
      projectExperience:
        'Structural steel and pipe spooling for two regional gas-processing facilities, and ' +
        'ongoing maintenance framework agreements with two industrial operators.',
      customerReferences: 'References available on request through AI Logistix.',
      certifications: 'ISO 9001:2015; welder qualifications to ASME IX.',
      qualityCertifications: 'ISO 9001:2015 (demonstration record)',
      healthSafetyCertifications: 'ISO 45001:2018 (demonstration record)',
      maximumContractCapacity: 2_500_000,
      maximumContractCurrency: 'USD',
      typicalWorkingCapitalNeed: 400_000,
      hasUsdAccess: true,
      hasExistingCreditFacilities: false,
      insuranceDescription: 'Public liability and contract works cover in place.',
    },
    update: {},
  })

  await prisma.bankingRelationship.deleteMany({ where: { organizationId: supplier.id } })
  await prisma.bankingRelationship.create({
    data: {
      organizationId: supplier.id,
      institutionName: 'Banco Comercial Demonstração',
      branch: 'Matola',
      accountCurrency: 'USD',
      // Masked only. The platform never stores a full account number.
      maskedAccountIdentifier: '****4821',
      relationshipManagerName: 'Carlos Nhaca',
    },
  })

  // --- Users --------------------------------------------------------------

  const [adminUser, opsUser, supplierUser, epcUser, ownerUser, bankUser] = await Promise.all([
    createUser({
      email: 'admin@demo-ailogistix.example',
      name: 'Tomás Ehler',
      jobTitle: 'Platform administrator',
      country: 'US',
      organizationId: aiLogistix.id,
      organizationName: 'AI Logistix',
      role: 'AI_LOGISTIX_ADMIN',
    }),
    createUser({
      email: 'operations@demo-ailogistix.example',
      name: 'Nadia Bakari',
      jobTitle: 'Transaction coordinator',
      country: 'US',
      organizationId: aiLogistix.id,
      organizationName: 'AI Logistix',
      role: 'AI_LOGISTIX_OPERATIONS',
    }),
    createUser({
      email: 'amelia@demo-maputofab.example',
      name: 'Amélia Chirindza',
      jobTitle: 'Managing director',
      phone: '+258 84 000 0000',
      country: 'MZ',
      organizationId: supplier.id,
      organizationName: 'Maputo Industrial Fabrication LDA',
      role: 'SUPPLIER',
    }),
    createUser({
      email: 'daniel@demo-atlanticepc.example',
      name: 'Daniel Vermeulen',
      jobTitle: 'Procurement manager',
      country: 'GB',
      organizationId: epc.id,
      organizationName: 'Atlantic EPC International',
      role: 'EPC',
    }),
    createUser({
      email: 'helena@demo-gedc.example',
      name: 'Helena Okafor',
      jobTitle: 'Local content manager',
      country: 'US',
      organizationId: projectOwner.id,
      organizationName: 'Global Energy Development Corporation',
      role: 'PROJECT_OWNER',
    }),
    createUser({
      email: 'rui@demo-idbank.example',
      name: 'Rui Bettencourt',
      jobTitle: 'Head of trade finance',
      country: 'ZA',
      organizationId: bank.id,
      organizationName: 'International Development Bank',
      role: 'FINANCIER',
    }),
  ])

  await createUser({
    email: 'observer@demo-programme.example',
    name: 'Programme Observer',
    jobTitle: 'Programme sponsor (read-only)',
    country: 'US',
    organizationId: observer.id,
    organizationName: 'Programme Observer Office',
    role: 'VIEWER',
  })

  // --- Project ------------------------------------------------------------

  const project = await prisma.project.upsert({
    where: { reference: 'PRJ-MZLNG-EXP' },
    create: {
      reference: 'PRJ-MZLNG-EXP',
      name: 'Mozambique LNG Infrastructure Expansion',
      projectOwnerId: projectOwner.id,
      epcId: epc.id,
      location: 'Cabo Delgado Province',
      country: 'MZ',
      sector: 'Oil and gas — midstream infrastructure',
      description:
        'Fictional demonstration project. Expansion of onshore support infrastructure, with a ' +
        'defined local-content procurement programme for fabrication and industrial services.',
      status: 'ACTIVE',
      startDate: new Date('2025-09-01'),
      targetCompletionDate: new Date('2027-06-30'),
      currency: 'USD',
      localContentProgram: 'Local Supplier Development Programme (demonstration)',
      primaryContactName: 'Helena Okafor',
      primaryContactEmail: 'helena.okafor@demo-gedc.example',
      isDemo: true,
    },
    update: {},
  })

  // --- Vendors ------------------------------------------------------------

  const vendors = await Promise.all(
    [
      { name: 'Highveld Steel Supply (Pty) Ltd', country: 'ZA', contactName: 'Sipho Dlamini' },
      { name: 'Rheinventil Industriearmaturen GmbH', country: 'DE', contactName: 'Katrin Lohmann' },
      { name: 'Matola Labour Services LDA', country: 'MZ', contactName: 'Jorge Macuácua' },
      { name: 'Índico Freight & Customs LDA', country: 'MZ', contactName: 'Fátima Sitoe' },
    ].map((vendor) =>
      prisma.vendor.upsert({
        where: { organizationId_name: { organizationId: supplier.id, name: vendor.name } },
        create: { ...vendor, organizationId: supplier.id, isDemo: true },
        update: {},
      }),
    ),
  )
  const [steelVendor, valveVendor, labourVendor, freightVendor] = vendors

  // --- The demonstration transaction --------------------------------------
  // USD 500,000 purchase order; USD 285,000 requested; USD 250,000 approved.

  const existing = await prisma.purchaseOrder.findFirst({
    where: { supplierId: supplier.id, buyerId: epc.id, poNumber: 'PO-456782' },
    select: { id: true },
  })

  if (existing) {
    console.info('Demonstration transaction already present; leaving it untouched.')
  } else {
    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber: 'PO-456782',
        projectId: project.id,
        supplierId: supplier.id,
        buyerId: epc.id,
        issueDate: new Date('2026-02-09'),
        currency: 'USD',
        value: 500_000,
        paymentTerms: '30 days from acceptance of delivery',
        incoterm: 'DAP',
        deliveryTerms: 'DAP project laydown area, Cabo Delgado',
        requestedDeliveryDate: new Date('2026-07-15'),
        scopeDescription:
          'Fabrication and supply of structural steel platforms, access walkways and pipe ' +
          'spools for the onshore support facility, including surface preparation, painting, ' +
          'and delivery to the project laydown area. Fabrication to approved drawings; welding ' +
          'to AWS D1.1; third-party inspection prior to despatch.',
        manufacturingComponent: 210_000,
        importedMaterialComponent: 165_000,
        localLabourComponent: 60_000,
        logisticsComponent: 40_000,
        taxesComponent: 25_000,
        expectedGrossMargin: 14.5,
        progressPaymentSchedule:
          '20% on completion of fabrication of the first platform section; balance on delivery ' +
          'and acceptance.',
        finalPaymentTerms: 'Balance payable 30 days after buyer acceptance of the final delivery.',
        expiryDate: new Date('2026-09-30'),
        status: 'VERIFIED',
        submittedAt: new Date('2026-02-16'),
        isDemo: true,
      },
    })

    await prisma.purchaseOrderVerification.create({
      data: {
        purchaseOrderId: po.id,
        verifiedById: epcUser.id,
        verifiedByOrganizationId: epc.id,
        method: 'ERP_LOOKUP',
        decision: 'APPROVED',
        valueConfirmed: true,
        buyerConfirmed: true,
        supplierConfirmed: true,
        paymentTermsConfirmed: true,
        poIsActiveConfirmed: true,
        comments:
          'Confirmed against our procurement system. Order is active and the supplier is on our ' +
          'approved vendor list for this scope.',
        createdAt: new Date('2026-02-18'),
      },
    })

    const transaction = await prisma.transaction.create({
      data: {
        number: 'MCONNECT-2026-000012',
        purchaseOrderId: po.id,
        projectId: project.id,
        supplierId: supplier.id,
        buyerId: epc.id,
        stage: 'PROCUREMENT',
        isDemo: true,
        stageHistory: {
          create: [
            { toStage: 'PURCHASE_ORDER', actorUserId: supplierUser.id, note: 'Transaction opened on purchase-order submission.', createdAt: new Date('2026-02-16') },
            { fromStage: 'PURCHASE_ORDER', toStage: 'VERIFICATION', actorUserId: supplierUser.id, note: 'Purchase order submitted for buyer verification.', createdAt: new Date('2026-02-16') },
            { fromStage: 'VERIFICATION', toStage: 'FINANCING_REVIEW', actorUserId: epcUser.id, note: 'Purchase order verified by the buyer.', createdAt: new Date('2026-02-18') },
            { fromStage: 'FINANCING_REVIEW', toStage: 'APPROVED', actorUserId: bankUser.id, note: 'Financing approved.', createdAt: new Date('2026-03-04') },
            { fromStage: 'APPROVED', toStage: 'FUNDED', actorUserId: bankUser.id, note: 'Financing funded.', createdAt: new Date('2026-03-09') },
            { fromStage: 'FUNDED', toStage: 'PROCUREMENT', actorUserId: supplierUser.id, note: 'Procurement started.', createdAt: new Date('2026-03-12') },
          ],
        },
      },
    })

    // Financing partner has been granted access to the transaction.
    await prisma.transactionAccess.create({
      data: {
        transactionId: transaction.id,
        organizationId: bank.id,
        readOnly: false,
        grantedById: opsUser.id,
      },
    })
    await prisma.transactionAccess.create({
      data: {
        transactionId: transaction.id,
        organizationId: observer.id,
        readOnly: true,
        grantedById: adminUser.id,
      },
    })

    const funding = await prisma.fundingRequest.create({
      data: {
        reference: 'FR-DEMO2026A',
        transactionId: transaction.id,
        requestedAmount: 285_000,
        currency: 'USD',
        percentageOfPoValue: 57,
        purposeSummary:
          'Working capital to purchase steel plate and imported valves, cover fabrication labour, ' +
          'and fund inbound freight and customs ahead of the buyer payment.',
        requiredFundingDate: new Date('2026-03-10'),
        proposedRepaymentSource:
          'Payment from Atlantic EPC International on acceptance of delivery under PO-456782.',
        expectedBuyerPaymentDate: new Date('2026-08-20'),
        status: 'FUNDED',
        assignedFinancierId: bank.id,
        approvedAmount: 250_000,
        approvedCurrency: 'USD',
        interestRatePct: 9.75,
        feePct: 1.25,
        conditionsPrecedent:
          'Verified purchase order on file; vendor quotations for the steel and valve packages; ' +
          'disbursement of the material portion directly to the named vendors; assignment of ' +
          'the buyer payment under PO-456782.',
        financierNotes:
          'Approved at USD 250,000 against a USD 500,000 verified purchase order (50%). Material ' +
          'packages to be paid directly to vendors.',
        submittedAt: new Date('2026-02-20'),
        decisionAt: new Date('2026-03-04'),
        fundedAt: new Date('2026-03-09'),
        isDemo: true,
        lines: {
          create: [
            { purpose: 'RAW_MATERIALS', description: 'Structural steel plate and sections', vendorId: steelVendor!.id, amount: 140_000, currency: 'USD' },
            { purpose: 'IMPORTED_COMPONENTS', description: 'Imported valves and instrumentation', vendorId: valveVendor!.id, amount: 65_000, currency: 'USD' },
            { purpose: 'LABOUR', description: 'Fabrication labour and welding crews', vendorId: labourVendor!.id, amount: 40_000, currency: 'USD' },
            { purpose: 'LOGISTICS', description: 'Inbound freight, customs and inland haulage', vendorId: freightVendor!.id, amount: 25_000, currency: 'USD' },
            { purpose: 'OTHER', description: 'Consumables, blasting media and paint', amount: 15_000, currency: 'USD' },
          ],
        },
      },
    })

    await prisma.disbursement.createMany({
      data: [
        {
          reference: 'DSB-DEMO001',
          fundingRequestId: funding.id,
          payeeName: 'Highveld Steel Supply (Pty) Ltd',
          payeeVendorId: steelVendor!.id,
          payeeBankDetails: 'Demonstration Bank ****7734',
          approvedAmount: 140_000,
          approvedCurrency: 'USD',
          purpose: 'RAW_MATERIALS',
          authorizationStatus: 'AUTHORIZED',
          paymentStatus: 'PAID',
          paymentDate: new Date('2026-03-11'),
          transactionReference: 'DEMO-REF-11842',
        },
        {
          reference: 'DSB-DEMO002',
          fundingRequestId: funding.id,
          payeeName: 'Rheinventil Industriearmaturen GmbH',
          payeeVendorId: valveVendor!.id,
          payeeBankDetails: 'Demonstration Bank ****2290',
          approvedAmount: 65_000,
          approvedCurrency: 'USD',
          purpose: 'IMPORTED_COMPONENTS',
          authorizationStatus: 'AUTHORIZED',
          paymentStatus: 'PAID',
          paymentDate: new Date('2026-03-13'),
          transactionReference: 'DEMO-REF-11855',
        },
        {
          reference: 'DSB-DEMO003',
          fundingRequestId: funding.id,
          payeeName: 'Maputo Industrial Fabrication LDA',
          approvedAmount: 45_000,
          approvedCurrency: 'USD',
          purpose: 'LABOUR',
          authorizationStatus: 'AUTHORIZED',
          paymentStatus: 'SCHEDULED',
        },
      ],
    })

    // Procurement plan
    await prisma.procurementItem.createMany({
      data: [
        {
          transactionId: transaction.id,
          vendorId: steelVendor!.id,
          itemName: 'Structural steel plate, S355, 12–25 mm',
          description: 'Plate for platform decking and support frames.',
          countryOfOrigin: 'ZA',
          quantity: 86,
          unit: 'tonnes',
          currency: 'USD',
          amount: 140_000,
          expectedPurchaseDate: new Date('2026-03-11'),
          expectedShipDate: new Date('2026-03-24'),
          expectedArrivalDate: new Date('2026-04-04'),
          requiredByDate: new Date('2026-04-10'),
          logisticsRequired: true,
          status: 'DELIVERED',
        },
        {
          transactionId: transaction.id,
          vendorId: valveVendor!.id,
          itemName: 'Ball and gate valves, DN50–DN200',
          description: 'Imported valve package with material certification.',
          countryOfOrigin: 'DE',
          quantity: 64,
          unit: 'each',
          currency: 'USD',
          amount: 65_000,
          expectedPurchaseDate: new Date('2026-03-13'),
          expectedShipDate: new Date('2026-04-08'),
          expectedArrivalDate: new Date('2026-05-06'),
          requiredByDate: new Date('2026-05-20'),
          logisticsRequired: true,
          status: 'SHIPPED',
        },
        {
          transactionId: transaction.id,
          vendorId: labourVendor!.id,
          itemName: 'Fabrication labour — welding and assembly',
          countryOfOrigin: 'MZ',
          quantity: 4200,
          unit: 'hours',
          currency: 'USD',
          amount: 40_000,
          requiredByDate: new Date('2026-06-15'),
          logisticsRequired: false,
          status: 'ORDERED',
        },
        {
          transactionId: transaction.id,
          itemName: 'Blasting media, primer and topcoat',
          countryOfOrigin: 'ZA',
          quantity: 1,
          unit: 'lot',
          currency: 'USD',
          amount: 15_000,
          requiredByDate: new Date('2026-05-25'),
          logisticsRequired: false,
          status: 'APPROVED',
        },
      ],
    })

    // Shipments
    const steelShipment = await prisma.shipment.create({
      data: {
        reference: 'SHP-DEMO001',
        transactionId: transaction.id,
        origin: 'Durban, ZA',
        destination: 'Matola, MZ',
        mode: 'ROAD',
        carrier: 'Índico Freight & Customs LDA',
        bookingReference: 'DEMO-BK-40118',
        estimatedDeparture: new Date('2026-03-24'),
        actualDeparture: new Date('2026-03-25'),
        estimatedArrival: new Date('2026-04-04'),
        actualArrival: new Date('2026-04-03'),
        customsStatus: 'CLEARED',
        deliveryStatus: 'DELIVERED',
        milestones: {
          create: [
            { type: 'BOOKED', occurredAt: new Date('2026-03-16T09:00:00Z') },
            { type: 'PICKED_UP', occurredAt: new Date('2026-03-25T06:30:00Z'), location: 'Durban, ZA' },
            { type: 'EXPORT_CLEARED', occurredAt: new Date('2026-03-26T14:10:00Z'), location: 'Durban, ZA' },
            { type: 'DEPARTED', occurredAt: new Date('2026-03-26T17:00:00Z'), location: 'Durban, ZA' },
            { type: 'ARRIVED', occurredAt: new Date('2026-04-01T11:20:00Z'), location: 'Ressano Garcia border' },
            { type: 'CUSTOMS_RELEASED', occurredAt: new Date('2026-04-02T15:45:00Z'), location: 'Ressano Garcia border' },
            { type: 'DELIVERED', occurredAt: new Date('2026-04-03T10:05:00Z'), location: 'Matola, MZ' },
          ],
        },
      },
    })

    await prisma.shipment.create({
      data: {
        reference: 'SHP-DEMO002',
        transactionId: transaction.id,
        origin: 'Hamburg, DE',
        destination: 'Maputo, MZ',
        mode: 'OCEAN_LCL',
        carrier: 'Demonstration Line',
        bookingReference: 'DEMO-BK-40233',
        masterBill: 'DEMOMBL0099231',
        houseBill: 'DEMOHBL0044117',
        containerNumber: 'DEMU4471820',
        estimatedDeparture: new Date('2026-04-08'),
        actualDeparture: new Date('2026-04-09'),
        estimatedArrival: new Date('2026-05-06'),
        customsStatus: 'NOT_STARTED',
        deliveryStatus: 'IN_TRANSIT',
        milestones: {
          create: [
            { type: 'BOOKED', occurredAt: new Date('2026-03-30T10:00:00Z') },
            { type: 'RECEIVED_AT_ORIGIN', occurredAt: new Date('2026-04-06T08:15:00Z'), location: 'Hamburg, DE' },
            { type: 'EXPORT_CLEARED', occurredAt: new Date('2026-04-08T12:00:00Z'), location: 'Hamburg, DE' },
            { type: 'DEPARTED', occurredAt: new Date('2026-04-09T19:30:00Z'), location: 'Hamburg, DE' },
          ],
        },
      },
    })

    await prisma.procurementItem.updateMany({
      where: { transactionId: transaction.id, itemName: { startsWith: 'Structural steel' } },
      data: { shipmentId: steelShipment.id },
    })

    // Execution milestones — the standard plan, partly complete.
    const MILESTONES: Array<[string, string, boolean]> = [
      ['FUNDING_APPROVED', 'Funding approved', true],
      ['RAW_MATERIAL_ORDERED', 'Raw material ordered', true],
      ['RAW_MATERIAL_SHIPPED', 'Raw material shipped', true],
      ['RAW_MATERIAL_DELIVERED', 'Raw material delivered', true],
      ['FABRICATION_STARTED', 'Fabrication started', true],
      ['PROGRESS_25', '25% complete', true],
      ['PROGRESS_50', '50% complete', false],
      ['PROGRESS_75', '75% complete', false],
      ['INSPECTION_SCHEDULED', 'Inspection scheduled', false],
      ['INSPECTION_PASSED', 'Inspection passed', false],
      ['READY_FOR_DELIVERY', 'Ready for delivery', false],
      ['DELIVERED', 'Delivered to buyer', false],
      ['BUYER_ACCEPTED', 'Buyer acceptance confirmed', false],
      ['INVOICE_SUBMITTED', 'Invoice submitted', false],
      ['INVOICE_APPROVED', 'Invoice approved', false],
      ['PAYMENT_RECEIVED', 'Buyer payment received', false],
      ['FINANCE_REPAID', 'Financing repaid', false],
    ]

    await prisma.transactionMilestone.createMany({
      data: MILESTONES.map(([type, title, done], index) => ({
        transactionId: transaction.id,
        type: type as never,
        title,
        sequence: index * 10,
        status: done ? ('COMPLETED' as const) : ('PENDING' as const),
        completedAt: done ? new Date(2026, 2, 10 + index) : null,
        completedById: done ? supplierUser.id : null,
        dueDate: !done && index < 10 ? new Date(2026, 4, 5 + index * 4) : null,
      })),
    })

    // Approvals — the decision record behind the state above.
    await prisma.approval.createMany({
      data: [
        {
          transactionId: transaction.id,
          type: 'PO_VERIFICATION',
          requestedFromOrganizationId: epc.id,
          requestedById: supplierUser.id,
          decision: 'APPROVED',
          decidedById: epcUser.id,
          decidedAt: new Date('2026-02-18'),
          comments: 'Confirmed against our procurement system.',
          requestedAt: new Date('2026-02-16'),
        },
        {
          transactionId: transaction.id,
          type: 'AI_LOGISTIX_TRANSACTION_REVIEW',
          requestedById: supplierUser.id,
          decision: 'APPROVED',
          decidedById: opsUser.id,
          decidedAt: new Date('2026-02-24'),
          comments: 'Documentation complete. Routed to International Development Bank.',
          requestedAt: new Date('2026-02-20'),
        },
        {
          transactionId: transaction.id,
          type: 'FINANCING_APPROVAL',
          requestedFromOrganizationId: bank.id,
          requestedById: opsUser.id,
          decision: 'APPROVED',
          decidedById: bankUser.id,
          decidedAt: new Date('2026-03-04'),
          comments: 'Approved at USD 250,000 subject to the conditions precedent recorded.',
          requestedAt: new Date('2026-02-24'),
        },
      ],
    })

    // An open information request, so the RFI workflow is visible in the demo.
    await prisma.rfi.create({
      data: {
        reference: 'RFI-DEMO001',
        transactionId: transaction.id,
        subject: 'Third-party inspection booking confirmation',
        body:
          'Please upload the confirmation from the inspection body once the pre-despatch ' +
          'inspection has been booked, so we can plan the delivery window.',
        requestedDocumentCategory: 'INSPECTION_CERTIFICATE',
        raisedById: epcUser.id,
        raisedByOrganizationId: epc.id,
        assignedToOrganizationId: supplier.id,
        assignedToUserId: supplierUser.id,
        status: 'OPEN',
        dueDate: new Date('2026-06-01'),
      },
    })

    await prisma.comment.createMany({
      data: [
        {
          transactionId: transaction.id,
          authorId: opsUser.id,
          authorOrganizationId: aiLogistix.id,
          body:
            'Steel package cleared customs at Ressano Garcia and was delivered to the workshop on ' +
            '3 April. Valve package departed Hamburg on 9 April, ETA Maputo 6 May.',
          mentionedUserIds: [],
          createdAt: new Date('2026-04-10T08:00:00Z'),
        },
        {
          transactionId: transaction.id,
          authorId: supplierUser.id,
          authorOrganizationId: supplier.id,
          body:
            'Fabrication of the first platform section is underway and on schedule. We will book ' +
            'the pre-despatch inspection once the second section is complete.',
          mentionedUserIds: [],
          createdAt: new Date('2026-04-14T14:30:00Z'),
        },
      ],
    })

    await prisma.auditEvent.createMany({
      data: [
        {
          actorUserId: supplierUser.id,
          actorEmail: supplierUser.email,
          organizationId: supplier.id,
          action: 'purchase_order.created',
          entityType: 'PurchaseOrder',
          entityId: po.id,
          afterData: { poNumber: 'PO-456782', value: '500000', currency: 'USD' },
          createdAt: new Date('2026-02-14T10:12:00Z'),
        },
        {
          actorUserId: supplierUser.id,
          actorEmail: supplierUser.email,
          organizationId: supplier.id,
          action: 'purchase_order.submitted',
          entityType: 'PurchaseOrder',
          entityId: po.id,
          afterData: { status: 'VERIFICATION_REQUESTED', transactionNumber: transaction.number },
          createdAt: new Date('2026-02-16T09:03:00Z'),
        },
        {
          actorUserId: epcUser.id,
          actorEmail: epcUser.email,
          organizationId: epc.id,
          action: 'purchase_order.verified',
          entityType: 'PurchaseOrder',
          entityId: po.id,
          afterData: { status: 'VERIFIED', method: 'ERP_LOOKUP' },
          createdAt: new Date('2026-02-18T11:40:00Z'),
        },
        {
          actorUserId: bankUser.id,
          actorEmail: bankUser.email,
          organizationId: bank.id,
          action: 'funding_request.approved',
          entityType: 'FundingRequest',
          entityId: funding.id,
          afterData: { status: 'APPROVED', approvedAmount: '250000', interestRatePct: '9.75' },
          createdAt: new Date('2026-03-04T15:20:00Z'),
        },
        {
          actorUserId: bankUser.id,
          actorEmail: bankUser.email,
          organizationId: bank.id,
          action: 'funding_request.funded',
          entityType: 'FundingRequest',
          entityId: funding.id,
          afterData: { status: 'FUNDED', fundedDate: '2026-03-09' },
          createdAt: new Date('2026-03-09T09:00:00Z'),
        },
      ],
    })

    console.info(`Created demonstration transaction ${transaction.number}.`)
  }

  // --- Credentials --------------------------------------------------------

  const lines = [
    'MConnect — demonstration account credentials',
    '',
    'These accounts are FICTIONAL and exist only for demonstration.',
    'This file is gitignored and must never be committed or shared publicly.',
    `Generated ${new Date().toISOString()}`,
    '',
    ...credentials.map(
      (user) =>
        `${user.role.padEnd(24)} ${user.email.padEnd(38)} ${user.password}\n${''.padEnd(24)} ${user.name} — ${user.organization}`,
    ),
    '',
    'Rotate or delete these accounts before exposing the deployment publicly.',
    '',
  ]
  writeFileSync('.seed-credentials.txt', lines.join('\n'), { mode: 0o600 })

  console.info('')
  console.info('Seed complete.')
  console.info(`  ${credentials.length} demonstration users written to .seed-credentials.txt`)
  console.info('  That file is gitignored. Do not commit it.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
