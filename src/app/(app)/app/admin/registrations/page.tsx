import { PageHeader } from '@/components/app/shell'
import { RegistrationReview } from '@/components/app/admin/registration-review'
import { Badge, Card, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { countryName } from '@/lib/countries'
import { requireActorWith } from '@/lib/session'
import { formatDateTime, humanizeEnum } from '@/lib/utils'
import { listRegistrationRequests } from '@/server/services/registration'
import { organizationOptions } from '@/server/services/access'

export const metadata = { title: 'Registrations' }
export const dynamic = 'force-dynamic'

export default async function RegistrationsPage() {
  const actor = await requireActorWith('registration:review')
  const [requests, organizations] = await Promise.all([
    listRegistrationRequests(actor),
    organizationOptions(actor),
  ])

  const pending = requests.filter((r) => r.status === 'PENDING_REVIEW')
  const reviewed = requests.filter((r) => r.status !== 'PENDING_REVIEW')

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Registrations"
        description="Self-registration grants no access. Approving a registration creates the organization and activates the account."
      />

      <Card className="mb-5">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Awaiting review</CardTitle>
          {pending.length > 0 ? (
            <Badge tone="accent">{pending.length} pending</Badge>
          ) : null}
        </CardHeader>
        {pending.length === 0 ? (
          <EmptyState title="Nothing awaiting review" description="New registrations appear here." />
        ) : (
          <div className="divide-y divide-ink-100">
            {pending.map((request) => (
              <RegistrationReview
                key={request.id}
                request={{
                  id: request.id,
                  name: request.name,
                  email: request.email,
                  companyName: request.companyName,
                  jobTitle: request.jobTitle,
                  phone: request.phone,
                  country: countryName(request.country),
                  organizationType: humanizeEnum(request.organizationType),
                  reason: request.reason,
                  createdAt: formatDateTime(request.createdAt),
                  emailVerified: Boolean(request.user?.emailVerifiedAt),
                }}
                organizations={organizations
                  .filter((o) => o.type === request.organizationType)
                  .map((o) => ({ id: o.id, label: o.tradingName ?? o.legalName }))}
              />
            ))}
          </div>
        )}
      </Card>

      {reviewed.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Reviewed</CardTitle>
          </CardHeader>
          <ul className="divide-y divide-ink-100">
            {reviewed.slice(0, 50).map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-[13.5px] font-medium text-ink-900">
                    {request.companyName}
                    <span className="ml-2 font-normal text-ink-400">{request.email}</span>
                  </p>
                  <p className="text-[11.5px] text-ink-400">
                    {humanizeEnum(request.organizationType)} · reviewed by{' '}
                    {request.reviewedBy?.name ?? '—'} on {formatDateTime(request.reviewedAt)}
                    {request.reviewNotes ? ` · ${request.reviewNotes}` : ''}
                  </p>
                </div>
                <Badge tone={request.status === 'ACTIVE' ? 'positive' : 'critical'}>
                  {request.status === 'ACTIVE' ? 'Approved' : humanizeEnum(request.status)}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  )
}
