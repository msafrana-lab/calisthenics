import { describe, expect, it } from 'vitest'
import type { ExerciseMeta, SessionRow, SetRow } from './metrics'
import { ladderHistory, setsByGroup, weekStart, weeklyMinutes, weightChange, weightSeries } from './metrics'

const CAT: Record<string, ExerciseMeta> = {
  P3: { id: 'P3', name: 'Knee push-up', group: 'push', cls: 'strength', measure: 'reps' },
  P4: { id: 'P4', name: 'Eccentric full push-up', group: 'push', cls: 'strength', measure: 'reps' },
  S1: { id: 'S1', name: 'Prone W', group: 'back', cls: 'endurance', measure: 'reps' },
  W1: { id: 'W1', name: 'March', group: 'warmup', cls: 'drill', measure: 'seconds' },
  M1: { id: 'M1', name: 'Hip flexor stretch', group: 'mobility', cls: 'stretch', measure: 'seconds' },
}
const catalogue = (id: string) => CAT[id]

const session = (id: string, day: string, done = true): SessionRow => ({ id, started_at: `${day}T07:00:00`, ended_at: done ? `${day}T07:20:00` : null, deleted: false })
const set = (session_id: string, exercise_id: string, reps: number): SetRow => ({ session_id, exercise_id, reps, seconds: null, deleted: false })

describe('weeks', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart('2026-10-08')).toBe('2026-10-05') // Thursday
    expect(weekStart('2026-10-05')).toBe('2026-10-05') // Monday
    expect(weekStart('2026-10-11')).toBe('2026-10-05') // Sunday
  })
})

describe('weight', () => {
  const w = (day: string, value: number, time = '07:00') => ({ recorded_at: `${day}T${time}:00`, value })

  it('averages same-day weigh-ins and smooths over 7 days', () => {
    const s = weightSeries([w('2026-10-01', 82), w('2026-10-01', 81, '20:00'), w('2026-10-03', 81), w('2026-10-09', 80)])
    expect(s.map((p) => p.weight)).toEqual([81.5, 81, 80])
    // 10-09 window is 10-03..10-09 → (81 + 80) / 2
    expect(s.map((p) => p.average)).toEqual([81.5, 81.3, 80.5])
  })

  it('reports the change against about four weeks earlier', () => {
    const s = weightSeries([w('2026-09-01', 84), w('2026-09-10', 83), w('2026-10-08', 81)])
    expect(weightChange(s)).toEqual({ current: 81, change: -2, since: '2026-09-10' })
    expect(weightChange(weightSeries([w('2026-10-08', 81)]))).toEqual({ current: 81, change: null, since: null })
    expect(weightChange([])).toBeNull()
  })
})

describe('cycling', () => {
  it('sums minutes per week and keeps empty weeks', () => {
    const weeks = weeklyMinutes(
      [
        { recorded_at: '2026-10-06T18:00:00', value: 45 },
        { recorded_at: '2026-10-08T18:00:00', value: 60 },
        { recorded_at: '2026-09-23T18:00:00', value: 30 },
        { recorded_at: '2026-08-01T18:00:00', value: 99 }, // outside the window
      ],
      '2026-10-08',
      3,
    )
    expect(weeks).toEqual([
      { week: '2026-09-21', value: 30 },
      { week: '2026-09-28', value: 0 },
      { week: '2026-10-05', value: 105 },
    ])
  })
})

describe('training volume', () => {
  it('counts working sets per group for finished sessions in the week', () => {
    const sessions = [session('a', '2026-10-06'), session('b', '2026-10-08', false), session('c', '2026-10-02')]
    const sets = [set('a', 'P3', 8), set('a', 'P3', 7), set('a', 'S1', 15), set('a', 'W1', 60), set('a', 'M1', 30), set('b', 'P3', 9), set('c', 'P3', 8)]
    const counts = setsByGroup(sessions, sets, catalogue, '2026-10-05')
    expect(Object.fromEntries(counts.map((c) => [c.group, c.sets]))).toEqual({ push: 2, back: 1, core: 0, legs: 0, hips: 0 })
  })
})

describe('exercise history', () => {
  it('keeps the best set per session and marks step changes', () => {
    const sessions = [session('a', '2026-10-01'), session('b', '2026-10-03'), session('c', '2026-10-06')]
    const sets = [set('a', 'P3', 8), set('a', 'P3', 10), set('b', 'P3', 12), set('c', 'P4', 5), set('c', 'P3', 12)]
    expect(ladderHistory('push', sessions, sets, catalogue)).toEqual([
      { day: '2026-10-01', exerciseId: 'P3', name: 'Knee push-up', best: 10, measure: 'reps', stepChange: false },
      { day: '2026-10-03', exerciseId: 'P3', name: 'Knee push-up', best: 12, measure: 'reps', stepChange: false },
      { day: '2026-10-06', exerciseId: 'P4', name: 'Eccentric full push-up', best: 5, measure: 'reps', stepChange: true },
    ])
  })
})
