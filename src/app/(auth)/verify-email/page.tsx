import Link from 'next/link'
import { verifyEmail } from '@/server/services/registration'
import { Alert, Card, CardBody } from '@/components/ui'

export const metadata = { title: 'Confirm your email address' }

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const verified = token ? await verifyEmail(token) : false

  return (
    <Card>
      <CardBody className="p-7 sm:p-8">
        <h1 className="font-serif text-[26px] leading-tight text-ink-900">
          {verified ? 'Email address confirmed' : 'Confirmation failed'}
        </h1>
        <div className="mt-5">
          {verified ? (
            <Alert tone="positive">
              Thank you. Your email address is confirmed. Your registration is now with AI Logistix
              for review — you will be emailed when your account is activated.
            </Alert>
          ) : (
            <Alert tone="critical">
              This confirmation link is invalid, has already been used, or has expired. Links are
              valid for 48 hours. Contact AI Logistix if you need a new one.
            </Alert>
          )}
        </div>
        <Link href="/login" className="mt-6 inline-block text-[13.5px] font-semibold text-accent-600">
          Continue to sign in
        </Link>
      </CardBody>
    </Card>
  )
}
