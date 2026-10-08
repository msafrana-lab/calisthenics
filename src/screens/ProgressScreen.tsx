import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { today } from '../lib/programme'
import { exerciseById } from '../exercises/library'
import { LADDERS } from '../programme/ladders'
import { localDay } from '../programme/engine'
import { BarChart, ChartCard, ColumnChart, LineChart } from '../components/charts'
import { addDays, ladderHistory, setsByGroup, WEEKLY_SET_TARGET, weekStart, weeklyMinutes, weightChange, weightSeries } from '../progress/metrics'

const RANGES = [
  { id: '4w', label: '4 weeks', weeks: 4 },
  { id: '12w', label: '12 weeks', weeks: 12 },
  { id: '1y', label: '1 year', weeks: 52 },
] as const

const shortDate = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const kg = (v: number) => v.toFixed(1)
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : '±'}${Math.abs(v).toFixed(1)}`

function StatTile({ label, value, unit, detail }: { label: string; value: string; unit?: string; detail?: string }) {
  return (
    <div className="card p-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="text-2xl font-semibold">
        {value}
        {unit && <span className="text-sm font-normal text-[var(--muted)]"> {unit}</span>}
      </div>
      {detail && <div className="text-xs text-[var(--muted)]">{detail}</div>}
    </div>
  )
}

function useProgressData() {
  return useLiveQuery(async () => {
    const [sessions, sets, ladders, weighIns, rides] = await Promise.all([
      db.sessions.toArray(),
      db.sets.toArray(),
      db.ladders.toArray(),
      db.health.where('[kind+recorded_at]').between(['weight', ''], ['weight', '￿']).toArray(),
      db.health.where('[kind+recorded_at]').between(['cycling', ''], ['cycling', '￿']).toArray(),
    ])
    return { sessions, sets, steps: Object.fromEntries(ladders.map((l) => [l.ladder_id, l.step])), weighIns, rides }
  }, [])
}

export function ProgressScreen() {
  const data = useProgressData()
  const [rangeId, setRangeId] = useState<(typeof RANGES)[number]['id']>('12w')
  if (!data) return null

  const day = today()
  const range = RANGES.find((r) => r.id === rangeId)!
  const from = addDays(day, -7 * range.weeks + 1)
  const finished = data.sessions.filter((s) => !s.deleted && s.ended_at !== null)

  // Headline figures
  const weights = weightSeries(data.weighIns)
  const change = weightChange(weights)
  const thisWeek = weekStart(day)
  const sessionsThisWeek = finished.filter((s) => localDay(s.started_at) >= thisWeek).length
  const minutes = weeklyMinutes(data.rides, day, range.weeks)
  const rideThisWeek = minutes[minutes.length - 1]?.value ?? 0

  // This week's training volume (not scoped by the range filter)
  const volume = setsByGroup(data.sessions, data.sets, exerciseById, thisWeek)

  // Range-scoped series
  const weightPoints = weights.filter((p) => p.day >= from).map((p) => ({ day: p.day, value: p.average, context: p.weight }))
  const histories = Object.values(LADDERS)
    .map((l) => ({ ladder: l, points: ladderHistory(l.id, data.sessions, data.sets, exerciseById).filter((p) => p.day >= from) }))
    .filter((h) => h.points.length > 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="grid grid-cols-3 gap-2">
        <StatTile
          label="Weight, 7-day avg"
          value={change ? kg(change.current) : '—'}
          unit={change ? 'kg' : undefined}
          detail={change ? (change.change !== null ? `${signed(change.change)} kg in 4 weeks` : 'Change shown after 4 weeks') : 'Connect Withings'}
        />
        <StatTile label="Sessions this week" value={String(sessionsThisWeek)} detail="Since Monday" />
        <StatTile label="Cycling this week" value={String(rideThisWeek)} unit="min" detail="Target 150–300 / week" />
      </div>

      <h2 className="pt-1 font-semibold">This week</h2>
      <ChartCard
        title="Working sets per muscle group"
        subtitle={`Since Monday. Shaded band: the ${WEEKLY_SET_TARGET[0]}–${WEEKLY_SET_TARGET[1]} sets per week the programme aims for. Upper back = shoulder blade and back-extension work.`}
        table={{ head: ['Group', 'Sets'], rows: volume.map((v) => [v.label, v.sets]) }}
      >
        <BarChart rows={volume.map((v) => ({ key: v.group, label: v.label, value: v.sets }))} band={WEEKLY_SET_TARGET} bandLabel="Target" max={12} />
      </ChartCard>

      <div className="flex items-center gap-2 pt-1" role="radiogroup" aria-label="Period">
        {RANGES.map((r) => (
          <button
            key={r.id}
            role="radio"
            aria-checked={r.id === rangeId}
            onClick={() => setRangeId(r.id)}
            className={`h-9 rounded-full px-3 text-sm font-semibold ${r.id === rangeId ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--accent-soft)]'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <ChartCard
        title="Weight (kg)"
        subtitle="Line: 7-day average. Dots: individual weigh-ins, which swing with water and food from day to day."
        table={{ head: ['Date', 'Weigh-in (kg)', '7-day avg (kg)'], rows: weightPoints.slice().reverse().map((p) => [shortDate(p.day), kg(p.context), kg(p.value)]) }}
      >
        <LineChart points={weightPoints} from={from} to={day} format={kg} valueLabel="7-day avg" contextLabel="weigh-in" />
      </ChartCard>

      <ChartCard
        title="Cycling minutes per week"
        subtitle="Indoor and outdoor rides from Strava. Shaded band: the WHO range of 150–300 min of moderate activity per week."
        table={{ head: ['Week of', 'Minutes'], rows: minutes.slice().reverse().map((w) => [shortDate(w.week), w.value]) }}
      >
        <ColumnChart
          columns={minutes.map((w) => ({ key: w.week, label: shortDate(w.week), value: w.value, detail: `Week of ${shortDate(w.week)}` }))}
          band={[150, 300]}
          format={(v) => String(Math.round(v))}
        />
      </ChartCard>

      <h2 className="pt-1 font-semibold">Exercise history</h2>
      <p className="-mt-2 text-xs text-[var(--muted)]">Best set per session. A labelled point marks a move to a new step; reps usually drop there because the exercise is harder.</p>
      {!histories.length && <p className="text-sm text-[var(--muted)]">No finished sessions in this period yet.</p>}
      {histories.map(({ ladder, points }) => {
        const unit = points[0].measure === 'reps' ? 'reps' : 's'
        const current = points[points.length - 1]
        return (
          <ChartCard
            key={ladder.id}
            title={ladder.name}
            subtitle={`Now: ${current.name}`}
            table={{ head: ['Date', 'Exercise', `Best (${unit})`], rows: points.slice().reverse().map((p) => [shortDate(p.day), p.name, p.best]) }}
          >
            <LineChart
              points={points.map((p) => ({ day: p.day, value: p.best, note: p.stepChange ? '↑ new step' : undefined }))}
              from={from}
              to={day}
              format={(v) => String(Math.round(v))}
              valueLabel={unit}
              height={130}
            />
          </ChartCard>
        )
      })}

      <h2 className="pt-1 font-semibold">Current steps</h2>
      <ul className="card divide-y divide-[var(--border)] text-sm">
        {Object.values(LADDERS).map((l) => {
          const step = Math.min(data.steps[l.id] ?? l.start, l.steps.length - 1)
          return (
            <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="text-[var(--muted)]">{l.name}</span>
              <span className="text-right">
                {exerciseById(l.steps[step].id)?.name ?? l.steps[step].id}{' '}
                <span className="text-[var(--muted)]">
                  ({step + 1}/{l.steps.length})
                </span>
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
