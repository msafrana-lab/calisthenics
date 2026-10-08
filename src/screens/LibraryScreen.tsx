import { useState } from 'react'
import { FigureView } from '../animation/FigureView'
import { EXERCISES, exerciseById } from '../exercises/library'
import { ExerciseHeader, ExerciseInfo } from '../components/ExerciseDetail'

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Exercises</h1>
      <p className="text-sm text-[var(--muted)]">
        {EXERCISES.length} exercises so far. The full library (about 40 exercises in progression ladders) is built from docs/EVIDENCE.md.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {EXERCISES.map((e) => (
          <button key={e.id} className="card overflow-hidden text-left" onClick={() => setOpenId(e.id)}>
            <FigureView animation={e.animation} showLabel={false} />
            <div className="p-3">
              <div className="text-sm font-semibold">{e.name}</div>
              <div className="text-xs text-[var(--muted)]">{e.muscles.slice(0, 2).join(', ')}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
