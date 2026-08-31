import { cn } from '@/lib/utils'

/**
 * Prospectus-style panels.
 *
 * The public site is read by ministries, development-finance institutions,
 * EPC executives and commercial banks, so it borrows the visual grammar of a
 * programme prospectus rather than a product marketing page: numbered sections,
 * dense panels, rules under headings, and figures set in tabular numerals.
 *
 * Nothing here renders a number the platform has not measured. Where a deck
 * would show a projection, these components show what is *measured* and where
 * it comes from — see `MeasurementGrid`.
 */

export function SectionNumber({ n }: { n: string }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-ink-900 text-[12px] font-bold tabular-nums text-white">
      {n}
    </span>
  )
}

export function PanelHeading({
  n,
  title,
  lead,
  className,
}: {
  n: string
  title: string
  lead?: string
  className?: string
}) {
  return (
    <div className={cn('max-w-3xl', className)}>
      <div className="flex items-center gap-3">
        <SectionNumber n={n} />
        <h2 className="text-[13px] font-bold uppercase tracking-[0.13em] text-ink-900">{title}</h2>
      </div>
      <div className="mt-3 h-[3px] w-16 bg-accent-500" />
      {lead ? (
        <p className="mt-5 text-[16px] leading-[1.65] text-ink-600">{lead}</p>
      ) : null}
    </div>
  )
}

/** The four-across credential strip used beneath the hero. */
export function CredentialStrip({
  items,
}: {
  items: Array<{ icon: React.ReactNode; label: string }>
}) {
  return (
    <div className="grid grid-cols-2 divide-ink-800 border-t border-ink-800 sm:grid-cols-4 sm:divide-x">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 px-5 py-4">
          <span className="text-accent-400">{item.icon}</span>
          <span className="text-[11.5px] font-semibold uppercase leading-tight tracking-[0.07em] text-ink-200">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/** Icon-led pillar card, five across on wide screens. */
export function Pillar({
  icon,
  title,
  body,
  tone = 'ink',
}: {
  icon: React.ReactNode
  title: string
  body: string
  tone?: 'ink' | 'accent'
}) {
  return (
    <div className="flex flex-col border-t-2 border-ink-900 bg-white p-5">
      <span
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full',
          tone === 'accent' ? 'bg-accent-500 text-white' : 'bg-ink-900 text-white',
        )}
      >
        {icon}
      </span>
      <h3 className="mt-4 text-[14px] font-bold uppercase leading-snug tracking-[0.05em] text-ink-900">
        {title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.65] text-ink-600">{body}</p>
    </div>
  )
}

/**
 * The transaction structure, as a table.
 *
 * Deliberately names *categories* of provider rather than institutions. Naming
 * a specific bank or development-finance institution here would assert a
 * relationship that does not exist until it is signed.
 */
export function StructureTable({
  rows,
}: {
  rows: Array<{ party: string; role: string; instrument: string; provides: string }>
}) {
  return (
    <div className="overflow-x-auto border border-ink-200">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="bg-ink-900 text-white">
            {['Party', 'Role', 'Instrument', 'Provides'].map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.09em]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.party} className={index % 2 ? 'bg-ink-50/60' : 'bg-white'}>
              <td className="border-t border-ink-100 px-4 py-3 text-[13.5px] font-semibold text-ink-900">
                {row.party}
              </td>
              <td className="border-t border-ink-100 px-4 py-3 text-[13px] text-ink-600">
                {row.role}
              </td>
              <td className="border-t border-ink-100 px-4 py-3 text-[13px] text-ink-600">
                {row.instrument}
              </td>
              <td className="border-t border-ink-100 px-4 py-3 text-[13px] text-ink-600">
                {row.provides}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * What the platform measures.
 *
 * A prospectus would put projected impact figures here. MConnect reports only
 * what it has recorded, so this shows the measurement framework and says
 * plainly where each figure comes from. No value is asserted until there are
 * transactions to derive it from.
 */
export function MeasurementGrid({
  groups,
}: {
  groups: Array<{ heading: string; metrics: string[] }>
}) {
  return (
    <div className="grid gap-px border border-ink-200 bg-ink-200 sm:grid-cols-2 lg:grid-cols-4">
      {groups.map((group) => (
        <div key={group.heading} className="bg-white p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-accent-600">
            {group.heading}
          </p>
          <ul className="mt-3 space-y-2">
            {group.metrics.map((metric) => (
              <li key={metric} className="flex gap-2.5 text-[13px] leading-snug text-ink-700">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-400" />
                {metric}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Dark banner used to close a page. */
export function ClosingBanner({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden bg-ink-950">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(#476296 1px, transparent 1px), linear-gradient(90deg, #476296 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 lg:flex-row lg:items-center lg:px-8 lg:py-20">
        <div className="max-w-xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-accent-400">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-serif text-[30px] leading-[1.15] text-white sm:text-[38px]">
            {title}
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-300">{body}</p>
        </div>
        {children ? <div className="flex shrink-0 flex-wrap gap-3">{children}</div> : null}
      </div>
    </section>
  )
}
