import { ChevronLeft, TriangleAlert } from 'lucide-react'
import { FigureView } from '../animation/FigureView'
import type { Exercise } from '../exercises/types'
import { Card, Eyebrow, Tag } from '../ui'

const LOAD_LABEL = { low: 'Low', medium: 'Medium', high: 'High' } as const

export function targetText(exercise: Exercise) {
  const unit = exercise.measure === 'reps' ? 'reps' : 's'
  return `${exercise.target[0]}${exercise.target[1] !== exercise.target[0] ? `–${exercise.target[1]}` : ''} ${unit}${exercise.perSide ? ' each side' : ''}`
}

/** Numbered how-to steps and joint cautions. */
export function ExerciseInfo({ exercise }: { exercise: Exercise }) {
  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {exercise.cues.map((c, i) => (
          <li key={c} className="flex gap-3 text-[15px] leading-snug">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xs font-semibold text-[var(--accent-ink)]">
              {i + 1}
            </span>
            <span>{c}</span>
          </li>
        ))}
      </ol>
      {exercise.cautions?.map((c) => (
        <div key={c} className="flex gap-2.5 rounded-2xl bg-[var(--warn-soft)] px-4 py-3 text-sm">
          <TriangleAlert size={17} className="mt-0.5 shrink-0 text-[var(--warn)]" />
          <span>{c}</span>
        </div>
      ))}
    </div>
  )
}

/** Full exercise page: large animation, targets, muscles, steps. */
export function ExerciseDetailView({ exercise, onBack }: { exercise: Exercise; onBack: () => void }) {
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="-ml-1 inline-flex items-center gap-1 pt-2 text-[15px] font-medium text-[var(--accent)]">
        <ChevronLeft size={20} /> Back
      </button>
      <div className="overflow-hidden rounded-[26px] bg-[var(--stage)] ring-1 ring-[var(--border)]">
        <FigureView animation={exercise.animation} />
      </div>
      <div>
        <h1 className="text-[26px] leading-tight font-semibold">{exercise.name}</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">{exercise.muscles.join(' · ')}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Tag tone="accent">Target {targetText(exercise)}</Tag>
        <Tag>Knee load: {LOAD_LABEL[exercise.kneeLoad]}</Tag>
        <Tag>Wrist load: {LOAD_LABEL[exercise.wristLoad]}</Tag>
      </div>
      <Card className="p-5">
        <Eyebrow className="mb-3">How to do it</Eyebrow>
        <ExerciseInfo exercise={exercise} />
      </Card>
    </div>
  )
}
