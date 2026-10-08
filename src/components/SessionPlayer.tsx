import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FigureView } from '../animation/FigureView'
import { exerciseById } from '../exercises/library'
import { LADDERS, SESSION_NAMES, type SessionType } from '../programme/ladders'
import type { LadderUpdate, Plan, PlanItem } from '../programme/engine'
import { db, type WorkoutSession } from '../lib/db'
import { discardSession } from '../lib/sessions'
import { finishProgrammeSession, setLadderStep } from '../lib/programme'
import { ExerciseInfo } from './ExerciseDetail'
import { Chips, SetLogger } from './SetLogger'
import { HoldTimer, RestTimer } from './Timer'

const PHASE_LABEL = { warmup: 'Warm-up', main: 'Main', cooldown: 'Cool-down' } as const

function describe(item: PlanItem): string {
  const ex = exerciseById(item.exerciseId)
  const unit = item.measure === 'reps' ? 'reps' : 's'
  const side = ex?.perSide ? ' each side' : ''
  if (item.phase !== 'main') return `${item.sets > 1 ? `${item.sets} × ` : ''}${item.target[0]}${item.target[1] !== item.target[0] ? `–${item.target[1]}` : ''} ${unit}${side}`
  return `${item.sets} sets × ${item.target[0]}–${item.target[1]} ${unit}${side}`
}

/** Index of the item to resume at, remembered per session on this device. */
function useStoredIndex(sessionId: string) {
  const key = `player:${sessionId}`
  const [index, setIndex] = useState(() => {
    try {
      return Number(localStorage.getItem(key) ?? 0)
    } catch {
      return 0
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, String(index))
    } catch {
      // Storage unavailable: resuming simply starts at the first exercise.
    }
  }, [key, index])
  return [index, setIndex] as const
}

function VariationSwitch({ item }: { item: PlanItem }) {
  if (!item.ladderId) return null
  const ladder = LADDERS[item.ladderId]
  const step = ladder.steps.findIndex((s) => s.id === item.exerciseId)
  const easier = step > 0 ? exerciseById(ladder.steps[step - 1].id) : undefined
  const harder = step < ladder.steps.length - 1 ? exerciseById(ladder.steps[step + 1].id) : undefined
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {easier && (
        <button className="btn btn-secondary min-h-9 text-sm" onClick={() => setLadderStep(ladder.id, step - 1)}>
          Easier: {easier.name}
        </button>
      )}
      {harder && (
        <button className="btn btn-secondary min-h-9 text-sm" onClick={() => setLadderStep(ladder.id, step + 1)}>
          Harder: {harder.name}
        </button>
      )}
    </div>
  )
}

function Finish({ session, onDone }: { session: WorkoutSession; onDone: (updates: LadderUpdate[]) => void }) {
  const [effort, setEffort] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">Finish the session</h2>
      <p className="text-sm text-[var(--muted)]">Overall, how hard was it? (1 = very easy, 10 = maximal effort) Optional.</p>
      <Chips label="Session effort" values={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} value={effort ?? -1} onChange={setEffort} />
      <button
        className="btn btn-primary w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          onDone(await finishProgrammeSession(session.id, effort))
        }}
      >
        Save and finish
      </button>
    </div>
  )
}

export function SessionPlayer({ session, plan, onFinished }: { session: WorkoutSession; plan: Plan; onFinished: (updates: LadderUpdate[]) => void }) {
  const [index, setIndex] = useStoredIndex(session.id)
  const [resting, setResting] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const items = plan.items
  const atEnd = index >= items.length
  const item = items[Math.min(index, items.length - 1)]
  const exercise = item && exerciseById(item.exerciseId)

  const counts = useLiveQuery(async () => {
    const sets = await db.sets.where('session_id').equals(session.id).filter((s) => !s.deleted).toArray()
    return sets.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.exercise_id]: (acc[s.exercise_id] ?? 0) + 1 }), {})
  }, [session.id])

  const go = (i: number) => {
    setResting(false)
    setShowInfo(false)
    setIndex(Math.max(0, Math.min(items.length, i)))
    window.scrollTo({ top: 0 })
  }
  const endRest = useCallback(() => setResting(false), [])

  const done = item ? (counts?.[item.exerciseId] ?? 0) : 0
  const setsComplete = item?.phase === 'main' && done >= item.sets

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-[var(--muted)]">
            {SESSION_NAMES[session.day_type as SessionType] ?? 'Session'} · {Math.min(index + 1, items.length)} of {items.length}
          </p>
          <h1 className="text-xl font-bold">{atEnd ? 'All done' : exercise?.name}</h1>
        </div>
        <button className="btn btn-secondary min-h-9 text-sm" onClick={() => confirm('Discard this session and everything logged in it?') && discardSession(session.id)}>
          Discard
        </button>
      </header>

      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--accent-soft)]">
        <div className="h-full bg-[var(--accent)] transition-all" style={{ width: `${(Math.min(index, items.length) / items.length) * 100}%` }} />
      </div>

      {atEnd || !item || !exercise ? (
        <Finish session={session} onDone={onFinished} />
      ) : (
        <>
          <div className="card overflow-hidden">
            <FigureView animation={exercise.animation} />
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold tracking-wide text-[var(--accent)] uppercase">{PHASE_LABEL[item.phase]}</div>
            <div className="font-semibold">
              {describe(item)}
              {item.rir !== null && <span className="font-normal text-[var(--muted)]"> · stop with {item.rir} in reserve</span>}
            </div>
            {item.notes.map((n) => (
              <p key={n} className="text-sm text-[var(--muted)]">
                {n}
              </p>
            ))}
          </div>

          <button className="text-sm font-medium text-[var(--accent)] underline" onClick={() => setShowInfo((s) => !s)}>
            {showInfo ? 'Hide instructions' : 'How to do it'}
          </button>
          {showInfo && <ExerciseInfo exercise={exercise} hideAnimation />}

          {item.phase === 'main' ? (
            <>
              <VariationSwitch item={item} />
              <p className="text-sm">
                Sets done: <b>{done}</b> of {item.sets}
              </p>
              {resting && !setsComplete ? (
                <RestTimer seconds={item.restSeconds} onDone={endRest} />
              ) : setsComplete ? (
                <button className="btn btn-primary w-full" onClick={() => go(index + 1)}>
                  Next exercise
                </button>
              ) : (
                <SetLogger
                  key={`${item.exerciseId}-${done}`}
                  exercise={exercise}
                  sessionId={session.id}
                  suggested={item.suggested}
                  rirTarget={item.rir}
                  onSaved={() => item.restSeconds > 0 && setResting(true)}
                />
              )}
            </>
          ) : (
            <div className="card space-y-3 p-4">
              {item.measure === 'seconds' && <HoldTimer key={item.exerciseId} seconds={item.target[0]} />}
              <button className="btn btn-primary w-full" onClick={() => go(index + 1)}>
                Done, next
              </button>
            </div>
          )}

          <div className="flex justify-between pt-2 text-sm">
            <button className="text-[var(--muted)] underline disabled:opacity-40" disabled={index === 0} onClick={() => go(index - 1)}>
              ‹ Previous
            </button>
            <button className="text-[var(--muted)] underline" onClick={() => go(index + 1)}>
              Skip ›
            </button>
          </div>
        </>
      )}
    </div>
  )
}
