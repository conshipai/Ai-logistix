import type { Actor } from '@/lib/rbac'
import type { TransactionScope } from '@/server/services/access'
import type { getTransactionDetail } from '@/server/services/transactions'
import type { listTransactionDocuments } from '@/server/services/documents'
import type { listComments, mentionableUsers } from '@/server/services/communications'
import type { listVendorsForTransaction } from '@/server/services/procurement'
import type { activeFinanciers } from '@/server/services/organizations'
import type { transactionAuditHistory } from '@/server/services/transactions'

type Detail = Awaited<ReturnType<typeof getTransactionDetail>>

export type TransactionDetail = Detail['transaction']
export type FundingDetail = TransactionDetail['fundingRequests'][number]

export interface TransactionPanelProps {
  actor: Actor
  scope: TransactionScope
  transaction: TransactionDetail
  funding: FundingDetail | null
  documents: Awaited<ReturnType<typeof listTransactionDocuments>>
  comments: Awaited<ReturnType<typeof listComments>>
  mentionable: Awaited<ReturnType<typeof mentionableUsers>>
  vendors: Awaited<ReturnType<typeof listVendorsForTransaction>>
  financiers: Awaited<ReturnType<typeof activeFinanciers>>
  auditEvents: Awaited<ReturnType<typeof transactionAuditHistory>>
}
