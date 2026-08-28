'use client'

import { updateOrganizationStatusAction } from '@/app/actions/organization'
import { ActionForm } from '@/components/app/forms'
import { Select } from '@/components/ui'

/**
 * Account and KYC state.
 *
 * Setting an organization to anything other than ACTIVE also takes its users
 * offline on their next request — the session token is re-checked against the
 * database rather than trusted until it expires.
 */
export function OrganizationStatusForm({
  organizationId,
  accountStatus,
  kycStatus,
}: {
  organizationId: string
  accountStatus: string
  kycStatus: string
}) {
  return (
    <ActionForm
      action={updateOrganizationStatusAction}
      submitLabel="Apply"
      pendingLabel="Saving…"
      submitVariant="outline"
      submitSize="sm"
      className="min-w-[170px]"
    >
      <div className="space-y-2">
        <input type="hidden" name="organizationId" value={organizationId} />
        <Select
          name="accountStatus"
          defaultValue={accountStatus}
          aria-label="Account status"
          className="py-1 text-[12.5px]"
        >
          <option value="PENDING_REVIEW">Pending review</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="REJECTED">Rejected</option>
          <option value="CLOSED">Closed</option>
        </Select>
        <Select
          name="kycStatus"
          defaultValue={kycStatus}
          aria-label="KYC status"
          className="py-1 text-[12.5px]"
        >
          <option value="NOT_STARTED">KYC: not started</option>
          <option value="IN_PROGRESS">KYC: in progress</option>
          <option value="SUBMITTED">KYC: submitted</option>
          <option value="VERIFIED">KYC: verified</option>
          <option value="EXPIRED">KYC: expired</option>
          <option value="REJECTED">KYC: rejected</option>
        </Select>
      </div>
    </ActionForm>
  )
}
