'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { submitRegistration, type FormState } from '@/app/actions/public'
import { COUNTRY_OPTIONS } from '@/lib/countries'
import { Alert, Button, Field, Input, Select, Textarea } from '@/components/ui'

const INITIAL: FormState = { ok: false }

const ORGANIZATION_TYPES = [
  { value: 'SUPPLIER', label: 'Supplier' },
  { value: 'EPC', label: 'EPC / contractor' },
  { value: 'PROJECT_OWNER', label: 'Project owner / operator' },
  { value: 'FINANCIAL_INSTITUTION', label: 'Financial institution' },
]

export function RegisterForm() {
  const [state, action, pending] = useActionState(submitRegistration, INITIAL)

  if (state.ok) {
    return (
      <div className="space-y-5">
        <Alert tone="positive" title="Registration received">
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
      {state.errors?._form ? <Alert tone="critical">{state.errors._form.join(' ')}</Alert> : null}

      <Field label="Full name" htmlFor="name" required error={state.errors?.name}>
        <Input id="name" name="name" autoComplete="name" required maxLength={120} />
      </Field>

      <Field
        label="Work email"
        htmlFor="email"
        required
        error={state.errors?.email}
        help="Use your company email address. Personal and disposable addresses are not accepted."
      >
        <Input id="email" name="email" type="email" autoComplete="username" required maxLength={254} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor="companyName" required error={state.errors?.companyName}>
          <Input
            id="companyName"
            name="companyName"
            autoComplete="organization"
            required
            maxLength={200}
          />
        </Field>
        <Field label="Job title" htmlFor="jobTitle" error={state.errors?.jobTitle}>
          <Input id="jobTitle" name="jobTitle" autoComplete="organization-title" maxLength={120} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Organization type"
          htmlFor="organizationType"
          required
          error={state.errors?.organizationType}
        >
          <Select id="organizationType" name="organizationType" required defaultValue="">
            <option value="" disabled>
              Select a type
            </option>
            {ORGANIZATION_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Country" htmlFor="country" required error={state.errors?.country}>
          <Select id="country" name="country" required defaultValue="">
            <option value="" disabled>
              Select a country
            </option>
            {COUNTRY_OPTIONS.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Phone" htmlFor="phone" error={state.errors?.phone}>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={40} />
      </Field>

      <Field
        label="Reason for registration"
        htmlFor="reason"
        required
        error={state.errors?.reason}
        help="Tell us briefly what your organization does and what you want to use MConnect for."
      >
        <Textarea id="reason" name="reason" required rows={4} maxLength={2000} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Password"
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
          />
        </Field>
        <Field
          label="Confirm password"
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
      </div>

      <Alert tone="info">
        Registering does not grant access. AI Logistix reviews every registration and will activate
        your account once your organization has been confirmed.
      </Alert>

      <Button type="submit" disabled={pending} className="w-full" size="lg">
        {pending ? 'Submitting…' : 'Submit registration'}
      </Button>
    </form>
  )
}
