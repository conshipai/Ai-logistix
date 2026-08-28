import type { TransactionStage } from '@prisma/client'
import { Check } from 'lucide-react'
import { TRANSACTION_LIFECYCLE, stageIndex } from '@/lib/state-machine'
import { cn, humanizeEnum } from '@/lib/utils'

/**
 * The transaction lifecycle banner.
 *
 * The brief asks that a user understand transaction state within five seconds.
 * Completed stages are filled and ticked, the current stage is accented, and
 * everything ahead is outlined — one glance tells you where the transaction is.
 */

const SHORT_LABELS: Partial<Record<TransactionStage, string>> = {
  PURCHASE_ORDER: 'PO',
  VERIFICATION: 'Verified',
  FINANCING_REVIEW: 'Review',
  APPROVED: 'Approved',
  FUNDED: 'Funded',
  PROCUREMENT: 'Procurement',
  LOGISTICS: 'Logistics',
  MANUFACTURING: 'Execution',
  DELIVERY: 'Delivery',
  BUYER_ACCEPTANCE: 'Acceptance',
  PAYMENT: 'Payment',
  REPAYMENT: 'Repayment',
  CLOSED: 'Closed',
}

export function LifecycleTrack({ stage }: { stage: TransactionStage }) {
  if (stage === 'CANCELLED') {
    return (
      <div className="rounded border border-ink-200 bg-ink-50 px-4 py-3 text-[13px] font-semibold text-ink-500">
        This transaction has been cancelled.
      </div>
    )
  }

  const current = stageIndex(stage)

  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-[760px] items-start">
        {TRANSACTION_LIFECYCLE.map((step, index) => {
          const done = index < current
          const active = index === current
          return (
            <li key={step} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    'h-px flex-1',
                    index === 0 ? 'bg-transparent' : done || active ? 'bg-ink-900' : 'bg-ink-200',
                  )}
                />
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors',
                    done
                      ? 'border-ink-900 bg-ink-900 text-white'
                      : active
                        ? 'border-accent-500 bg-accent-500 text-white'
                        : 'border-ink-200 bg-white text-ink-300',
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={cn(
                    'h-px flex-1',
                    index === TRANSACTION_LIFECYCLE.length - 1
                      ? 'bg-transparent'
                      : done
                        ? 'bg-ink-900'
                        : 'bg-ink-200',
                  )}
                />
              </div>
              <span
                className={cn(
                  'mt-2 px-1 text-center text-[10.5px] font-semibold leading-tight',
                  active ? 'text-accent-600' : done ? 'text-ink-700' : 'text-ink-300',
                )}
              >
                {SHORT_LABELS[step] ?? humanizeEnum(step)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** The vertical form of the same track, used in narrow columns. */
export function LifecycleList({ stage }: { stage: TransactionStage }) {
  const current = stageIndex(stage)
  return (
    <ol className="space-y-0">
      {TRANSACTION_LIFECYCLE.map((step, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={step} className="relative flex items-center gap-3 py-1.5">
            {index < TRANSACTION_LIFECYCLE.length - 1 ? (
              <span
                className={cn(
                  'absolute left-[9px] top-6 h-full w-px',
                  done ? 'bg-ink-900' : 'bg-ink-200',
                )}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full border-2',
                done
                  ? 'border-ink-900 bg-ink-900'
                  : active
                    ? 'border-accent-500 bg-accent-500'
                    : 'border-ink-200 bg-white',
              )}
            >
              {done ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} /> : null}
            </span>
            <span
              className={cn(
                'text-[13px]',
                active
                  ? 'font-semibold text-accent-600'
                  : done
                    ? 'font-medium text-ink-700'
                    : 'text-ink-300',
              )}
            >
              {humanizeEnum(step)}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
