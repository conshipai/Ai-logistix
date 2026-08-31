import {
  BarChart3,
  Building2,
  Eye,
  FileSearch,
  Lock,
  Users,
} from 'lucide-react'
import { PageHero } from '@/components/marketing/chrome'
import {
  ClosingBanner,
  MeasurementGrid,
  PanelHeading,
  Pillar,
} from '@/components/marketing/panels'
import { Alert, ButtonLink } from '@/components/ui'

export const metadata = {
  title: 'For governments and programme sponsors',
  description:
    'How MConnect supports national local-content objectives: measured participation from ' +
    'transaction records, read-only observer access for ministries and agencies, and no ' +
    'requirement for public capital.',
}

const OBSERVER = [
  {
    icon: <Eye className="h-5 w-5" />,
    title: 'Read-only by construction',
    body: 'The observer role holds no write capability of any kind — it cannot verify, approve, fund or alter anything. That is enforced on the server for every request, not hidden in the interface.',
    tone: 'accent' as const,
  },
  {
    icon: <FileSearch className="h-5 w-5" />,
    title: 'Scoped to what is authorised',
    body: 'Access is granted per transaction and is revocable. An observer sees the transactions shared with it and nothing else — the same isolation that keeps one supplier from seeing another.',
  },
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Reporting from records',
    body: 'Participation figures are computed from verified orders, recorded milestones and actual payments — not from returns submitted by the parties being measured.',
  },
  {
    icon: <Lock className="h-5 w-5" />,
    title: 'Auditable and attributable',
    body: 'Every verification, approval, funding decision and document access is recorded in an append-only trail identifying who acted, when, and from where.',
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
    heading: 'Capability built',
    metrics: [
      'Transactions completed per supplier',
      'Delivery accepted by the buyer',
      'On-time delivery against estimate',
      'Repeat participation across projects',
    ],
  },
  {
    heading: 'Financing enabled',
    metrics: [
      'Financing requested, approved and funded',
      'Financing-to-purchase-order ratio',
      'Repayment performance',
      'Transactions completed without financing',
    ],
  },
  {
    heading: 'Programme view',
    metrics: [
      'Participation by project and by sector',
      'Imported inputs supporting local manufacturing',
      'Transactions active and completed',
      'Complete audit history per transaction',
    ],
  },
]

