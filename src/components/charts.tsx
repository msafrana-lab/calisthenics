// Small SVG charts for the Progress screen. Single-series by design: the
// accent hue (--chart-1) carries the data, a neutral gray (--chart-context)
// carries context, and a 10% accent wash marks target ranges.
import { useEffect, useRef, useState, type ReactNode } from 'react'

const FONT = 11

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(320)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** About `count` round tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    min -= 1
    max += 1
  }
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const out: number[] = []
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.001; v += step) out.push(Math.round(v * 1000) / 1000)
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step)
  return out
}

const shortDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const dayNum = (day: string) => Date.parse(`${day}T12:00:00Z`) / 864e5

/** Column/bar with a 4px rounded data end and a square base. */
function roundedBar(x: number, y: number, w: number, h: number, horizontal = false) {
  const r = Math.min(4, horizontal ? w : h, horizontal ? h / 2 : w / 2)
  if (h <= 0 || w <= 0) return ''
  if (horizontal) return `M${x} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x}Z`
  return `M${x} ${y + h}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h}Z`
}

// ---------------------------------------------------------------- card + table

export function ChartCard({
  title,
  subtitle,
  table,
  children,
}: {
  title: string
  subtitle?: ReactNode
  table: { head: string[]; rows: (string | number)[][] }
  children: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <section className="card space-y-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-[var(--muted)]">{subtitle}</p>}
        </div>
        <button className="shrink-0 text-xs font-medium text-[var(--accent)] underline" onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Chart' : 'Table'}
        </button>
      </div>
      {showTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-left text-xs text-[var(--muted)]">
                {table.head.map((h) => (
                  <th key={h} className="py-1 pr-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  {r.map((c, j) => (
                    <td key={j} className="py-1 pr-2">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  )
}

function Tooltip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x - 80, 0), width - 160)
  return (
    <div
      className="pointer-events-none absolute z-10 w-[160px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-xs shadow-md"
      style={{ left, top: Math.max(0, y - 58) }}
    >
      {children}
    </div>
  )
}

// ---------------------------------------------------------------- line chart

export type LinePoint = { day: string; value: number; context?: number; note?: string }

/**
 * Time series: the main value as a 2px line with an end dot and end label;
 * optional context values (e.g. daily weigh-ins) as small gray dots; points
 * with a `note` get a short direct label (used sparingly, e.g. step changes).
 */
