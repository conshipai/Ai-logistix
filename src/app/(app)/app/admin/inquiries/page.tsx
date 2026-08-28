import { PageHeader } from '@/components/app/shell'
import { Badge, Card, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { countryName } from '@/lib/countries'
import { prisma } from '@/lib/db'
import { requireActorWith } from '@/lib/session'
import { formatDateTime, humanizeEnum } from '@/lib/utils'

export const metadata = { title: 'Inquiries' }
export const dynamic = 'force-dynamic'

export default async function InquiriesPage() {
  await requireActorWith('organization:read:any')
  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Programme inquiries"
        description="Submissions from the public contact forms."
      />

      <Card>
        <CardHeader>
          <CardTitle>
            {inquiries.length} inquir{inquiries.length === 1 ? 'y' : 'ies'}
          </CardTitle>
        </CardHeader>
        {inquiries.length === 0 ? (
          <EmptyState
            title="No inquiries"
            description="Submissions from the public contact page appear here."
          />
        ) : (
          <ul className="divide-y divide-ink-100">
            {inquiries.map((inquiry) => (
              <li key={inquiry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[15px] font-semibold text-ink-900">{inquiry.company}</h3>
                      <Badge tone="neutral">{humanizeEnum(inquiry.type)}</Badge>
                      <Badge tone={inquiry.status === 'NEW' ? 'accent' : 'neutral'}>
                        {humanizeEnum(inquiry.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[13.5px] text-ink-600">
                      {inquiry.name}
                      {inquiry.jobTitle ? `, ${inquiry.jobTitle}` : ''} ·{' '}
                      <a href={`mailto:${inquiry.email}`} className="text-accent-600 hover:underline">
                        {inquiry.email}
                      </a>
                      {inquiry.phone ? ` · ${inquiry.phone}` : ''} ·{' '}
                      {countryName(inquiry.country)}
                    </p>
                    <p className="mt-2 max-w-3xl whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
                      {inquiry.message}
                    </p>
                  </div>
                  <p className="shrink-0 text-[11.5px] text-ink-400">
                    {formatDateTime(inquiry.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
