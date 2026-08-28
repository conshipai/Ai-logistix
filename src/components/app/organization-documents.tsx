'use client'

import Link from 'next/link'
import { Download, FileText } from 'lucide-react'
import type { DocumentCategory } from '@prisma/client'
import { uploadDocumentAction } from '@/app/actions/transaction'
import { ActionForm } from '@/components/app/forms'
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
} from '@/components/ui'
import { allowedUploadAccept } from '@/lib/upload-types'
import { formatDate } from '@/lib/utils'

/**
 * Company-level compliance documents — registration, tax, KYC, financials.
 *
 * These carry RESTRICTED visibility: the owning organization and AI Logistix
 * only. They are never exposed to a counterparty on a transaction.
 */

const COMPANY_CATEGORIES: Array<{ value: DocumentCategory; label: string }> = [
  { value: 'COMPANY_REGISTRATION', label: 'Company registration' },
  { value: 'TAX_DOCUMENT', label: 'Tax document' },
  { value: 'KYC', label: 'KYC document' },
  { value: 'BANK_LETTER', label: 'Bank letter' },
  { value: 'AUDITED_FINANCIALS', label: 'Audited financials' },
  { value: 'MANAGEMENT_ACCOUNTS', label: 'Management accounts' },
  { value: 'QUALITY_CERTIFICATE', label: 'Quality certificate' },
  { value: 'INSPECTION_CERTIFICATE', label: 'Inspection certificate' },
  { value: 'OTHER', label: 'Other' },
]

const LABELS = new Map(COMPANY_CATEGORIES.map((c) => [c.value, c.label]))

export function OrganizationDocuments({
  documents,
}: {
  documents: Array<{
    id: string
    fileName: string
    category: DocumentCategory
    sizeBytes: number
    createdAt: Date
    expiresAt: Date | null
    uploadedBy: string
  }>
}) {
  const now = new Date()

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Company documents</CardTitle>
        <span className="text-[12px] text-ink-400">
          Visible to your organization and AI Logistix only
        </span>
      </CardHeader>

      {documents.length === 0 ? (
        <EmptyState
          title="No company documents"
          description="Upload your company registration, tax certificate and KYC documents. These are reviewed once and used across every transaction."
        />
      ) : (
        <CardBody className="p-0">
          <ul className="divide-y divide-ink-100">
            {documents.map((document) => {
              const expired = document.expiresAt && document.expiresAt < now
              return (
                <li
                  key={document.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-300" />
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-medium text-ink-900">
                        {document.fileName}
                      </p>
                      <p className="text-[11.5px] text-ink-400">
                        {formatDate(document.createdAt)} · {(document.sizeBytes / 1024).toFixed(0)} KB
                        {' · '}
                        {document.uploadedBy}
                        {document.expiresAt ? ` · expires ${formatDate(document.expiresAt)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {expired ? <Badge tone="critical">Expired</Badge> : null}
                    <Badge tone="neutral">{LABELS.get(document.category) ?? document.category}</Badge>
                    <Link
                      href={`/api/documents/${document.id}/download`}
                      className="inline-flex items-center gap-1.5 rounded border border-ink-200 px-2.5 py-1 text-[12.5px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardBody>
      )}

      <CardBody className="border-t border-ink-100 bg-ink-50/40 p-5">
        <ActionForm
          action={uploadDocumentAction}
          submitLabel="Upload"
          pendingLabel="Uploading…"
          submitVariant="outline"
          submitSize="sm"
          successMessage="Document uploaded."
        >
          {(state) => (
            <div className="grid gap-4 sm:grid-cols-3">
              <input type="hidden" name="visibility" value="RESTRICTED" />
              <Field label="File" htmlFor="orgFile" required error={state.errors?.file}>
                <Input
                  id="orgFile"
                  name="file"
                  type="file"
                  required
                  accept={allowedUploadAccept()}
                  className="file:mr-3 file:rounded file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-[13px] file:font-semibold file:text-ink-800"
                />
              </Field>
              <Field label="Category" htmlFor="orgCategory" required>
                <Select id="orgCategory" name="category" required defaultValue="COMPANY_REGISTRATION">
                  {COMPANY_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Expires on" htmlFor="orgExpiresAt">
                <Input id="orgExpiresAt" name="expiresAt" type="date" />
              </Field>
            </div>
          )}
        </ActionForm>
      </CardBody>
    </Card>
  )
}
