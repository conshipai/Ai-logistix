import type { MilestoneStatus, MilestoneType, Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { NotFoundError, requirePermission, type Actor } from '@/lib/rbac'
import { assertWritable, requireTransactionScope } from '@/server/services/access'
import { advanceStageIfAhead } from '@/server/services/transactions'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Execution milestones.
 *
 * Every transaction is seeded with the standard manufacturing/execution plan so
 * the supplier sees a concrete checklist rather than an empty page. Completing
 * certain milestones nudges the transaction stage forward, which is what keeps
 * the lifecycle banner honest without anyone having to set it by hand.
 */

interface MilestoneTemplate {
  type: MilestoneType
  title: string
  description?: string
}

const STANDARD_MILESTONES: MilestoneTemplate[] = [
  { type: 'FUNDING_APPROVED', title: 'Funding approved', description: 'Financing decision recorded by the participating institution.' },
  { type: 'RAW_MATERIAL_ORDERED', title: 'Raw material ordered', description: 'Purchase orders placed with the material vendors.' },
  { type: 'RAW_MATERIAL_SHIPPED', title: 'Raw material shipped', description: 'Materials despatched from the vendor.' },
  { type: 'RAW_MATERIAL_DELIVERED', title: 'Raw material delivered', description: 'Materials received at the supplier facility.' },
  { type: 'FABRICATION_STARTED', title: 'Fabrication started' },
  { type: 'PROGRESS_25', title: '25% complete' },
  { type: 'PROGRESS_50', title: '50% complete' },
  { type: 'PROGRESS_75', title: '75% complete' },
  { type: 'INSPECTION_SCHEDULED', title: 'Inspection scheduled' },
  { type: 'INSPECTION_PASSED', title: 'Inspection passed' },
  { type: 'READY_FOR_DELIVERY', title: 'Ready for delivery' },
  { type: 'DELIVERED', title: 'Delivered to buyer' },
  { type: 'BUYER_ACCEPTED', title: 'Buyer acceptance confirmed' },
  { type: 'INVOICE_SUBMITTED', title: 'Invoice submitted' },
  { type: 'INVOICE_APPROVED', title: 'Invoice approved' },
  { type: 'PAYMENT_RECEIVED', title: 'Buyer payment received' },
  { type: 'FINANCE_REPAID', title: 'Financing repaid' },
]

/** Milestone completion that should pull the transaction stage forward. */
const STAGE_FOR_MILESTONE: Partial<Record<MilestoneType, Parameters<typeof advanceStageIfAhead>[2]>> = {
  FABRICATION_STARTED: 'MANUFACTURING',
  PROGRESS_25: 'MANUFACTURING',
  PROGRESS_50: 'MANUFACTURING',
  PROGRESS_75: 'MANUFACTURING',
  READY_FOR_DELIVERY: 'MANUFACTURING',
  DELIVERED: 'DELIVERY',
  BUYER_ACCEPTED: 'BUYER_ACCEPTANCE',
  PAYMENT_RECEIVED: 'PAYMENT',
  FINANCE_REPAID: 'REPAYMENT',
}

export async function seedStandardMilestones(db: Db, transactionId: string): Promise<void> {
  const existing = await db.transactionMilestone.count({ where: { transactionId } })
  if (existing > 0) return
  await db.transactionMilestone.createMany({
    data: STANDARD_MILESTONES.map((m, index) => ({
      transactionId,
      type: m.type,
      title: m.title,
      description: m.description ?? null,
      sequence: index * 10,
      status: 'PENDING' as const,
    })),
  })
}

export async function createMilestone(
  actor: Actor,
  input: { transactionId: string; type: MilestoneType; title: string; description?: string; dueDate?: Date },
): Promise<{ id: string }> {
  requirePermission(actor, 'milestone:manage')
  const scope = await requireTransactionScope(actor, input.transactionId)
  assertWritable(scope)

  const last = await prisma.transactionMilestone.findFirst({
    where: { transactionId: input.transactionId },
    orderBy: { sequence: 'desc' },
    select: { sequence: true },
  })

  const milestone = await prisma.transactionMilestone.create({
    data: {
      transactionId: input.transactionId,
      type: input.type,
      title: input.title,
      description: input.description || null,
      dueDate: input.dueDate ?? null,
      sequence: (last?.sequence ?? 0) + 10,
    },
    select: { id: true, title: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.MILESTONE_CREATED,
    entityType: 'TransactionMilestone',
    entityId: milestone.id,
    after: { title: milestone.title, transactionId: input.transactionId },
  })
  return { id: milestone.id }
}

export async function updateMilestoneStatus(
  actor: Actor,
  milestoneId: string,
  status: MilestoneStatus,
  note?: string,
): Promise<void> {
  requirePermission(actor, 'milestone:manage')

  const milestone = await prisma.transactionMilestone.findUnique({
    where: { id: milestoneId },
    select: { id: true, transactionId: true, status: true, title: true, type: true },
  })
  if (!milestone) throw new NotFoundError('Milestone not found.')

  const scope = await requireTransactionScope(actor, milestone.transactionId)
  assertWritable(scope)

  const completing = status === 'COMPLETED'
  await prisma.transactionMilestone.update({
    where: { id: milestoneId },
    data: {
      status,
      completedAt: completing ? new Date() : null,
      completedById: completing ? actor.userId : null,
      description: note ? note : undefined,
    },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.MILESTONE_UPDATED,
    entityType: 'TransactionMilestone',
    entityId: milestoneId,
    before: { status: milestone.status },
    after: { status, title: milestone.title, note },
  })

  const stage = completing ? STAGE_FOR_MILESTONE[milestone.type] : undefined
  if (stage) {
    await advanceStageIfAhead(
      prisma,
      milestone.transactionId,
      stage,
      actor,
      `Milestone "${milestone.title}" completed.`,
    )
  }
}

/** Marks a named standard milestone complete, if it exists and is still open. */
export async function completeStandardMilestone(
  db: Db,
  transactionId: string,
  type: MilestoneType,
  actorUserId: string,
): Promise<void> {
  await db.transactionMilestone.updateMany({
    where: { transactionId, type, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    data: { status: 'COMPLETED', completedAt: new Date(), completedById: actorUserId },
  })
}

export async function overdueMilestones(actor: Actor, limit = 20) {
  const { transactionScopeWhere } = await import('@/server/services/access')
  return prisma.transactionMilestone.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      dueDate: { lt: new Date() },
      transaction: transactionScopeWhere(actor),
    },
    include: {
      transaction: { select: { id: true, number: true, supplier: { select: { legalName: true } } } },
    },
    orderBy: { dueDate: 'asc' },
    take: limit,
  })
}

export async function upcomingMilestones(actor: Actor, limit = 10) {
  const { transactionScopeWhere } = await import('@/server/services/access')
  return prisma.transactionMilestone.findMany({
    where: {
      status: { in: ['PENDING', 'IN_PROGRESS'] },
      transaction: { ...transactionScopeWhere(actor), stage: { notIn: ['CLOSED', 'CANCELLED'] } },
    },
    include: { transaction: { select: { id: true, number: true } } },
    orderBy: [{ dueDate: 'asc' }, { sequence: 'asc' }],
    take: limit,
  })
}
