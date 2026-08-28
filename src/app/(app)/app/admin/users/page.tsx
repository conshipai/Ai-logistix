import { PageHeader } from '@/components/app/shell'
import { MembershipControls } from '@/components/app/admin/membership-controls'
import { Badge, Card, CardHeader, CardTitle, EmptyState, Input, Table, Td, Th } from '@/components/ui'
import { requireActorWith } from '@/lib/session'
import { formatDate, humanizeEnum } from '@/lib/utils'
import { listUsers } from '@/server/services/users'

export const metadata = { title: 'Users' }
export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const actor = await requireActorWith('user:manage:any')
  const params = await searchParams
  const users = await listUsers(actor, params.q?.trim() || undefined)

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Platform users and their organization memberships. Deactivating a membership takes effect on the user's next request."
      />

      <Card className="mb-5">
        <form className="flex flex-wrap items-end gap-3 p-4" method="get">
          <div className="min-w-[240px] flex-1">
            <label
              htmlFor="q"
              className="mb-1 block text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400"
            >
              Search
            </label>
            <Input id="q" name="q" defaultValue={params.q ?? ''} placeholder="Name or email" />
          </div>
          <button
            type="submit"
            className="h-10 rounded bg-ink-900 px-4 text-sm font-semibold text-white hover:bg-ink-800"
          >
            Search
          </button>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {users.length} user{users.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        {users.length === 0 ? (
          <EmptyState title="No users found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Organization</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th>Last sign-in</Th>
                <Th>Manage</Th>
              </tr>
            </thead>
            <tbody>
              {users.flatMap((user) =>
                user.memberships.length === 0
                  ? [
                      <tr key={user.id}>
                        <Td>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-[11.5px] text-ink-400">{user.email}</p>
                        </Td>
                        <Td colSpan={2} className="text-ink-400">
                          No organization membership
                        </Td>
                        <Td>
                          <Badge tone="caution">{humanizeEnum(user.status)}</Badge>
                        </Td>
                        <Td className="text-[12.5px] text-ink-500">
                          {formatDate(user.lastLoginAt)}
                        </Td>
                        <Td />
                      </tr>,
                    ]
                  : user.memberships.map((membership) => (
                      <tr key={membership.id}>
                        <Td>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-[11.5px] text-ink-400">{user.email}</p>
                        </Td>
                        <Td>
                          {membership.organization.tradingName ?? membership.organization.legalName}
                          <p className="text-[11px] text-ink-400">
                            {humanizeEnum(membership.organization.type)}
                          </p>
                        </Td>
                        <Td>
                          <Badge tone="neutral">{humanizeEnum(membership.role)}</Badge>
                        </Td>
                        <Td>
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone={user.status === 'ACTIVE' ? 'positive' : 'caution'}>
                              {humanizeEnum(user.status)}
                            </Badge>
                            {!membership.isActive ? (
                              <Badge tone="critical">Membership inactive</Badge>
                            ) : null}
                          </div>
                        </Td>
                        <Td className="text-[12.5px] text-ink-500">
                          {formatDate(user.lastLoginAt)}
                          {user.emailVerifiedAt ? null : (
                            <p className="text-[11px] text-caution-600">Email unconfirmed</p>
                          )}
                        </Td>
                        <Td>
                          <MembershipControls
                            membershipId={membership.id}
                            role={membership.role}
                            isActive={membership.isActive}
                          />
                        </Td>
                      </tr>
                    )),
              )}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
