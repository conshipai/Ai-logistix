import { createCommentAction, createRfiAction, updateRfiAction } from '@/app/actions/transaction'
import { ActionButton, ActionForm } from '@/components/app/forms'
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Label,
  Select,
  Textarea,
} from '@/components/ui'
import { DOCUMENT_CATEGORY_LABELS } from '@/server/services/documents'
import { isStaff } from '@/lib/rbac'
import { formatDate, formatDateTime, initials } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

export function CommunicationsPanel({
  transaction,
  comments,
  mentionable,
  actor,
  scope,
}: TransactionPanelProps) {
  const canWrite = !scope.readOnly
  const staff = isStaff(actor)

  // An RFI can only be addressed to a party already on the transaction.
  const parties = [
    { id: transaction.supplierId, label: transaction.supplier.tradingName ?? transaction.supplier.legalName },
    { id: transaction.buyerId, label: transaction.buyer.tradingName ?? transaction.buyer.legalName },
    {
      id: transaction.project.projectOwnerId,
      label:
        transaction.project.projectOwner.tradingName ?? transaction.project.projectOwner.legalName,
    },
    ...transaction.access.map((grant) => ({
      id: grant.organizationId,
      label: grant.organization.tradingName ?? grant.organization.legalName,
    })),
  ].filter(
    (party, index, all) =>
      party.id !== actor.organizationId && all.findIndex((p) => p.id === party.id) === index,
  )

  const openRfis = transaction.rfis.filter((rfi) => ['OPEN', 'RESPONDED'].includes(rfi.status))

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-5">
        {/* Open requests */}
        {openRfis.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Open information requests</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <ul className="divide-y divide-ink-100">
                {openRfis.map((rfi) => {
                  const isMine = rfi.raisedByOrganizationId === actor.organizationId
                  const isForMe = rfi.assignedToOrganizationId === actor.organizationId
                  return (
                    <li key={rfi.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[14px] font-semibold text-ink-900">{rfi.subject}</p>
                            <Badge tone={rfi.status === 'OPEN' ? 'caution' : 'info'}>
                              {rfi.status === 'OPEN' ? 'Awaiting response' : 'Responded'}
                            </Badge>
                            {isForMe ? <Badge tone="accent">For you</Badge> : null}
                          </div>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">
                            {rfi.body}
                          </p>
                          <p className="mt-1.5 text-[11.5px] text-ink-400">
                            {rfi.reference} · raised by {rfi.raisedBy.name} on{' '}
                            {formatDate(rfi.createdAt)}
                            {rfi.dueDate ? ` · due ${formatDate(rfi.dueDate)}` : ''}
                            {rfi.requestedDocumentCategory
                              ? ` · requests: ${DOCUMENT_CATEGORY_LABELS[rfi.requestedDocumentCategory]}`
                              : ''}
                          </p>
                        </div>
                        {canWrite && (isMine || staff) ? (
                          <ActionButton
                            action={updateRfiAction}
                            fields={{
                              rfiId: rfi.id,
                              status: 'RESOLVED',
                              transactionId: transaction.id,
                            }}
                            label="Mark resolved"
                          />
                        ) : null}
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardBody>
          </Card>
        ) : null}

        {/* Thread */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction thread</CardTitle>
          </CardHeader>
          {comments.length === 0 ? (
            <EmptyState
              title="No messages yet"
              description="Questions, clarifications and updates on this transaction are recorded here for every party."
            />
          ) : (
            <CardBody className="space-y-5 p-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                      comment.authorId === actor.userId ? 'bg-accent-500' : 'bg-ink-700'
                    }`}
                  >
                    {initials(comment.author.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-[13.5px] font-semibold text-ink-900">
                        {comment.author.name}
                      </p>
                      <p className="text-[11.5px] text-ink-400">
                        {formatDateTime(comment.createdAt)}
                      </p>
                      {comment.internalOnly ? (
                        <Badge tone="caution">AI Logistix internal</Badge>
                      ) : null}
                      {comment.rfi ? <Badge tone="neutral">{comment.rfi.reference}</Badge> : null}
                    </div>
                    <p className="mt-1 whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
                      {comment.body}
                    </p>
                  </div>
                </div>
              ))}
            </CardBody>
          )}

          {canWrite ? (
            <CardBody className="border-t border-ink-100 bg-ink-50/40 p-5">
              <ActionForm
                action={createCommentAction}
                submitLabel="Post message"
                pendingLabel="Posting…"
                submitSize="sm"
                successMessage="Message posted."
              >
                {(state) => (
                  <div className="space-y-3">
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <Field label="Message" htmlFor="commentBody" required error={state.errors?.body}>
                      <Textarea id="commentBody" name="body" rows={3} required maxLength={8000} />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Notify"
                        htmlFor="mentionedUserIds"
                        help="Hold Ctrl or Cmd to select several people."
                      >
                        <Select
                          id="mentionedUserIds"
                          name="mentionedUserIds"
                          multiple
                          size={4}
                          className="h-auto"
                        >
                          {mentionable
                            .filter((user) => user.id !== actor.userId)
                            .map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name} — {user.organization}
                              </option>
                            ))}
                        </Select>
                      </Field>
                      {staff ? (
                        <Label className="flex items-start gap-2 pt-6 font-normal">
                          <Checkbox name="internalOnly" className="mt-0.5" />
                          <span className="text-[13px] leading-snug text-ink-700">
                            Internal note — visible to AI Logistix staff only
                          </span>
                        </Label>
                      ) : null}
                    </div>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          ) : null}
        </Card>
      </div>

      {canWrite && parties.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Request information</CardTitle>
          </CardHeader>
          <CardBody className="p-5">
            <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
              An information request is tracked separately from the thread, so it is clear what is
              still outstanding and who it is with.
            </p>
            <ActionForm
              action={createRfiAction}
              submitLabel="Send request"
              pendingLabel="Sending…"
              submitVariant="outline"
              submitSize="sm"
              successMessage="Information request sent."
            >
              {(state) => (
                <div className="space-y-3">
                  <input type="hidden" name="transactionId" value={transaction.id} />
                  <Field
                    label="Send to"
                    htmlFor="assignedToOrganizationId"
                    required
                    error={state.errors?.assignedToOrganizationId}
                  >
                    <Select
                      id="assignedToOrganizationId"
                      name="assignedToOrganizationId"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Select an organization
                      </option>
                      {parties.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Subject" htmlFor="rfiSubject" required error={state.errors?.subject}>
                    <Input id="rfiSubject" name="subject" required maxLength={200} />
                  </Field>
                  <Field label="What do you need?" htmlFor="rfiBody" required error={state.errors?.body}>
                    <Textarea id="rfiBody" name="body" rows={4} required maxLength={4000} />
                  </Field>
                  <Field label="Document requested" htmlFor="requestedDocumentCategory">
                    <Select
                      id="requestedDocumentCategory"
                      name="requestedDocumentCategory"
                      defaultValue=""
                    >
                      <option value="">No specific document</option>
                      {Object.entries(DOCUMENT_CATEGORY_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Needed by" htmlFor="rfiDueDate">
                    <Input id="rfiDueDate" name="dueDate" type="date" />
                  </Field>
                </div>
              )}
            </ActionForm>
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
