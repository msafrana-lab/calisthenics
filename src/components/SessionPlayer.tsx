import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, Info, SkipForward, X } from 'lucide-react'
import { FigureView } from '../animation/FigureView'
import { exerciseById } from '../exercises/library'
import { LADDERS, SESSION_NAMES, type SessionType } from '../programme/ladders'
import type { LadderUpdate, Plan, PlanItem } from '../programme/engine'
import { db, type WorkoutSession } from '../lib/db'
import { discardSession } from '../lib/sessions'
import { finishProgrammeSession, setLadderStep } from '../lib/programme'
import { Card, Eyebrow, Segmented, Tag } from '../ui'
import { ExerciseInfo, targetText } from './ExerciseDetail'
import { LoggedSets, SetLogger } from './SetLogger'
import { HoldTimer, RestTimer } from './Timer'

const PHASE_LABEL = { warmup: 'Warm-up', main: 'Workout', cooldown: 'Cool-down · optional' } as const

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
  if (!easier && !harder) return null
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        disabled={!easier}
        className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-3 py-2.5 text-left text-[13px] ring-1 ring-[var(--border)] disabled:opacity-40"
        onClick={() => setLadderStep(ladder.id, step - 1)}
      >
        <ChevronsDown size={17} className="shrink-0 text-[var(--accent)]" />
        <span className="min-w-0">
          <span className="block text-[11px] text-[var(--muted)]">Easier</span>
          <span className="block truncate font-medium">{easier?.name ?? '—'}</span>
        </span>
      </button>
      <button
        disabled={!harder}
        className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-3 py-2.5 text-left text-[13px] ring-1 ring-[var(--border)] disabled:opacity-40"
        onClick={() => setLadderStep(ladder.id, step + 1)}
      >
        <ChevronsUp size={17} className="shrink-0 text-[var(--accent)]" />
        <span className="min-w-0">
          <span className="block text-[11px] text-[var(--muted)]">Harder</span>
          <span className="block truncate font-medium">{harder?.name ?? '—'}</span>
        </span>
      </button>
    </div>
  )
}

