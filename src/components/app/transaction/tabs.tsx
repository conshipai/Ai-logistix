import Link from 'next/link'
import type { Actor } from '@/lib/rbac'
import type { TransactionScope } from '@/server/services/access'
import { cn } from '@/lib/utils'
import { OverviewPanel } from './panels/overview'
import { PurchaseOrderPanel } from './panels/purchase-order'
import { FinancingPanel } from './panels/financing'
import { ProcurementPanel } from './panels/procurement'
import { LogisticsPanel } from './panels/logistics'
import { MilestonesPanel } from './panels/milestones'
import { DocumentsPanel } from './panels/documents'
import { CommunicationsPanel } from './panels/communications'
import { AuditPanel } from './panels/audit'
import type { TransactionPanelProps } from './panels/types'

/**
 * Tabs are URL-driven and server-rendered.
 *
 * Each panel loads only the data its tab needs, so the transaction page stays
 * fast as a transaction accumulates documents, shipments and audit history.
 */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'purchase-order', label: 'Purchase order' },
  { id: 'financing', label: 'Financing' },
  { id: 'procurement', label: 'Procurement' },
  { id: 'logistics', label: 'Logistics' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'documents', label: 'Documents' },
  { id: 'communications', label: 'Communications' },
  { id: 'audit', label: 'Audit history' },
] as const

export function TransactionTabs(
  props: TransactionPanelProps & { actor: Actor; scope: TransactionScope; activeTab: string },
) {
  const { activeTab, transaction } = props

  return (
    <div>
      <nav
        className="mb-5 flex gap-1 overflow-x-auto border-b border-ink-200"
        aria-label="Transaction sections"
      >
        {TABS.map((tab) => {
          const active = tab.id === activeTab
          const count = tabCount(tab.id, props)
          return (
            <Link
              key={tab.id}
              href={`/app/transactions/${transaction.id}?tab=${tab.id}`}
              aria-current={active ? 'page' : undefined}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-[13.5px] font-medium transition-colors',
                active
                  ? 'border-accent-500 text-ink-900'
                  : 'border-transparent text-ink-500 hover:border-ink-300 hover:text-ink-800',
              )}
            >
              {tab.label}
              {count !== null ? (
                <span
                  className={cn(
                    'tabular rounded-full px-1.5 py-0.5 text-[10.5px] font-bold',
                    active ? 'bg-ink-900 text-white' : 'bg-ink-100 text-ink-500',
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      {activeTab === 'overview' ? <OverviewPanel {...props} /> : null}
      {activeTab === 'purchase-order' ? <PurchaseOrderPanel {...props} /> : null}
      {activeTab === 'financing' ? <FinancingPanel {...props} /> : null}
      {activeTab === 'procurement' ? <ProcurementPanel {...props} /> : null}
      {activeTab === 'logistics' ? <LogisticsPanel {...props} /> : null}
      {activeTab === 'milestones' ? <MilestonesPanel {...props} /> : null}
      {activeTab === 'documents' ? <DocumentsPanel {...props} /> : null}
      {activeTab === 'communications' ? <CommunicationsPanel {...props} /> : null}
      {activeTab === 'audit' ? <AuditPanel {...props} /> : null}
    </div>
  )
}

function tabCount(tabId: string, props: TransactionPanelProps): number | null {
  switch (tabId) {
    case 'procurement':
      return props.transaction.procurementItems.length || null
    case 'logistics':
      return props.transaction.shipments.length || null
    case 'documents':
      return props.documents.length || null
    case 'communications': {
      const open = props.transaction.rfis.filter((r) => r.status === 'OPEN').length
      return open || null
    }
    default:
      return null
  }
}
