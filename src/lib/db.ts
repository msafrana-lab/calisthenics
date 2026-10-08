import Dexie, { type EntityTable } from 'dexie'

// The phone's local database is the source of truth; Supabase is the backup
// and the bridge for Apple Health data. Rows changed locally carry dirty = 1
// until they have been pushed.

type Synced = { updated_at: string; dirty: 0 | 1 }

export type WorkoutSession = Synced & {
  id: string
  day_type: string
  started_at: string
  ended_at: string | null
  effort: number | null
  notes: string | null
  deleted: boolean
}

export type SetLog = Synced & {
  id: string
  session_id: string
  exercise_id: string
  set_index: number
  reps: number | null
  seconds: number | null
  rir: number | null
  pain: number | null
  deleted: boolean
}

export type LadderProgress = Synced & { ladder_id: string; step: number }

export type HealthSample = {
  id: string
  kind: 'weight' | 'cycling'
  recorded_at: string
  value: number
  unit: string
  duration_s: number | null
  energy_kcal: number | null
  source: string | null
  external_id?: string | null
  /** Rides: indoor flag, heart rate, power, Strava workout type and the derived intensity. */
  details?: { intensity?: 'easy' | 'hard'; indoor?: boolean; name?: string | null; [k: string]: unknown } | null
}

export type DayLogRow = Synced & {
  day: string
  cycling: 'none' | 'easy' | 'hard' | null
  morning: Partial<Record<'knee' | 'shoulder' | 'wrist', 'same' | 'worse'>> | null
}

export type Meta = { key: string; value: string }

export class AppDB extends Dexie {
  sessions!: EntityTable<WorkoutSession, 'id'>
  sets!: EntityTable<SetLog, 'id'>
  ladders!: EntityTable<LadderProgress, 'ladder_id'>
  health!: EntityTable<HealthSample, 'id'>
  days!: EntityTable<DayLogRow, 'day'>
  meta!: EntityTable<Meta, 'key'>

  constructor(name = 'calisthenics') {
    super(name)
    this.version(1).stores({
      sessions: 'id, started_at, dirty',
      sets: 'id, session_id, exercise_id, dirty',
      ladders: 'ladder_id, dirty',
      health: 'id, [kind+recorded_at]',
      meta: 'key',
    })
    this.version(2).stores({ days: 'day, dirty' })
  }
}

export const db = new AppDB()

export const now = () => new Date().toISOString()
export const newId = () => crypto.randomUUID()
