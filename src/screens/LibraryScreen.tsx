import { useState } from 'react'
import { Search } from 'lucide-react'
import { FigureView } from '../animation/FigureView'
import { EXERCISES, exerciseById } from '../exercises/library'
import type { Group } from '../exercises/types'
import { ExerciseDetailView, targetText } from '../components/ExerciseDetail'
import { ScreenHeader } from '../ui'

const GROUPS: [Group | 'all', string][] = [
  ['all', 'All'],
  ['push', 'Push'],
  ['core', 'Core'],
  ['legs', 'Legs'],
  ['hips', 'Hips'],
  ['back', 'Back'],
  ['mobility', 'Mobility'],
  ['warmup', 'Warm-up'],
]

export function LibraryScreen() {
  const [openId, setOpenId] = useState<string | null>(null)
  const [group, setGroup] = useState<Group | 'all'>('all')
  const [query, setQuery] = useState('')
  const open = openId ? exerciseById(openId) : undefined

  if (open) return <ExerciseDetailView exercise={open} onBack={() => setOpenId(null)} />

  const q = query.trim().toLowerCase()
  const list = EXERCISES.filter((e) => (group === 'all' || e.group === group) && (!q || `${e.name} ${e.muscles.join(' ')}`.toLowerCase().includes(q)))

  return (
    <div className="space-y-4">
      <ScreenHeader eyebrow={`${EXERCISES.length} exercises · mat and wall`} title="Exercises" />

      <label className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-4 ring-1 ring-[var(--border)]">
        <Search size={18} className="text-[var(--muted)]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercises or muscles"
          className="h-12 w-full bg-transparent text-[16px] outline-none placeholder:text-[var(--muted)]"
        />
      </label>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {GROUPS.map(([g, label]) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold ${
              group === g ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {!list.length && <p className="py-8 text-center text-sm text-[var(--muted)]">No exercise matches.</p>}
      <div className="grid grid-cols-2 gap-3">
        {list.map((e) => (
          <button key={e.id} className="card overflow-hidden text-left active:scale-[0.98]" onClick={() => setOpenId(e.id)}>
            <div className="bg-[var(--stage)]">
              <FigureView animation={e.animation} showLabel={false} time={e.animation.frames[0].move} />
            </div>
            <div className="space-y-0.5 p-3">
              <div className="text-[14px] leading-snug font-semibold">{e.name}</div>
              <div className="text-[12px] text-[var(--muted)]">
                {targetText(e)}
                {e.variationOf ? ' · variation' : ''}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
