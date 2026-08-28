import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import type { NextAction } from '@/server/services/next-action'
import { Card, CardBody } from '@/components/ui'

/**
 * The prominent NEXT ACTION panel.
 *
 * Whether the transaction is waiting on you or on somebody else is carried by
 * the colour and the icon before the text is read at all.
 */
export function NextActionCard({ action }: { action: NextAction }) {
  const isYours = action.owner === 'you'

  return (
    <Card className={isYours ? 'border-accent-500/50 bg-accent-50/40' : 'border-ink-200 bg-white'}>
      <CardBody className="flex h-full flex-col p-6">
        <div className="flex items-center gap-2">
          {isYours ? (
            <ArrowRight className="h-4 w-4 text-accent-600" />
          ) : (
            <Clock className="h-4 w-4 text-ink-400" />
          )}
          <p
            className={`text-[11px] font-bold uppercase tracking-[0.11em] ${
              isYours ? 'text-accent-600' : 'text-ink-400'
            }`}
          >
            {isYours
              ? 'Next action — you'
              : `Waiting${action.waitingOn ? ` on ${action.waitingOn}` : ''}`}
          </p>
        </div>

        <h2 className="mt-3 font-serif text-[21px] leading-snug text-ink-900">{action.title}</h2>
        <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-ink-600">
          {action.description}
        </p>

        {action.href ? (
          <Link
            href={action.href}
            className={`mt-5 inline-flex items-center justify-center gap-2 rounded px-4 py-2.5 text-[13.5px] font-semibold transition-colors ${
              isYours
                ? 'bg-accent-500 text-white hover:bg-accent-600'
                : 'bg-ink-100 text-ink-800 hover:bg-ink-200'
            }`}
          >
            Go to this step
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <p className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-ink-400">
            <CheckCircle2 className="h-4 w-4" />
            Nothing for you to do right now
          </p>
        )}
      </CardBody>
    </Card>
  )
}
