// Progress figures computed from the local training history. Pure functions,
// tested in metrics.test.ts.
import type { ExerciseClass, Group } from '../exercises/types'
import { localDay, stepIndex } from '../programme/engine'
import { LADDERS } from '../programme/ladders'

const DAY_MS = 864e5

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
}

/** Monday of the week containing `day` (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay() // 0 = Sunday
  return addDays(day, -((dow + 6) % 7))
}

// ---------------------------------------------------------------- weight

export type WeighIn = { recorded_at: string; value: number }
export type WeightPoint = { day: string; weight: number; average: number }

/**
 * Daily weight (mean of that day's weigh-ins) with a trailing 7-day average.
 * The average smooths day-to-day water and food swings, which can be larger
 * than a week's real change.
 */
export function weightSeries(weighIns: WeighIn[], windowDays = 7): WeightPoint[] {
  const byDay = new Map<string, number[]>()
  for (const w of weighIns) {
    const d = localDay(w.recorded_at)
    byDay.set(d, [...(byDay.get(d) ?? []), w.value])
  }
  const days = [...byDay.keys()].sort()
  const daily = days.map((d) => ({ day: d, weight: mean(byDay.get(d)!) }))
  return daily.map((p) => {
    const from = addDays(p.day, -(windowDays - 1))
    const window = daily.filter((q) => q.day >= from && q.day <= p.day)
    return { ...p, average: round1(mean(window.map((q) => q.weight))) }
  })
}

/** Latest 7-day average and its change against the average about `days` earlier. */
export function weightChange(series: WeightPoint[], days = 28): { current: number; change: number | null; since: string | null } | null {
  const last = series.at(-1)
  if (!last) return null
  const target = addDays(last.day, -days)
  const earlier = [...series].reverse().find((p) => p.day <= target)
  return { current: last.average, change: earlier ? round1(last.average - earlier.average) : null, since: earlier?.day ?? null }
}

// ---------------------------------------------------------------- cycling

export type RideRow = { recorded_at: string; value: number }
export type WeekValue = { week: string; value: number }

/** Minutes of cycling per Monday-start week, oldest first, including empty weeks. */
export function weeklyMinutes(rides: RideRow[], today: string, weeks: number): WeekValue[] {
  const current = weekStart(today)
  const out: WeekValue[] = []
  for (let i = weeks - 1; i >= 0; i--) out.push({ week: addDays(current, -7 * i), value: 0 })
  for (const r of rides) {
    const w = weekStart(localDay(r.recorded_at))
    const slot = out.find((o) => o.week === w)
    if (slot) slot.value += r.value
  }
  return out
}

// ---------------------------------------------------------------- training volume

export type SessionRow = { id: string; started_at: string; ended_at: string | null; deleted: boolean }
export type SetRow = { session_id: string; exercise_id: string; reps: number | null; seconds: number | null; deleted: boolean }
export type ExerciseMeta = { id: string; name: string; group: Group; cls: ExerciseClass; measure: 'reps' | 'seconds' }

/** Groups shown in the weekly volume chart (mobility and warm-up are not working sets). */
export const VOLUME_GROUPS: { group: Group; label: string }[] = [
  { group: 'push', label: 'Push' },
  { group: 'back', label: 'Upper back' },
  { group: 'core', label: 'Core' },
  { group: 'legs', label: 'Legs' },
  { group: 'hips', label: 'Hips' },
]

/** R3: aim for about 6–10 hard sets per muscle group per week. */
export const WEEKLY_SET_TARGET: readonly [number, number] = [6, 10]

const WORKING: Set<ExerciseClass> = new Set(['strength', 'endurance', 'hold', 'cuff'])

function finishedSessions(sessions: SessionRow[]) {
  return new Map(sessions.filter((s) => !s.deleted && s.ended_at !== null).map((s) => [s.id, s]))
}

/** Working sets per group in the week starting `week` (Monday). */
export function setsByGroup(sessions: SessionRow[], sets: SetRow[], catalogue: (id: string) => ExerciseMeta | undefined, week: string) {
  const done = finishedSessions(sessions)
  const end = addDays(week, 7)
  const counts = new Map<Group, number>()
  for (const s of sets) {
    if (s.deleted) continue
    const session = done.get(s.session_id)
    const ex = catalogue(s.exercise_id)
    if (!session || !ex || !WORKING.has(ex.cls)) continue
    const day = localDay(session.started_at)
    if (day < week || day >= end) continue
    counts.set(ex.group, (counts.get(ex.group) ?? 0) + 1)
  }
  return VOLUME_GROUPS.map((g) => ({ ...g, sets: counts.get(g.group) ?? 0 }))
}

// ---------------------------------------------------------------- exercise history

export type HistoryPoint = { day: string; exerciseId: string; name: string; best: number; measure: 'reps' | 'seconds'; stepChange: boolean }

/**
 * Best set per finished session for one progression ladder, oldest first.
 * `stepChange` marks the first session on a new exercise of the ladder.
 */
export function ladderHistory(ladderId: string, sessions: SessionRow[], sets: SetRow[], catalogue: (id: string) => ExerciseMeta | undefined): HistoryPoint[] {
  const ladder = LADDERS[ladderId]
  if (!ladder) return []
  const done = finishedSessions(sessions)
  const best = new Map<string, { session: SessionRow; exerciseId: string; best: number }>()
  for (const s of sets) {
    const session = done.get(s.session_id)
    // Variations are shown as their step (R12).
    const step = stepIndex(ladder, s.exercise_id)
    if (s.deleted || !session || step < 0) continue
    const stepId = ladder.steps[step].id
    const amount = s.reps ?? s.seconds ?? 0
    const cur = best.get(s.session_id)
    // If two steps were done in one session, keep the harder one.
    const harder = cur && step > stepIndex(ladder, cur.exerciseId)
    if (!cur || harder || (cur.exerciseId === stepId && amount > cur.best)) best.set(s.session_id, { session, exerciseId: stepId, best: amount })
  }
  const rows = [...best.values()].sort((a, b) => a.session.started_at.localeCompare(b.session.started_at))
  return rows.map((r, i) => {
    const ex = catalogue(r.exerciseId)
    return {
      day: localDay(r.session.started_at),
      exerciseId: r.exerciseId,
      name: ex?.name ?? r.exerciseId,
      best: r.best,
      measure: ex?.measure ?? 'reps',
      stepChange: i > 0 && rows[i - 1].exerciseId !== r.exerciseId,
    }
  })
}

// ---------------------------------------------------------------- helpers

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length
}
function round1(x: number) {
  return Math.round(x * 10) / 10
}
