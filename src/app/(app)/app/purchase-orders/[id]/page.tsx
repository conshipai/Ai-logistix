import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/app/shell'
import { PurchaseOrderForm } from '@/components/app/purchase-order-form'
import { ActionButton } from '@/components/app/forms'
import { submitPurchaseOrderAction } from '@/app/actions/transaction'
import { PoStatusBadge } from '@/components/status'
import { Alert, Card, CardBody, CardHeader, CardTitle } from '@/components/ui'
import { prisma } from '@/lib/db'
import { NotFoundError, isStaff } from '@/lib/rbac'
import { requireActor } from '@/lib/session'
import { projectScopeWhere, selectableBuyers } from '@/server/services/access'
import { getPurchaseOrder } from '@/server/services/purchase-orders'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Purchase order' }

export default async function PurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const actor = await requireActor()
  const { id } = await params

  let po
  try {
    po = await getPurchaseOrder(actor, id)
  } catch (error) {
    if (error instanceof NotFoundError) notFound()
    throw error
  }

  // Once submitted, the transaction page is the place to work — redirect there.
  if (po.transaction && !['DRAFT', 'REJECTED'].includes(po.status)) {
    redirect(`/app/transactions/${po.transaction.id}?tab=purchase-order`)
  }

  const editable =
    ['DRAFT', 'REJECTED'].includes(po.status) &&
    (po.supplierId === actor.organizationId || isStaff(actor))

  const [projects, buyers] = await Promise.all([
    prisma.project.findMany({
      where: { ...projectScopeWhere(actor), status: { in: ['PLANNED', 'ACTIVE'] } },
      select: { id: true, name: true, country: true },
      orderBy: { name: 'asc' },
    }),
    selectableBuyers(actor),
  ])

  return (
    <>
      <div className="mb-5">
        <Link
          href="/app/transactions"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All transactions
        </Link>
      </div>

      <PageHeader
        eyebrow={`Purchase order ${po.poNumber}`}
        title={po.status === 'REJECTED' ? 'Correct and resubmit' : 'Draft purchase order'}
        description={
          po.status === 'REJECTED'
            ? 'Your buyer returned this order. Review their comments, make the corrections and submit it again.'
            : 'Review the details, attach the signed order, then submit it to your buyer for verification.'
        }
        actions={<PoStatusBadge status={po.status} />}
      />

      {po.status === 'REJECTED' && po.verifications[0]?.comments ? (
        <Alert tone="critical" title="Comments from your buyer" className="mb-5 max-w-4xl">
          {po.verifications[0].comments}
        </Alert>
      ) : null}

      <div className="max-w-4xl space-y-5">
        {editable ? (
          <PurchaseOrderForm
            mode="edit"
            projects={projects.map((p) => ({ id: p.id, label: `${p.name} (${p.country})` }))}
            buyers={buyers.map((b) => ({
              id: b.id,
              label: `${b.tradingName ?? b.legalName} — ${b.type === 'EPC' ? 'EPC contractor' : 'Project owner'}`,
            }))}
            defaults={{
              id: po.id,
              poNumber: po.poNumber,
              projectId: po.projectId,
              buyerId: po.buyerId,
              issueDate: po.issueDate,
              currency: po.currency,
              value: po.value,
              paymentTerms: po.paymentTerms,
              incoterm: po.incoterm,
              deliveryTerms: po.deliveryTerms,
              requestedDeliveryDate: po.requestedDeliveryDate,
              scopeDescription: po.scopeDescription,
              manufacturingComponent: po.manufacturingComponent,
              importedMaterialComponent: po.importedMaterialComponent,
              localLabourComponent: po.localLabourComponent,
              logisticsComponent: po.logisticsComponent,
              taxesComponent: po.taxesComponent,
              expectedGrossMargin: po.expectedGrossMargin,
              advancePaymentAmount: po.advancePaymentAmount,
              progressPaymentSchedule: po.progressPaymentSchedule,
              finalPaymentTerms: po.finalPaymentTerms,
              expiryDate: po.expiryDate,
            }}
          />
        ) : (
          <Alert tone="info">
            This purchase order can no longer be edited from here.
          </Alert>
        )}

        {editable ? (
          <Card className="border-accent-500/40">
            <CardHeader>
              <CardTitle>Submit for verification</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <p className="mb-4 text-[13.5px] leading-relaxed text-ink-600">
                Submitting opens a transaction and asks{' '}
                <strong className="font-semibold">
                  {po.buyer.tradingName ?? po.buyer.legalName}
                </strong>{' '}
                to confirm this order. You will be able to attach the signed purchase-order document
                on the transaction page, and to request working capital once it is verified.
              </p>
              <ActionButton
                action={submitPurchaseOrderAction}
                fields={{ purchaseOrderId: po.id }}
                label="Submit for verification"
                pendingLabel="Submitting…"
                variant="accent"
                size="md"
              />
            </CardBody>
          </Card>
        ) : null}
      </div>
    </>
  )
}
