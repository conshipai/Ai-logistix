import { PageHero } from '@/components/marketing/chrome'
import { Card, CardBody, SectionHeading } from '@/components/ui'

export const metadata = {
  title: 'Why MConnect',
  description:
    'What local suppliers, project owners, EPC contractors, financial institutions, the local ' +
    'economy and international exporters each get from a controlled PO-based workflow.',
}

const BENEFICIARIES = [
  {
    title: 'Local suppliers',
    headline: 'Access to larger contracts and better working-capital options.',
    body: 'A supplier can pursue orders that would otherwise be beyond its cash position, and can show a prospective financier a verified order rather than only a balance sheet.',
  },
  {
    title: 'Project owners',
    headline: 'More reliable local-content execution.',
    body: 'Local-content commitments are met by suppliers who can actually perform, with execution visible against the plan rather than reported after the fact.',
  },
  {
    title: 'EPC contractors',
    headline: 'Lower supplier execution risk.',
    body: 'Fewer schedule surprises from a supplier that could not fund materials, and a structured verification step that takes minutes rather than an email chain.',
  },
  {
    title: 'Financial institutions',
    headline: 'Better visibility into the underlying transaction.',
    body: 'The purchase-order verification, the itemised use of funds, procurement and logistics milestones, delivery acceptance and repayment all sit in one auditable record.',
  },
  {
    title: 'The local economy',
    headline: 'Increased local manufacturing capability and supplier development.',
    body: 'Each executed order builds capability, employment and a track record that makes the next order easier to finance than the last.',
  },
  {
    title: 'International exporters',
    headline: 'A route to sell into local-content procurement.',
    body: 'Raw materials, components, equipment and services can be sold into projects delivered through local suppliers, with logistics and documentation coordinated by AI Logistix.',
  },
]

export default function WhyMConnectPage() {
  return (
    <>
      <PageHero
        eyebrow="Why MConnect"
        title="The same workflow serves six different interests"
        lead="A transaction platform is only worth adopting if every party gets something from it. Here is what each one gets."
      />

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {BENEFICIARIES.map((item) => (
              <Card key={item.title} className="flex flex-col">
                <CardBody className="flex-1 p-6">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-600">
                    {item.title}
                  </p>
                  <h3 className="mt-3 font-serif text-[19px] leading-snug text-ink-900">
                    {item.headline}
                  </h3>
                  <p className="mt-3 text-[13.5px] leading-[1.7] text-ink-600">{item.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-100 bg-ink-50/40 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="How the platform is built"
            title="Control, not convenience"
            description="MConnect handles commercially sensitive financial information, so the platform is built to the standard that implies."
          />
          <div className="mt-10 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['Organization isolation', 'One organization can never reach another’s transactions or documents, and identifiers cannot be probed to discover whether a record exists.'],
              ['Server-side authorization', 'Every action re-checks both the role and the record scope on the server. Hiding a control in the interface is never treated as a control.'],
              ['Immutable audit trail', 'Login, verification, approval, funding, document access and permission changes are all recorded, with secrets and bank identifiers redacted.'],
              ['Enforced state machine', 'Invalid transitions are rejected. An unverified purchase order has no path to a funded transaction.'],
              ['Signed document access', 'Documents are never publicly addressable. Each download re-checks authorization and is issued as a short-lived signed URL.'],
              ['Minimal banking data', 'The platform stores an institution, a currency and a masked identifier. It never stores banking credentials or full account numbers.'],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="text-[14.5px] font-semibold text-ink-900">{title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.7] text-ink-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
