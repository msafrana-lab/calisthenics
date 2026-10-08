// Development-only page: every keyframe and the midpoint of every movement for
// the exercises given in ?ids=P1,P2 (all if omitted). Used by scripts/review.mjs.
import { createRoot } from 'react-dom/client'
import { FigureView } from '../animation/FigureView'
import { EXERCISES } from '../exercises/library'
import '../index.css'

const params = new URLSearchParams(location.search)
const ids = params.get('ids')?.split(',')
// Compact mode: held positions only, at most 4 per exercise, smaller frames.
const compact = params.has('compact')
const list = ids ? EXERCISES.filter((e) => ids.includes(e.id)) : EXERCISES

function moments(e: (typeof EXERCISES)[number]) {
  const out: { t: number; label: string }[] = []
  let t = 0
  for (const f of e.animation.frames) {
    out.push({ t: t + f.move / 2, label: `→ ${f.label ?? ''} (mid)` })
    t += f.move
    out.push({ t: t + (f.hold ?? 0) / 2, label: f.label ?? '' })
    t += f.hold ?? 0
  }
  if (!compact) return out
  const held = out.filter((m) => !m.label.startsWith('→'))
  const step = Math.max(1, Math.ceil(held.length / 4))
  return held.filter((_, i) => i % step === 0).slice(0, 4)
}

createRoot(document.getElementById('root')!).render(
  <div id="sheet" style={{ padding: 12, background: 'var(--bg)', width: 'max-content' }}>
    {list.map((e) => (
      <div key={e.id} style={{ marginBottom: 14 }}>
        <div style={{ font: '600 14px sans-serif', marginBottom: 4 }}>
          {e.id} · {e.name} · view {e.animation.view ?? 'side'}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {moments(e).map((m, i) => (
            <div key={i} style={{ width: compact ? 150 : 220, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
              <FigureView animation={e.animation} time={m.t} showLabel={false} />
              <div style={{ font: '11px sans-serif', padding: '2px 6px', color: 'var(--muted)' }}>{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>,
)
