import { useCallback, useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsDown, ChevronsUp, FlaskConical, Info, Lock, Plus, RotateCcw, SkipForward, TriangleAlert, X } from 'lucide-react'
import { FigureView } from '../animation/FigureView'
import { exerciseById } from '../exercises/library'
import { LADDERS, SESSION_NAMES, type SessionType } from '../programme/ladders'
import { buildItem, extraOptions, isOpen, stepIndex, STRETCH_TOP_UP, testId, type EngineInput, type LadderUpdate, type Plan, type PlanItem } from '../programme/engine'
import { db, type WorkoutSession } from '../lib/db'
import { discardSession } from '../lib/sessions'
import { finishProgrammeSession, setLadderStep } from '../lib/programme'
import { logSet } from '../lib/sessions'
import { Card, Eyebrow, Segmented, Tag, Thumb } from '../ui'
import { ExerciseInfo, targetText } from './ExerciseDetail'
import { LoggedSets, SetLogger } from './SetLogger'
import { HoldTimer, RestTimer } from './Timer'

const PHASE_LABEL = { warmup: 'Warm-up', main: 'Workout', cooldown: 'Cool-down · optional' } as const

type Custom = {
  /** Ladders added after the planned exercises. */
  extras: string[]
  /** Exercise used just for today, per ladder. */
  swaps: Record<string, string>
}

/** Changes made to this session on this device: extra exercises and one-off steps. */
function useSessionCustom(sessionId: string) {
  const key = `player-custom:${sessionId}`
  const [custom, setCustom] = useState<Custom>(() => {
    try {
      return { extras: [], swaps: {}, ...JSON.parse(localStorage.getItem(key) ?? '{}') }
    } catch {
      return { extras: [], swaps: {} }
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(custom))
    } catch {
      // Storage unavailable: the changes last until the app is closed.
    }
  }, [key, custom])
  return [custom, setCustom] as const
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

function StepButton({ dir, name, locked, onPick }: { dir: 'easier' | 'harder'; name?: string; locked?: boolean; onPick: () => void }) {
  const Icon = locked ? Lock : dir === 'easier' ? ChevronsDown : ChevronsUp
  return (
    <button
      disabled={!name || locked}
      className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-3 py-2.5 text-left text-[13px] ring-1 ring-[var(--border)] disabled:opacity-40"
      onClick={onPick}
    >
      <Icon size={17} className="shrink-0 text-[var(--accent)]" />
      <span className="min-w-0">
        <span className="block text-[11px] text-[var(--muted)]">{locked ? 'Unlocks with a readiness test' : dir === 'easier' ? 'Easier' : 'Harder'}</span>
        <span className="block truncate font-medium">{name ?? '—'}</span>
      </span>
    </button>
  )
}

/**
 * Easier and Harder options from the ladder. Each asks whether the change is
 * for today only (the ladder stays where it is) or from now on.
 */
