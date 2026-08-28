import Link from 'next/link'
import { Download, FileText } from 'lucide-react'
import { PageHeader } from '@/components/app/shell'
import { Badge, Card, CardHeader, CardTitle, EmptyState, Table, Td, Th } from '@/components/ui'
import { requireActorWith } from '@/lib/session'
import { formatDate } from '@/lib/utils'
import { DOCUMENT_CATEGORY_LABELS, recentDocuments } from '@/server/services/documents'

export const metadata = { title: 'Documents' }
export const dynamic = 'force-dynamic'

export default async function DocumentsPage() {
  const actor = await requireActorWith('document:read')
  const documents = await recentDocuments(actor, 100)

  return (
    <>
      <PageHeader
        title="Documents"
        description="Everything you are authorized to see, across your organization and your transactions."
      />

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>{documents.length} document{documents.length === 1 ? '' : 's'}</CardTitle>
          <span className="text-[12px] text-ink-400">
            Every download re-checks your authorization and is recorded
          </span>
        </CardHeader>
        {documents.length === 0 ? (
          <EmptyState
            title="No documents"
            description="Documents you upload, and those shared with you on a transaction, appear here."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Category</Th>
                <Th>Transaction</Th>
                <Th>Uploaded</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="hover:bg-ink-50/60">
                  <Td>
                    <div className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{document.fileName}</p>
                        <p className="text-[11.5px] text-ink-400">
                          {(document.sizeBytes / 1024).toFixed(0)} KB
                          {document.version > 1 ? ` · version ${document.version}` : ''}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone="neutral">{DOCUMENT_CATEGORY_LABELS[document.category]}</Badge>
                  </Td>
                  <Td>
                    {document.transaction ? (
                      <Link
                        href={`/app/transactions/${document.transaction.id}?tab=documents`}
                        className="font-mono text-[12.5px] font-semibold text-ink-700 hover:text-accent-600"
                      >
                        {document.transaction.number}
                      </Link>
                    ) : (
                      <span className="text-[12.5px] text-ink-400">Company document</span>
                    )}
                  </Td>
                  <Td className="text-[12.5px] text-ink-500">
                    {formatDate(document.createdAt)}
                    <span className="block text-[11.5px] text-ink-400">
                      {document.uploadedBy.name}
                    </span>
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={`/api/documents/${document.id}/download`}
                      className="inline-flex items-center gap-1.5 rounded border border-ink-200 px-2.5 py-1 text-[12.5px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Link>
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
