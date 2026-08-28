import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { WorkflowGraphic } from '@/components/marketing/workflow'
import { ButtonLink, SectionHeading } from '@/components/ui'

export const metadata = {
  title: 'MConnect — Local Content Supply Chain Finance',
  description:
    'A purchase order should create opportunity, not a financing barrier. MConnect connects ' +
    'qualified local suppliers, project owners, EPC contractors, financial institutions and ' +
    'logistics providers through a controlled PO-based procurement workflow.',
}

const BARRIERS = [
  'Sufficient working capital to buy materials before being paid',
  'Access to USD for imported components and equipment',
  'Bank credit on terms that match a project timeline',
  'Supplier credit from international vendors',
  'Trade-finance facilities such as letters of credit',
  'Collateral of the kind traditional lenders require',
]

const AUDIENCES = [
  {
    title: 'Suppliers',
    body: 'Register your company, upload an approved purchase order, set out what you need and what it will be spent on, then track the transaction to delivery and payment.',
    href: '/how-it-works#suppliers',
  },
  {
    title: 'EPCs and project owners',
    body: 'Confirm that a purchase order is genuine and active, review the supplier relationship, monitor local-content execution, and confirm receipt and acceptance.',
    href: '/how-it-works#epcs',
  },
  {
    title: 'Financial institutions',
    body: 'Review qualified transactions with the purchase-order verification, supporting documentation, procurement milestones and repayment status in one place.',
    href: '/how-it-works#financiers',
  },
  {
    title: 'AI Logistix',
    body: 'Transaction coordination and the logistics control layer: document validation, procurement support, freight and customs, milestone monitoring and lender visibility.',
    href: '/how-it-works#ai-logistix',
  },
]

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink-950">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(#476296 1px, transparent 1px), linear-gradient(90deg, #476296 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-accent-400">
            Local Content Supply Chain Finance
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-[38px] leading-[1.08] text-white sm:text-[54px]">
            A purchase order should create opportunity — not a financing barrier.
          </h1>
          <p className="mt-6 max-w-2xl text-[17px] leading-[1.7] text-ink-200">
            MConnect connects qualified local suppliers, project owners, EPC contractors, financial
            institutions and logistics providers through a controlled, purchase-order-based
            procurement workflow.
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
              See how it works
            </ButtonLink>
          </div>
          <p className="mt-8 max-w-2xl text-[12.5px] leading-relaxed text-ink-400">
            MConnect does not itself act as the lender. Financing may be provided by participating
            banks, development-finance institutions, insurers, trade-finance providers or other
            approved institutions, subject to their own independent review.
          </p>
        </div>
      </section>

      {/* The problem */}
      <section className="border-b border-ink-100 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div>
              <SectionHeading
                eyebrow="The problem"
                title="Capability is rarely the constraint. Capital is."
                description="Local suppliers may hold the technical capability to fulfil major project requirements while lacking the financial resources to execute the order in front of them."
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
            <div className="rounded-lg border border-ink-200 bg-ink-50/50 p-6 lg:p-8">
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

      {/* Workflow */}
      <section className="border-b border-ink-100 bg-ink-50/40 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="The workflow"
            title="One controlled path from order to repayment"
            description="Every transaction follows the same sequence, and every party sees the same record of where it stands."
          />
          <div className="mt-12">
            <WorkflowGraphic />
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="border-b border-ink-100 py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Participants"
            title="Four parties, one transaction record"
            description="MConnect gives each participant exactly the view their role requires — and nothing beyond it."
          />
          <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-ink-200 bg-ink-200 sm:grid-cols-2">
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

      {/* Closing */}
      <section className="bg-ink-900 py-16 lg:py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 lg:flex-row lg:items-center lg:px-8">
          <div className="max-w-xl">
            <h2 className="font-serif text-[28px] leading-tight text-white sm:text-[34px]">
              Connecting global procurement with local capability.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-ink-300">
              Registration is reviewed by AI Logistix before an account is activated. Tell us about
              your organization and we will be in touch.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <ButtonLink href="/register" variant="accent" size="lg">
              Register
            </ButtonLink>
            <ButtonLink
              href="/contact"
              size="lg"
              className="border border-ink-700 bg-transparent text-white hover:bg-ink-800"
            >
              Programme inquiry
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  )
}
