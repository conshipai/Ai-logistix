import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { currentActor } from '@/lib/session'
import { Alert, Card, CardBody } from '@/components/ui'

export const metadata = { title: 'Sign in' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; registered?: string; verified?: string; reset?: string }>
}) {
  if (await currentActor()) redirect('/app')
  const params = await searchParams

  return (
    <Card>
      <CardBody className="p-7 sm:p-8">
        <h1 className="font-serif text-[26px] leading-tight text-ink-900">Sign in to MConnect</h1>
        <p className="mt-1.5 text-[13.5px] text-ink-500">
          Access is restricted to approved organizations.
        </p>

        {params.registered ? (
          <Alert tone="positive" className="mt-5">
            Registration received. Your account will be activated once AI Logistix has reviewed it.
          </Alert>
        ) : null}
        {params.verified ? (
          <Alert tone="positive" className="mt-5">
            Your email address has been confirmed.
          </Alert>
        ) : null}
        {params.reset ? (
          <Alert tone="positive" className="mt-5">
            Your password has been reset. Sign in with your new password.
          </Alert>
        ) : null}

        <div className="mt-6">
          <LoginForm redirectTo={params.redirectTo} />
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-5 text-[13px]">
          <Link href="/forgot-password" className="font-medium text-ink-600 hover:text-ink-900">
            Forgot your password?
          </Link>
          <Link href="/register" className="font-semibold text-accent-600 hover:text-accent-700">
            Register an organization
          </Link>
        </div>
      </CardBody>
    </Card>
  )
}
