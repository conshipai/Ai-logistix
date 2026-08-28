import { LifecycleColumn } from '@/components/marketing/workflow'
import { PageHero } from '@/components/marketing/chrome'
import { Card, CardBody, SectionHeading } from '@/components/ui'

export const metadata = {
  title: 'How it works',
  description:
    'What suppliers, EPC contractors, project owners, financial institutions and AI Logistix each ' +
    'do within an MConnect transaction.',
}

const SECTIONS = [
  {
    id: 'suppliers',
    eyebrow: 'For suppliers',
    title: 'From an order in hand to materials on the floor',
    lead: 'Everything a supplier needs to do is presented as a short list of next actions. No banking terminology, no forms that ask for information twice.',
    steps: [
      'Register your company and have the account reviewed',
      'Complete your company profile and capability information',
      'Upload the approved purchase order and supporting documents',
      'Set out how much working capital you need',
      'Provide the procurement plan and vendor quotations',
      'Track the transaction through procurement and delivery',
      'Submit invoices and supporting documents',
    ],
  },
  {
    id: 'epcs',
    eyebrow: 'For EPCs and project owners',
    title: 'Confirm what you issued, then watch it execute',
    lead: 'Verification is a short structured checklist rather than a free-text sign-off, so what was confirmed is recorded unambiguously and permanently.',
    steps: [
      'Verify that the purchase order was issued and remains active',
      'Confirm the order value, the supplier and the payment terms',
      'Review the supplier relationship and approve transaction details',
      'Ask the supplier questions without leaving the transaction',
      'Monitor local-content execution across your suppliers',
      'Confirm receipt and acceptance of the delivery',
      'Upload related documentation to the shared record',
    ],
  },
  {
    id: 'financiers',
    eyebrow: 'For financial institutions',
    title: 'Underlying transactions you can actually see',
    lead: 'A financing request arrives with the verification already done, the use of funds itemised, and the procurement and logistics milestones visible as they happen.',
    steps: [
      'Review transactions specifically shared with your institution',
      'Read the purchase-order verification and who performed it',
      'Access the supporting documentation under signed, audited access',
      'Ask questions and request further information',
      'Record the approved amount, rate or fee, and conditions precedent',
      'Approve, decline or request more information',
      'Record funding and track repayment against buyer payment',
    ],
  },
  {
    id: 'ai-logistix',
    eyebrow: 'For AI Logistix',
    title: 'The transaction coordinator and logistics control layer',
    lead: 'AI Logistix is not a bank and not a lender. It is the party that keeps the transaction moving and keeps the record complete for everyone else.',
    steps: [
      'Validate documentation as it arrives',
      'Coordinate procurement with the supplier and its vendors',
      'Arrange freight and coordinate customs clearance',
      'Monitor milestones and chase what is late',
      'Maintain the document trail across the transaction',
      'Provide lender visibility into execution as it happens',
      'Coordinate delivery and monitor payment milestones',
    ],
  },
]

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="The same transaction, seen four different ways"
        lead="MConnect gives each participant the view their role requires. Everyone works from one record; nobody sees more than they should."
      />

      {SECTIONS.map((section, index) => (
        <section
          key={section.id}
          id={section.id}
          className={`scroll-mt-24 border-b border-ink-100 py-16 lg:py-20 ${
            index % 2 === 1 ? 'bg-ink-50/40' : ''
          }`}
        >
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
              <div>
                <SectionHeading
                  eyebrow={section.eyebrow}
                  title={section.title}
                  description={section.lead}
                />
              </div>
              <Card className="self-start">
                <CardBody className="p-7">
                  <LifecycleColumn steps={section.steps} />
                </CardBody>
              </Card>
            </div>
          </div>
        </section>
      ))}

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Transaction lifecycle"
            title="Thirteen states, and only one is ever current"
            description="A transaction moves through a defined sequence. Invalid jumps are rejected by the platform — an unverified purchase order can never reach funding."
          />
          <div className="mt-10 grid gap-x-12 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Purchase order', 'The supplier records the order it has received.'],
              ['Verification', 'The buyer confirms the order is genuine and active.'],
              ['Financing review', 'AI Logistix reviews, then a partner assesses.'],
              ['Approved', 'A financing decision and any conditions are recorded.'],
              ['Funded', 'The advance is recorded against the facility.'],
              ['Procurement', 'Materials and components are ordered.'],
              ['Logistics', 'Freight, customs and delivery are tracked.'],
              ['Manufacturing', 'Fabrication progress and inspection are recorded.'],
              ['Delivery', 'Goods or services reach the buyer.'],
              ['Buyer acceptance', 'The buyer confirms receipt and acceptance.'],
              ['Payment', 'The buyer payment is recorded against the invoice.'],
              ['Repayment', 'The financing institution is repaid.'],
              ['Closed', 'The transaction is complete and archived.'],
            ].map(([name, detail], index) => (
              <div key={name} className="flex gap-3 border-b border-ink-100 py-3.5">
                <span className="tabular mt-0.5 text-[11px] font-bold text-ink-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div>
                  <p className="text-[14px] font-semibold text-ink-900">{name}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-500">{detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
