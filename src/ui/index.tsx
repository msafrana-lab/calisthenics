// Shared interface pieces for the light, premium look.
import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`eyebrow ${className}`}>{children}</div>
}

export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pt-2">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="mt-1 text-[28px] leading-tight font-semibold">{title}</h1>
      </div>
      {right}
    </header>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-1 pt-2">
      <h2 className="text-[17px] font-semibold">{children}</h2>
      {action}
    </div>
  )
}

/** Pill-shaped segmented control (single choice). */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: ReactNode }[]
  value: T | null
  onChange: (v: T) => void
  label: string
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-full bg-[var(--surface-2)] p-1 ring-1 ring-[var(--border)]">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-full font-semibold transition-colors ${size === 'sm' ? 'h-9 text-[13px]' : 'h-10 text-sm'} ${
              active ? 'bg-[var(--accent)] text-[var(--accent-text)] shadow-sm' : 'text-[var(--muted)]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Tag({ children, tone = 'neutral', icon }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'warn'; icon?: ReactNode }) {
  const tones = {
    neutral: 'bg-[var(--surface-2)] text-[var(--muted)] ring-1 ring-[var(--border)]',
    accent: 'bg-[var(--accent-soft)] text-[var(--accent-ink)]',
    warn: 'bg-[var(--warn-soft)] text-[var(--warn)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {icon}
      {children}
    </span>
  )
}

export function Callout({ children, tone = 'accent', icon }: { children: ReactNode; tone?: 'accent' | 'warn'; icon?: ReactNode }) {
  return (
    <div className={`flex gap-2.5 rounded-2xl px-4 py-3 text-sm ${tone === 'warn' ? 'bg-[var(--warn-soft)]' : 'bg-[var(--accent-soft)]'}`}>
      {icon && <span className={`mt-0.5 shrink-0 ${tone === 'warn' ? 'text-[var(--warn)]' : 'text-[var(--accent-ink)]'}`}>{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Circular progress ring with content in the middle. */
export function Ring({ value, size = 180, stroke = 10, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-[var(--accent-soft)]" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="stroke-[var(--accent)] transition-[stroke-dashoffset] duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  )
}

/** Exercise thumbnail tile with the soft stage background. */
export function Thumb({ children, size = 64 }: { children: ReactNode; size?: number }) {
  return (
    <div className="shrink-0 overflow-hidden rounded-2xl bg-[var(--stage)] ring-1 ring-[var(--border)]" style={{ width: size, height: size }}>
      <div className="flex h-full items-center">{children}</div>
    </div>
  )
}
