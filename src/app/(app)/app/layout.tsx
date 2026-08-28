import { prisma } from '@/lib/db'
import { requireActor } from '@/lib/session'
import { AppShell } from '@/components/app/shell'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireActor()
  const organization = await prisma.organization.findUnique({
    where: { id: actor.organizationId },
    select: { isDemo: true },
  })

  return (
    <AppShell actor={actor} isDemoOrganization={organization?.isDemo ?? false}>
      {children}
    </AppShell>
  )
}
