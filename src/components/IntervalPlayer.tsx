import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronDown, Pause, Play, Plus, SkipBack, SkipForward, Volume2, X } from 'lucide-react'
import { FigureView } from '../animation/FigureView'
import { exerciseById } from '../exercises/library'
import { LADDERS, SESSION_NAMES } from '../programme/ladders'
import { buildItem, extraOptions, programmeWeek, testId, timing, type Block, type EngineInput, type LadderUpdate, type Plan, type PlanItem, type Rating } from '../programme/engine'
import { buildTimeline, totalSeconds, type Interval, type Segment } from '../programme/timeline'
import { db, type WorkoutSession } from '../lib/db'
import { discardSession, logSet } from '../lib/sessions'
import { finishProgrammeSession } from '../lib/programme'
import { beep, cueSettings, saveCueSettings, say, stopSpeech, unlockCues, type CueSettings } from '../lib/cues'
import { useIntervalClock, type ClockEvent } from '../lib/useIntervalClock'
import { useWakeLock } from '../lib/useWakeLock'
import { Card, Eyebrow, Ring, Segmented, Tag, Thumb } from '../ui'
import { ExerciseInfo, targetText } from './ExerciseDetail'
import { fmt } from './Timer'
import { ReadinessTest, VariationSwitch } from './StepChoice'

export const BLOCK_LABEL: Record<Block, string> = { ramp: 'Ramp', build: 'Build', peak: 'Peak', winddown: 'Wind-down' }

/** Rating stored as reps in reserve (R16): too easy = 4, about right = 2, too hard = 0. */
export const RATING_RIR: Record<Rating, number> = { easy: 4, right: 2, hard: 0 }

type Custom = {
  /** Exercise used just for today, per ladder. */
  swaps: Record<string, string>
  /** One more round of the Build block added at the end. */
  extraRound: boolean
  /** Ladders added at the end as extra exercises (2 rounds each). */
  extras: string[]
  /** Seconds done, so a reload resumes where the session was. */
  elapsed: number
}

function useCustom(sessionId: string) {
  const key = `interval-custom:${sessionId}`
  const [custom, setCustom] = useState<Custom>(() => {
    try {
      return { swaps: {}, extraRound: false, extras: [], elapsed: 0, ...JSON.parse(localStorage.getItem(key) ?? '{}') }
    } catch {
      return { swaps: {}, extraRound: false, extras: [], elapsed: 0 }
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(custom))
    } catch {
      // Storage unavailable: changes last until the app is closed.
    }
  }, [key, custom])
  return [custom, setCustom] as const
}

/** Spoken name: "Reverse lunge, left side first". */
const spoken = (item: PlanItem | undefined) => {
  const ex = item && exerciseById(item.exerciseId)
  return ex ? `${ex.name}${ex.perSide ? ', first side' : ''}` : ''
}

function CueToggles() {
  const [s, setS] = useState<CueSettings>(cueSettings)
  const set = (next: CueSettings) => {
    setS(next)
    saveCueSettings(next)
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      {(['sound', 'voice'] as const).map((k) => (
        <button
          key={k}
          aria-pressed={s[k]}
          onClick={() => set({ ...s, [k]: !s[k] })}
          className={`flex h-11 items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold ring-1 ring-[var(--border)] ${
            s[k] ? 'bg-[var(--accent-soft)] text-[var(--accent-ink)]' : 'bg-[var(--surface)] text-[var(--muted)]'
          }`}
        >
          <Volume2 size={16} /> {k === 'sound' ? 'Beeps' : 'Voice'} {s[k] ? 'on' : 'off'}
        </button>
      ))}
    </div>
  )
}

