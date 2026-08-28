import Link from 'next/link'
import {
  Building2,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LifeBuoy,
  Landmark,
  ScrollText,
  Ship,
  Users,
} from 'lucide-react'
import { signOutAction } from '@/app/actions/auth'
import { Wordmark } from '@/components/marketing/chrome'
import { can, isStaff, type Actor } from '@/lib/rbac'
import { humanizeEnum, initials } from '@/lib/utils'
import { Badge } from '@/components/ui'

/**
 * Application chrome.
 *
 * Navigation is derived from the actor's capabilities, so a supplier never sees
 * an administration link. The server re-checks on every route regardless — the
 * navigation is a convenience, never the control.
 */

interface NavItem {
  href: string
  label: string
  icon: typeof LayoutDashboard
}

function navigationFor(actor: Actor): Array<{ heading?: string; items: NavItem[] }> {
  const primary: NavItem[] = [
    { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/app/transactions', label: 'Transactions', icon: ClipboardList },
  ]
  if (can(actor, 'po:create')) {
    primary.push({ href: '/app/purchase-orders/new', label: 'New purchase order', icon: FileText })
  }
  if (can(actor, 'project:read')) {
    primary.push({ href: '/app/projects', label: 'Projects', icon: FolderKanban })
  }
  if (actor.organizationType === 'FINANCIAL_INSTITUTION' || isStaff(actor)) {
    primary.push({ href: '/app/financing', label: 'Financing', icon: Landmark })
  }
  if (can(actor, 'shipment:manage')) {
    primary.push({ href: '/app/logistics', label: 'Logistics', icon: Ship })
  }

  const organization: NavItem[] = [
    { href: '/app/organization', label: 'My organization', icon: Building2 },
    { href: '/app/documents', label: 'Documents', icon: FileText },
  ]
  if (can(actor, 'analytics:read:program')) {
    organization.push({ href: '/app/analytics', label: 'Programme analytics', icon: ScrollText })
  }

  const sections: Array<{ heading?: string; items: NavItem[] }> = [
    { items: primary },
    { heading: 'Organization', items: organization },
  ]

  if (isStaff(actor)) {
    const admin: NavItem[] = [
      { href: '/app/admin/registrations', label: 'Registrations', icon: LifeBuoy },
      { href: '/app/admin/organizations', label: 'Organizations', icon: Building2 },
      { href: '/app/admin/inquiries', label: 'Inquiries', icon: FileText },
    ]
    if (can(actor, 'user:manage:any')) {
      admin.push({ href: '/app/admin/users', label: 'Users', icon: Users })
    }
    if (can(actor, 'audit:read')) {
      admin.push({ href: '/app/admin/audit', label: 'Audit log', icon: ScrollText })
    }
    sections.push({ heading: 'Administration', items: admin })
  }

  return sections
}

const ROLE_LABELS: Record<string, string> = {
  SUPPLIER: 'Supplier',
  EPC: 'EPC contractor',
  PROJECT_OWNER: 'Project owner',
  FINANCIER: 'Financing partner',
  AI_LOGISTIX_ADMIN: 'AI Logistix — administrator',
  AI_LOGISTIX_OPERATIONS: 'AI Logistix — operations',
  VIEWER: 'Read-only observer',
}

export function AppShell({
  actor,
  isDemoOrganization,
  children,
}: {
  actor: Actor
  isDemoOrganization: boolean
  children: React.ReactNode
}) {
  const sections = navigationFor(actor)

  return (
    <div className="min-h-screen bg-ink-50/50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-ink-200 bg-white">
        <div className="flex items-center justify-between gap-4 px-4 py-2.5 lg:px-6">
          <Wordmark />
          <div className="flex items-center gap-3">
            {isDemoOrganization ? (
              <Badge tone="accent" className="hidden sm:inline-flex">
                Demonstration data
              </Badge>
            ) : null}
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold leading-tight text-ink-900">{actor.name}</p>
              <p className="text-[11.5px] leading-tight text-ink-400">
                {actor.organizationName} · {ROLE_LABELS[actor.role] ?? humanizeEnum(actor.role)}
              </p>
            </div>
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-[12px] font-bold text-white"
              title={actor.email}
            >
              {initials(actor.name)}
            </div>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded px-2.5 py-1.5 text-[13px] font-medium text-ink-500 transition-colors hover:bg-ink-50 hover:text-ink-900"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px]">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-ink-200 bg-white lg:block">
          <nav className="sticky top-[57px] space-y-6 px-3 py-5" aria-label="Application">
            {sections.map((section, index) => (
              <div key={section.heading ?? index}>
                {section.heading ? (
                  <p className="mb-2 px-2.5 text-[10.5px] font-bold uppercase tracking-[0.11em] text-ink-400">
                    {section.heading}
                  </p>
                ) : null}
                <ul className="space-y-0.5">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2.5 rounded px-2.5 py-2 text-[13.5px] font-medium text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
                      >
                        <item.icon className="h-4 w-4 shrink-0 text-ink-400" />
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile navigation */}
        <div className="w-full min-w-0">
          <nav
            className="flex gap-1 overflow-x-auto border-b border-ink-200 bg-white px-3 py-2 lg:hidden"
            aria-label="Application (mobile)"
          >
            {sections
              .flatMap((s) => s.items)
              .map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] font-medium text-ink-600"
                >
                  <item.icon className="h-3.5 w-3.5 text-ink-400" />
                  {item.label}
                </Link>
              ))}
          </nav>
          <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-bold uppercase tracking-[0.11em] text-accent-600">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 font-serif text-[26px] leading-tight text-ink-900 sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-ink-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </div>
  )
}
