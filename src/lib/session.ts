import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AuthorizationError, type Actor, type Permission, can } from '@/lib/rbac'

/** The signed-in actor, or null. Never throws. */
export async function currentActor(): Promise<Actor | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    name: session.user.name ?? '',
    role: session.user.role,
    organizationId: session.user.organizationId,
    organizationType: session.user.organizationType,
    organizationName: session.user.organizationName,
  }
}

/** For pages: redirects unauthenticated visitors to the sign-in screen. */
export async function requireActor(): Promise<Actor> {
  const actor = await currentActor()
  if (!actor) redirect('/login')
  return actor
}

/** For pages: redirects, then enforces a capability. */
export async function requireActorWith(permission: Permission): Promise<Actor> {
  const actor = await requireActor()
  if (!can(actor, permission)) redirect('/app?denied=1')
  return actor
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireActorOrThrow(): Promise<Actor> {
  const actor = await currentActor()
  if (!actor) throw new AuthorizationError('You must be signed in.')
  return actor
}
