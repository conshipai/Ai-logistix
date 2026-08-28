'use client'

import { useActionState, useState } from 'react'
import type { FormState } from '@/app/actions/public'
import { Alert, Button, type ButtonProps } from '@/components/ui'

const INITIAL: FormState = { ok: false }

type ServerAction = (state: FormState, formData: FormData) => Promise<FormState>

/**
 * A form bound to a server action, with the action's result rendered inline.
 *
 * Every mutation in the application goes through one of these, so success and
 * failure are reported consistently and a failed authorization check reads as a
 * plain message rather than an error page.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  submitVariant = 'primary',
  submitSize,
  className,
  resetOnSuccess = false,
  successMessage,
  footer,
}: {
  action: ServerAction
  children: React.ReactNode | ((state: FormState) => React.ReactNode)
  submitLabel: string
  pendingLabel?: string
  submitVariant?: ButtonProps['variant']
  submitSize?: ButtonProps['size']
  className?: string
  resetOnSuccess?: boolean
  successMessage?: string
  footer?: React.ReactNode
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL)
  const [key, setKey] = useState(0)

  // Clearing the form after a successful add keeps repeated entry quick.
  if (resetOnSuccess && state.ok && key === 0) {
    queueMicrotask(() => setKey(1))
  }

  return (
    <form key={key} action={formAction} className={className}>
      {state.ok && (successMessage || state.message) ? (
        <Alert tone="positive" className="mb-4">
          {successMessage ?? state.message}
        </Alert>
      ) : null}
      {!state.ok && state.message ? (
        <Alert tone="critical" className="mb-4">
          {state.message}
        </Alert>
      ) : null}
      {!state.ok && state.errors?._form ? (
        <Alert tone="critical" className="mb-4">
          {state.errors._form.join(' ')}
        </Alert>
      ) : null}

      {typeof children === 'function' ? children(state) : children}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} variant={submitVariant} size={submitSize}>
          {pending ? (pendingLabel ?? 'Working…') : submitLabel}
        </Button>
        {footer}
      </div>
    </form>
  )
}

/**
 * A single-button form for a state change that needs no additional input —
 * marking a milestone complete, authorizing a disbursement, submitting a draft.
 */
export function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  variant = 'outline',
  size = 'sm',
  confirm,
  className,
}: {
  action: ServerAction
  fields: Record<string, string>
  label: string
  pendingLabel?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  confirm?: string
  className?: string
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL)

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault()
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Button type="submit" disabled={pending} variant={variant} size={size}>
        {pending ? (pendingLabel ?? 'Working…') : label}
      </Button>
      {!state.ok && state.message ? (
        <p className="mt-1.5 text-[12px] font-medium text-critical-600">{state.message}</p>
      ) : null}
    </form>
  )
}

/** An inline select that submits its enclosing form the moment it changes. */
export function StatusSelect({
  action,
  fields,
  name,
  value,
  options,
  ariaLabel,
}: {
  action: ServerAction
  fields: Record<string, string>
  name: string
  value: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
  ariaLabel: string
}) {
  const [state, formAction, pending] = useActionState(action, INITIAL)

  return (
    <form action={formAction}>
      {Object.entries(fields).map(([field, fieldValue]) => (
        <input key={field} type="hidden" name={field} value={fieldValue} />
      ))}
      <select
        name={name}
        defaultValue={value}
        aria-label={ariaLabel}
        disabled={pending}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded border border-ink-200 bg-white px-2 py-1 text-[12.5px] font-medium text-ink-800 focus:border-ink-500 focus:outline-none focus:ring-1 focus:ring-ink-500 disabled:opacity-50"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
      {!state.ok && state.message ? (
        <p className="mt-1 max-w-[220px] text-[11.5px] font-medium text-critical-600">
          {state.message}
        </p>
      ) : null}
    </form>
  )
}
