import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Public-site chrome.
 *
 * The wordmark is set in the serif face against the deep navy; the AI Logistix
 * orange appears once, as a rule under the mark. The intent is a platform that
 * reads as institutional infrastructure rather than as a freight brochure.
 */

const NAV = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/local-content', label: 'Local content' },
  { href: '/financial-structure', label: 'Financial structure' },
  { href: '/why-mconnect', label: 'Why MConnect' },
  { href: '/contact', label: 'Contact' },
]

export function Wordmark({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="group inline-flex flex-col leading-none">
      <span
        className={cn(
          'font-serif text-[21px] font-semibold tracking-tight',
          inverted ? 'text-white' : 'text-ink-900',
        )}
      >
        MConnect
      </span>
      <span className="mt-1 h-[2px] w-7 bg-accent-500 transition-all group-hover:w-12" />
      <span
        className={cn(
          'mt-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em]',
          inverted ? 'text-ink-300' : 'text-ink-400',
        )}
      >
        Powered by AI Logistix
      </span>
    </Link>
  )
}

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 lg:px-8">
        <Wordmark />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13.5px] font-medium text-ink-600 transition-colors hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded px-3 py-2 text-[13.5px] font-semibold text-ink-700 transition-colors hover:bg-ink-50"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded bg-ink-900 px-4 py-2 text-[13.5px] font-semibold text-white transition-colors hover:bg-ink-800"
          >
            Register
          </Link>
        </div>
      </div>
      <nav
        className="flex gap-5 overflow-x-auto border-t border-ink-100 px-5 py-2 lg:hidden"
        aria-label="Main (mobile)"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap text-[13px] font-medium text-ink-600"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

/**
 * The financing disclaimer is rendered on every public page. It states plainly
 * that MConnect is not the lender and that naming a potential participant is
 * not a claim of participation.
 */
export function Disclosure() {
  return (
    <section className="border-t border-ink-800 bg-ink-950 py-10">
      <div className="mx-auto max-w-6xl px-5 lg:px-8">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
          Important disclosure
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <p className="text-[12.5px] leading-[1.75] text-ink-300">
            MConnect is a supply-chain coordination and transaction-management platform. Financing
            availability is subject to independent review and approval by participating financial
            institutions. Submission of a purchase order or financing request does not constitute an
            offer or commitment to provide financing.
          </p>
          <p className="text-[12.5px] leading-[1.75] text-ink-300">
            References to potential government agencies, development-finance institutions, banks,
            project owners, or EPC contractors describe potential platform participants or financing
            structures and do not imply endorsement or participation unless expressly stated.
            AI Logistix is not a bank, a licensed lender, or a representative of any government
            agency or project operator.
          </p>
        </div>
      </div>
    </section>
  )
}

export function PublicFooter() {
  return (
    <>
      <Disclosure />
      <footer className="bg-ink-950 pb-12 pt-10">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="grid gap-8 border-t border-ink-800 pt-9 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Wordmark inverted />
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-ink-400">
                Connecting global procurement with local capability through a controlled,
                purchase-order-based workflow.
              </p>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Platform
              </h3>
              <ul className="mt-3 space-y-2">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-[13px] text-ink-300 transition-colors hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">
                Access
              </h3>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/login" className="text-[13px] text-ink-300 hover:text-white">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link href="/register" className="text-[13px] text-ink-300 hover:text-white">
                    Register an organization
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="text-[13px] text-ink-300 hover:text-white">
                    Programme inquiry
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <p className="mt-9 border-t border-ink-800 pt-6 text-[12px] text-ink-500">
            © {new Date().getFullYear()} AI Logistix. MConnect is a platform operated by
            AI Logistix.
          </p>
        </div>
      </footer>
    </>
  )
}

export function PageHero({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string
  title: string
  lead?: string
}) {
  return (
    <section className="border-b border-ink-100 bg-ink-50/60">
      <div className="mx-auto max-w-6xl px-5 py-14 lg:px-8 lg:py-20">
        <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent-600">
          {eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl font-serif text-[34px] leading-[1.12] text-ink-900 sm:text-[44px]">
          {title}
        </h1>
        {lead ? (
          <p className="mt-5 max-w-2xl text-[17px] leading-[1.65] text-ink-600">{lead}</p>
        ) : null}
      </div>
    </section>
  )
}
