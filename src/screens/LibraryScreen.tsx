import { useState } from 'react'
import { FigureView } from '../animation/FigureView'
import { EXERCISES, exerciseById } from '../exercises/library'
import type { Group } from '../exercises/types'
import { ExerciseHeader, ExerciseInfo } from '../components/ExerciseDetail'

const GROUPS: [Group, string][] = [
  ['push', 'Push'],
  ['core', 'Core'],
  ['legs', 'Legs'],
  ['hips', 'Hips'],
  ['back', 'Back and shoulder blades'],
  ['mobility', 'Mobility and stretching'],
  ['warmup', 'Warm-up'],
]

export function LibraryScreen() {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = openId ? exerciseById(openId) : undefined

  if (open) {
    return (
      <div>
        <ExerciseHeader exercise={open} onBack={() => setOpenId(null)} />
        <ExerciseInfo exercise={open} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">Exercises</h1>
        <p className="text-sm text-[var(--muted)]">{EXERCISES.length} exercises, mat and wall only.</p>
      </header>
      {GROUPS.map(([group, label]) => (
        <section key={group} className="space-y-2">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--muted)] uppercase">{label}</h2>
          <div className="grid grid-cols-2 gap-3">
            {EXERCISES.filter((e) => e.group === group).map((e) => (
              <button key={e.id} className="card overflow-hidden text-left" onClick={() => setOpenId(e.id)}>
                <FigureView animation={e.animation} showLabel={false} time={e.animation.frames[0].move} />
                <div className="p-3">
                  <div className="text-sm font-semibold">{e.name}</div>
                  <div className="text-xs text-[var(--muted)]">{e.muscles.slice(0, 2).join(', ')}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
