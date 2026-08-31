import Link from 'next/link'
import {
  Anchor,
  ArrowRight,
  BadgeCheck,
  Building2,
  FileCheck2,
  Gavel,
  GraduationCap,
  Landmark,
  Leaf,
  Ship,
  Truck,
  Users,
} from 'lucide-react'
import { WorkflowGraphic } from '@/components/marketing/workflow'
import {
  ClosingBanner,
  CredentialStrip,
  MeasurementGrid,
  PanelHeading,
  Pillar,
  StructureTable,
} from '@/components/marketing/panels'
import { ButtonLink } from '@/components/ui'

export const metadata = {
  title: 'MConnect — Local Content Supply Chain Finance',
  description:
    'A purchase order should create opportunity, not a financing barrier. MConnect connects ' +
    'qualified local suppliers, project owners, EPC contractors, financial institutions and ' +
    'logistics providers through a controlled PO-based procurement workflow. Powered by AI Logistix.',
}

const BARRIERS = [
  'Working capital to buy materials months before an invoice is paid',
  'Access to USD for imported components and equipment',
  'Bank credit on terms that match a project timeline',
  'Supplier credit from international vendors who do not know the company',
  'Trade-finance facilities such as letters of credit',
  'Collateral of the kind conventional lenders require',
]

const PILLARS = [
  {
    icon: <FileCheck2 className="h-5 w-5" />,
    title: 'Verified purchase orders',
    body: 'Every transaction begins with an order the buyer has confirmed against a structured checklist — recorded permanently, against a named person.',
    tone: 'accent' as const,
  },
  {
    icon: <Landmark className="h-5 w-5" />,
    title: 'Controlled working capital',
    body: 'Funds are requested against a verified order, itemised by use, and can be disbursed to material vendors rather than released as cash.',
  },
  {
    icon: <Truck className="h-5 w-5" />,
    title: 'Logistics and customs',
    body: 'AI Logistix coordinates freight, customs clearance and delivery, and records each milestone as it happens rather than after the fact.',
  },
  {
    icon: <Gavel className="h-5 w-5" />,
    title: 'Governance and audit',
    body: 'Role-based access, organization isolation and an append-only audit trail covering verification, approval, funding and repayment.',
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: 'Local capability',
    body: 'Each executed order builds a documented delivery record, which is what makes the next order easier to finance than the last.',
  },
]

const STRUCTURE = [
  {
    party: 'Project owner / EPC',
    role: 'Issues and verifies the purchase order',
    instrument: 'Purchase order',
    provides: 'Confirmation that the order is genuine, active and on stated terms',
  },
  {
    party: 'Local supplier',
    role: 'Performs the contract',
    instrument: 'Manufacturing or services',
    provides: 'Delivery against the order, with progress recorded as it happens',
  },
  {
    party: 'MConnect / AI Logistix',
    role: 'Transaction coordination and logistics',
    instrument: 'Platform, freight, documentation',
    provides: 'Verification workflow, document control, execution visibility',
  },
  {
    party: 'Financing institution',
    role: 'Provides working capital',
    instrument: 'Subject to its own credit assessment',
    provides: 'Funding against a verified transaction, repaid from buyer payment',
  },
  {
    party: 'Material vendor',
    role: 'Supplies inputs',
    instrument: 'Vendor invoice',
    provides: 'Materials, components and equipment',
  },
]

const MEASUREMENT = [
  {
    heading: 'Local participation',
    metrics: [
      'Purchase-order value awarded to local suppliers',
      'Number of local suppliers participating',
      'Supplier sectors represented',
      'Local labour and manufacturing components',
    ],
  },
  {
    heading: 'Financing',
    metrics: [
      'Financing requested, approved and funded',
      'Financing-to-purchase-order ratio',
      'Average financing duration',
      'Repayment performance',
    ],
  },
  {
    heading: 'Execution',
    metrics: [
      'Procurement and manufacturing milestones',
      'Shipments by transport mode',
      'On-time delivery against estimate',
      'Delivery acceptance by the buyer',
    ],
  },
  {
    heading: 'Programme',
    metrics: [
      'Transactions by project',
      'Imported inputs supporting local manufacturing',
      'Transactions active and completed',
      'Complete audit history per transaction',
    ],
  },
]