export function LineChart({
  points,
  from,
  to,
  format,
  valueLabel,
  contextLabel,
  height = 170,
}: {
  points: LinePoint[]
  from: string
  to: string
  format: (v: number) => string
  valueLabel: string
  contextLabel?: string
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  if (!points.length) return <p className="py-6 text-center text-sm text-[var(--muted)]">No data in this period yet.</p>

  const m = { l: 38, r: 34, t: 18, b: 22 }
  const values = points.flatMap((p) => (p.context === undefined ? [p.value] : [p.value, p.context]))
  const ticks = niceTicks(Math.min(...values), Math.max(...values), 3)
  const [y0, y1] = [ticks[0], ticks[ticks.length - 1]]
  const x0 = dayNum(from)
  const x1 = Math.max(dayNum(to), x0 + 1)
  const sx = (day: string) => m.l + ((dayNum(day) - x0) / (x1 - x0)) * (width - m.l - m.r)
  const sy = (v: number) => m.t + (1 - (v - y0) / (y1 - y0 || 1)) * (height - m.t - m.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.day).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(' ')
  const last = points[points.length - 1]
  const xTicks = [from, to]

  const nearest = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left
    let best = 0
    points.forEach((p, i) => {
      if (Math.abs(sx(p.day) - x) < Math.abs(sx(points[best].day) - x)) best = i
    })
    return best
  }
  const a = active === null ? null : points[active]

  return (
    <div ref={ref} className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${valueLabel}: latest ${format(last.value)} on ${shortDate(last.day)}`}
        tabIndex={0}
        className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        onPointerMove={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerDown={(e) => setActive(nearest(e.clientX, e.currentTarget.getBoundingClientRect()))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? points.length) - 1))
          if (e.key === 'ArrowRight') setActive((i) => Math.min(points.length - 1, (i ?? -1) + 1))
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={sy(t)} y2={sy(t)} className="stroke-[var(--border)]" strokeWidth={1} />
            <text x={m.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={FONT} className="fill-[var(--muted)] tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}
        {xTicks.map((d, i) => (
          <text key={d} x={sx(d)} y={height - 6} textAnchor={i === 0 ? 'start' : 'end'} fontSize={FONT} className="fill-[var(--muted)]">
            {shortDate(d)}
          </text>
        ))}

        {points.map((p) => p.context !== undefined && <circle key={`c${p.day}`} cx={sx(p.day)} cy={sy(p.context)} r={2.5} className="fill-[var(--chart-context)]" />)}
        <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" className="stroke-[var(--chart-1)]" />
        {points.length < 30 &&
          points.map((p) => <circle key={`p${p.day}`} cx={sx(p.day)} cy={sy(p.value)} r={3} strokeWidth={2} className="fill-[var(--chart-1)] stroke-[var(--surface)]" />)}
        {points.map(
          (p) =>
            p.note && (
              <text key={`n${p.day}`} x={sx(p.day)} y={Math.max(FONT, sy(p.value) - 9)} textAnchor="middle" fontSize={FONT - 1} className="fill-[var(--text)]">
                {p.note}
              </text>
            ),
        )}
        <circle cx={sx(last.day)} cy={sy(last.value)} r={4.5} strokeWidth={2} className="fill-[var(--chart-1)] stroke-[var(--surface)]" />
        <text x={sx(last.day) + 7} y={sy(last.value) + 4} fontSize={FONT} fontWeight={600} className="fill-[var(--text)]">
          {format(last.value)}
        </text>

        {a && (
          <g>
            <line x1={sx(a.day)} x2={sx(a.day)} y1={m.t} y2={height - m.b} className="stroke-[var(--muted)]" strokeWidth={1} />
            <circle cx={sx(a.day)} cy={sy(a.value)} r={5} strokeWidth={2} className="fill-[var(--chart-1)] stroke-[var(--surface)]" />
          </g>
        )}
      </svg>
      {a && (
        <Tooltip x={sx(a.day)} y={sy(a.value)} width={width}>
          <div className="text-[var(--muted)]">{shortDate(a.day)}</div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3 bg-[var(--chart-1)]" />
            <b className="text-sm">{format(a.value)}</b> <span className="text-[var(--muted)]">{valueLabel}</span>
          </div>
          {a.context !== undefined && contextLabel && (
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--chart-context)]" />
              <b>{format(a.context)}</b> <span className="text-[var(--muted)]">{contextLabel}</span>
            </div>
          )}
          {a.note && <div className="text-[var(--muted)]">{a.note}</div>}
        </Tooltip>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- columns

export type Column = { key: string; label: string; value: number; detail?: string }

/** Vertical columns (≤24px) with an optional shaded target band. */
export function ColumnChart({
  columns,
  band,
  bandLabel,
  format,
  height = 170,
}: {
  columns: Column[]
  band?: readonly [number, number]
  bandLabel?: string
  format: (v: number) => string
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const m = { l: 38, r: 8, t: 14, b: 22 }
  const ticks = niceTicks(0, Math.max(...columns.map((c) => c.value), band?.[1] ?? 0, 1), 3)
  const top = ticks[ticks.length - 1]
  const sy = (v: number) => m.t + (1 - v / top) * (height - m.t - m.b)
  const slot = (width - m.l - m.r) / columns.length
  const barW = Math.min(24, slot - 2)
  const labelEvery = Math.ceil(columns.length / 6)
  const a = active === null ? null : columns[active]

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={height} role="img" aria-label={columns.map((c) => `${c.label}: ${format(c.value)}`).join(', ')} onPointerLeave={() => setActive(null)}>
        {band && (
          <g>
            <rect x={m.l} y={sy(band[1])} width={width - m.l - m.r} height={sy(band[0]) - sy(band[1])} className="fill-[var(--chart-band)]" />
            {bandLabel && (
              <text x={width - m.r - 4} y={sy(band[1]) + FONT + 2} textAnchor="end" fontSize={FONT - 1} className="fill-[var(--muted)]">
                {bandLabel}
              </text>
            )}
          </g>
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={m.l} x2={width - m.r} y1={sy(t)} y2={sy(t)} className="stroke-[var(--border)]" strokeWidth={1} />
            <text x={m.l - 6} y={sy(t) + 4} textAnchor="end" fontSize={FONT} className="fill-[var(--muted)] tabular-nums">
              {format(t)}
            </text>
          </g>
        ))}
        {columns.map((c, i) => {
          const x = m.l + i * slot + (slot - barW) / 2
          return (
            <g
              key={c.key}
              tabIndex={0}
              role="img"
              aria-label={`${c.label}: ${format(c.value)}`}
              className="outline-none"
              onPointerEnter={() => setActive(i)}
              onPointerDown={() => setActive(i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            >
              <rect x={m.l + i * slot} y={m.t} width={slot} height={height - m.t - m.b} fill="transparent" />
              <path d={roundedBar(x, sy(c.value), barW, sy(0) - sy(c.value))} className={`fill-[var(--chart-1)] ${active === i ? 'opacity-75' : ''}`} />
              {i % labelEvery === (columns.length - 1) % labelEvery && (
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize={FONT} className="fill-[var(--muted)]">
                  {c.label}
                </text>
              )}
            </g>
          )
        })}
        {columns.length > 0 && (
          <text
            x={m.l + (columns.length - 1) * slot + slot / 2}
            y={sy(columns[columns.length - 1].value) - 5}
            textAnchor="middle"
            fontSize={FONT}
            fontWeight={600}
            className="fill-[var(--text)]"
          >
            {format(columns[columns.length - 1].value)}
          </text>
        )}
      </svg>
      {a && (
        <Tooltip x={m.l + (active ?? 0) * slot + slot / 2} y={sy(a.value)} width={width}>
          <div className="text-[var(--muted)]">{a.detail ?? a.label}</div>
          <b className="text-sm">{format(a.value)}</b>
        </Tooltip>
      )}
    </div>
  )
}

// ---------------------------------------------------------------- horizontal bars

export type BarRow = { key: string; label: string; value: number }

/** Horizontal bars with the value at the tip and an optional target band. */
export function BarChart({ rows, band, bandLabel, max }: { rows: BarRow[]; band?: readonly [number, number]; bandLabel?: string; max?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const rowH = 30
  const barH = 14
  const labelW = Math.min(150, width * 0.42)
  const m = { l: labelW + 8, r: 28, t: band ? 16 : 4 }
  const height = m.t + rows.length * rowH
  const top = Math.max(max ?? 0, band?.[1] ?? 0, ...rows.map((r) => r.value), 1)
  const sx = (v: number) => m.l + (v / top) * (width - m.l - m.r)
  return (
    <div ref={ref}>
      <svg width={width} height={height} role="img" aria-label={rows.map((r) => `${r.label}: ${r.value}`).join(', ')}>
        {band && (
          <g>
            <rect x={sx(band[0])} y={m.t} width={sx(band[1]) - sx(band[0])} height={rows.length * rowH} className="fill-[var(--chart-band)]" />
            {bandLabel && (
              <text x={(sx(band[0]) + sx(band[1])) / 2} y={FONT} textAnchor="middle" fontSize={FONT - 1} className="fill-[var(--muted)]">
                {bandLabel}
              </text>
            )}
          </g>
        )}
        <line x1={m.l} x2={m.l} y1={m.t} y2={height} className="stroke-[var(--border)]" strokeWidth={1} />
        {rows.map((r, i) => {
          const y = m.t + i * rowH + (rowH - barH) / 2
          return (
            <g key={r.key}>
              <text x={0} y={y + barH - 3} fontSize={FONT + 1} className="fill-[var(--text)]">
                {r.label}
              </text>
              <path d={roundedBar(m.l, y, sx(r.value) - m.l, barH, true)} className="fill-[var(--chart-1)]" />
              <text x={sx(r.value) + 5} y={y + barH - 3} fontSize={FONT} fontWeight={600} className="fill-[var(--text)] tabular-nums">
                {r.value}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
