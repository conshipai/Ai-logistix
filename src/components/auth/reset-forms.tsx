'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import {
  requestPasswordResetAction,
  resetPasswordAction,
  type FormState,
} from '@/app/actions/public'
import { Alert, Button, Field, Input } from '@/components/ui'

const INITIAL: FormState = { ok: false }

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, INITIAL)

  if (state.ok) {
    return (
      <div className="space-y-5">
        <Alert tone="positive" title="Check your email">
          {state.message}
        </Alert>
        <Link href="/login" className="text-[13.5px] font-semibold text-accent-600">
          Return to sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      {state.message ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field label="Work email" htmlFor="email" required error={state.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? 'Sending…' : 'Send reset link'}
      </Button>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, INITIAL)

  if (state.ok) {
    return (
      <div className="space-y-5">
        <Alert tone="positive" title="Password reset">
          {state.message}
        </Alert>
        <Link href="/login?reset=1" className="text-[13.5px] font-semibold text-accent-600">
          Continue to sign in
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.message ? <Alert tone="critical">{state.message}</Alert> : null}
      <Field
        label="New password"
        htmlFor="password"
        required
        error={state.errors?.password}
        help="At least 12 characters, with upper and lower case and a digit."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          autoFocus
        />
      </Field>
      <Field
        label="Confirm new password"
        htmlFor="confirmPassword"
        required
        error={state.errors?.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  )
}
