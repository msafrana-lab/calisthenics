import { FigureView } from '../animation/FigureView'
import type { Exercise } from '../exercises/types'

const LOAD_LABEL = { low: 'Low', medium: 'Medium', high: 'High' } as const

export function ExerciseHeader({ exercise, onBack }: { exercise: Exercise; onBack: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <button onClick={onBack} className="btn btn-secondary px-3" aria-label="Back">
        ‹ Back
      </button>
      <h1 className="text-xl font-bold">{exercise.name}</h1>
    </div>
  )
}

export function ExerciseInfo({ exercise, hideAnimation = false }: { exercise: Exercise; hideAnimation?: boolean }) {
  const unit = exercise.measure === 'reps' ? 'reps' : 'seconds'
  return (
    <div className="space-y-3">
      {!hideAnimation && (
        <div className="card overflow-hidden">
          <FigureView animation={exercise.animation} />
        </div>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1">
          Target {exercise.target[0]}–{exercise.target[1]} {unit}
        </span>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1">Knee load: {LOAD_LABEL[exercise.kneeLoad]}</span>
        <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1">Wrist load: {LOAD_LABEL[exercise.wristLoad]}</span>
      </div>
      <p className="text-sm text-[var(--muted)]">{exercise.muscles.join(' · ')}</p>
      <ol className="card list-decimal space-y-1 py-3 pr-4 pl-8 text-sm">
        {exercise.cues.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ol>
      {exercise.cautions && (
        <ul className="space-y-1 rounded-2xl bg-[var(--warn-soft)] px-4 py-3 text-sm">
          {exercise.cautions.map((c) => (
            <li key={c}>
              <span className="font-semibold text-[var(--warn)]">Caution · </span>
              {c}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
