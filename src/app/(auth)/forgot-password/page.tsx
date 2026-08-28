import { ForgotPasswordForm } from '@/components/auth/reset-forms'
import { Card, CardBody } from '@/components/ui'

export const metadata = { title: 'Reset your password' }

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardBody className="p-7 sm:p-8">
        <h1 className="font-serif text-[26px] leading-tight text-ink-900">Reset your password</h1>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">
          Enter your work email address and we will send you a link to set a new password.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
      </CardBody>
    </Card>
  )
}
