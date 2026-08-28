import { PageHero } from '@/components/marketing/chrome'
import { Alert, Card, CardBody, SectionHeading } from '@/components/ui'

export const metadata = {
  title: 'Local content',
  description:
    'Why local-content requirements and supplier-capacity expectations can create a financing gap, ' +
    'and what closing it requires.',
}

export default function LocalContentPage() {
  return (
    <>
      <PageHero
        eyebrow="Local content"
        title="Why local-content participation can create a financing gap"
        lead="Local-content expectations are intended to build durable industrial capability. Meeting them asks local firms to carry working capital they may not yet have access to."
      />

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <div className="prose-institutional">
            <p>
              Large energy and infrastructure projects frequently operate under local-content
              programmes: commitments, contractual requirements or regulatory expectations that a
              defined share of goods and services be procured from companies established in the
              host country. The specific form these take varies considerably between countries,
              projects and contracts.
            </p>
            <p>
              Whatever their form, the practical effect on procurement is similar. Project owners
              and EPC contractors are expected to award work to local suppliers, and local suppliers
              are expected to be able to perform it at the scale, quality and schedule the project
              requires.
            </p>

            <h2 className="mt-10 font-serif text-[24px] leading-tight text-ink-900">
              Where the gap appears
            </h2>
            <p>
              A purchase order is a commitment to pay after delivery. Fulfilling it usually requires
              spending before delivery — often months before. On a fabrication order, a supplier may
              need to buy steel, import valves or instrumentation, pay labour, cover freight and
              settle duties well before the first invoice becomes payable.
            </p>
            <p>
              A supplier that has been awarded work precisely because it is locally established may
              be the same supplier that has the least access to the working capital the award
              requires. It may lack a credit history with international banks, hold assets that do
              not serve as conventional collateral, have limited access to foreign currency for
              imported inputs, and be unable to obtain supplier credit from vendors who do not know
              it.
            </p>
            <p>
              The result is a specific and solvable mismatch: a creditworthy buyer, a qualified
              supplier, a genuine order — and no financing instrument positioned between them.
            </p>

            <h2 className="mt-10 font-serif text-[24px] leading-tight text-ink-900">
              What closing it requires
            </h2>
            <p>
              Financing against a purchase order is only prudent when the order itself can be
              relied upon. That means a lender needs to know, from a source other than the borrower,
              that the order exists, that its value and terms are as stated, that it remains active,
              and that the goods or services are actually being produced and delivered.
            </p>
            <p>
              That is the gap MConnect is built to close. It is a transaction-management and
              visibility platform: it establishes verification, itemises the use of funds, tracks
              procurement and logistics against the plan, and records delivery, acceptance, payment
              and repayment in one auditable trail.
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              { title: 'For the supplier', body: 'Access to larger contracts, and a path to working capital that is tied to the order rather than to a balance sheet.' },
              { title: 'For the project', body: 'Local-content commitments executed by suppliers who can actually perform, with less delivery risk.' },
              { title: 'For the lender', body: 'A verified underlying transaction and continuous visibility of execution, rather than a periodic report.' },
            ].map((item) => (
              <Card key={item.title}>
                <CardBody>
                  <p className="text-[13px] font-bold uppercase tracking-[0.07em] text-accent-600">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-ink-600">{item.body}</p>
                </CardBody>
              </Card>
            ))}
          </div>

          <Alert tone="info" className="mt-10">
            This page describes a commercial pattern observed across emerging-market project
            procurement generally. It does not describe, interpret or make any claim about the
            local-content regulations of any specific country. Suppliers and buyers should take
            their own legal and regulatory advice on the requirements that apply to them.
          </Alert>
        </div>
      </section>

      <section className="border-t border-ink-100 bg-ink-50/40 py-16">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Design"
            title="Not built for one country"
            description="Country is an explicit field on every organization, project and transaction. Nothing in MConnect assumes a single market, a single currency or a single language — Mozambique is the first programme, not the only one the platform can serve."
          />
        </div>
      </section>
    </>
  )
}
