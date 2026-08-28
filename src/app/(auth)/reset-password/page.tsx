import Link from 'next/link'
import { ResetPasswordForm } from '@/components/auth/reset-forms'
import { Alert, Card, CardBody } from '@/components/ui'

export const metadata = { title: 'Set a new password' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  return (
    <Card>
      <CardBody className="p-7 sm:p-8">
        <h1 className="font-serif text-[26px] leading-tight text-ink-900">Set a new password</h1>
        {token ? (
          <>
            <p className="mt-1.5 text-[13.5px] text-ink-500">
              Choose a password you do not use anywhere else.
            </p>
            <div className="mt-6">
              <ResetPasswordForm token={token} />
            </div>
          </>
        ) : (
          <div className="mt-5 space-y-5">
            <Alert tone="critical">
              This password reset link is missing or malformed. Please request a new one.
            </Alert>
            <Link
              href="/forgot-password"
              className="text-[13.5px] font-semibold text-accent-600"
            >
              Request a new reset link
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