function Finish({ session, onDone }: { session: WorkoutSession; onDone: (updates: LadderUpdate[]) => void }) {
  const [effort, setEffort] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-[22px] font-semibold">Nice work</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">How hard was the session overall? Optional.</p>
      </div>
      <div className="space-y-1.5">
        <Segmented
          size="sm"
          label="Session effort"
          value={effort}
          onChange={setEffort}
          options={[2, 4, 6, 8, 10].map((v) => ({ value: v, label: String(v) }))}
        />
        <div className="flex justify-between px-1 text-[11px] text-[var(--muted)]">
          <span>Very easy</span>
          <span>Maximal</span>
        </div>
      </div>
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
    </Card>
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
  const next = items[index + 1] && exerciseById(items[index + 1].exerciseId)

  const counts = useLiveQuery(async () => {
    const sets = await db.sets.where('session_id').equals(session.id).filter((s) => !s.deleted).toArray()
    return sets.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.exercise_id]: (acc[s.exercise_id] ?? 0) + 1 }), {})
  }, [session.id])

  const go = (i: number) => {
    setResting(false)
    setShowInfo(false)
    setIndex(Math.max(0, Math.min(items.length, i)))
    document.getElementById('player-scroll')?.scrollTo({ top: 0 })
  }
  const endRest = useCallback(() => setResting(false), [])

  const done = item ? (counts?.[item.exerciseId] ?? 0) : 0
  const setsComplete = item?.phase === 'main' && done >= item.sets

  return (
    <div id="player-scroll" className="fixed inset-0 z-40 overflow-y-auto bg-[var(--bg)]">
      <div className="mx-auto max-w-xl px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <header className="flex items-center justify-between gap-2 py-2">
          <button
            aria-label="Discard session"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] ring-1 ring-[var(--border)]"
            onClick={() => confirm('Discard this session and everything logged in it?') && discardSession(session.id)}
          >
            <X size={20} />
          </button>
          <div className="text-center">
            <div className="text-[13px] font-semibold">{SESSION_NAMES[session.day_type as SessionType] ?? 'Session'}</div>
            <div className="text-[11px] text-[var(--muted)]">
              {Math.min(index + 1, items.length)} of {items.length}
            </div>
          </div>
          <button className="h-10 rounded-full px-3 text-[13px] font-semibold text-[var(--accent)]" onClick={() => go(items.length)}>
            Finish
          </button>
        </header>

        <div className="mt-1 flex gap-1" aria-hidden>
          {items.map((it, i) => (
            <div
              key={`${it.phase}-${it.exerciseId}`}
              className={`h-1 flex-1 rounded-full ${i < index ? 'bg-[var(--accent)]' : i === index ? 'bg-[var(--accent)]/45' : 'bg-[var(--border)]'}`}
            />
          ))}
        </div>

        {atEnd || !item || !exercise ? (
          <div className="pt-6">
            <Finish session={session} onDone={onFinished} />
          </div>
        ) : (
          <div className="space-y-5 pt-4">
            <div className="overflow-hidden rounded-[26px] bg-[var(--stage)] ring-1 ring-[var(--border)]">
              <FigureView animation={exercise.animation} />
            </div>

            <div>
              <Eyebrow className="text-[var(--accent)]">{PHASE_LABEL[item.phase]}</Eyebrow>
              <h1 className="mt-1 text-[26px] leading-tight font-semibold">{exercise.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.phase === 'main' ? (
                  <>
                    <Tag tone="accent">
                      Set {Math.min(done + 1, item.sets)} of {item.sets}
                    </Tag>
                    <Tag>{targetText(exercise)}</Tag>
                    {item.rir !== null && <Tag>Stop {item.rir} short of failure</Tag>}
                  </>
                ) : (
                  <Tag>
                    {item.sets > 1 ? `${item.sets} × ` : ''}
                    {targetText(exercise)}
                  </Tag>
                )}
              </div>
              {item.notes.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {item.notes.map((n) => (
                    <div key={n} className="flex gap-2 text-[13px] text-[var(--muted)]">
                      <Info size={15} className="mt-0.5 shrink-0" /> {n}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button className="flex w-full items-center justify-between rounded-2xl bg-[var(--surface)] px-4 py-3 text-[15px] font-medium ring-1 ring-[var(--border)]" onClick={() => setShowInfo((s) => !s)}>
              How to do it
              <ChevronDown size={18} className={`text-[var(--muted)] transition-transform ${showInfo ? 'rotate-180' : ''}`} />
            </button>
            {showInfo && <ExerciseInfo exercise={exercise} />}

            {item.phase === 'main' ? (
              <>
                <VariationSwitch item={item} />
                <LoggedSets exercise={exercise} sessionId={session.id} />
                <Card className="p-5">
                  {resting && !setsComplete ? (
                    <RestTimer seconds={item.restSeconds} onDone={endRest} />
                  ) : setsComplete ? (
                    <div className="space-y-3 text-center">
                      <p className="text-[15px] font-medium">All {item.sets} sets done</p>
                      <button className="btn btn-primary w-full" onClick={() => go(index + 1)}>
                        {next ? `Next: ${next.name}` : 'Finish'} <ChevronRight size={18} />
                      </button>
                    </div>
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
                </Card>
              </>
            ) : (
              <Card className="space-y-4 p-5">
                {item.measure === 'seconds' && <HoldTimer key={item.exerciseId} seconds={item.target[0]} />}
                <button className="btn btn-primary w-full" onClick={() => go(index + 1)}>
                  Done <ChevronRight size={18} />
                </button>
                {item.phase === 'cooldown' && (
                  <button className="btn btn-ghost w-full" onClick={() => go(index + 1)}>
                    <SkipForward size={17} /> Skip stretch
                  </button>
                )}
              </Card>
            )}

            <div className="flex justify-between text-[13px] font-medium">
              <button className="inline-flex items-center gap-0.5 text-[var(--muted)] disabled:opacity-30" disabled={index === 0} onClick={() => go(index - 1)}>
                <ChevronLeft size={16} /> Previous
              </button>
              <button className="inline-flex items-center gap-0.5 text-[var(--muted)]" onClick={() => go(index + 1)}>
                Skip exercise <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
