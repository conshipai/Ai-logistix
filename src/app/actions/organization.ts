'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AuthorizationError, NotFoundError, ValidationError } from '@/lib/rbac'
import { requireActorOrThrow } from '@/lib/session'
import {
  bankingRelationshipSchema,
  fieldErrors,
  inviteUserSchema,
  membershipUpdateSchema,
  organizationProfileSchema,
  organizationStatusSchema,
  projectSchema,
  registrationDecisionSchema,
  supplierProfileSchema,
  uuidSchema,
} from '@/lib/validation'
import type { FormState } from '@/app/actions/public'
import {
  addBankingRelationship,
  removeBankingRelationship,
  updateOrganizationProfile,
  updateOrganizationStatus,
  updateSupplierProfile,
} from '@/server/services/organizations'
import { createProject, updateProject } from '@/server/services/projects'
import { decideRegistration } from '@/server/services/registration'
import { inviteUser, updateMembership } from '@/server/services/users'

async function run(fn: () => Promise<unknown>, message: string): Promise<FormState> {
  try {
    await fn()
    return { ok: true, message }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, message: error.message, errors: error.fieldErrors }
    }
    if (error instanceof AuthorizationError) return { ok: false, message: error.message }
    if (error instanceof NotFoundError) {
      return { ok: false, message: 'That record could not be found.' }
    }
    if (error instanceof z.ZodError) {
      return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(error) }
    }
    if (error && typeof error === 'object' && 'digest' in error) throw error
    console.error('[action] unhandled failure', error)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
}

export async function updateOrganizationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const organizationId =
    (formData.get('organizationId') as string | null) || actor.organizationId
  const parsed = organizationProfileSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(
    () => updateOrganizationProfile(actor, organizationId, parsed.data),
    'Company profile saved.',
  )
  if (result.ok) {
    revalidatePath('/app/organization')
    revalidatePath('/app/admin/organizations')
  }
  return result
}

export async function updateSupplierProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const organizationId =
    (formData.get('organizationId') as string | null) || actor.organizationId
  const parsed = supplierProfileSchema.safeParse({
    ...Object.fromEntries(formData),
    hasUsdAccess: formData.get('hasUsdAccess') === 'on',
    hasExistingCreditFacilities: formData.get('hasExistingCreditFacilities') === 'on',
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(
    () => updateSupplierProfile(actor, organizationId, parsed.data),
    'Capability profile saved.',
  )
  if (result.ok) revalidatePath('/app/organization')
  return result
}

export async function addBankingRelationshipAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const organizationId =
    (formData.get('organizationId') as string | null) || actor.organizationId
  const parsed = bankingRelationshipSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(
    () => addBankingRelationship(actor, organizationId, parsed.data),
    'Banking relationship added.',
  )
  if (result.ok) revalidatePath('/app/organization')
  return result
}

export async function removeBankingRelationshipAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const id = uuidSchema.parse(formData.get('bankingRelationshipId'))
  const result = await run(() => removeBankingRelationship(actor, id), 'Banking relationship removed.')
  if (result.ok) revalidatePath('/app/organization')
  return result
}

export async function inviteUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = inviteUserSchema.safeParse({
    ...Object.fromEntries(formData),
    organizationId: formData.get('organizationId') || actor.organizationId,
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(
    () => inviteUser(actor, parsed.data),
    'User added. They have been emailed a link to set their password.',
  )
  if (result.ok) {
    revalidatePath('/app/organization')
    revalidatePath('/app/admin/users')
  }
  return result
}

export async function updateMembershipAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = membershipUpdateSchema.safeParse({
    membershipId: formData.get('membershipId'),
    role: formData.get('role') || undefined,
    isActive: formData.get('isActive') === null ? undefined : formData.get('isActive') === 'true',
  })
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(
    () =>
      updateMembership(actor, parsed.data.membershipId, {
        role: parsed.data.role,
        isActive: parsed.data.isActive,
      }),
    'Membership updated.',
  )
  if (result.ok) {
    revalidatePath('/app/organization')
    revalidatePath('/app/admin/users')
  }
  return result
}

export async function createProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = projectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => createProject(actor, parsed.data), 'Project created.')
  if (result.ok) revalidatePath('/app/projects')
  return result
}

export async function updateProjectAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const id = uuidSchema.parse(formData.get('projectId'))
  const parsed = projectSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(() => updateProject(actor, id, parsed.data), 'Project updated.')
  if (result.ok) {
    revalidatePath('/app/projects')
    revalidatePath(`/app/projects/${id}`)
  }
  return result
}

export async function decideRegistrationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = registrationDecisionSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(
    () => decideRegistration(actor, parsed.data),
    parsed.data.decision === 'APPROVE'
      ? 'Registration approved. The user has been notified and can now sign in.'
      : 'Registration rejected.',
  )
  if (result.ok) {
    revalidatePath('/app/admin/registrations')
    revalidatePath('/app/admin/organizations')
  }
  return result
}

export async function updateOrganizationStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireActorOrThrow()
  const parsed = organizationStatusSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, message: 'Please correct the highlighted fields.', errors: fieldErrors(parsed.error) }
  }
  const result = await run(
    () => updateOrganizationStatus(actor, parsed.data),
    'Organization updated.',
  )
  if (result.ok) revalidatePath('/app/admin/organizations')
  return result
}
