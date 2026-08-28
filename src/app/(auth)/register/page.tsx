import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/register-form'
import { currentActor } from '@/lib/session'
import { Card, CardBody } from '@/components/ui'

export const metadata = { title: 'Register' }

export default async function RegisterPage() {
  if (await currentActor()) redirect('/app')

  return (
    <div className="w-full sm:max-w-xl">
      <Card>
        <CardBody className="p-7 sm:p-8">
          <h1 className="font-serif text-[26px] leading-tight text-ink-900">
            Register your organization
          </h1>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-500">
            Suppliers, EPC contractors, project owners and financial institutions can request
            access to MConnect.
          </p>
          <div className="mt-6">
            <RegisterForm />
          </div>
          <p className="mt-6 border-t border-ink-100 pt-5 text-[13px] text-ink-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-accent-600 hover:text-accent-700">
              Sign in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