export default function ForGovernmentPage() {
  return (
    <>
      <PageHero
        eyebrow="For governments and programme sponsors"
        title="Local-content participation you can measure, not just require."
        lead="MConnect is built so that a ministry, agency or programme sponsor can observe what local suppliers actually delivered — without taking credit risk, committing public capital, or relying on self-reported compliance."
      />

      {/* 01 — the problem in the government's terms */}
      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <PanelHeading
              n="01"
              title="The execution gap"
              lead="Local-content objectives are set to build durable industrial capability. Meeting them asks local firms to carry working capital they may not yet have access to."
            />
            <div className="prose-institutional">
              <p>
                A purchase order is a commitment to pay after delivery. Fulfilling it usually
                requires spending months beforehand — steel, imported components, labour, freight,
                duties. A supplier awarded work precisely because it is locally established may be
                the same supplier with the least access to the capital that award requires.
              </p>
              <p>
                The result is a specific and solvable mismatch: a creditworthy buyer, a qualified
                supplier, a genuine order — and no financing instrument positioned between them.
                Where that gap goes unaddressed, participation targets are met on paper by
                intermediaries rather than in practice by manufacturers.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — what it is and is not */}
      <section className="border-b border-ink-100 bg-ink-50/40 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="02"
            title="What MConnect is"
            lead="A transaction-management and visibility platform. It is not a lender, and it does not ask the public sector to become one."
          />
          <div className="mt-11 grid gap-6 lg:grid-cols-2">
            <div className="border-t-2 border-ink-900 bg-white p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-ink-400">
                What it does
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  'Establishes that a purchase order is genuine, active and on the stated terms — confirmed by the buyer, against a structured checklist.',
                  'Itemises what requested working capital will be spent on, and allows funds to be disbursed to material vendors rather than released as cash.',
                  'Tracks procurement, freight, customs, manufacturing and delivery as they happen.',
                  'Records delivery acceptance, invoicing, buyer payment and repayment in one auditable trail.',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-positive-500" />
                    <span className="text-[14px] leading-relaxed text-ink-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="border-t-2 border-accent-500 bg-white p-6">
              <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-ink-400">
                What it is not
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  'Not a bank, and not a licensed lender. AI Logistix does not provide the financing.',
                  'Not a request for public capital, a sovereign guarantee, or a first-loss position.',
                  'Not a request for a change in law, policy or procurement rules.',
                  'Not an exclusive arrangement — the platform is open to any qualified supplier, buyer or financing institution.',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                    <span className="text-[14px] leading-relaxed text-ink-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — observer access */}
      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="03"
            title="Observer access"
            lead="A ministry, agency, auditor or programme sponsor can be granted read-only visibility of authorised transactions. The role already exists in the platform and is covered by its test suite."
          />
          <div className="mt-11 grid gap-px bg-ink-200 sm:grid-cols-2 lg:grid-cols-4">
            {OBSERVER.map((item) => (
              <Pillar key={item.title} {...item} />
            ))}
          </div>
        </div>
      </section>

      {/* 04 — what is measured */}
      <section className="border-b border-ink-100 bg-ink-50/40 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="04"
            title="What can be reported"
            lead="Every figure is derived from the transaction record itself. Where the platform holds no data for a metric, it is reported as unavailable rather than estimated."
          />
          <div className="mt-11">
            <MeasurementGrid groups={MEASUREMENT} />
          </div>
          <p className="mt-5 max-w-3xl text-[12.5px] leading-relaxed text-ink-500">
            No projected or illustrative figure is presented as a result anywhere on this platform.
            A metric appears once there are transactions to derive it from, and not before.
          </p>
        </div>
      </section>

      {/* 05 — governance */}
      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="05"
            title="Governance and data"
            lead="The platform holds commercially sensitive information, and is built to the standard that implies."
          />
          <div className="mt-11 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {[
              [
                'Organization isolation',
                'One organization cannot reach another\'s transactions or documents, and identifiers cannot be probed to discover whether a record exists.',
              ],
              [
                'Server-side authorization',
                'Every action re-checks both the role and the record scope on the server. Hiding a control in the interface is never treated as a control.',
              ],
              [
                'Immutable audit trail',
                'Verification, approval, funding, document access and permission changes are all recorded, with secrets and bank identifiers redacted at write time.',
              ],
              [
                'Minimal financial data',
                'The platform stores an institution, a currency and a masked identifier. It never stores banking credentials or full account numbers.',
              ],
              [
                'Not built for one country',
                'Country is an explicit field throughout. Nothing assumes a single market, currency or language; Portuguese is scaffolded in the interface.',
              ],
              [
                'Independent credit decisions',
                'Financing institutions apply their own assessment, pricing and conditions. MConnect provides the record those decisions are made against, not the decision.',
              ],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="text-[14.5px] font-semibold text-ink-900">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.7] text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 — engagement */}
      <section className="border-b border-ink-100 bg-ink-50/40 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <PanelHeading
            n="06"
            title="How engagement could work"
            lead="Nothing below has been agreed with any government or agency. It sets out the forms of engagement the platform is designed to accommodate, as a basis for discussion."
          />
          <div className="mt-11 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <Eye className="h-5 w-5" />,
                title: 'Observer access',
                body: 'Read-only visibility of transactions on a designated project or programme, granted per transaction and revocable at any time.',
              },
              {
                icon: <Users className="h-5 w-5" />,
                title: 'Supplier referral',
                body: 'Local suppliers identified through an existing development or registration programme can be directed to register, subject to the same review as any other applicant.',
              },
              {
                icon: <Building2 className="h-5 w-5" />,
                title: 'Programme reporting',
                body: 'Periodic reporting on local participation for a designated programme, derived from the transaction record rather than from returns submitted by participants.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 border border-ink-200 bg-white p-6">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink-900 text-white">
                  {item.icon}
                </span>
                <div>
                  <h3 className="text-[15px] font-semibold text-ink-900">{item.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.7] text-ink-600">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <Alert tone="caution" title="No participation or endorsement is implied" className="mt-8">
            MConnect is operated by AI Logistix. No government, agency, development-finance
            institution, bank, project owner or EPC contractor participates in, endorses, or has any
            relationship with the programme unless that relationship is expressly stated. References
            to such organizations on this site describe categories of potential participant or
            potential financing structures only. AI Logistix is not a bank, a licensed lender, or a
            representative of any government agency or project operator.
          </Alert>
        </div>
      </section>

      <ClosingBanner
        eyebrow="Government and development-finance inquiries"
        title="Measured participation, without public capital at risk."
        body="Tell us which programme or project you are responsible for and we will set out what observer access and reporting would look like in practice."
      >
        <ButtonLink href="/contact#government" variant="accent" size="lg">
          Programme inquiry
        </ButtonLink>
        <ButtonLink
          href="/local-content"
          size="lg"
          className="border border-ink-700 bg-transparent text-white hover:bg-ink-900"
        >
          Read on local content
        </ButtonLink>
      </ClosingBanner>
    </>
  )
}
