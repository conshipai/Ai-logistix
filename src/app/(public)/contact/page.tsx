import type { InquiryType } from '@prisma/client'
import { PageHero } from '@/components/marketing/chrome'
import { InquiryForm } from '@/components/marketing/inquiry-form'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui'

export const metadata = {
  title: 'Contact',
  description:
    'Programme inquiries for suppliers, EPC contractors and project owners, financial ' +
    'institutions, and government or development-finance organizations.',
}

const FORMS: Array<{ id: string; type: InquiryType; title: string; blurb: string }> = [
  {
    id: 'supplier',
    type: 'SUPPLIER',
    title: 'Supplier inquiry',
    blurb:
      'You hold, or expect to hold, purchase orders from a project owner or EPC contractor and ' +
      'want to understand what MConnect could support.',
  },
  {
    id: 'epc',
    type: 'EPC_PROJECT_OWNER',
    title: 'EPC / project-owner inquiry',
    blurb:
      'You procure from local suppliers and want more reliable local-content execution with ' +
      'visibility of how your orders are being delivered.',
  },
  {
    id: 'financial',
    type: 'FINANCIAL_INSTITUTION',
    title: 'Financial-institution inquiry',
    blurb:
      'You are a bank, insurer or trade-finance provider interested in reviewing verified ' +
      'purchase-order-backed transactions.',
  },
  {
    id: 'government',
    type: 'GOVERNMENT_DEVELOPMENT_FINANCE',
    title: 'Government / development-finance inquiry',
    blurb:
      'You represent a government agency, development-finance institution, embassy or programme ' +
      'sponsor and want to understand the platform or request observer access.',
  },
]

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Programme inquiry"
        lead="Tell us which side of the transaction you sit on and we will route your inquiry to the right part of the AI Logistix team."
      />

      <section className="py-14 lg:py-20">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          <nav className="mb-10 flex flex-wrap gap-2" aria-label="Inquiry types">
            {FORMS.map((form) => (
              <a
                key={form.id}
                href={`#${form.id}`}
                className="rounded-full border border-ink-200 px-4 py-1.5 text-[13px] font-medium text-ink-600 transition-colors hover:border-ink-400 hover:text-ink-900"
              >
                {form.title}
              </a>
            ))}
          </nav>

          <div className="space-y-10">
            {FORMS.map((form) => (
              <Card key={form.id} id={form.id} className="scroll-mt-24">
                <CardHeader>
                  <CardTitle>{form.title}</CardTitle>
                </CardHeader>
                <CardBody className="p-6 sm:p-7">
                  <p className="mb-6 max-w-2xl text-[14px] leading-relaxed text-ink-600">
                    {form.blurb}
                  </p>
                  <InquiryForm type={form.type} />
                </CardBody>
              </Card>
            ))}
          </div>

          <p className="mt-10 text-[12.5px] leading-relaxed text-ink-400">
            Submitting an inquiry does not create any commercial or financing relationship, and does
            not constitute an application for financing. If you are ready to register an
            organization on the platform, use the registration form instead — registrations are
            reviewed by AI Logistix before an account is activated.
          </p>
        </div>
      </section>
    </>
  )
}
