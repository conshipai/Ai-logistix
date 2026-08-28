import { PageHero } from '@/components/marketing/chrome'
import { FinancialStructureDiagram } from '@/components/marketing/workflow'
import { Alert, Card, CardBody, CardHeader, CardTitle, SectionHeading } from '@/components/ui'

export const metadata = {
  title: 'Financial structure',
  description:
    'How a verified purchase order, controlled working capital, coordinated logistics and buyer ' +
    'payment fit together — and who provides which part.',
}

const ROLES = [
  {
    party: 'Project owner / EPC',
    provides: 'The purchase order, and verification that it is genuine and active',
    receives: 'Delivered goods or services, and local-content execution it can rely on',
  },
  {
    party: 'Local supplier',
    provides: 'Manufacturing or services against the order',
    receives: 'Working capital positioned against the order, and payment on acceptance',
  },
  {
    party: 'MConnect / AI Logistix',
    provides: 'Transaction oversight, document control, procurement support and logistics',
    receives: 'No lending role. AI Logistix is not a bank and not a licensed lender.',
  },
  {
    party: 'Financing institution',
    provides: 'Controlled working capital, subject to its own independent review',
    receives: 'A verified underlying transaction, execution visibility, and repayment',
  },
  {
    party: 'Raw material vendor',
    provides: 'Materials, components and equipment',
    receives: 'Payment, which may be disbursed to the vendor rather than to the supplier',
  },
]

export default function FinancialStructurePage() {
  return (
    <>
      <PageHero
        eyebrow="Financial structure"
        title="Where each party sits, and what each one actually provides"
        lead="The structure is deliberately conventional. What MConnect adds is verification, control and visibility around it — not a new financial instrument."
      />

      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <FinancialStructureDiagram />
        </div>
      </section>

      <section className="border-b border-ink-100 py-16 lg:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <SectionHeading
            eyebrow="Roles"
            title="Who does what"
            description="Being clear about roles matters more here than in most platforms, because one of them is a regulated activity that AI Logistix does not perform."
          />
          <div className="mt-10 overflow-hidden rounded-lg border border-ink-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-ink-50">
                <tr>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-500">
                    Party
                  </th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-500">
                    Provides
                  </th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-500">
                    Receives
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROLES.map((role) => (
                  <tr key={role.party} className="border-t border-ink-100 align-top">
                    <td className="px-5 py-4 text-[14px] font-semibold text-ink-900">
                      {role.party}
                    </td>
                    <td className="px-5 py-4 text-[13.5px] leading-relaxed text-ink-600">
                      {role.provides}
                    </td>
                    <td className="px-5 py-4 text-[13.5px] leading-relaxed text-ink-600">
                      {role.receives}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-5 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Who provides the financing</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4 p-7">
              <p className="text-[15px] font-semibold leading-relaxed text-ink-900">
                MConnect itself does not necessarily act as the lender.
              </p>
              <p className="text-[14.5px] leading-[1.75] text-ink-600">
                Financing may ultimately be provided by participating banks, development-finance
                institutions, insurers, trade-finance providers or other approved institutions. Each
                institution applies its own credit assessment, pricing, documentation and conditions
                precedent. MConnect provides the transaction record those decisions are made
                against; it does not make them.
              </p>
              <p className="text-[14.5px] leading-[1.75] text-ink-600">
                The platform is designed to accommodate both public and private financing
                institutions, and to support a structure in which funds are disbursed to raw-material
                vendors rather than to the supplier where that is the appropriate control.
              </p>
            </CardBody>
          </Card>

          <Alert tone="caution" title="No participation is implied" className="mt-8">
            Any reference on this platform to a government agency, development-finance institution,
            bank, insurer, project owner or EPC contractor describes a category of potential
            participant or a potential financing structure. It does not state or imply that any
            named organization participates in, endorses, or has any relationship with MConnect or
            AI Logistix, unless that relationship is expressly stated.
          </Alert>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardBody>
                <p className="text-[13px] font-bold uppercase tracking-[0.07em] text-ink-400">
                  Designed to accommodate
                </p>
                <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-600">
                  <li>Commercial banks, domestic and international</li>
                  <li>Development-finance institutions</li>
                  <li>Trade-credit insurers and guarantee providers</li>
                  <li>Specialist trade-finance and supply-chain-finance providers</li>
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <p className="text-[13px] font-bold uppercase tracking-[0.07em] text-ink-400">
                  What AI Logistix is not
                </p>
                <ul className="mt-3 space-y-2 text-[13.5px] leading-relaxed text-ink-600">
                  <li>Not a bank</li>
                  <li>Not a licensed lender</li>
                  <li>Not a representative of any export-credit or development-finance agency</li>
                  <li>Not a representative of any project owner or operator</li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>
    </>
  )
}
