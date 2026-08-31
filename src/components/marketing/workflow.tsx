import { cn } from '@/lib/utils'

/**
 * The eight-step public workflow graphic.
 *
 * Rendered as inline SVG on wide screens and as a stacked list on narrow ones,
 * so the sequence is legible on a phone without a horizontal scroll.
 */

export const WORKFLOW_STEPS = [
  { n: 1, label: 'Purchase Order', detail: 'A supplier receives an order from an operator or EPC contractor.' },
  { n: 2, label: 'Verification', detail: 'The buyer confirms the order value, terms and that it remains active.' },
  { n: 3, label: 'Financing Review', detail: 'AI Logistix reviews the file; a financing partner assesses the request.' },
  { n: 4, label: 'Procurement', detail: 'Materials and components are sourced against an agreed plan.' },
  { n: 5, label: 'Logistics', detail: 'Freight, customs and delivery are coordinated and tracked.' },
  { n: 6, label: 'Delivery', detail: 'Goods or services are delivered to the buyer.' },
  { n: 7, label: 'Payment', detail: 'The buyer accepts and pays against the supplier invoice.' },
  { n: 8, label: 'Facility Repaid', detail: 'The financing institution is repaid and the transaction closes.' },
]

export function WorkflowGraphic({ className }: { className?: string }) {
  return (
    <div className={cn('w-full', className)}>
      {/* Wide: a single continuous track. */}
      <div className="hidden lg:block">
        <svg
          viewBox="0 0 1120 132"
          className="w-full"
          role="img"
          aria-label="MConnect workflow: purchase order, verification, financing review, procurement, logistics, delivery, payment, facility repaid."
        >
          <line x1="82" y1="42" x2="1038" y2="42" stroke="#c6d2e4" strokeWidth="2" />
          {WORKFLOW_STEPS.map((step, index) => {
            const x = 82 + (index * (1038 - 82)) / (WORKFLOW_STEPS.length - 1)
            const isLast = index === WORKFLOW_STEPS.length - 1
            return (
              <g key={step.n}>
                <circle
                  cx={x}
                  cy={42}
                  r={15}
                  fill={isLast ? '#0f9d6e' : index === 0 ? '#f26522' : '#101b30'}
                />
                <text
                  x={x}
                  y={47}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="13"
                  fontWeight="700"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {step.n}
                </text>
                <text
                  x={x}
                  y={78}
                  textAnchor="middle"
                  fill="#101b30"
                  fontSize="12.5"
                  fontWeight="600"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  {step.label}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="mt-3 grid grid-cols-8 gap-3">
          {WORKFLOW_STEPS.map((step) => (
            <p key={step.n} className="text-center text-[11.5px] leading-snug text-ink-500">
              {step.detail}
            </p>
          ))}
        </div>
      </div>

      {/* Narrow: a stacked, numbered sequence. */}
      <ol className="space-y-0 lg:hidden">
        {WORKFLOW_STEPS.map((step, index) => (
          <li key={step.n} className="relative flex gap-4 pb-6 last:pb-0">
            {index < WORKFLOW_STEPS.length - 1 ? (
              <span className="absolute left-[15px] top-8 h-full w-px bg-ink-200" aria-hidden />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white',
                index === 0
                  ? 'bg-accent-500'
                  : index === WORKFLOW_STEPS.length - 1
                    ? 'bg-positive-500'
                    : 'bg-ink-900',
              )}
            >
              {step.n}
            </span>
            <div className="pt-0.5">
              <p className="text-[14px] font-semibold text-ink-900">{step.label}</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-ink-500">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * The financial-structure diagram from the brief: who contracts with whom, and
 * where MConnect and AI Logistix sit relative to the flow of goods and funds.
 */
export function FinancialStructureDiagram() {
  const boxes = [
    { id: 'owner', x: 40, y: 20, w: 220, h: 62, title: 'Project owner / EPC', sub: 'Issues the purchase order', tone: 'dark' },
    { id: 'supplier', x: 40, y: 168, w: 220, h: 62, title: 'Local supplier', sub: 'Manufacturing / services', tone: 'dark' },
    { id: 'mconnect', x: 340, y: 94, w: 240, h: 76, title: 'MConnect / AI Logistix', sub: 'Transaction oversight, logistics and documentation', tone: 'accent' },
    { id: 'financier', x: 660, y: 20, w: 240, h: 62, title: 'Financing institution', sub: 'Controlled working capital', tone: 'light' },
    { id: 'vendor', x: 660, y: 168, w: 240, h: 62, title: 'Raw material vendor', sub: 'Materials and components', tone: 'light' },
  ]

  const fills: Record<string, { bg: string; title: string; sub: string; stroke: string }> = {
    dark: { bg: '#101b30', title: '#ffffff', sub: '#9aaecd', stroke: '#101b30' },
    accent: { bg: '#f26522', title: '#ffffff', sub: '#ffe5d4', stroke: '#d94e0f' },
    light: { bg: '#ffffff', title: '#101b30', sub: '#476296', stroke: '#c6d2e4' },
  }

  return (
    <figure className="w-full overflow-x-auto">
      <svg
        viewBox="0 0 940 300"
        className="w-full min-w-[680px]"
        role="img"
        aria-label="Financial structure: the project owner or EPC issues a verified purchase order to the local supplier. MConnect and AI Logistix provide transaction oversight, logistics and documentation. A financing institution provides controlled working capital, which pays raw material vendors. The supplier manufactures and delivers, and the project owner accepts and pays."
      >
        {/* Connections drawn first so the boxes sit above them. */}
        <g stroke="#9aaecd" strokeWidth="1.5" fill="none">
          <path d="M150 82 L150 168" markerEnd="url(#arrow)" />
          <path d="M260 51 L340 110" markerEnd="url(#arrow)" />
          <path d="M260 199 L340 154" markerEnd="url(#arrow)" />
          <path d="M580 120 L660 61" markerEnd="url(#arrow)" />
          <path d="M580 145 L660 190" markerEnd="url(#arrow)" />
          <path d="M780 82 L780 168" strokeDasharray="4 4" markerEnd="url(#arrow)" />
        </g>

        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#9aaecd" />
          </marker>
        </defs>

        {/* Edge labels. */}
        <g fontFamily="ui-sans-serif, system-ui, sans-serif" fontSize="10.5" fill="#476296" fontWeight="600">
          <text x="158" y="128">Verified PO</text>
          <text x="266" y="88">Acceptance</text>
          <text x="266" y="184">Delivery</text>
          <text x="588" y="104">Funding request</text>
          <text x="588" y="176">Vendor payment</text>
          <text x="788" y="128">Materials</text>
        </g>

        {boxes.map((box) => {
          const fill = fills[box.tone]!
          return (
            <g key={box.id}>
              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                rx={6}
                fill={fill.bg}
                stroke={fill.stroke}
                strokeWidth="1.5"
              />
              <text
                x={box.x + 16}
                y={box.y + 26}
                fill={fill.title}
                fontSize="13.5"
                fontWeight="700"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {box.title}
              </text>
              <text
                x={box.x + 16}
                y={box.y + 44}
                fill={fill.sub}
                fontSize="11"
                fontFamily="ui-sans-serif, system-ui, sans-serif"
              >
                {box.sub.length > 42 ? box.sub.slice(0, 40) + '…' : box.sub}
              </text>
              {box.sub.length > 42 ? (
                <text
                  x={box.x + 16}
                  y={box.y + 59}
                  fill={fill.sub}
                  fontSize="11"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                >
                  documentation
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}

/** The lifecycle column used on the "how it works" page. */
export function LifecycleColumn({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => (
        <li key={step} className="relative flex items-start gap-3.5 pb-4 last:pb-0">
          {index < steps.length - 1 ? (
            <span className="absolute left-[5px] top-4 h-full w-px bg-ink-200" aria-hidden />
          ) : null}
          <span
            className={cn(
              'relative z-10 mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white',
              index === steps.length - 1 ? 'bg-positive-500' : 'bg-ink-900',
            )}
          />
          <span className="text-[14px] font-medium leading-snug text-ink-800">{step}</span>
        </li>
      ))}
    </ol>
  )
}
