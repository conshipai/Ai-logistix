/**
 * Creates the first AI Logistix administrator.
 *
 * A freshly deployed MConnect has no users at all: registration is
 * self-service but grants no access, and approving a registration requires an
 * administrator who does not yet exist. Without this script the only route in
 * is hand-crafting a bcrypt hash and writing rows by hand, which is a poor
 * thing to ask of anyone and easy to get wrong.
 *
 * Usage — in the deployment's terminal, or locally against a database:
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" npm run create-admin
 *
 * A strong password is generated and printed once. Supply ADMIN_PASSWORD to
 * choose your own; note that doing so puts it in the shell history.
 *
 * Safe to run against production — it creates nothing fictional, is refused if
 * the user already exists (unless ADMIN_RESET_PASSWORD=true), and writes an
 * audit event like every other privileged action on the platform.
 */
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

function generatePassword() {
  // Ambiguous characters removed so it survives being read aloud or retyped.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = randomBytes(24)
  let out = ''
  for (const b of bytes) out += alphabet[b % alphabet.length]
  return `${out.slice(0, 8)}-${out.slice(8, 16)}-${out.slice(16, 24)}`
}

function fail(message) {
  console.error(`\n[create-admin] ${message}\n`)
  process.exit(1)
}

const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()
const name = (process.env.ADMIN_NAME ?? '').trim()
const organizationName = (process.env.ADMIN_ORG ?? 'AI Logistix').trim()
const reset = process.env.ADMIN_RESET_PASSWORD === 'true'

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  fail('Set ADMIN_EMAIL to a valid email address.\n\n  Example:\n    ADMIN_EMAIL=you@company.com ADMIN_NAME="Your Name" npm run create-admin')
}
if (!name) fail('Set ADMIN_NAME to the administrator\'s full name.')

const supplied = process.env.ADMIN_PASSWORD
const password = supplied ?? generatePassword()
const generated = !supplied

// The same policy the application enforces on every other password.
if (password.length < 12) fail('ADMIN_PASSWORD must be at least 12 characters.')
if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
  fail('ADMIN_PASSWORD must contain an upper-case letter, a lower-case letter and a digit.')
}

try {
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  })

  if (existing && !reset) {
    fail(
      `A user already exists for ${email}.\n\n` +
        '  To reset that account\'s password and ensure it is an active\n' +
        '  administrator, re-run with ADMIN_RESET_PASSWORD=true.',
    )
  }

  const organization = await prisma.organization.findFirst({
    where: { type: 'AI_LOGISTIX' },
    select: { id: true, legalName: true },
  })

  const passwordHash = await bcrypt.hash(password, 12)

  const result = await prisma.$transaction(async (tx) => {
    const org =
      organization ??
      (await tx.organization.create({
        data: {
          reference: `ORG-${randomBytes(4).toString('hex').toUpperCase()}`,
          type: 'AI_LOGISTIX',
          legalName: organizationName,
          country: (process.env.ADMIN_COUNTRY ?? 'US').toUpperCase(),
          accountStatus: 'ACTIVE',
          kycStatus: 'VERIFIED',
        },
        select: { id: true, legalName: true },
      }))

    const user = await tx.user.upsert({
      where: { email },
      create: {
        email,
        name,
        passwordHash,
        status: 'ACTIVE',
        emailVerifiedAt: new Date(),
      },
      update: {
        passwordHash,
        status: 'ACTIVE',
        failedLoginCount: 0,
        lockedUntil: null,
      },
      select: { id: true, email: true },
    })

    await tx.organizationMembership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
      create: {
        userId: user.id,
        organizationId: org.id,
        role: 'AI_LOGISTIX_ADMIN',
        isPrimary: true,
        isActive: true,
      },
      update: { role: 'AI_LOGISTIX_ADMIN', isActive: true },
    })

    // Privileged actions are audited; creating the first administrator is the
    // most privileged of them.
    await tx.auditEvent.create({
      data: {
        actorUserId: user.id,
        actorEmail: user.email,
        organizationId: org.id,
        action: existing ? 'user.password_reset' : 'user.created',
        entityType: 'User',
        entityId: user.id,
        afterData: {
          role: 'AI_LOGISTIX_ADMIN',
          via: 'create-admin script',
          organization: org.legalName,
        },
      },
    })

    return { user, org, createdOrg: !organization }
  })

  console.info('')
  console.info('[create-admin] Administrator ready.')
  console.info('')
  console.info(`  Organization  ${result.org.legalName}${result.createdOrg ? '  (created)' : ''}`)
  console.info(`  Name          ${name}`)
  console.info(`  Email         ${result.user.email}`)
  console.info('  Role          AI Logistix — administrator')
  console.info('')
  if (generated) {
    console.info('  Password      ' + password)
    console.info('')
    console.info('  This password is shown once and is not stored anywhere in')
    console.info('  readable form. Save it to a password manager now, then sign')
    console.info('  in and change it.')
  } else {
    console.info('  Password      (the value you supplied)')
  }
  console.info('')
} catch (error) {
  console.error('[create-admin] Failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
