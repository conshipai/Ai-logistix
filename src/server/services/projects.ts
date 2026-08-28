import type { z } from 'zod'
import { prisma } from '@/lib/db'
import { AUDIT_ACTIONS, recordAudit } from '@/lib/audit'
import { reference } from '@/lib/ids'
import { NotFoundError, ValidationError, requirePermission, type Actor } from '@/lib/rbac'
import type { projectSchema } from '@/lib/validation'
import { projectScopeWhere } from '@/server/services/access'

export type ProjectInput = z.infer<typeof projectSchema>

export async function listProjects(actor: Actor) {
  requirePermission(actor, 'project:read')
  return prisma.project.findMany({
    where: projectScopeWhere(actor),
    include: {
      projectOwner: { select: { id: true, legalName: true, tradingName: true } },
      epc: { select: { id: true, legalName: true, tradingName: true } },
      _count: { select: { purchaseOrders: true, transactions: true } },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })
}

export async function getProject(actor: Actor, projectId: string) {
  requirePermission(actor, 'project:read')
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectScopeWhere(actor) },
    include: {
      projectOwner: true,
      epc: true,
      transactions: {
        include: {
          purchaseOrder: { select: { poNumber: true, value: true, currency: true } },
          supplier: { select: { id: true, legalName: true, tradingName: true, country: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!project) throw new NotFoundError('Project not found.')
  return project
}

export async function createProject(actor: Actor, input: ProjectInput): Promise<{ id: string }> {
  requirePermission(actor, 'project:manage')

  const owner = await prisma.organization.findUnique({
    where: { id: input.projectOwnerId },
    select: { id: true, type: true, isDemo: true },
  })
  if (!owner) throw new NotFoundError('Project owner not found.')
  if (owner.type !== 'PROJECT_OWNER' && owner.type !== 'EPC') {
    throw new ValidationError('The project owner must be a project-owner or EPC organization.')
  }

  if (input.epcId) {
    const epc = await prisma.organization.findUnique({
      where: { id: input.epcId },
      select: { id: true, type: true },
    })
    if (!epc || epc.type !== 'EPC') throw new ValidationError('Select an EPC organization.')
  }

  const project = await prisma.project.create({
    data: {
      reference: reference('PRJ'),
      name: input.name,
      projectOwnerId: input.projectOwnerId,
      epcId: input.epcId || null,
      location: input.location || null,
      country: input.country,
      sector: input.sector || null,
      description: input.description || null,
      status: input.status,
      startDate: input.startDate ?? null,
      targetCompletionDate: input.targetCompletionDate ?? null,
      currency: input.currency,
      localContentProgram: input.localContentProgram || null,
      primaryContactName: input.primaryContactName || null,
      primaryContactEmail: input.primaryContactEmail || null,
      isDemo: owner.isDemo,
    },
    select: { id: true, name: true },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.PROJECT_CREATED,
    entityType: 'Project',
    entityId: project.id,
    after: { name: project.name, country: input.country, projectOwnerId: input.projectOwnerId },
  })
  return { id: project.id }
}

export async function updateProject(
  actor: Actor,
  projectId: string,
  input: ProjectInput,
): Promise<void> {
  requirePermission(actor, 'project:manage')

  const before = await prisma.project.findFirst({
    where: { id: projectId, ...projectScopeWhere(actor) },
  })
  if (!before) throw new NotFoundError('Project not found.')

  await prisma.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      projectOwnerId: input.projectOwnerId,
      epcId: input.epcId || null,
      location: input.location || null,
      country: input.country,
      sector: input.sector || null,
      description: input.description || null,
      status: input.status,
      startDate: input.startDate ?? null,
      targetCompletionDate: input.targetCompletionDate ?? null,
      currency: input.currency,
      localContentProgram: input.localContentProgram || null,
      primaryContactName: input.primaryContactName || null,
      primaryContactEmail: input.primaryContactEmail || null,
    },
  })

  await recordAudit({
    actor,
    action: AUDIT_ACTIONS.PROJECT_UPDATED,
    entityType: 'Project',
    entityId: projectId,
    before: { name: before.name, status: before.status },
    after: { name: input.name, status: input.status },
  })
}
