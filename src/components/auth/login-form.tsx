'use client'

import { useActionState } from 'react'
import { signInAction } from '@/app/actions/auth'
import type { FormState } from '@/app/actions/public'
import { Alert, Button, Field, Input } from '@/components/ui'

const INITIAL: FormState = { ok: false }

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState(signInAction, INITIAL)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo ?? '/app'} />
      {state.message ? <Alert tone="critical">{state.message}</Alert> : null}

      <Field label="Work email" htmlFor="email" required>
        <Input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
