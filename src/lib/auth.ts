import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import type { OrganizationType, Role } from '@prisma/client'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/password'

/**
 * Authentication.
 *
 * Auth.js v5 with a credentials provider and JWT sessions carried in an
 * HTTP-only, SameSite=Lax cookie (Secure in production). The session token
 * carries only identifiers and the active membership; every authorization
 * decision is still made server-side against the database.
 */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: Role
      organizationId: string
      organizationType: OrganizationType
      organizationName: string
      locale: string
    } & DefaultSession['user']
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const MAX_FAILED_LOGINS = 8
const LOCKOUT_MINUTES = 15

export class SignInError extends Error {
  constructor(public readonly reason: 'INVALID' | 'PENDING' | 'SUSPENDED' | 'LOCKED') {
    super(reason)
    this.name = 'SignInError'
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60, updateAge: 30 * 60 },
  pages: { signIn: '/login', error: '/login' },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production'
        ? '__Secure-mconnect.session'
        : 'mconnect.session',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw)
        if (!parsed.success) return null
        const email = parsed.data.email.trim().toLowerCase()

        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            memberships: {
              where: { isActive: true },
              include: { organization: true },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
          },
        })

        // Always spend the same work whether or not the account exists, so
        // response timing does not disclose which emails are registered.
        const hash = user?.passwordHash ?? '$2a$12$0000000000000000000000000000000000000000000000000000'
        const ok = await verifyPassword(parsed.data.password, hash)

        if (!user || !ok) {
          if (user) {
            const failed = user.failedLoginCount + 1
            await prisma.user.update({
              where: { id: user.id },
              data: {
                failedLoginCount: failed,
                lockedUntil:
                  failed >= MAX_FAILED_LOGINS
                    ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
                    : user.lockedUntil,
              },
            })
          }
          return null
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) throw new SignInError('LOCKED')
        if (user.status === 'PENDING_REVIEW') throw new SignInError('PENDING')
        if (user.status !== 'ACTIVE') throw new SignInError('SUSPENDED')

        const membership = user.memberships.find((m) => m.organization.accountStatus === 'ACTIVE')
        if (!membership) throw new SignInError('PENDING')

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership.role,
          organizationId: membership.organizationId,
          organizationType: membership.organization.type,
          organizationName: membership.organization.tradingName ?? membership.organization.legalName,
          locale: user.locale,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.uid = user.id
        token.role = (user as { role: Role }).role
        token.organizationId = (user as { organizationId: string }).organizationId
        token.organizationType = (user as { organizationType: OrganizationType }).organizationType
        token.organizationName = (user as { organizationName: string }).organizationName
        token.locale = (user as { locale: string }).locale
        return token
      }

      // Re-read the membership when the session is refreshed so a revoked
      // membership or suspended account stops working without waiting for the
      // token to expire.
      if (trigger === 'update' || !token.role) {
        const membership = await prisma.organizationMembership.findFirst({
          where: { userId: token.uid as string, isActive: true },
          include: { organization: true, user: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        })
        if (!membership || membership.user.status !== 'ACTIVE') return null
        token.role = membership.role
        token.organizationId = membership.organizationId
        token.organizationType = membership.organization.type
        token.organizationName =
          membership.organization.tradingName ?? membership.organization.legalName
      }
      return token
    },
    async session({ session, token }) {
      if (token.uid) {
        session.user.id = token.uid as string
        session.user.role = token.role as Role
        session.user.organizationId = token.organizationId as string
        session.user.organizationType = token.organizationType as OrganizationType
        session.user.organizationName = token.organizationName as string
        session.user.locale = (token.locale as string) ?? 'en'
      }
      return session
    },
  },
})
