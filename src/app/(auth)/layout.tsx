import Link from 'next/link'
import { Wordmark } from '@/components/marketing/chrome'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-50/60">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 lg:px-8">
          <Wordmark />
          <Link href="/" className="text-[13.5px] font-medium text-ink-500 hover:text-ink-900">
            Back to site
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-5 py-10 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-ink-100 bg-white py-5">
        <p className="mx-auto max-w-md px-5 text-center text-[11.5px] leading-relaxed text-ink-400">
          MConnect is a supply-chain coordination and transaction-management platform. Financing
          availability is subject to independent review and approval by participating financial
          institutions.
        </p>
      </footer>
    </div>
  )
}
