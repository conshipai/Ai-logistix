import { PageHeader } from '@/components/app/shell'
import { OrganizationStatusForm } from '@/components/app/admin/organization-status'
import { Badge, Card, CardHeader, CardTitle, EmptyState, Input, Table, Td, Th } from '@/components/ui'
import { countryName } from '@/lib/countries'
import { requireActorWith } from '@/lib/session'
import { formatDate, humanizeEnum } from '@/lib/utils'
import { listOrganizations } from '@/server/services/organizations'

export const metadata = { title: 'Organizations' }
export const dynamic = 'force-dynamic'

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const actor = await requireActorWith('organization:read:any')
  const params = await searchParams
  const organizations = await listOrganizations(actor, { search: params.q?.trim() || undefined })

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Organizations"
        description="Every organization on the platform, its KYC state and its account status."
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
            <Input id="q" name="q" defaultValue={params.q ?? ''} placeholder="Name or reference" />
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
            {organizations.length} organization{organizations.length === 1 ? '' : 's'}
          </CardTitle>
        </CardHeader>
        {organizations.length === 0 ? (
          <EmptyState title="No organizations found" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Organization</Th>
                <Th>Type</Th>
                <Th>Country</Th>
                <Th className="text-right">Users</Th>
                <Th className="text-right">Transactions</Th>
                <Th>KYC</Th>
                <Th>Status</Th>
                <Th>Manage</Th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((organization) => (
                <tr key={organization.id}>
                  <Td>
                    <p className="font-medium">
                      {organization.tradingName ?? organization.legalName}
                    </p>
                    <p className="font-mono text-[11px] text-ink-400">{organization.reference}</p>
                  </Td>
                  <Td className="text-ink-600">{humanizeEnum(organization.type)}</Td>
                  <Td className="text-ink-500">{countryName(organization.country)}</Td>
                  <Td className="tabular text-right">{organization._count.memberships}</Td>
                  <Td className="tabular text-right">
                    {organization._count.transactionsAsSupplier}
                  </Td>
                  <Td>
                    <Badge tone={organization.kycStatus === 'VERIFIED' ? 'positive' : 'neutral'}>
                      {humanizeEnum(organization.kycStatus)}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge
                      tone={
                        organization.accountStatus === 'ACTIVE'
                          ? 'positive'
                          : organization.accountStatus === 'PENDING_REVIEW'
                            ? 'caution'
                            : 'critical'
                      }
                    >
                      {humanizeEnum(organization.accountStatus)}
                    </Badge>
                    <p className="mt-1 text-[11px] text-ink-400">
                      Joined {formatDate(organization.createdAt)}
                    </p>
                  </Td>
                  <Td>
                    <OrganizationStatusForm
                      organizationId={organization.id}
                      accountStatus={organization.accountStatus}
                      kycStatus={organization.kycStatus}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  )
}
