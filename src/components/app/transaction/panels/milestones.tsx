import {
  createMilestoneAction,
  deliveryAcceptanceAction,
  updateMilestoneAction,
} from '@/app/actions/transaction'
import { ActionButton, ActionForm, StatusSelect } from '@/components/app/forms'
import { MilestoneStatusBadge } from '@/components/status'
import {
  Alert,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Textarea,
} from '@/components/ui'
import { formatDate, formatDateTime, humanizeEnum } from '@/lib/utils'
import type { TransactionPanelProps } from './types'

export function MilestonesPanel({ transaction, scope }: TransactionPanelProps) {
  const canUpdate = (scope.isSupplier || scope.isStaff) && !scope.readOnly
  const canAccept = (scope.isBuyer || scope.isProjectOwner || scope.isStaff) && !scope.isSupplier && !scope.readOnly

  const milestones = transaction.milestones
  const completed = milestones.filter((m) => m.status === 'COMPLETED').length
  const readyForDelivery = milestones.some(
    (m) => m.type === 'READY_FOR_DELIVERY' && m.status === 'COMPLETED',
  )
  const alreadyAccepted = milestones.some(
    (m) => m.type === 'BUYER_ACCEPTED' && m.status === 'COMPLETED',
  )

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Execution milestones</CardTitle>
          <span className="text-[12.5px] font-semibold text-ink-500">
            {completed} of {milestones.length} complete
          </span>
        </CardHeader>
        <CardBody className="p-0">
          <ul className="divide-y divide-ink-100">
            {milestones.map((milestone) => (
              <li
                key={milestone.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p
                    className={`text-[14px] font-medium ${
                      milestone.status === 'COMPLETED' ? 'text-ink-400 line-through' : 'text-ink-900'
                    }`}
                  >
                    {milestone.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-400">
                    {milestone.completedAt
                      ? `Completed ${formatDateTime(milestone.completedAt)}`
                      : milestone.dueDate
                        ? `Due ${formatDate(milestone.dueDate)}`
                        : humanizeEnum(milestone.type)}
                  </p>
                  {milestone.description ? (
                    <p className="mt-0.5 text-[12.5px] text-ink-500">{milestone.description}</p>
                  ) : null}
                </div>
                <div className="shrink-0">
                  {canUpdate ? (
                    <StatusSelect
                      action={updateMilestoneAction}
                      fields={{ milestoneId: milestone.id, transactionId: transaction.id }}
                      name="status"
                      value={milestone.status}
                      ariaLabel={`Status for ${milestone.title}`}
                      options={[
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'IN_PROGRESS', label: 'In progress' },
                        { value: 'COMPLETED', label: 'Completed' },
                        { value: 'BLOCKED', label: 'Blocked' },
                        { value: 'SKIPPED', label: 'Not applicable' },
                      ]}
                    />
                  ) : (
                    <MilestoneStatusBadge status={milestone.status} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <div className="space-y-5">
        {canAccept ? (
          <Card className={readyForDelivery && !alreadyAccepted ? 'border-accent-500/40' : ''}>
            <CardHeader>
              <CardTitle>Delivery and acceptance</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              {alreadyAccepted ? (
                <Alert tone="positive">
                  Delivery has been confirmed and accepted. The supplier can now invoice.
                </Alert>
              ) : (
                <>
                  <p className="mb-4 text-[13px] leading-relaxed text-ink-500">
                    Confirming acceptance records that your organization has received the goods or
                    services and accepts them. It allows the supplier to invoice and starts the
                    repayment cycle.
                  </p>
                  <ActionForm
                    action={deliveryAcceptanceAction}
                    submitLabel="Confirm delivery and acceptance"
                    pendingLabel="Recording…"
                    submitVariant="accent"
                    submitSize="sm"
                    footer={
                      <ActionButton
                        action={deliveryAcceptanceAction}
                        fields={{
                          transactionId: transaction.id,
                          accepted: 'false',
                          comments: 'Delivery not accepted. See communications.',
                        }}
                        label="Not accepted"
                        variant="outline"
                        size="sm"
                      />
                    }
                  >
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <input type="hidden" name="accepted" value="true" />
                    <Field label="Comments" htmlFor="acceptanceComments">
                      <Textarea
                        id="acceptanceComments"
                        name="comments"
                        rows={3}
                        maxLength={4000}
                        placeholder="Any observations on condition, quantity or quality."
                      />
                    </Field>
                  </ActionForm>
                </>
              )}
            </CardBody>
          </Card>
        ) : null}

        {canUpdate ? (
          <Card>
            <CardHeader>
              <CardTitle>Add a milestone</CardTitle>
            </CardHeader>
            <CardBody className="p-5">
              <ActionForm
                action={createMilestoneAction}
                submitLabel="Add milestone"
                pendingLabel="Adding…"
                submitVariant="outline"
                submitSize="sm"
                successMessage="Milestone added."
              >
                {(state) => (
                  <div className="space-y-3">
                    <input type="hidden" name="transactionId" value={transaction.id} />
                    <input type="hidden" name="type" value="CUSTOM" />
                    <Field label="Title" htmlFor="milestoneTitle" required error={state.errors?.title}>
                      <Input id="milestoneTitle" name="title" required maxLength={200} />
                    </Field>
                    <Field label="Due date" htmlFor="milestoneDue">
                      <Input id="milestoneDue" name="dueDate" type="date" />
                    </Field>
                    <Field label="Description" htmlFor="milestoneDescription">
                      <Textarea
                        id="milestoneDescription"
                        name="description"
                        rows={2}
                        maxLength={2000}
                      />
                    </Field>
                  </div>
                )}
              </ActionForm>
            </CardBody>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
