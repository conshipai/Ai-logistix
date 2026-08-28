import Link from 'next/link'
import { PageHeader } from '@/components/app/shell'
import { Card, CardHeader, CardTitle, EmptyState, Input, Table, Td, Th } from '@/components/ui'
import { prisma } from '@/lib/db'
import { requireActorWith } from '@/lib/session'
import { formatDateTime } from '@/lib/utils'

export const metadata = { title: 'Audit log' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

/**
 * The platform-wide audit trail.
 *
 * Read-only by construction: the application has no code path that updates or
 * deletes an audit row, and before/after payloads were redacted at write time.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; action?: string; page?: string }>
}) {
  await requireActorWith('audit:read')
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)

  const where = {
    ...(params.action ? { action: params.action } : {}),
    ...(params.q
      ? {
          OR: [
            { actorEmail: { contains: params.q, mode: 'insensitive' as const } },
            { entityType: { contains: params.q, mode: 'insensitive' as const } },
            { action: { contains: params.q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  }

  const [events, total, actions] = await Promise.all([
    prisma.auditEvent.findMany({
      where,
      include: {
        actorUser: { select: { name: true, email: true } },
        organization: { select: { legalName: true, tradingName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.auditEvent.count({ where }),
    prisma.auditEvent.groupBy({ by: ['action'], _count: true, orderBy: { action: 'asc' } }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Audit log"
        description={`${total.toLocaleString()} recorded events. Append-only; secrets and bank identifiers are redacted at write time.`}
      />

      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3 p-4" method="get">
          <div className="min-w-[220px] flex-1">
            <label
              htmlFor="q"
              className="mb-1 block text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400"
            >
              Search
            </label>
            <Input id="q" name="q" defaultValue={params.q ?? ''} placeholder="Actor, action or entity" />
          </div>
          <div>
            <label
              htmlFor="action"
              className="mb-1 block text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400"
            >
              Action
            </label>
            <select
              id="action"
              name="action"
              defaultValue={params.action ?? ''}
              className="h-10 max-w-[260px] rounded border border-ink-200 bg-white px-3 text-sm"
            >
              <option value="">All actions</option>
              {actions.map((entry) => (
                <option key={entry.action} value={entry.action}>
                  {entry.action} ({entry._count})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="h-10 rounded bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-800"
          >
            Filter
          </button>
          {params.q || params.action ? (
            <Link
              href="/app/admin/audit"
              className="h-10 px-3 py-2.5 text-sm font-medium text-ink-500 hover:text-ink-900"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Events</CardTitle>
        </CardHeader>
        {events.length === 0 ? (
          <EmptyState title="No audit events match those filters" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Action</Th>
                <Th>Actor</Th>
                <Th>Organization</Th>
                <Th>Entity</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <Td className="tabular whitespace-nowrap text-[12.5px] text-ink-500">
                    {formatDateTime(event.createdAt)}
                  </Td>
                  <Td className="font-mono text-[12px] font-semibold">{event.action}</Td>
                  <Td className="text-[12.5px]">
                    {event.actorUser?.name ?? event.actorEmail ?? 'System'}
                    {event.actorUser ? (
                      <p className="text-[11px] text-ink-400">{event.actorUser.email}</p>
                    ) : null}
                  </Td>
                  <Td className="text-[12.5px] text-ink-500">
                    {event.organization
                      ? (event.organization.tradingName ?? event.organization.legalName)
                      : '—'}
                  </Td>
                  <Td className="text-[12px]">
                    <span className="font-medium">{event.entityType}</span>
                    {event.entityId ? (
                      <p className="font-mono text-[10.5px] text-ink-400">
                        {event.entityId.slice(0, 8)}…
                      </p>
                    ) : null}
                  </Td>
                  <Td className="font-mono text-[11.5px] text-ink-400">
                    {event.ipAddress ?? '—'}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {totalPages > 1 ? (
        <nav className="mt-5 flex items-center justify-between" aria-label="Pagination">
          <p className="text-[13px] text-ink-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={`/app/admin/audit?${new URLSearchParams({ ...params, page: String(page - 1) })}`}
                className="rounded border border-ink-200 px-3 py-1.5 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={`/app/admin/audit?${new URLSearchParams({ ...params, page: String(page + 1) })}`}
                className="rounded border border-ink-200 px-3 py-1.5 text-[13px] font-medium text-ink-700 hover:bg-ink-50"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </>
  )
}
