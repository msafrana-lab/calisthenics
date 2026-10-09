import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bike, Check, ChevronRight, Clock, Dumbbell, Info, Play, Shuffle, Sparkles, StretchHorizontal, TriangleAlert } from 'lucide-react'
import { FigureView } from '../animation/FigureView'
import { exerciseById } from '../exercises/library'
import { ExerciseDetailView } from '../components/ExerciseDetail'
import { SessionPlayer } from '../components/SessionPlayer'
import { LADDERS, SESSION_NAMES, type SessionType } from '../programme/ladders'
import { localDay, morningCheckDue, plan as makePlan, STRETCH_TOP_UP, stretchPlan, type Cycling, type EngineInput, type LadderUpdate, type Morning, type PlanItem } from '../programme/engine'
import { activeSession, startSession } from '../lib/sessions'
import { db } from '../lib/db'
import { importedActivities, loadsLegs, sportName } from '../lib/activities'
import { saveMorning, setCycling, today, useEngineInput } from '../lib/programme'
import { addDays, weekStart } from '../progress/metrics'
import { Callout, Card, Eyebrow, ScreenHeader, Segmented, SectionTitle, Tag, Thumb } from '../ui'
import type { Region } from '../exercises/types'
import type { Account } from '../lib/useAccount'

const REGION_LABEL: Record<Region, string> = { knee: 'Knees', shoulder: 'Shoulders', wrist: 'Wrists' }
const PHASES = [
  ['warmup', 'Warm-up'],
  ['main', 'Workout'],
  ['cooldown', 'Cool-down'],
] as const

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function WeekStrip({ doneDays, todayDay }: { doneDays: Set<string>; todayDay: string }) {
  const monday = weekStart(todayDay)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  return (
    <div className="flex justify-between px-1">
      {days.map((d) => {
        const done = doneDays.has(d)
        const isToday = d === todayDay
        const label = new Date(`${d}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'narrow' })
        return (
          <div key={d} className="flex flex-col items-center gap-1.5">
            <span className={`text-[11px] font-medium ${isToday ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>{label}</span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold ${
                done
                  ? 'bg-[var(--accent)] text-[var(--accent-text)]'
                  : isToday
                    ? 'bg-[var(--surface)] text-[var(--text)] ring-2 ring-[var(--accent)]'
                    : 'bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]'
              }`}
            >
              {done ? <Check size={16} strokeWidth={3} /> : Number(d.slice(8))}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function MorningCheck({ sessionId, regions }: { sessionId: string; regions: Region[] }) {
  const [answers, setAnswers] = useState<Morning>({})
  const [result, setResult] = useState<LadderUpdate[] | null>(null)
  if (result) {
    return (
      <Callout icon={<Check size={18} />}>
        {result.length ? 'Thanks. Exercises that loaded those joints move one step easier, with fewer sets next time.' : 'Thanks, noted.'}
      </Callout>
    )
  }
  const complete = regions.every((r) => answers[r])
  return (
    <Card className="space-y-4 p-5">
      <div>
        <Eyebrow>Morning check</Eyebrow>
        <p className="mt-1 text-[15px] font-medium">How do these feel compared with usual, after your last session?</p>
      </div>
      {regions.map((r) => (
        <div key={r} className="space-y-1.5">
          <div className="text-sm font-medium">{REGION_LABEL[r]}</div>
          <Segmented
            label={REGION_LABEL[r]}
            value={answers[r] ?? null}
            onChange={(v) => setAnswers((a) => ({ ...a, [r]: v }))}
            options={[
              { value: 'same', label: 'Usual or better' },
              { value: 'worse', label: 'Worse' },
            ]}
          />
        </div>
      ))}
      <button className="btn btn-primary w-full" disabled={!complete} onClick={async () => setResult(await saveMorning(today(), sessionId, answers))}>
        Save
      </button>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Swelling, locking, giving way, sharp or night pain, numbness, or pain lasting over 48 hours: stop training that area and get it assessed.
      </p>
    </Card>
  )
}

function CardioToday({ value }: { value: Cycling | null }) {
  const day = today()
  const manual = useLiveQuery(async () => (await db.days.get(day))?.cycling ?? null, [day])
  const activities = useLiveQuery(async () => (await importedActivities()).filter((r) => localDay(r.recorded_at) === day), [day])
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center gap-2">
        <Bike size={18} className="text-[var(--accent)]" />
        <h2 className="text-[15px] font-semibold">Cycling and sport today</h2>
      </div>
      <Segmented
        label="Cycling today"
        value={value}
        onChange={(v) => setCycling(day, manual === v ? null : v)}
        options={[
          { value: 'none', label: 'None' },
          { value: 'easy', label: 'Easy' },
          { value: 'hard', label: 'Hard' },
        ]}
      />
      {!!activities?.length && (
        <div className="flex flex-wrap gap-1.5">
          {activities.map((r) => (
            <Tag key={r.id} tone={loadsLegs(r) && r.details?.intensity === 'hard' ? 'accent' : 'neutral'}>
              {r.value} min {sportName(r)}
              {loadsLegs(r) ? ` · ${r.details?.intensity ?? 'easy'}` : ''}
            </Tag>
          ))}
          <span className="text-xs text-[var(--muted)]">from Strava{manual ? ', overridden by your choice' : ''}</span>
        </div>
      )}
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        Hard: intervals, threshold work or over 60 min, for rides and leg-heavy sports. It moves the legs session to another day.
      </p>
    </Card>
  )
}

function itemMeta(item: PlanItem) {
  const ex = exerciseById(item.exerciseId)
  const unit = item.measure === 'reps' ? 'reps' : 's'
  const range = `${item.target[0]}${item.target[1] !== item.target[0] ? `–${item.target[1]}` : ''} ${unit}`
  return `${item.sets > 1 ? `${item.sets} × ` : ''}${range}${ex?.perSide ? ' each side' : ''}`
}

function ItemRow({ item, onOpen }: { item: PlanItem; onOpen: () => void }) {
  const ex = exerciseById(item.exerciseId)
  if (!ex) return null
  const ladder = item.ladderId ? LADDERS[item.ladderId] : undefined
  return (
    <li>
      <button className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[var(--surface-2)]" onClick={onOpen}>
        <Thumb size={60}>
          <FigureView animation={ex.animation} showLabel={false} time={ex.animation.frames[0].move} />
        </Thumb>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{ex.name}</div>
          <div className="text-[13px] text-[var(--muted)]">
            {itemMeta(item)}
            {ladder ? ` · step ${ladder.steps.findIndex((s) => s.id === item.exerciseId) + 1} of ${ladder.steps.length}` : ''}
          </div>
        </div>
        <ChevronRight size={18} className="shrink-0 text-[var(--muted)]" />
      </button>
    </li>
  )
}

/** A ride or leg-loading activity today or yesterday (set by hand or imported). */
function rodeRecently(input: EngineInput) {
  const yesterday = addDays(input.today, -1)
  return input.days.some((d) => (d.day === input.today || d.day === yesterday) && (d.cycling === 'easy' || d.cycling === 'hard'))
}

function StretchTopUp({ input }: { input: EngineInput }) {
  const p = stretchPlan(input, rodeRecently(input))
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
          <StretchHorizontal size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold">Stretch top-up</h2>
          <p className="text-[13px] text-[var(--muted)]">
            Optional · about {Math.max(2, p.minutes)} min · {p.reasons[0]}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {p.items.map((i) => {
          const ex = exerciseById(i.exerciseId)
          if (!ex) return null
          return (
            <div key={i.exerciseId} className="min-w-0 flex-1 space-y-1">
              <div className="overflow-hidden rounded-2xl bg-[var(--stage)] ring-1 ring-[var(--border)]">
                <FigureView animation={ex.animation} showLabel={false} time={ex.animation.frames[0].move} />
              </div>
              <div className="truncate text-center text-[12px] text-[var(--muted)]">{ex.name}</div>
            </div>
          )
        })}
      </div>
      <button className="btn btn-secondary w-full" onClick={() => startSession(STRETCH_TOP_UP)}>
        <Play size={17} fill="currentColor" /> Start stretches
      </button>
    </Card>
  )
}

function Summary({ updates, stretch, onClose }: { updates: LadderUpdate[]; stretch: boolean; onClose: () => void }) {
  return (
    <div className="space-y-5 pt-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-[var(--accent-text)]">
          <Check size={30} strokeWidth={2.5} />
        </span>
        <h1 className="text-[28px] font-semibold">Session complete</h1>
        <p className="max-w-xs text-sm text-[var(--muted)]">Saved on this phone and backed up when you are online.</p>
      </div>
      {!stretch && (
      <Card className="p-5">
        <Eyebrow>Next time</Eyebrow>
        {updates.length ? (
          <ul className="mt-3 space-y-3">
            {updates.map((u) => (
              <li key={u.ladderId} className="flex gap-3 text-sm">
                <Sparkles size={18} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                <div>
                  <div className="font-semibold">{LADDERS[u.ladderId].name}</div>
                  <div className="text-[var(--muted)]">{u.reason}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--muted)]">Same exercises: aim for one more rep or a few more seconds.</p>
        )}
      </Card>
      )}
      <button className="btn btn-primary w-full" onClick={onClose}>
        Done
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
  const [summary, setSummary] = useState<{ updates: LadderUpdate[]; stretch: boolean } | null>(null)

  if (!input) return null

  if (summary) return <Summary updates={summary.updates} stretch={summary.stretch} onClose={() => setSummary(null)} />

  if (session) {
    const stretch = session.day_type === STRETCH_TOP_UP
    const type = (['A', 'B', 'C', 'D'] as const).find((t) => t === session.day_type)
    return (
      <SessionPlayer
        session={session}
        plan={stretch ? stretchPlan(input, rodeRecently(input)) : makePlan(input, type)}
        input={input}
        onFinished={(u) => {
          setSummary({ updates: u, stretch })
          account.syncNow()
        }}
      />
    )
  }

  const open = openId ? exerciseById(openId) : undefined
  if (open) return <ExerciseDetailView exercise={open} onBack={() => setOpenId(null)} />

  const p = makePlan(input, override)
  const todayLog = input.days.find((d) => d.day === input.today)
  const check = morningCheckDue(input)
  const finished = input.sessions.filter((s) => !s.deleted && s.ended_at)
  const doneDays = new Set(finished.filter((s) => s.day_type !== STRETCH_TOP_UP).map((s) => localDay(s.started_at)))
  const stretchedToday = finished.some((s) => s.day_type === STRETCH_TOP_UP && localDay(s.started_at) === input.today)
  const doneToday = doneDays.has(input.today)
  const lead = exerciseById(p.items.find((i) => i.phase === 'main')?.exerciseId ?? '')
  const mainCount = p.items.filter((i) => i.phase === 'main').length

  return (
    <div className="space-y-5">
      <ScreenHeader eyebrow={new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} title={greeting()} />

      <WeekStrip doneDays={doneDays} todayDay={input.today} />

      {check && <MorningCheck sessionId={check.session.id} regions={check.regions} />}

      <section
        className="card overflow-hidden"
        style={{ background: 'linear-gradient(160deg, var(--hero-from) 0%, var(--hero-to) 100%)' }}
      >
        <div className="flex items-start gap-3 p-5 pb-0">
          <div className="min-w-0 flex-1">
            <Eyebrow>
              {doneToday ? 'Done today · up next' : 'Today'} · week {p.week}
              {p.deload ? ' · lighter week' : ''}
            </Eyebrow>
            <h2 className="mt-1.5 text-[26px] leading-tight font-semibold">{SESSION_NAMES[p.type]}</h2>
            <div className="mt-3 flex flex-wrap gap-3 text-[13px] text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <Clock size={15} /> About {Math.max(5, Math.round(p.minutes / 5) * 5)} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Dumbbell size={15} /> {mainCount} exercises
              </span>
            </div>
          </div>
          {lead && (
            <div className="w-28 shrink-0 overflow-hidden rounded-2xl bg-[var(--stage)]/70">
              <FigureView animation={lead.animation} showLabel={false} />
            </div>
          )}
        </div>
        <div className="space-y-2 p-5">
          {[...p.warnings, ...p.reasons].map((r) => (
            <div key={r} className="flex gap-2 text-[13px] text-[var(--muted)]">
              {p.warnings.includes(r) ? <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[var(--warn)]" /> : <Info size={15} className="mt-0.5 shrink-0" />}
              <span>{r}</span>
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button className="btn btn-primary flex-1" onClick={() => startSession(p.type)}>
              <Play size={18} fill="currentColor" /> Start
            </button>
            <button className="btn btn-secondary px-4" onClick={() => setChoosing((c) => !c)} aria-label="Change session">
              <Shuffle size={18} />
            </button>
          </div>
          {choosing && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {(['A', 'B', 'C', 'D'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setOverride(t)
                    setChoosing(false)
                  }}
                  className={`min-h-12 rounded-2xl px-3 text-left text-[13px] font-semibold ${
                    p.type === t ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--surface)] ring-1 ring-[var(--border)]'
                  }`}
                >
                  {SESSION_NAMES[t]}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <CardioToday value={todayLog?.cycling ?? null} />

      {!stretchedToday && <StretchTopUp input={input} />}

      <SectionTitle>Plan</SectionTitle>
      <Card className="overflow-hidden">
        {PHASES.map(([phase, label]) => {
          const items = p.items.filter((i) => i.phase === phase)
          if (!items.length) return null
          return (
            <div key={phase} className="border-b border-[var(--border)] last:border-b-0">
              <Eyebrow className="px-4 pt-4 pb-1">{label}</Eyebrow>
              <ul className="divide-y divide-[var(--border)]">
                {items.map((i) => (
                  <ItemRow key={`${phase}-${i.exerciseId}`} item={i} onOpen={() => setOpenId(i.exerciseId)} />
                ))}
              </ul>
            </div>
          )
        })}
      </Card>
    </div>
  )
}