function VariationSwitch({ item, planned, input, onToday }: { item: PlanItem; planned: string; input: EngineInput; onToday: (exerciseId: string | null) => void }) {
  const [pending, setPending] = useState<number | null>(null)
  if (!item.ladderId) return null
  const ladder = LADDERS[item.ladderId]
  const step = stepIndex(ladder, item.exerciseId)
  const own = stepIndex(ladder, planned)
  const at = (i: number) => (i >= 0 && i < ladder.steps.length ? exerciseById(ladder.steps[i].id) : undefined)
  const easier = at(step - 1)
  const harder = at(step + 1)
  // An advanced step opens only through its readiness test (R13).
  const stored = isOpen(input, ladder) ? Math.min(input.steps[ladder.id] ?? ladder.start, ladder.steps.length - 1) : -1
  const harderLocked = !!ladder.steps[step + 1]?.gate && step + 1 > stored
  const target = pending === null ? undefined : at(pending)
  const versions = [ladder.steps[step].id, ...(ladder.steps[step].variants ?? [])].filter((id) => exerciseById(id))

  return (
    <div className="space-y-2">
      {step !== own && (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--accent-soft)] px-3 py-2 text-[13px] text-[var(--accent-ink)]">
          <span>
            Just today: {step > own ? 'harder' : 'easier'} than your step ({exerciseById(planned)?.name}).
          </span>
          <button className="inline-flex shrink-0 items-center gap-1 font-semibold" onClick={() => onToday(null)}>
            <RotateCcw size={14} /> Undo
          </button>
        </div>
      )}
      {versions.length > 1 && (
        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-[var(--muted)]">Version</div>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {versions.map((id) => {
              const ex = exerciseById(id)!
              const active = id === item.exerciseId
              return (
                <button
                  key={id}
                  onClick={() => onToday(id === planned ? null : id)}
                  className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${
                    active ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]'
                  }`}
                >
                  {ex.variationOf ? variationLabel(ex.name, exerciseById(ex.variationOf)?.name) : 'Standard'}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <StepButton dir="easier" name={easier?.name} onPick={() => setPending(step - 1)} />
        <StepButton dir="harder" name={harder?.name} locked={harderLocked} onPick={() => setPending(step + 1)} />
      </div>
      {target && pending !== null && (
        <Card className="space-y-3 p-4">
          <p className="text-[14px]">
            Switch to <b>{target.name}</b>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => {
                onToday(pending === own ? null : target.id)
                setPending(null)
              }}
            >
              Just today
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await setLadderStep(ladder.id, pending)
                onToday(null)
                setPending(null)
              }}
            >
              From now on
            </button>
          </div>
          <button className="w-full text-center text-[13px] text-[var(--muted)]" onClick={() => setPending(null)}>
            Cancel
          </button>
        </Card>
      )}
    </div>
  )
}

/** Short chip label: the part of a variation's name that differs from its step ("narrow hands"). */
function variationLabel(name: string, baseName?: string): string {
  if (baseName && name.toLowerCase().startsWith(baseName.toLowerCase())) {
    const rest = name.slice(baseName.length).replace(/^[\s,]+/, '')
    if (rest) return rest.charAt(0).toUpperCase() + rest.slice(1)
  }
  return name
}

/** Readiness test for an advanced step (R13 G6): the user does it and records the result. */
function ReadinessTest({ item, sessionId, done, onNext }: { item: PlanItem; sessionId: string; done: boolean; onNext: () => void }) {
  const t = item.test!
  const [result, setResult] = useState<'yes' | 'no' | null>(null)
  const [pain, setPain] = useState(0)
  const name = exerciseById(t.stepId)?.name ?? t.stepId
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
          <FlaskConical size={20} />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold">Readiness test</h2>
          <p className="text-[13px] text-[var(--muted)]">Optional. Passing it unlocks {name}.</p>
        </div>
      </div>
      <p className="text-[15px]">{t.text}</p>
      {t.caution && (
        <div className="flex gap-2 rounded-2xl bg-[var(--warn-soft)] px-3 py-2.5 text-[13px]">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[var(--warn)]" />
          This step loads a sensitive joint heavily. A physiotherapist assessment is advised before trying it.
        </div>
      )}
      {done ? (
        <>
          <p className="text-sm text-[var(--muted)]">Result saved. It counts when you finish the session.</p>
          <button className="btn btn-primary w-full" onClick={onNext}>
            Next <ChevronRight size={18} />
          </button>
        </>
      ) : (
        <>
          <Segmented
            label="Test result"
            value={result}
            onChange={setResult}
            options={[
              { value: 'yes' as const, label: 'Done as described' },
              { value: 'no' as const, label: 'Not yet' },
            ]}
          />
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium">Highest joint pain</span>
              <span className={`font-semibold tabular-nums ${pain > t.painMax ? 'text-[var(--warn)]' : 'text-[var(--muted)]'}`}>{pain === 0 ? 'None' : `${pain} / 10`}</span>
            </div>
            <input type="range" min={0} max={10} step={1} value={pain} onChange={(e) => setPain(Number(e.target.value))} aria-label="Highest joint pain, 0 to 10" className="w-full accent-[var(--accent)]" />
            <p className="text-[12px] text-[var(--muted)]">To pass: as described, with pain {t.painMax}/10 or less.</p>
          </div>
          <button
            className="btn btn-primary w-full"
            disabled={result === null}
            onClick={async () => {
              await logSet({ session_id: sessionId, exercise_id: testId(t.stepId), reps: result === 'yes' ? 1 : 0, seconds: null, rir: null, pain })
              onNext()
            }}
          >
            Save result
          </button>
        </>
      )}
    </Card>
  )
}

function ExtraOffer({ options, onAdd }: { options: PlanItem[]; onAdd: (ladderId: string) => void }) {
  if (!options.length) return null
  return (
    <Card className="space-y-3 p-5">
      <div>
        <h2 className="text-[17px] font-semibold">Time for more?</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Optional: 2 sets of an exercise you did not train today, chosen from the muscle groups with the fewest sets this week.</p>
      </div>
      <ul className="space-y-2">
        {options.map((o) => {
          const ex = exerciseById(o.exerciseId)
          if (!ex || !o.ladderId) return null
          return (
            <li key={o.ladderId}>
              <button className="flex w-full items-center gap-3 rounded-2xl bg-[var(--surface-2)] p-2 pr-3 text-left ring-1 ring-[var(--border)]" onClick={() => onAdd(o.ladderId!)}>
                <Thumb size={52}>
                  <FigureView animation={ex.animation} showLabel={false} time={ex.animation.frames[0].move} />
                </Thumb>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{ex.name}</span>
                  <span className="block text-[13px] text-[var(--muted)]">
                    2 × {targetText(ex)} · {LADDERS[o.ladderId].name}
                  </span>
                </span>
                <Plus size={20} className="shrink-0 text-[var(--accent)]" />
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function Finish({ session, onDone }: { session: WorkoutSession; onDone: (updates: LadderUpdate[]) => void }) {
  const [effort, setEffort] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const stretch = session.day_type === STRETCH_TOP_UP
  return (
    <Card className="space-y-5 p-5">
      <div>
        <h2 className="text-[22px] font-semibold">Nice work</h2>
        {!stretch && <p className="mt-1 text-sm text-[var(--muted)]">How hard was the session overall? Optional.</p>}
      </div>
      {!stretch && (
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
      )}
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

export function SessionPlayer({
  session,
  plan,
  input,
  onFinished,
}: {
  session: WorkoutSession
  plan: Plan
  input: EngineInput
  onFinished: (updates: LadderUpdate[]) => void
}) {
  const [index, setIndex] = useStoredIndex(session.id)
  const [resting, setResting] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [custom, setCustom] = useSessionCustom(session.id)

  // Planned items with today's one-off steps, then any extra exercises.
  const swapped = plan.items.map((it) => {
    const id = it.ladderId && !it.test && custom.swaps[it.ladderId]
    if (!id) return it
    const alt = buildItem(input, { phase: it.phase, exerciseId: id, sets: it.sets, ladderId: it.ladderId, notes: it.notes })
    return alt ?? it
  })
  const extras = custom.extras.flatMap((ladderId) => {
    const ladder = LADDERS[ladderId]
    const id = custom.swaps[ladderId] ?? plan.items.find((i) => i.ladderId === ladderId)?.exerciseId ?? ladder?.steps[Math.min(input.steps[ladderId] ?? ladder.start, ladder.steps.length - 1)].id
    const it = id && buildItem(input, { phase: 'main', exerciseId: id, sets: 2, ladderId, notes: ['Extra exercise: 2 sets at the usual effort.'] })
    return it ? [it] : []
  })
  const items = [...swapped, ...extras]
  const planned = (it: PlanItem) => {
    if (!it.ladderId) return it.exerciseId
    const ladder = LADDERS[it.ladderId]
    return plan.items.find((p) => p.ladderId === it.ladderId && !p.test)?.exerciseId ?? ladder.steps[Math.min(input.steps[it.ladderId] ?? ladder.start, ladder.steps.length - 1)].id
  }
  // Offered on the finish screen only; the engine leaves out ladders already in the session.
  const offers = index >= items.length ? extraOptions(input, plan.type, items) : []
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

  const done = item ? (counts?.[item.test ? testId(item.test.stepId) : item.exerciseId] ?? 0) : 0
  const setsComplete = item?.phase === 'main' && !item.test && done >= item.sets

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
          <div className="space-y-4 pt-6">
            <ExtraOffer
              options={offers}
              onAdd={(ladderId) => {
                setCustom((c) => ({ ...c, extras: [...c.extras, ladderId] }))
                go(items.length)
              }}
            />
            <Finish session={session} onDone={onFinished} />
          </div>
        ) : (
          <div className="space-y-5 pt-4">
            <div className="overflow-hidden rounded-[26px] bg-[var(--stage)] ring-1 ring-[var(--border)]">
              <FigureView animation={exercise.animation} />
            </div>

            <div>
              <Eyebrow className="text-[var(--accent)]">{session.day_type === STRETCH_TOP_UP ? 'Stretch' : PHASE_LABEL[item.phase]}</Eyebrow>
              <h1 className="mt-1 text-[26px] leading-tight font-semibold">{exercise.name}</h1>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.test ? (
                  <Tag tone="accent">Readiness test</Tag>
                ) : item.phase === 'main' ? (
                  <>
                    {exercise.variationOf && <Tag tone="accent">Variation</Tag>}
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

            {item.test ? (
              <ReadinessTest key={item.test.stepId} item={item} sessionId={session.id} done={done > 0} onNext={() => go(index + 1)} />
            ) : item.phase === 'main' ? (
              <>
                <VariationSwitch
                  key={item.ladderId}
                  item={item}
                  planned={planned(item)}
                  input={input}
                  onToday={(id) =>
                    setCustom((c) => {
                      const swaps = { ...c.swaps }
                      if (id) swaps[item.ladderId!] = id
                      else delete swaps[item.ladderId!]
                      return { ...c, swaps }
                    })
                  }
                />
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
