import { Card, CardBody, CardHeader, CardTitle, EmptyState } from '@/components/ui'
import { formatDateTime } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

/**
 * The audit history.
 *
 * Append-only: no path in the application updates or deletes an audit row.
 * Before/after payloads are redacted at write time, so nothing sensitive can
 * appear here even when the underlying record contained it.
 */

const ACTION_LABELS: Record<string, string> = {
  'transaction.created': 'Transaction opened',
  'transaction.stage_changed': 'Stage changed',
  'transaction.shared': 'Shared with an organization',
  'transaction.access_revoked': 'Access revoked',
  'transaction.closed': 'Transaction closed',
  'purchase_order.created': 'Purchase order created',
  'purchase_order.updated': 'Purchase order updated',
  'purchase_order.submitted': 'Purchase order submitted',
  'purchase_order.verification_requested': 'Verification requested',
  'purchase_order.verified': 'Purchase order verified',
  'purchase_order.rejected': 'Purchase order rejected',
  'funding_request.created': 'Financing request created',
  'funding_request.submitted': 'Financing request submitted',
  'funding_request.status_changed': 'Financing status changed',
  'funding_request.approved': 'Financing approved',
  'funding_request.rejected': 'Financing declined',
  'funding_request.funded': 'Funding recorded',
  'disbursement.recorded': 'Disbursement recorded',
  'disbursement.updated': 'Disbursement updated',
  'repayment.recorded': 'Repayment recorded',
  'document.uploaded': 'Document uploaded',
  'document.viewed': 'Document viewed',
  'document.deleted': 'Document removed',
  'procurement_item.created': 'Procurement line added',
  'procurement_item.updated': 'Procurement line updated',
  'shipment.created': 'Shipment created',
  'shipment.updated': 'Shipment updated',
  'shipment.milestone_recorded': 'Shipment milestone recorded',
  'transaction_milestone.created': 'Milestone added',
  'transaction_milestone.updated': 'Milestone updated',
  'approval.requested': 'Approval requested',
  'approval.decided': 'Approval decided',
  'comment.created': 'Message posted',
  'rfi.created': 'Information requested',
  'rfi.updated': 'Information request updated',
  'invoice.created': 'Invoice submitted',
  'invoice.updated': 'Invoice updated',
  'delivery.accepted': 'Delivery acceptance recorded',
}

export function AuditPanel({ auditEvents, transaction }: TransactionPanelProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Audit history — {transaction.number}</CardTitle>
        <span className="text-[12px] text-ink-400">
          Append-only. Secrets and bank identifiers are redacted at write time.
        </span>
      </CardHeader>
      {auditEvents.length === 0 ? (
        <EmptyState title="No audit events" description="Activity on this transaction appears here." />
      ) : (
        <CardBody className="p-0">
          <ol className="divide-y divide-ink-100">
            {auditEvents.map((event) => (
              <li key={event.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink-900">
                    {ACTION_LABELS[event.action] ?? event.action}
                  </p>
                  <p className="tabular text-[11.5px] text-ink-400">
                    {formatDateTime(event.createdAt)}
                  </p>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-500">
                  {event.actorUser?.name ?? event.actorEmail ?? 'System'}
                  {event.organization
                    ? ` · ${event.organization.tradingName ?? event.organization.legalName}`
                    : ''}
                  {event.ipAddress ? ` · ${event.ipAddress}` : ''}
                </p>
                {event.afterData ? (
                  <pre className="mt-2 overflow-x-auto rounded bg-ink-50 px-3 py-2 text-[11.5px] leading-relaxed text-ink-600">
                    {JSON.stringify(event.afterData, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ol>
        </CardBody>
      )}
    </Card>
  )
}