const AUDIENCES = [
  {
    title: 'Suppliers',
    body: 'Register, upload an approved purchase order, set out what you need and what it will be spent on, then track the transaction to delivery and payment.',
    href: '/how-it-works#suppliers',
  },
  {
    title: 'EPCs and project owners',
    body: 'Confirm an order is genuine and active, review the supplier relationship, monitor local-content execution, and confirm receipt and acceptance.',
    href: '/how-it-works#epcs',
  },
  {
    title: 'Financial institutions',
    body: 'Review qualified transactions with the verification, supporting documentation, procurement milestones and repayment status in one record.',
    href: '/how-it-works#financiers',
  },
  {
    title: 'Government and programme sponsors',
    body: 'Observe local-content participation across a programme through read-only access and reporting derived from actual transactions.',
    href: '/local-content',
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'linear-gradient(#476296 1px, transparent 1px), linear-gradient(90deg, #476296 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-40 top-0 h-full w-[55%] opacity-[0.10]"
          style={{
            background:
              'radial-gradient(ellipse at center, #f26522 0%, transparent 62%)',
          }}
          aria-hidden
        />

        <div className="relative mx-auto max-w-6xl px-5 pb-4 pt-16 lg:px-8 lg:pt-24">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent-400">
              Local Content Supply Chain Finance
            </p>
            <span className="hidden h-3 w-px bg-ink-700 sm:block" />
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-400">
              Mozambique · United States
            </p>
          </div>

          <h1 className="mt-5 max-w-4xl font-serif text-[38px] leading-[1.06] text-white sm:text-[56px]">
            A purchase order should create opportunity — not a financing barrier.
          </h1>

          <p className="mt-6 max-w-2xl text-[17px] leading-[1.7] text-ink-200">
            MConnect connects qualified local suppliers, project owners, EPC contractors,
            financial institutions and logistics providers through a controlled,
            purchase-order-based procurement workflow.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/register" variant="accent" size="lg">
              Register your organization
            </ButtonLink>
            <ButtonLink
              href="/how-it-works"
              size="lg"
              className="border border-ink-700 bg-transparent text-white hover:bg-ink-900"
            >
              How the programme works
            </ButtonLink>
          </div>

          <p className="mt-9 max-w-2xl border-l-2 border-ink-700 pl-4 text-[12.5px] leading-relaxed text-ink-400">
            MConnect does not itself act as the lender. Financing may be provided by
            participating banks, development-finance institutions, insurers, trade-finance
            providers or other approved institutions, subject to their own independent review.
          </p>
        </div>

        <div className="relative mx-auto mt-12 max-w-6xl px-5 lg:px-8">
          <CredentialStrip
            items={[
              { icon: <BadgeCheck className="h-4 w-4" />, label: 'Buyer-verified purchase orders' },
              { icon: <Landmark className="h-4 w-4" />, label: 'Institution-agnostic financing' },
              { icon: <Ship className="h-4 w-4" />, label: 'Freight and customs coordination' },
              { icon: <Anchor className="h-4 w-4" />, label: 'Auditable transaction record' },
            ]}
          />
        </div>
      </section>

      {/* 01 — the gap */}
      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div>
              <PanelHeading
                n="01"
                title="The financing gap"
                lead="Local suppliers may hold the technical capability to fulfil a major project's requirements while lacking the financial resources to execute the order in front of them."
              />
              <p className="mt-6 text-[15px] leading-[1.75] text-ink-600">
                This can prevent a company from executing a purchase order{' '}
                <strong className="font-semibold text-ink-900">
                  even when the end customer is a highly creditworthy international corporation
                </strong>
                . The order is real, the buyer is sound, and the supplier is qualified — but the
                materials must be bought months before the invoice is paid.
              </p>
            </div>

            <div className="border border-ink-200 bg-ink-50/50 p-6 lg:p-8">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
                What a qualified supplier may lack
              </p>
              <ul className="mt-5 space-y-3.5">
                {BARRIERS.map((barrier) => (
                  <li key={barrier} className="flex gap-3">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                    <span className="text-[14.5px] leading-relaxed text-ink-700">{barrier}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — workflow */}
      <section className="border-b border-ink-100 bg-ink-50/40 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="02"
            title="How the programme works"
            lead="Every transaction follows the same sequence, and every party sees the same record of where it stands."
          />
          <div className="mt-12">
            <WorkflowGraphic />
          </div>
        </div>
      </section>

      {/* 03 — pillars */}
      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="03"
            title="Strategic pillars"
            lead="What the platform actually enforces, rather than what it asks participants to promise."
          />
          <div className="mt-11 grid gap-px bg-ink-200 sm:grid-cols-2 lg:grid-cols-5">
            {PILLARS.map((pillar) => (
              <Pillar key={pillar.title} {...pillar} />
            ))}
          </div>
        </div>
      </section>

      {/* 04 — participants */}
      <section className="border-b border-ink-100 bg-ink-50/40 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="04"
            title="Participants"
            lead="MConnect gives each participant exactly the view their role requires — and nothing beyond it."
          />
          <div className="mt-11 grid gap-px border border-ink-200 bg-ink-200 sm:grid-cols-2">
            {AUDIENCES.map((audience) => (
              <Link
                key={audience.title}
                href={audience.href}
                className="group bg-white p-7 transition-colors hover:bg-ink-50/70"
              >
                <h3 className="font-serif text-[21px] text-ink-900">{audience.title}</h3>
                <p className="mt-3 text-[14.5px] leading-[1.7] text-ink-600">{audience.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-600">
                  Read more
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 05 — structure */}
      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="05"
            title="Transaction structure"
            lead="Who provides what. The structure is deliberately conventional — what MConnect adds is verification, control and visibility around it."
          />
          <div className="mt-11">
            <StructureTable rows={STRUCTURE} />
          </div>
          <p className="mt-5 max-w-3xl text-[12.5px] leading-relaxed text-ink-500">
            Financing institutions are shown as a category rather than by name. Any reference on
            this platform to a government agency, development-finance institution, bank, insurer,
            project owner or EPC contractor describes a potential participant or financing
            structure, and does not state or imply that any named organization participates in or
            endorses the programme.{' '}
            <Link href="/financial-structure" className="font-semibold text-accent-600 underline">
              Read the full structure
            </Link>
            .
          </p>
        </div>
      </section>

      {/* 06 — measurement */}
      <section className="border-b border-ink-100 bg-ink-50/40 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="06"
            title="What the programme measures"
            lead="Reporting is derived from the transaction record itself — verified orders, recorded milestones, actual disbursements and repayments."
          />
          <div className="mt-11">
            <MeasurementGrid groups={MEASUREMENT} />
          </div>
          <p className="mt-5 max-w-3xl text-[12.5px] leading-relaxed text-ink-500">
            MConnect reports only figures it can derive from stored records. Where the platform
            holds no data for a metric it is reported as unavailable rather than estimated. No
            projected or illustrative figure is presented as a result.
          </p>
        </div>
      </section>

      {/* 07 — local content */}
      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
            <PanelHeading
              n="07"
              title="Built for local-content participation"
              lead="Local-content expectations are intended to build durable industrial capability. Meeting them asks local firms to carry working capital they may not yet have access to."
            />
            <div className="space-y-6">
              {[
                {
                  icon: <Users className="h-5 w-5" />,
                  title: 'Supplier development that is documented',
                  body: 'Each executed order produces a verifiable record of delivery, quality acceptance and payment — the evidence a supplier needs to win and finance the next one.',
                },
                {
                  icon: <Building2 className="h-5 w-5" />,
                  title: 'Visibility for programme sponsors',
                  body: 'Read-only access lets a ministry, agency or programme sponsor observe participation across a project without access to commercially sensitive terms.',
                },
                {
                  icon: <Leaf className="h-5 w-5" />,
                  title: 'Not built for one country',
                  body: 'Country is an explicit field on every organization, project and transaction. Mozambique is the first programme the platform serves, not the only one it can.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white">
                    {item.icon}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink-900">{item.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-[1.7] text-ink-600">
                      {item.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <ClosingBanner
        eyebrow="Connecting global procurement with local capability"
        title="A verified order, a funded supplier, a delivered project."
        body="Registration is reviewed by AI Logistix before an account is activated. Tell us about your organization and we will be in touch."
      >
        <ButtonLink href="/register" variant="accent" size="lg">
          Register
        </ButtonLink>
        <ButtonLink
          href="/contact"
          size="lg"
          className="border border-ink-700 bg-transparent text-white hover:bg-ink-900"
        >
          Programme inquiry
        </ButtonLink>
      </ClosingBanner>
    </>
  )
}