function ItemRow({ item, planned, input, onToday }: { item: PlanItem; planned: string; input: EngineInput; onToday: (id: string | null) => void }) {
  const [open, setOpen] = useState(false)
  const ex = exerciseById(item.exerciseId)
  if (!ex) return null
  return (
    <li>
      <button className="flex w-full items-center gap-3 px-4 py-2.5 text-left" onClick={() => item.ladderId && setOpen((o) => !o)}>
        <Thumb size={48}>
          <FigureView animation={ex.animation} showLabel={false} time={ex.animation.frames[0].move} />
        </Thumb>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{ex.name}</span>
          <span className="block text-[12px] text-[var(--muted)]">
            {item.rounds && item.rounds > 1 ? `${item.rounds} × ` : ''}
            {item.work} s{ex.perSide ? ' each side' : ''}
            {item.rest ? ` · rest ${item.rest} s` : ''}
          </span>
        </span>
        {item.ladderId && <ChevronDown size={18} className={`shrink-0 text-[var(--muted)] transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && item.ladderId && (
        <div className="px-4 pb-3">
          <VariationSwitch item={item} planned={planned} input={input} onToday={onToday} />
        </div>
      )}
    </li>
  )
}

function Rate({ items, onSave }: { items: PlanItem[]; onSave: (r: Record<number, { rating: Rating; pain: number }>, effort: number | null) => Promise<void> }) {
  const [rates, setRates] = useState<Record<number, { rating: Rating; pain: number }>>(() =>
    Object.fromEntries(items.map((_, i) => [i, { rating: 'right' as Rating, pain: 0 }])),
  )
  const [effort, setEffort] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const set = (i: number, v: Partial<{ rating: Rating; pain: number }>) => setRates((r) => ({ ...r, [i]: { ...r[i], ...v } }))
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[24px] font-semibold">How did it feel?</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">One tap per exercise. "Too easy" twice in a row moves you up a step; "too hard" or pain moves you down.</p>
      </div>
      {items.map((it, i) => {
        const ex = exerciseById(it.exerciseId)
        if (!ex) return null
        return (
          <Card key={i} className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Thumb size={44}>
                <FigureView animation={ex.animation} showLabel={false} time={ex.animation.frames[0].move} />
              </Thumb>
              <div className="min-w-0 flex-1 truncate text-[15px] font-semibold">{ex.name}</div>
            </div>
            <Segmented
              size="sm"
              label={`${ex.name}: how it felt`}
              value={rates[i].rating}
              onChange={(rating) => set(i, { rating })}
              options={[
                { value: 'easy' as Rating, label: 'Too easy' },
                { value: 'right' as Rating, label: 'About right' },
                { value: 'hard' as Rating, label: 'Too hard' },
              ]}
            />
            <div className="flex items-center gap-3 text-[13px]">
              <span className="shrink-0 text-[var(--muted)]">Joint pain</span>
              <input
                type="range"
                min={0}
                max={10}
                value={rates[i].pain}
                onChange={(e) => set(i, { pain: Number(e.target.value) })}
                aria-label={`${ex.name}: highest joint pain, 0 to 10`}
                className="flex-1 accent-[var(--accent)]"
              />
              <span className={`w-12 text-right font-semibold tabular-nums ${rates[i].pain >= 4 ? 'text-[var(--warn)]' : 'text-[var(--muted)]'}`}>
                {rates[i].pain ? `${rates[i].pain}/10` : 'None'}
              </span>
            </div>
          </Card>
        )
      })}
      <Card className="space-y-3 p-4">
        <div className="text-[15px] font-semibold">Session effort (optional)</div>
        <Segmented size="sm" label="Session effort" value={effort} onChange={setEffort} options={[2, 4, 6, 8, 10].map((v) => ({ value: v, label: String(v) }))} />
        <div className="flex justify-between px-1 text-[11px] text-[var(--muted)]">
          <span>Very easy</span>
          <span>Maximal</span>
        </div>
      </Card>
      <button
        className="btn btn-primary w-full"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          await onSave(rates, effort)
        }}
      >
        Save and finish
      </button>
    </div>
  )
}

/** Moves on to the rating once every readiness test has a result. */
function TestsDone({ onDone }: { onDone: () => void }) {
  useEffect(onDone, [onDone])
  return null
}

export function IntervalPlayer({ session, plan, input, onFinished }: { session: WorkoutSession; plan: Plan; input: EngineInput; onFinished: (u: LadderUpdate[]) => void }) {
  const [custom, setCustom] = useCustom(session.id)
  const [started, setStarted] = useState(custom.elapsed > 0)
  const [stage, setStage] = useState<'run' | 'tests' | 'rate'>('run')
  const [showInfo, setShowInfo] = useState(false)

  const buildTime = timing(input, programmeWeek(input)).build
  // Planned items with today's swaps applied (same timing), then extra exercises.
  const items = useMemo(() => {
    const planned = plan.items.map((it) => {
      const id = it.ladderId && !it.test && custom.swaps[it.ladderId]
      const alt = id ? buildItem(input, { phase: it.phase, exerciseId: id, sets: it.sets, ladderId: it.ladderId, notes: it.notes }) : null
      return alt ? { ...it, ...alt, block: it.block, work: it.work, rest: it.rest, rounds: it.rounds } : it
    })
    const extras = custom.extras.flatMap((ladderId) => {
      const ladder = LADDERS[ladderId]
      const id = ladder?.steps[Math.min(input.steps[ladderId] ?? ladder.start, ladder.steps.length - 1)].id
      const it = id && buildItem(input, { phase: 'main', exerciseId: id, sets: 2, ladderId, notes: ['Extra exercise.'] })
      return it ? [{ ...it, block: 'build' as const, work: buildTime.work, rest: buildTime.rest, rounds: 2 }] : []
    })
    return [...planned, ...extras]
  }, [plan.items, custom.swaps, custom.extras, input, buildTime.work, buildTime.rest])
  const intervals = useMemo<Interval[]>(() => {
    const base = (plan.intervals ?? []).map((iv) => ({ ...iv }))
    const more: Interval[] = []
    if (custom.extraRound)
      for (const iv of base) if (items[iv.item]?.block === 'build' && iv.round === 1) more.push({ ...iv, round: (items[iv.item].rounds ?? 1) + 1 })
    custom.extras.forEach((_, k) => {
      const i = plan.items.length + k
      if (!items[i]) return
      const perSide = !!exerciseById(items[i].exerciseId)?.perSide
      for (const round of [1, 2]) more.push({ item: i, round, work: buildTime.work, rest: buildTime.rest, perSide, switch: perSide ? 10 : undefined })
    })
    if (more.length && base.length) base[base.length - 1].rest = 20
    return [...base, ...more]
  }, [plan.intervals, plan.items.length, custom.extraRound, custom.extras, items, buildTime.work, buildTime.rest])
  const segments = useMemo(() => buildTimeline(intervals), [intervals])
  const tests = items.filter((i) => i.test)
  const testsDone = useLiveQuery(
    async () => (await db.sets.where('session_id').equals(session.id).filter((s) => !s.deleted && s.exercise_id.startsWith('test:')).toArray()).map((s) => s.exercise_id),
    [session.id],
  )

  const onEvent = (e: ClockEvent) => {
    if (e.type === 'done') {
      beep('end')
      say('Session complete.')
      return
    }
    const seg = segments[e.index]
    if (e.type === 'countdown') return beep('tick')
    if (e.type !== 'segment') return
    const item = items[seg.item]
    if (seg.kind === 'work') {
      beep('start')
      const prev = segments[e.index - 1]
      if (seg.side === 2) say('Other side')
      else if (!prev || prev.kind === 'work') say(spoken(item))
    } else {
      beep('end')
      say(seg.side === 2 ? 'Switch sides' : `Rest. Next: ${spoken(item)}`)
    }
  }
  const clock = useIntervalClock(segments, onEvent)
  useWakeLock(started && clock.running)

  // Remember progress for a reload; resume from it once.
  useEffect(() => {
    if (clock.running) setCustom((c) => ({ ...c, elapsed: Math.floor(clock.elapsed) }))
  }, [Math.floor(clock.elapsed / 5)]) // every 5 s
  useEffect(() => {
    if (custom.elapsed > 0) {
      const i = segments.findIndex((s) => s.start + s.seconds > custom.elapsed)
      if (i >= 0) clock.seek(i)
    }
    return stopSpeech
  }, [])

  const seg: Segment | undefined = segments[clock.index]
  const item = seg ? items[seg.item] : undefined
  const exercise = item && exerciseById(item.exerciseId)
  const total = totalSeconds(segments)
  const rated = items.filter((it, i) => it.ladderId && !it.test && intervals.some((iv) => iv.item === i))

  const header = (
    <header className="flex items-center justify-between gap-2 py-2">
      <button
        aria-label="Discard session"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface)] ring-1 ring-[var(--border)]"
        onClick={() => confirm('Discard this session?') && (stopSpeech(), discardSession(session.id))}
      >
        <X size={20} />
      </button>
      <div className="text-center">
        <div className="text-[13px] font-semibold">{SESSION_NAMES[plan.type]}</div>
        <div className="text-[11px] text-[var(--muted)] tabular-nums">
          {fmt(Math.min(clock.elapsed, total))} of {fmt(total)}
        </div>
      </div>
      <button
        className="h-10 rounded-full px-3 text-[13px] font-semibold text-[var(--accent)]"
        onClick={() => {
          clock.pause()
          stopSpeech()
          setStage(tests.length ? 'tests' : 'rate')
        }}
      >
        Finish
      </button>
    </header>
  )

  const shell = (children: React.ReactNode) => (
    <div id="player-scroll" className="fixed inset-0 z-40 overflow-y-auto bg-[var(--bg)]">
      <div className="mx-auto max-w-xl px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {header}
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${Math.min(100, (clock.elapsed / Math.max(1, total)) * 100)}%` }} />
        </div>
        {children}
      </div>
    </div>
  )

  if (stage === 'rate') {
    return shell(
      <div className="pt-5">
        <Rate
          items={rated}
          onSave={async (rates, effort) => {
            // One set per completed round, so weekly volume counts each interval (R16).
            const doneAt = clock.elapsed
            for (const [k, r] of Object.entries(rates)) {
              const it = rated[Number(k)]
              const index = items.indexOf(it)
              const rounds = segments.filter((s) => s.kind === 'work' && s.item === index && s.side !== 2 && s.start < doneAt).length
              for (let n = 0; n < Math.max(1, rounds); n++)
                await logSet({ session_id: session.id, exercise_id: it.exerciseId, reps: null, seconds: it.work ?? null, rir: RATING_RIR[r.rating], pain: r.pain })
            }
            onFinished(await finishProgrammeSession(session.id, effort))
          }}
        />
      </div>,
    )
  }

  if (stage === 'tests') {
    const next = tests.find((t) => !testsDone?.includes(testId(t.test!.stepId)))
    if (testsDone && !next) return shell(<TestsDone onDone={() => setStage('rate')} />)
    return shell(
      <div className="space-y-4 pt-5">
        {next && (
          <>
            <div className="overflow-hidden rounded-[26px] bg-[var(--stage)] ring-1 ring-[var(--border)]">
              <FigureView animation={exerciseById(next.exerciseId)!.animation} />
            </div>
            <ReadinessTest key={next.test!.stepId} item={next} sessionId={session.id} done={false} onNext={() => undefined} />
            <button className="btn btn-ghost w-full" onClick={() => setStage('rate')}>
              Skip the test today
            </button>
          </>
        )}
      </div>,
    )
  }

  if (!started) {
    const blocks = (['ramp', 'build', 'peak', 'winddown'] as Block[]).map((b) => [b, items.filter((i) => i.block === b && !i.test)] as const).filter(([, l]) => l.length)
    return shell(
      <div className="space-y-4 pt-4">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="accent">About {Math.round(total / 60)} min</Tag>
          <Tag>{rated.length} rated exercises</Tag>
          <Tag>No jumping</Tag>
        </div>
        <p className="text-[13px] text-[var(--muted)]">
          Exercises get harder as you go: the first ones are your warm-up. Tap an exercise to change its version or step for today.
        </p>
        <Card className="overflow-hidden">
          {blocks.map(([b, list]) => (
            <div key={b} className="border-b border-[var(--border)] last:border-b-0">
              <Eyebrow className="px-4 pt-3.5 pb-1">{BLOCK_LABEL[b]}</Eyebrow>
              <ul>
                {list.map((it) => (
                  <ItemRow
                    key={`${b}-${it.exerciseId}`}
                    item={it}
                    planned={plan.items.find((p) => p.ladderId === it.ladderId && !p.test)?.exerciseId ?? it.exerciseId}
                    input={input}
                    onToday={(id) =>
                      setCustom((c) => {
                        const swaps = { ...c.swaps }
                        if (id && id !== plan.items.find((p) => p.ladderId === it.ladderId)?.exerciseId) swaps[it.ladderId!] = id
                        else delete swaps[it.ladderId!]
                        return { ...c, swaps }
                      })
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
        </Card>
        <CueToggles />
        <button
          className="btn btn-primary w-full text-[17px]"
          onClick={() => {
            unlockCues()
            setStarted(true)
            clock.start()
          }}
        >
          <Play size={18} fill="currentColor" /> Start
        </button>
      </div>,
    )
  }

  if (clock.done) {
    return shell(
      <div className="space-y-4 pt-6">
        <Card className="space-y-2 p-5 text-center">
          <h2 className="text-[22px] font-semibold">Intervals done</h2>
          <p className="text-sm text-[var(--muted)]">Rate each exercise next, so the programme can adjust.</p>
        </Card>
        {extraOptions(input, plan.type, items).map((o) => {
          const ex = exerciseById(o.exerciseId)
          if (!ex || !o.ladderId) return null
          return (
            <button
              key={o.ladderId}
              className="flex w-full items-center gap-3 rounded-2xl bg-[var(--surface)] p-2 pr-3 text-left ring-1 ring-[var(--border)]"
              onClick={() => {
                unlockCues()
                setCustom((c) => ({ ...c, extras: [...c.extras, o.ladderId!] }))
              }}
            >
              <Thumb size={52}>
                <FigureView animation={ex.animation} showLabel={false} time={ex.animation.frames[0].move} />
              </Thumb>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] text-[var(--muted)]">Add an exercise · 2 × {buildTime.work} s</span>
                <span className="block truncate text-[15px] font-semibold">{ex.name}</span>
              </span>
              <Plus size={20} className="shrink-0 text-[var(--accent)]" />
            </button>
          )
        })}
        {!custom.extraRound && plan.items.some((i) => i.block === 'build') && (
          <Card className="space-y-3 p-5">
            <div>
              <h3 className="text-[17px] font-semibold">Time for more?</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">One more round of the Build block, at the same timing.</p>
            </div>
            <button
              className="btn btn-secondary w-full"
              onClick={() => {
                unlockCues()
                setCustom((c) => ({ ...c, extraRound: true }))
              }}
            >
              <Plus size={18} /> Add a round
            </button>
          </Card>
        )}
        <button className="btn btn-primary w-full" onClick={() => setStage(tests.length ? 'tests' : 'rate')}>
          Continue
        </button>
      </div>,
    )
  }

  const work = seg?.kind === 'work'
  const nextWork = segments.findIndex((s, i) => i > clock.index && s.kind === 'work')
  const prevWork = (() => {
    for (let i = clock.index - (seg && clock.left < seg.seconds - 3 ? 0 : 1); i >= 0; i--) if (segments[i].kind === 'work') return i
    return 0
  })()

  return shell(
    <div className="space-y-4 pt-4">
      <div className={`overflow-hidden rounded-[26px] ring-1 ring-[var(--border)] ${work ? 'bg-[var(--stage)]' : 'bg-[var(--surface-2)] opacity-90'}`}>
        {exercise && <FigureView animation={exercise.animation} />}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow className="text-[var(--accent)]">
            {item?.block ? BLOCK_LABEL[item.block] : ''}
            {work ? '' : seg?.side === 2 ? ' · switch sides' : ' · rest, next up'}
          </Eyebrow>
          <h1 className="mt-1 text-[24px] leading-tight font-semibold">{exercise?.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item?.rounds && item.rounds > 1 && <Tag>Round {seg?.round} of {item.rounds}</Tag>}
            {seg?.side && <Tag tone="accent">{seg.side === 1 ? 'First side' : 'Second side'}</Tag>}
            {exercise && <Tag>{targetText(exercise)}</Tag>}
          </div>
        </div>
        <Ring value={seg ? clock.left / seg.seconds : 0} size={104} stroke={8}>
          <div className={`text-[28px] leading-none font-semibold tabular-nums ${work ? '' : 'text-[var(--muted)]'}`}>{Math.ceil(clock.left)}</div>
          <div className="eyebrow mt-1">{work ? 'Work' : 'Rest'}</div>
        </Ring>
      </div>

      <div className="flex items-center justify-center gap-4 py-2">
        <button aria-label="Back" className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] ring-1 ring-[var(--border)]" onClick={() => clock.seek(prevWork)}>
          <SkipBack size={20} />
        </button>
        <button
          aria-label={clock.running ? 'Pause' : 'Resume'}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)] shadow-md active:scale-95"
          onClick={() => {
            if (clock.running) {
              clock.pause()
              stopSpeech()
            } else {
              unlockCues()
              clock.start()
            }
          }}
        >
          {clock.running ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" />}
        </button>
        <button
          aria-label="Skip"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface)] ring-1 ring-[var(--border)]"
          onClick={() => (nextWork >= 0 ? clock.seek(nextWork) : clock.seek(segments.length - 1))}
        >
          <SkipForward size={20} />
        </button>
      </div>

      <button className="flex w-full items-center justify-between rounded-2xl bg-[var(--surface)] px-4 py-3 text-[15px] font-medium ring-1 ring-[var(--border)]" onClick={() => setShowInfo((s) => !s)}>
        How to do it
        <ChevronDown size={18} className={`text-[var(--muted)] transition-transform ${showInfo ? 'rotate-180' : ''}`} />
      </button>
      {showInfo && exercise && <ExerciseInfo exercise={exercise} />}
    </div>,
  )
}
