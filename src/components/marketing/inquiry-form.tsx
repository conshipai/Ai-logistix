'use client'

import { useActionState } from 'react'
import type { InquiryType } from '@prisma/client'
import { submitInquiry, type FormState } from '@/app/actions/public'
import { COUNTRY_OPTIONS } from '@/lib/countries'
import { Alert, Button, Field, Input, Select, Textarea } from '@/components/ui'

const INITIAL: FormState = { ok: false }

export function InquiryForm({ type }: { type: InquiryType }) {
  const [state, action, pending] = useActionState(submitInquiry, INITIAL)

  if (state.ok) {
    return (
      <Alert tone="positive" title="Inquiry received">
        {state.message}
      </Alert>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="type" value={type} />
      {/* Honeypot: hidden from people, tempting to bots. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="hidden"
      />

      {state.message ? <Alert tone="critical">{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor={`${type}-name`} required error={state.errors?.name}>
          <Input id={`${type}-name`} name="name" autoComplete="name" required maxLength={120} />
        </Field>
        <Field label="Work email" htmlFor={`${type}-email`} required error={state.errors?.email}>
          <Input
            id={`${type}-email`}
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" htmlFor={`${type}-company`} required error={state.errors?.company}>
          <Input
            id={`${type}-company`}
            name="company"
            autoComplete="organization"
            required
            maxLength={200}
          />
        </Field>
        <Field label="Job title" htmlFor={`${type}-title`} error={state.errors?.jobTitle}>
          <Input
            id={`${type}-title`}
            name="jobTitle"
            autoComplete="organization-title"
            maxLength={120}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country" htmlFor={`${type}-country`} required error={state.errors?.country}>
          <Select id={`${type}-country`} name="country" required defaultValue="">
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
        <Field label="Phone" htmlFor={`${type}-phone`} error={state.errors?.phone}>
          <Input id={`${type}-phone`} name="phone" type="tel" autoComplete="tel" maxLength={40} />
        </Field>
      </div>

      <Field
        label="How can we help?"
        htmlFor={`${type}-message`}
        required
        error={state.errors?.message}
      >
        <Textarea id={`${type}-message`} name="message" required rows={5} maxLength={4000} />
      </Field>

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? 'Sending…' : 'Submit inquiry'}
      </Button>
    </form>
  )
}
