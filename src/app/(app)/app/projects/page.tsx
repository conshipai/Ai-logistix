import Link from 'next/link'
import { PageHeader } from '@/components/app/shell'
import { ProjectForm } from '@/components/app/project-form'
import { Badge, Card, CardHeader, CardTitle, EmptyState, Table, Td, Th } from '@/components/ui'
import { countryName } from '@/lib/countries'
import { can } from '@/lib/rbac'
import { requireActorWith } from '@/lib/session'
import { formatDate, humanizeEnum } from '@/lib/utils'
import { listProjects } from '@/server/services/projects'
import { organizationOptions } from '@/server/services/access'

export const metadata = { title: 'Projects' }
export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const actor = await requireActorWith('project:read')
  const projects = await listProjects(actor)
  const canManage = can(actor, 'project:manage')

  const [owners, epcs] = canManage
    ? await Promise.all([
        organizationOptions(actor, { in: ['PROJECT_OWNER', 'EPC'] }),
        organizationOptions(actor, 'EPC'),
      ])
    : [[], []]

  return (
    <>
      <PageHeader
        title="Projects"
        description="Purchase orders are always attached to a project, so local-content participation can be reported per project."
      />

      <Card className="mb-5">
        <CardHeader>
          <CardTitle>{projects.length} project{projects.length === 1 ? '' : 's'}</CardTitle>
        </CardHeader>
        {projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            description={
              canManage
                ? 'Create a project so suppliers can attach their purchase orders to it.'
                : 'Projects will appear here once AI Logistix has set them up.'
            }
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Project</Th>
                <Th>Owner</Th>
                <Th>EPC</Th>
                <Th>Country</Th>
                <Th>Sector</Th>
                <Th className="text-right">Transactions</Th>
                <Th>Status</Th>
                <Th>Target completion</Th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-ink-50/60">
                  <Td>
                    <Link
                      href={`/app/projects/${project.id}`}
                      className="font-semibold text-ink-900 hover:text-accent-600"
                    >
                      {project.name}
                    </Link>
                    {project.localContentProgram ? (
                      <p className="text-[11.5px] text-ink-400">{project.localContentProgram}</p>
                    ) : null}
                  </Td>
                  <Td>{project.projectOwner.tradingName ?? project.projectOwner.legalName}</Td>
                  <Td className="text-ink-600">
                    {project.epc ? (project.epc.tradingName ?? project.epc.legalName) : '—'}
                  </Td>
                  <Td className="text-ink-500">{countryName(project.country)}</Td>
                  <Td className="text-ink-500">{project.sector ?? '—'}</Td>
                  <Td className="tabular text-right">{project._count.transactions}</Td>
                  <Td>
                    <Badge tone={project.status === 'ACTIVE' ? 'positive' : 'neutral'}>
                      {humanizeEnum(project.status)}
                    </Badge>
                  </Td>
                  <Td className="text-[12.5px] text-ink-500">
                    {formatDate(project.targetCompletionDate)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {canManage ? (
        <div className="max-w-4xl">
          <ProjectForm
            owners={owners.map((o) => ({
              id: o.id,
              label: `${o.tradingName ?? o.legalName} (${humanizeEnum(o.type)})`,
            }))}
            epcs={epcs.map((o) => ({ id: o.id, label: o.tradingName ?? o.legalName }))}
          />
        </div>
      ) : null}
    </>
  )
}
