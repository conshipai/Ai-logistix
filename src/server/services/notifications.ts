import type { Prisma, PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'
import { appUrl } from '@/lib/env'
import { emailLayout, isMailConfigured, sendMail } from '@/lib/mail'

type Db = PrismaClient | Prisma.TransactionClient

/**
 * Notification service.
 *
 * Every notable workflow event lands here. Each notification is persisted first
 * (so the in-app inbox is complete and auditable), then delivery is attempted
 * by email. When SMTP is not configured the notification is marked SKIPPED and
 * logged — the workflow is never blocked by mail configuration.
 */

export const NOTIFICATION_EVENTS = {
  REGISTRATION_RECEIVED: 'registration.received',
  REGISTRATION_APPROVED: 'registration.approved',
  REGISTRATION_REJECTED: 'registration.rejected',
  PO_SUBMITTED: 'po.submitted',
  PO_VERIFICATION_REQUESTED: 'po.verification_requested',
  PO_VERIFIED: 'po.verified',
  PO_REJECTED: 'po.rejected',
  FINANCING_SUBMITTED: 'financing.submitted',
  FINANCING_SHARED: 'financing.shared_with_financier',
  INFORMATION_REQUESTED: 'financing.information_requested',
  FINANCING_APPROVED: 'financing.approved',
  FINANCING_REJECTED: 'financing.rejected',
  FUNDING_RECORDED: 'financing.funded',
  MILESTONE_OVERDUE: 'milestone.overdue',
  DELIVERY_ACCEPTED: 'delivery.accepted',
  PAYMENT_RECORDED: 'payment.recorded',
  REPAYMENT_RECORDED: 'repayment.recorded',
  TRANSACTION_CLOSED: 'transaction.closed',
  RFI_RAISED: 'rfi.raised',
  COMMENT_MENTION: 'comment.mention',
} as const

export type NotificationEvent =
  (typeof NOTIFICATION_EVENTS)[keyof typeof NOTIFICATION_EVENTS]

export interface NotifyInput {
  userIds: string[]
  event: NotificationEvent | string
  subject: string
  body: string
  linkPath?: string
}

/**
 * Queues and delivers notifications. Never throws: a mail outage must not roll
 * back the business action that triggered it.
 */
export async function notify(input: NotifyInput, db: Db = prisma): Promise<void> {
  const userIds = Array.from(new Set(input.userIds)).filter(Boolean)
  if (userIds.length === 0) return

  try {
    const users = await db.user.findMany({
      where: { id: { in: userIds }, status: 'ACTIVE' },
      select: { id: true, email: true, name: true },
    })
    if (users.length === 0) return

    const link = input.linkPath ? `${appUrl()}${input.linkPath}` : undefined
    const mailEnabled = isMailConfigured()

    await db.notification.createMany({
      data: users.map((user) => ({
        userId: user.id,
        channel: 'IN_APP' as const,
        event: input.event,
        subject: input.subject,
        body: input.body,
        linkPath: input.linkPath ?? null,
        status: 'SENT' as const,
        sentAt: new Date(),
      })),
    })

    for (const user of users) {
      const result = await sendMail({
        to: user.email,
        subject: `[MConnect] ${input.subject}`,
        text: `${input.body}${link ? `\n\nOpen MConnect: ${link}` : ''}`,
        html: emailLayout(
          input.subject,
          `<p style="line-height:1.65;margin:0">${escapeHtml(input.body).replace(/\n/g, '<br>')}</p>`,
          link,
          'Open in MConnect',
        ),
      })

      await db.notification.create({
        data: {
          userId: user.id,
          channel: 'EMAIL',
          event: input.event,
          subject: input.subject,
          body: input.body,
          linkPath: input.linkPath ?? null,
          status: result.delivered ? 'SENT' : result.skipped ? 'SKIPPED' : 'FAILED',
          error: result.error ?? null,
          sentAt: result.delivered ? new Date() : null,
        },
      })

      if (!mailEnabled) break // Log once per event rather than once per recipient.
    }
  } catch (error) {
    console.error('[notifications] failed', input.event, error)
  }
}

/** Resolves the active users of an organization, for role-addressed events. */
export async function usersInOrganization(
  organizationId: string,
  db: Db = prisma,
): Promise<string[]> {
  const memberships = await db.organizationMembership.findMany({
    where: { organizationId, isActive: true, user: { status: 'ACTIVE' } },
    select: { userId: true },
  })
  return memberships.map((m) => m.userId)
}

/** Resolves AI Logistix staff, for events that need coordinator attention. */
export async function aiLogistixStaffUserIds(db: Db = prisma): Promise<string[]> {
  const memberships = await db.organizationMembership.findMany({
    where: {
      isActive: true,
      role: { in: ['AI_LOGISTIX_ADMIN', 'AI_LOGISTIX_OPERATIONS'] },
      user: { status: 'ACTIVE' },
    },
    select: { userId: true },
  })
  return memberships.map((m) => m.userId)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
