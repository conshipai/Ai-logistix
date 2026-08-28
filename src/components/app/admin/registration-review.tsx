'use client'

import { decideRegistrationAction } from '@/app/actions/organization'
import { ActionForm } from '@/components/app/forms'
import { Badge, Field, Select, Textarea } from '@/components/ui'

/**
 * Registration review.
 *
 * The approver decides whether to create a new organization or attach the user
 * to one that already exists — the common case when a second person from a
 * company already on the platform registers.
 */
export function RegistrationReview({
  request,
  organizations,
}: {
  request: {
    id: string
    name: string
    email: string
    companyName: string
    jobTitle: string | null
    phone: string | null
    country: string
    organizationType: string
    reason: string
    createdAt: string
    emailVerified: boolean
  }
  organizations: Array<{ id: string; label: string }>
}) {
  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[16px] font-semibold text-ink-900">{request.companyName}</h3>
            <Badge tone="neutral">{request.organizationType}</Badge>
            <Badge tone={request.emailVerified ? 'positive' : 'caution'}>
              {request.emailVerified ? 'Email confirmed' : 'Email not confirmed'}
            </Badge>
          </div>
          <p className="mt-1 text-[13.5px] text-ink-600">
            {request.name}
            {request.jobTitle ? `, ${request.jobTitle}` : ''} · {request.email}
            {request.phone ? ` · ${request.phone}` : ''} · {request.country}
          </p>
          <p className="mt-2 max-w-3xl whitespace-pre-line text-[13.5px] leading-relaxed text-ink-700">
            {request.reason}
          </p>
          <p className="mt-1.5 text-[11.5px] text-ink-400">Registered {request.createdAt}</p>
        </div>
      </div>

      <div className="mt-4 rounded border border-ink-200 bg-ink-50/50 p-4">
        <ActionForm
          action={decideRegistrationAction}
          submitLabel="Record decision"
          pendingLabel="Recording…"
          submitSize="sm"
        >
          {(state) => (
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="registrationRequestId" value={request.id} />

              <Field label="Decision" htmlFor={`decision-${request.id}`} required>
                <Select id={`decision-${request.id}`} name="decision" defaultValue="APPROVE">
                  <option value="APPROVE">Approve and activate</option>
                  <option value="REJECT">Reject</option>
                </Select>
              </Field>

              <Field
                label="Organization"
                htmlFor={`org-${request.id}`}
                help="Leave blank to create a new one."
              >
                <Select id={`org-${request.id}`} name="existingOrganizationId" defaultValue="">
                  <option value="">Create a new organization</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      Attach to {organization.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Notes"
                htmlFor={`notes-${request.id}`}
                error={state.errors?.notes}
                className="sm:col-span-3"
              >
                <Textarea
                  id={`notes-${request.id}`}
                  name="notes"
                  rows={2}
                  maxLength={2000}
                  placeholder="Recorded against the decision and included in the email to the registrant."
                />
              </Field>
            </div>
          )}
        </ActionForm>
      </div>
    </div>
  )
}
