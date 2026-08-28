import { PageHeader } from '@/components/app/shell'
import { PurchaseOrderForm } from '@/components/app/purchase-order-form'
import { Alert } from '@/components/ui'
import { prisma } from '@/lib/db'
import { requireActorWith } from '@/lib/session'
import { projectScopeWhere, selectableBuyers } from '@/server/services/access'

export const metadata = { title: 'New purchase order' }
export const dynamic = 'force-dynamic'

export default async function NewPurchaseOrderPage() {
  const actor = await requireActorWith('po:create')

  const [projects, buyers] = await Promise.all([
    prisma.project.findMany({
      where: { ...projectScopeWhere(actor), status: { in: ['PLANNED', 'ACTIVE'] } },
      select: { id: true, name: true, country: true },
      orderBy: { name: 'asc' },
    }),
    selectableBuyers(actor),
  ])

  if (projects.length === 0 || buyers.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Purchase order"
          title="Upload a purchase order"
          description="Record the order you have received so it can be verified and financed."
        />
        <Alert tone="caution" title="Not ready yet">
          {projects.length === 0
            ? 'There are no active projects on the platform to attach a purchase order to. '
            : ''}
          {buyers.length === 0
            ? 'No EPC or project-owner organizations are active on the platform yet. '
            : ''}
          Contact AI Logistix and we will set this up for you.
        </Alert>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Purchase order"
        title="Upload a purchase order"
        description="Record the order you have received. Once your buyer confirms it, you can request working capital against it."
      />
      <div className="max-w-4xl">
        <PurchaseOrderForm
          mode="create"
          projects={projects.map((p) => ({ id: p.id, label: `${p.name} (${p.country})` }))}
          buyers={buyers.map((b) => ({
            id: b.id,
            label: `${b.tradingName ?? b.legalName} — ${b.type === 'EPC' ? 'EPC contractor' : 'Project owner'}`,
          }))}
        />
      </div>
    </>
  )
}
