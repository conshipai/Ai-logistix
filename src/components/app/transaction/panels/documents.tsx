import Link from 'next/link'
import { Download, FileText } from 'lucide-react'
import { deleteDocumentAction, uploadDocumentAction } from '@/app/actions/transaction'
import { ActionButton, ActionForm } from '@/components/app/forms'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  Field,
  Input,
  Select,
  Table,
  Td,
  Th,
} from '@/components/ui'
import {
  DOCUMENT_CATEGORY_LABELS,
  DOCUMENT_VISIBILITY_LABELS,
} from '@/server/services/documents'
import { allowedUploadAccept } from '@/lib/storage'
import { can } from '@/lib/rbac'
import { formatDate } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

/** Categories relevant to a transaction, in the order they arise in the workflow. */
const TRANSACTION_CATEGORIES: Array<keyof typeof DOCUMENT_CATEGORY_LABELS> = [
  'PURCHASE_ORDER',
  'CONTRACT',
  'TECHNICAL_SPECIFICATION',
  'DRAWING',
  'COMMERCIAL_QUOTE',
  'VENDOR_QUOTE',
  'BILL_OF_MATERIALS',
  'PAYMENT_SCHEDULE',
  'PURCHASE_INVOICE',
  'COMMERCIAL_INVOICE',
  'PACKING_LIST',
  'BILL_OF_LADING',
  'AIR_WAYBILL',
  'CUSTOMS_DOCUMENT',
  'CERTIFICATE_OF_ORIGIN',
  'QUALITY_CERTIFICATE',
  'INSPECTION_CERTIFICATE',
  'PROOF_OF_DELIVERY',
  'BUYER_ACCEPTANCE',
  'PAYMENT_CONFIRMATION',
  'OTHER',
]

export function DocumentsPanel({ transaction, documents, actor, scope }: TransactionPanelProps) {
  const canUpload = can(actor, 'document:upload') && !scope.readOnly
  const canDelete = can(actor, 'document:delete')

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Transaction documents</CardTitle>
          <span className="text-[12px] text-ink-400">
            Access is checked on every download and recorded
          </span>
        </CardHeader>
        {documents.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Documents uploaded against this transaction appear here, visible only to the parties each one is shared with."
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Document</Th>
                <Th>Category</Th>
                <Th>Uploaded by</Th>
                <Th>Visible to</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id}>
                  <Td>
                    <div className="flex items-start gap-2.5">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{document.fileName}</p>
                        <p className="text-[11.5px] text-ink-400">
                          {formatDate(document.createdAt)} ·{' '}
                          {(document.sizeBytes / 1024).toFixed(0)} KB
                          {document.version > 1 ? ` · version ${document.version}` : ''}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge tone="neutral">{DOCUMENT_CATEGORY_LABELS[document.category]}</Badge>
                  </Td>
                  <Td className="text-ink-500">
                    <p className="text-[13px]">{document.uploadedBy.name}</p>
                    <p className="text-[11.5px] text-ink-400">
                      {document.organization.tradingName ?? document.organization.legalName}
                    </p>
                  </Td>
                  <Td className="text-[12px] text-ink-500">
                    {DOCUMENT_VISIBILITY_LABELS[document.visibility]}
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/api/documents/${document.id}/download`}
                        className="inline-flex items-center gap-1.5 rounded border border-ink-200 px-2.5 py-1 text-[12.5px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </Link>
                      {canDelete ? (
                        <ActionButton
                          action={deleteDocumentAction}
                          fields={{ documentId: document.id, transactionId: transaction.id }}
                          label="Remove"
                          variant="ghost"
                          confirm={`Remove "${document.fileName}"? The audit record is retained.`}
                        />
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {canUpload ? (
        <Card>
          <CardHeader>
            <CardTitle>Upload a document</CardTitle>
          </CardHeader>
          <CardBody className="p-5">
            <ActionForm
              action={uploadDocumentAction}
              submitLabel="Upload"
              pendingLabel="Uploading…"
              successMessage="Document uploaded."
            >
              {(state) => (
                <div className="space-y-4">
                  <input type="hidden" name="transactionId" value={transaction.id} />

                  <Field label="File" htmlFor="file" required error={state.errors?.file}>
                    <Input
                      id="file"
                      name="file"
                      type="file"
                      required
                      accept={allowedUploadAccept()}
                      className="file:mr-3 file:rounded file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-ink-800"
                    />
                  </Field>

                  <Field label="Category" htmlFor="category" required error={state.errors?.category}>
                    <Select id="category" name="category" required defaultValue="PURCHASE_ORDER">
                      {TRANSACTION_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {DOCUMENT_CATEGORY_LABELS[category]}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Who can see this?"
                    htmlFor="visibility"
                    required
                    help="Your own organization and AI Logistix can always see what you upload."
                  >
                    <Select id="visibility" name="visibility" defaultValue="TRANSACTION_PARTIES">
                      {Object.entries(DOCUMENT_VISIBILITY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field
                    label="Expires on"
                    htmlFor="expiresAt"
                    help="For certificates and insurance that need renewing."
                  >
                    <Input id="expiresAt" name="expiresAt" type="date" />
                  </Field>

                  <p className="text-[12px] leading-relaxed text-ink-400">
                    PDF, image, Office and CSV files up to 25 MB. Documents are never publicly
                    addressable — each download re-checks your authorization and is recorded.
                  </p>
                </div>
              )}
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
