import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppDB, type SetLog, type WorkoutSession } from './db'
import { sync, type Remote } from './sync'

type Row = Record<string, unknown>

/** In-memory server that stamps server_updated_at like the database trigger does. */
class FakeRemote implements Remote {
  tables = new Map<string, Map<string, Row>>()
  private clock = 0

  private table(name: string) {
    if (!this.tables.has(name)) this.tables.set(name, new Map())
    return this.tables.get(name)!
  }

  insertFromServer(table: string, key: string, row: Row) {
    this.table(table).set(String(row[key]), { ...row, user_id: 'u1', server_updated_at: this.stamp() })
  }

  private stamp() {
    return new Date(Date.UTC(2026, 0, 1, 0, 0, 0, ++this.clock)).toISOString()
  }

  async upsert(table: string, rows: Row[], onConflict: string) {
    const key = onConflict.split(',').pop()!
    for (const row of rows) this.insertFromServer(table, key, row)
  }

  async changedSince(table: string, since: string | null, limit: number) {
    return [...this.table(table).values()]
      .filter((r) => since === null || String(r.server_updated_at) > since)
      .sort((a, b) => String(a.server_updated_at).localeCompare(String(b.server_updated_at)))
      .slice(0, limit)
  }
}

const session = (id: string, updated_at: string, dirty: 0 | 1 = 1): WorkoutSession => ({
  id,
  day_type: 'A',
  started_at: '2026-10-08T07:00:00Z',
  ended_at: null,
  effort: null,
  notes: null,
  deleted: false,
  updated_at,
  dirty,
})

let db: AppDB
let remote: FakeRemote

beforeEach(async () => {
  db = new AppDB(`test-${crypto.randomUUID()}`)
  remote = new FakeRemote()
})

describe('sync', () => {
  it('pushes local changes and clears the dirty flag', async () => {
    await db.sessions.add(session('s1', '2026-10-08T07:30:00Z'))
    const set: SetLog = {
      id: 'x1', session_id: 's1', exercise_id: 'P3', set_index: 0, reps: 8, seconds: null,
      rir: 2, pain: 0, deleted: false, updated_at: '2026-10-08T07:31:00Z', dirty: 1,
    }
    await db.sets.add(set)

    const result = await sync(remote, db)

    expect(result.pushed).toBe(2)
    expect(remote.tables.get('workout_sessions')!.get('s1')!.dirty).toBeUndefined()
    expect((await db.sessions.get('s1'))!.dirty).toBe(0)
    expect((await db.sets.get('x1'))!.dirty).toBe(0)
  })

  it('pulls rows written elsewhere, including Apple Health imports', async () => {
    remote.insertFromServer('workout_sessions', 'id', { ...session('s2', '2026-10-07T10:00:00Z'), dirty: undefined })
    remote.insertFromServer('health_samples', 'id', {
      id: 'h1', kind: 'weight', recorded_at: '2026-10-08T06:00:00Z', value: '81.4', unit: 'kg',
      duration_s: null, energy_kcal: null, source: 'Withings', updated_at: '2026-10-08T06:00:00Z',
    })

    await sync(remote, db)

    expect((await db.sessions.get('s2'))!.dirty).toBe(0)
    const weight = await db.health.get('h1')
    expect(weight!.value).toBe(81.4)
    expect(weight).not.toHaveProperty('user_id')
  })

  it('keeps an edit made offline and uploads it on the next successful sync', async () => {
    remote.insertFromServer('workout_sessions', 'id', { ...session('s3', '2026-10-08T07:00:00Z'), notes: 'server' })
    await db.sessions.add({ ...session('s3', '2026-10-08T09:00:00Z'), notes: 'phone' })

    const offline: Remote = { upsert: async () => { throw new Error('offline') }, changedSince: remote.changedSince.bind(remote) }
    await expect(sync(offline, db)).rejects.toThrow('offline')
    expect((await db.sessions.get('s3'))!.dirty).toBe(1)

    await sync(remote, db)

    expect((await db.sessions.get('s3'))!.notes).toBe('phone')
    expect(remote.tables.get('workout_sessions')!.get('s3')!.notes).toBe('phone')
  })

  it('only pulls what changed since the last sync', async () => {
    remote.insertFromServer('workout_sessions', 'id', session('a', '2026-10-01T00:00:00Z'))
    expect((await sync(remote, db)).pulled).toBe(1)
    expect((await sync(remote, db)).pulled).toBe(0)
    remote.insertFromServer('workout_sessions', 'id', session('b', '2026-10-02T00:00:00Z'))
    expect((await sync(remote, db)).pulled).toBe(1)
  })
})
