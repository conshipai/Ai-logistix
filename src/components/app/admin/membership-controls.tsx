'use client'

import { updateMembershipAction } from '@/app/actions/organization'
import { ActionButton, ActionForm } from '@/components/app/forms'
import { Select } from '@/components/ui'

const ROLES = [
  'SUPPLIER',
  'EPC',
  'PROJECT_OWNER',
  'FINANCIER',
  'AI_LOGISTIX_OPERATIONS',
  'AI_LOGISTIX_ADMIN',
  'VIEWER',
]

const LABELS: Record<string, string> = {
  SUPPLIER: 'Supplier',
  EPC: 'EPC',
  PROJECT_OWNER: 'Project owner',
  FINANCIER: 'Financing partner',
  AI_LOGISTIX_OPERATIONS: 'AI Logistix operations',
  AI_LOGISTIX_ADMIN: 'AI Logistix administrator',
  VIEWER: 'Read-only observer',
}

export function MembershipControls({
  membershipId,
  role,
  isActive,
}: {
  membershipId: string
  role: string
  isActive: boolean
}) {
  return (
    <div className="min-w-[190px] space-y-2">
      <ActionForm
        action={updateMembershipAction}
        submitLabel="Change role"
        pendingLabel="Saving…"
        submitVariant="outline"
        submitSize="sm"
      >
        <input type="hidden" name="membershipId" value={membershipId} />
        <Select name="role" defaultValue={role} aria-label="Role" className="py-1 text-[12.5px]">
          {ROLES.map((value) => (
            <option key={value} value={value}>
              {LABELS[value] ?? value}
            </option>
          ))}
        </Select>
      </ActionForm>

      <ActionButton
        action={updateMembershipAction}
        fields={{ membershipId, isActive: isActive ? 'false' : 'true' }}
        label={isActive ? 'Deactivate' : 'Reactivate'}
        variant={isActive ? 'ghost' : 'outline'}
        confirm={
          isActive
            ? 'Deactivate this membership? The user loses access on their next request.'
            : undefined
        }
      />
    </div>
  )
}
