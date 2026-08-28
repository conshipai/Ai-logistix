import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The MConnect component set.
 *
 * Deliberately small and hand-rolled on plain elements: server-rendered by
 * default, no client-side runtime, and no dependency on a component framework
 * that would have to be upgraded in lockstep with Next.
 */

// --- Button -----------------------------------------------------------------

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-500 focus-visible:ring-offset-2 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-ink-900 text-white hover:bg-ink-800',
        accent: 'bg-accent-500 text-white hover:bg-accent-600',
        secondary: 'bg-ink-100 text-ink-900 hover:bg-ink-200',
        outline: 'border border-ink-200 bg-white text-ink-800 hover:bg-ink-50',
        ghost: 'text-ink-700 hover:bg-ink-50',
        danger: 'bg-critical-600 text-white hover:bg-critical-700',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-[15px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export function ButtonLink({
  className,
  variant,
  size,
  href,
  ...props
}: React.ComponentProps<typeof Link> & VariantProps<typeof buttonVariants>) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
}

// --- Surfaces ---------------------------------------------------------------

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg border border-ink-200/80 bg-white shadow-card', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('border-b border-ink-100 px-5 py-4', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-[13px] font-bold uppercase tracking-[0.09em] text-ink-500', className)}
      {...props}
    />
  )
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('border-t border-ink-100 bg-ink-50/60 px-5 py-3', className)} {...props} />
  )
}

// --- Badge ------------------------------------------------------------------

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-ink-100 text-ink-700',
        info: 'bg-ink-900 text-white',
        positive: 'bg-positive-50 text-positive-700 ring-1 ring-inset ring-positive-500/25',
        caution: 'bg-caution-50 text-caution-700 ring-1 ring-inset ring-caution-500/25',
        critical: 'bg-critical-50 text-critical-700 ring-1 ring-inset ring-critical-500/25',
        accent: 'bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-500/25',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

// --- Form controls ----------------------------------------------------------

const fieldClasses =
  'block w-full rounded border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-ink-500 focus:outline-none focus:ring-1 focus:ring-ink-500 disabled:bg-ink-50 disabled:text-ink-400'

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} {...props} />
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldClasses, 'min-h-[90px] resize-y', className)} {...props} />
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClasses, 'pr-8', className)} {...props} />
}

export function Checkbox({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 rounded border-ink-300 text-ink-900 focus:ring-ink-500',
        className,
      )}
      {...props}
    />
  )
}

export function Label({
  className,
  required,
  hint,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean; hint?: string }) {
  return (
    <label className={cn('block text-[13px] font-semibold text-ink-800', className)} {...props}>
      {children}
      {required ? <span className="ml-0.5 text-accent-600">*</span> : null}
      {hint ? <span className="ml-1.5 font-normal text-ink-400">{hint}</span> : null}
    </label>
  )
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  help,
  children,
  className,
}: {
  label: string
  htmlFor?: string
  required?: boolean
  hint?: string
  error?: string[] | string
  help?: string
  children: React.ReactNode
  className?: string
}) {
  const messages = Array.isArray(error) ? error : error ? [error] : []
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor} required={required} hint={hint}>
        {label}
      </Label>
      {children}
      {help && messages.length === 0 ? (
        <p className="text-[12px] leading-snug text-ink-400">{help}</p>
      ) : null}
      {messages.map((message) => (
        <p key={message} className="text-[12px] font-medium text-critical-600">
          {message}
        </p>
      ))}
    </div>
  )
}

// --- Feedback ---------------------------------------------------------------

export function Alert({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'positive' | 'caution' | 'critical'
  title?: string
  children?: React.ReactNode
  className?: string
}) {
  const tones = {
    info: 'border-ink-200 bg-ink-50 text-ink-800',
    positive: 'border-positive-500/30 bg-positive-50 text-positive-700',
    caution: 'border-caution-500/30 bg-caution-50 text-caution-700',
    critical: 'border-critical-500/30 bg-critical-50 text-critical-700',
  }
  return (
    <div className={cn('rounded border px-4 py-3 text-sm leading-relaxed', tones[tone], className)}>
      {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
      {children}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-ink-400">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}

// --- Data display -----------------------------------------------------------

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn('w-full min-w-[640px] text-left text-sm', className)} {...props} />
    </div>
  )
}

export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'border-b border-ink-200 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.07em] text-ink-500',
        className,
      )}
      {...props}
    />
  )
}

export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn('border-b border-ink-100 px-4 py-3 align-middle text-ink-800', className)} {...props} />
  )
}

export function DefinitionList({
  items,
  columns = 2,
  className,
}: {
  items: Array<{ term: string; value: React.ReactNode }>
  columns?: 1 | 2 | 3
  className?: string
}) {
  const grid = { 1: 'sm:grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3' }
  return (
    <dl className={cn('grid grid-cols-1 gap-x-6 gap-y-4', grid[columns], className)}>
      {items.map((item) => (
        <div key={item.term}>
          <dt className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">
            {item.term}
          </dt>
          <dd className="mt-0.5 text-sm text-ink-900">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Metric({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'default' | 'accent' | 'muted'
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-ink-400">{label}</p>
      <p
        className={cn(
          'tabular mt-1 text-2xl font-semibold leading-tight',
          tone === 'accent' ? 'text-accent-600' : tone === 'muted' ? 'text-ink-400' : 'text-ink-900',
        )}
      >
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-[12px] text-ink-400">{sub}</p> : null}
    </div>
  )
}

export function ProgressBar({
  value,
  label,
  tone = 'default',
}: {
  value: number | null
  label?: string
  tone?: 'default' | 'accent' | 'positive'
}) {
  const tones = {
    default: 'bg-ink-700',
    accent: 'bg-accent-500',
    positive: 'bg-positive-500',
  }
  return (
    <div>
      {label ? (
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <span className="text-[12px] font-medium text-ink-600">{label}</span>
          <span className="tabular text-[12px] font-semibold text-ink-500">
            {value === null ? 'No data' : `${value}%`}
          </span>
        </div>
      ) : null}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          className={cn('h-full rounded-full transition-all', tones[tone])}
          style={{ width: `${Math.min(100, Math.max(0, value ?? 0))}%` }}
        />
      </div>
    </div>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn('max-w-2xl', className)}>
      {eyebrow ? (
        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-accent-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 font-serif text-[26px] leading-tight text-ink-900 sm:text-[32px]">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">{description}</p>
      ) : null}
    </div>
  )
}
