import { describe, expect, it } from 'vitest'
import { ROLE_PERMISSIONS, can, isAdmin, isReadOnly, isStaff, type Actor } from '@/lib/rbac'

/**
 * Capability matrix.
 *
 * These are pure unit tests over the permission table. They guard the rules
 * that matter commercially: a supplier can never hold the capability to verify
 * a purchase order or decide financing, and only an administrator holds the
 * capabilities that change security posture.
 */

function actor(role: Actor['role']): Pick<Actor, 'role'> {
  return { role }
}

describe('role capabilities', () => {
  it('never lets a supplier verify a purchase order', () => {
    expect(can(actor('SUPPLIER'), 'po:verify')).toBe(false)
  })

  it('never lets a supplier decide financing or record repayment', () => {
    expect(can(actor('SUPPLIER'), 'funding:decide')).toBe(false)
    expect(can(actor('SUPPLIER'), 'funding:record-funding')).toBe(false)
    expect(can(actor('SUPPLIER'), 'funding:record-repayment')).toBe(false)
  })

  it('never lets a supplier accept its own delivery', () => {
    expect(can(actor('SUPPLIER'), 'delivery:accept')).toBe(false)
  })

  it('lets an EPC verify but not create a purchase order', () => {
    expect(can(actor('EPC'), 'po:verify')).toBe(true)
    expect(can(actor('EPC'), 'po:create')).toBe(false)
  })

  it('never lets an EPC or project owner decide financing', () => {
    expect(can(actor('EPC'), 'funding:decide')).toBe(false)
    expect(can(actor('PROJECT_OWNER'), 'funding:decide')).toBe(false)
  })

  it('lets a financier decide financing but not verify the purchase order', () => {
    expect(can(actor('FINANCIER'), 'funding:decide')).toBe(true)
    expect(can(actor('FINANCIER'), 'po:verify')).toBe(false)
  })

  it('gives read-only observers no write capability at all', () => {
    const writes = [
      'po:create', 'po:submit', 'po:verify', 'funding:create', 'funding:decide',
      'document:upload', 'comment:create', 'milestone:manage', 'procurement:manage',
    ] as const
    for (const permission of writes) {
      expect(can(actor('VIEWER'), permission)).toBe(false)
    }
    expect(can(actor('VIEWER'), 'transaction:read')).toBe(true)
    expect(isReadOnly(actor('VIEWER'))).toBe(true)
  })

  it('reserves security-changing capabilities to the administrator', () => {
    for (const permission of ['user:manage:any', 'document:delete', 'settings:manage'] as const) {
      expect(can(actor('AI_LOGISTIX_ADMIN'), permission)).toBe(true)
      expect(can(actor('AI_LOGISTIX_OPERATIONS'), permission)).toBe(false)
    }
  })

  it('gives operations every non-security capability the admin has', () => {
    const adminOnly = new Set(['user:manage:any', 'document:delete', 'settings:manage'])
    for (const permission of ROLE_PERMISSIONS.AI_LOGISTIX_ADMIN) {
      if (adminOnly.has(permission)) continue
      expect(ROLE_PERMISSIONS.AI_LOGISTIX_OPERATIONS.has(permission)).toBe(true)
    }
  })

  it('recognises both AI Logistix roles as staff, and only one as admin', () => {
    expect(isStaff(actor('AI_LOGISTIX_ADMIN'))).toBe(true)
    expect(isStaff(actor('AI_LOGISTIX_OPERATIONS'))).toBe(true)
    expect(isStaff(actor('SUPPLIER'))).toBe(false)
    expect(isAdmin(actor('AI_LOGISTIX_ADMIN'))).toBe(true)
    expect(isAdmin(actor('AI_LOGISTIX_OPERATIONS'))).toBe(false)
  })
})
