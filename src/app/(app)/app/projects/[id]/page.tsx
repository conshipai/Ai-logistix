import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/app/shell'
import { StageBadge } from '@/components/status'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  DefinitionList,
  EmptyState,
  Metric,
  Table,
  Td,
  Th,
} from '@/components/ui'
import { countryName } from '@/lib/countries'
import { NotFoundError } from '@/lib/rbac'
import { requireActorWith } from '@/lib/session'
import { formatDate, formatMoney, humanizeEnum, toNumber } from '@/lib/utils'
import { getProject } from '@/server/services/projects'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Project' }

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await requireActorWith('project:read')
  const { id } = await params

  let project
  try {
    project = await getProject(actor, id)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  const totalValue = project.transactions.reduce(
    (sum, t) => sum + (toNumber(t.purchaseOrder.value) ?? 0),
    0,
  )
  const suppliers = new Set(project.transactions.map((t) => t.supplierId))
  const completed = project.transactions.filter((t) => t.stage === 'CLOSED').length

  return (
    <>
      <div className="mb-5">
        <Link
          href="/app/projects"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All projects
        </Link>
      </div>

      <PageHeader
        eyebrow={project.localContentProgram ?? countryName(project.country)}
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <Badge tone={project.status === 'ACTIVE' ? 'positive' : 'neutral'}>
            {humanizeEnum(project.status)}
          </Badge>
        }
      />

      <Card className="mb-5">
        <CardBody className="grid grid-cols-2 gap-6 p-6 lg:grid-cols-4">
          <Metric
            label="Local purchase-order value"
            value={formatMoney(totalValue, project.currency, { compact: true })}
          />
          <Metric label="Suppliers participating" value={suppliers.size} />
          <Metric label="Transactions" value={project.transactions.length} />
          <Metric label="Completed" value={completed} tone="accent" />
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Transactions on this project</CardTitle>
          </CardHeader>
          {project.transactions.length === 0 ? (
            <EmptyState
              title="No transactions yet"
              description="Purchase orders raised against this project will appear here."
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Transaction</Th>
                  <Th>Supplier</Th>
                  <Th>Country</Th>
                  <Th className="text-right">PO value</Th>
                  <Th>Stage</Th>
                </tr>
              </thead>
              <tbody>
                {project.transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-ink-50/60">
                    <Td>
                      <Link
                        href={`/app/transactions/${transaction.id}`}
                        className="font-mono text-[13px] font-semibold text-ink-900 hover:text-accent-600"
                      >
                        {transaction.number}
                      </Link>
                      <p className="text-[11.5px] text-ink-400">
                        {transaction.purchaseOrder.poNumber}
                      </p>
                    </Td>
                    <Td>{transaction.supplier.tradingName ?? transaction.supplier.legalName}</Td>
                    <Td className="text-ink-500">{countryName(transaction.supplier.country)}</Td>
                    <Td className="tabular text-right font-medium">
                      {formatMoney(
                        transaction.purchaseOrder.value,
                        transaction.purchaseOrder.currency,
                      )}
                    </Td>
                    <Td>
                      <StageBadge stage={transaction.stage} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
          </CardHeader>
          <CardBody className="p-6">
            <DefinitionList
              columns={1}
              items={[
                { term: 'Reference', value: <span className="font-mono">{project.reference}</span> },
                {
                  term: 'Project owner',
                  value: project.projectOwner.tradingName ?? project.projectOwner.legalName,
                },
                {
                  term: 'EPC contractor',
                  value: project.epc ? (project.epc.tradingName ?? project.epc.legalName) : '—',
                },
                { term: 'Country', value: countryName(project.country) },
                { term: 'Location', value: project.location ?? '—' },
                { term: 'Sector', value: project.sector ?? '—' },
                { term: 'Currency', value: project.currency },
                { term: 'Start date', value: formatDate(project.startDate) },
                { term: 'Target completion', value: formatDate(project.targetCompletionDate) },
                { term: 'Local-content programme', value: project.localContentProgram ?? '—' },
                { term: 'Primary contact', value: project.primaryContactName ?? '—' },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  )
}
