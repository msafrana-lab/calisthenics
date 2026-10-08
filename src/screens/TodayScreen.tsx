import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FigureView } from '../animation/FigureView'
import { exerciseById } from '../exercises/library'
import { ExerciseHeader, ExerciseInfo } from '../components/ExerciseDetail'
import { SessionPlayer } from '../components/SessionPlayer'
import { LADDERS, SESSION_NAMES, type SessionType } from '../programme/ladders'
import { localDay, morningCheckDue, plan as makePlan, type Cycling, type LadderUpdate, type Morning, type PlanItem } from '../programme/engine'
import { activeSession, startSession } from '../lib/sessions'
import { db } from '../lib/db'
import { importedActivities, loadsLegs, sportName } from '../lib/activities'
import { saveMorning, setCycling, today, useEngineInput } from '../lib/programme'
import type { Region } from '../exercises/types'
import type { Account } from '../lib/useAccount'

const REGION_LABEL: Record<Region, string> = { knee: 'Knees', shoulder: 'Shoulders', wrist: 'Wrists' }
const PHASES = [
  ['warmup', 'Warm-up'],
  ['main', 'Main'],
  ['cooldown', 'Cool-down'],
] as const

function MorningCheck({ sessionId, regions }: { sessionId: string; regions: Region[] }) {
  const [answers, setAnswers] = useState<Morning>({})
  const [result, setResult] = useState<LadderUpdate[] | null>(null)
  if (result) {
    return (
      <div className="card p-4 text-sm">
        {result.length ? 'Thanks. The exercises that loaded those joints move one step easier, with fewer sets next time.' : 'Thanks, noted.'}
      </div>
    )
  }
  const complete = regions.every((r) => answers[r])
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">Morning check</h2>
      <p className="text-sm text-[var(--muted)]">Compared with your usual, how do these feel after the last session?</p>
      {regions.map((r) => (
        <div key={r} className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{REGION_LABEL[r]}</span>
          <div className="flex gap-1.5">
            {(['same', 'worse'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setAnswers((a) => ({ ...a, [r]: v }))}
                className={`h-10 rounded-xl px-3 text-sm font-semibold ${answers[r] === v ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--accent-soft)]'}`}
              >
                {v === 'same' ? 'Usual or better' : 'Worse'}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button className="btn btn-primary w-full" disabled={!complete} onClick={async () => setResult(await saveMorning(today(), sessionId, answers))}>
        Save
      </button>
      <p className="text-xs text-[var(--muted)]">
        Swelling, locking, giving way, sharp or night pain, numbness, or pain lasting over 48 hours: stop training that area and get it assessed.
      </p>
    </div>
  )
}

function CyclingToday({ value }: { value: Cycling | null }) {
  const options: [Cycling, string][] = [
    ['none', 'No ride'],
    ['easy', 'Easy ride'],
    ['hard', 'Hard ride'],
  ]
  const day = today()
  const manual = useLiveQuery(async () => (await db.days.get(day))?.cycling ?? null, [day])
  const rides = useLiveQuery(async () => (await importedActivities()).filter((r) => localDay(r.recorded_at) === day), [day])
  return (
    <div className="card space-y-2 p-4">
      <h2 className="font-semibold">Cycling and sport today</h2>
      <div className="flex gap-1.5">
        {options.map(([v, label]) => (
          <button
            key={v}
            onClick={() => setCycling(day, manual === v ? null : v)}
            className={`h-10 flex-1 rounded-xl text-sm font-semibold ${value === v ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--accent-soft)]'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {!!rides?.length && (
        <p className="text-sm">
          From Strava:{' '}
          {rides
            .map((r) => `${r.value} min ${sportName(r)}${loadsLegs(r) ? ` (${r.details?.intensity ?? 'easy'} for the legs)` : ''}`)
            .join(', ')}
          {manual ? ' · your own setting above is used instead.' : '.'}
        </p>
      )}
      <p className="text-xs text-[var(--muted)]">
        Hard = intervals, threshold work or longer than 60 min, for rides and leg-heavy sports such as hikes, runs or skating. Tap a selected
        option again to clear it.
      </p>
    </div>
  )
}

function ItemRow({ item, onOpen }: { item: PlanItem; onOpen: () => void }) {
  const ex = exerciseById(item.exerciseId)
  if (!ex) return null
  const unit = item.measure === 'reps' ? 'reps' : 's'
  return (
    <li>
      <button className="card flex w-full items-center gap-3 overflow-hidden p-2 text-left" onClick={onOpen}>
        <div className="w-24 shrink-0 overflow-hidden rounded-xl">
          <FigureView animation={ex.animation} showLabel={false} time={ex.animation.frames[0].move} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{ex.name}</div>
          <div className="text-sm text-[var(--muted)]">
            {item.sets > 1 ? `${item.sets} × ` : ''}
            {item.target[0]}
            {item.target[1] !== item.target[0] ? `–${item.target[1]}` : ''} {unit}
            {ex.perSide ? ' each side' : ''}
            {item.ladderId ? ` · ${LADDERS[item.ladderId].name} step ${LADDERS[item.ladderId].steps.findIndex((s) => s.id === item.exerciseId) + 1}` : ''}
          </div>
        </div>
      </button>
    </li>
  )
}

function Summary({ updates, onClose }: { updates: LadderUpdate[]; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Session saved</h1>
      {updates.length ? (
        <ul className="card divide-y divide-[var(--border)] text-sm">
          {updates.map((u) => (
            <li key={u.ladderId} className="p-3">
              <b>{LADDERS[u.ladderId].name}:</b> {u.reason}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">No step changes: keep the same exercises and aim for one more rep or a few more seconds next time.</p>
      )}
      <button className="btn btn-primary w-full" onClick={onClose}>
        Back to today
      </button>
    </div>
  )
}

export function TodayScreen({ account }: { account: Account }) {
  const input = useEngineInput()
  const session = useLiveQuery(() => activeSession(), [])
  const [override, setOverride] = useState<SessionType | undefined>()
  const [choosing, setChoosing] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [summary, setSummary] = useState<LadderUpdate[] | null>(null)

  if (!input) return null

  if (summary) return <Summary updates={summary} onClose={() => setSummary(null)} />

  if (session) {
    const type = (['A', 'B', 'C', 'D'] as const).find((t) => t === session.day_type)
    return (
      <SessionPlayer
        session={session}
        plan={makePlan(input, type)}
        onFinished={(u) => {
          setSummary(u)
          account.syncNow()
        }}
      />
    )
  }

  const open = openId ? exerciseById(openId) : undefined
  if (open) {
    return (
      <div className="space-y-4">
        <ExerciseHeader exercise={open} onBack={() => setOpenId(null)} />
        <ExerciseInfo exercise={open} />
      </div>
    )
  }

  const p = makePlan(input, override)
  const todayLog = input.days.find((d) => d.day === input.today)
  const check = morningCheckDue(input)
  const doneToday = input.sessions.filter((s) => !s.deleted && s.ended_at && localDay(s.started_at) === input.today).length

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-[var(--muted)]">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · Week {p.week}
          {p.deload ? ' (lighter week)' : ''}
        </p>
        <h1 className="text-2xl font-bold">{SESSION_NAMES[p.type]}</h1>
      </header>

      {check && <MorningCheck sessionId={check.session.id} regions={check.regions} />}
      <CyclingToday value={todayLog?.cycling ?? null} />

      {doneToday > 0 && <div className="rounded-2xl bg-[var(--accent-soft)] p-4 text-sm">Today's session is done. The next one is shown below if you want to look ahead.</div>}
      {p.warnings.map((w) => (
        <div key={w} className="rounded-2xl bg-[var(--warn-soft)] p-4 text-sm">
          {w}
        </div>
      ))}
      {p.reasons.length > 0 && (
        <ul className="space-y-1 text-sm text-[var(--muted)]">
          {p.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" onClick={() => startSession(p.type)}>
          Start session
        </button>
        <button className="btn btn-secondary" onClick={() => setChoosing((c) => !c)}>
          Change
        </button>
      </div>
      {choosing && (
        <div className="card space-y-2 p-3">
          <p className="text-sm text-[var(--muted)]">Choose another session for today. The rotation carries on from whatever you do.</p>
          <div className="grid grid-cols-2 gap-2">
            {(['A', 'B', 'C', 'D'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setOverride(t)}
                className={`min-h-11 rounded-xl px-2 text-sm font-semibold ${p.type === t ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--accent-soft)]'}`}
              >
                {SESSION_NAMES[t]}
              </button>
            ))}
          </div>
        </div>
      )}

      {PHASES.map(([phase, label]) => {
        const items = p.items.filter((i) => i.phase === phase)
        if (!items.length) return null
        return (
          <section key={phase} className="space-y-2">
            <h2 className="text-sm font-semibold tracking-wide text-[var(--muted)] uppercase">{label}</h2>
            <ul className="space-y-2">
              {items.map((i) => (
                <ItemRow key={`${phase}-${i.exerciseId}`} item={i} onOpen={() => setOpenId(i.exerciseId)} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
