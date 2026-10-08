import type { Table } from 'dexie'
import { db as defaultDb, type AppDB } from './db'

type Row = Record<string, unknown>

/** What the sync engine needs from the server; Supabase in the app, a fake in tests. */
export interface Remote {
  upsert(table: string, rows: Row[], onConflict: string): Promise<void>
  /** Rows changed on the server after `since`, oldest first, at most `limit`. */
  changedSince(table: string, since: string | null, limit: number): Promise<Row[]>
}

type Spec = { local: 'sessions' | 'sets' | 'ladders' | 'days' | 'health'; remote: string; key: string; conflict: string; push: boolean }

// Order matters: sessions before the sets that reference them.
const TABLES: Spec[] = [
  { local: 'sessions', remote: 'workout_sessions', key: 'id', conflict: 'id', push: true },
  { local: 'sets', remote: 'set_logs', key: 'id', conflict: 'id', push: true },
  { local: 'ladders', remote: 'ladder_progress', key: 'ladder_id', conflict: 'user_id,ladder_id', push: true },
  { local: 'days', remote: 'day_logs', key: 'day', conflict: 'user_id,day', push: true },
  { local: 'health', remote: 'health_samples', key: 'id', conflict: 'id', push: false },
]

const PAGE = 500
const SERVER_ONLY = ['user_id', 'server_updated_at']

function toRemote(row: Row): Row {
  const { dirty: _dirty, ...rest } = row
  return rest
}

function toLocal(row: Row, push: boolean): Row {
  const out: Row = { ...row }
  for (const k of SERVER_ONLY) delete out[k]
  if (typeof out.value === 'string') out.value = Number(out.value)
  if (typeof out.energy_kcal === 'string') out.energy_kcal = Number(out.energy_kcal)
  if (push) out.dirty = 0
  return out
}

async function pushTable(db: AppDB, remote: Remote, spec: Spec): Promise<number> {
  const table = db[spec.local] as unknown as Table<Row, string>
  const pending = await table.where('dirty').equals(1).toArray()
  if (!pending.length) return 0
  await remote.upsert(spec.remote, pending.map(toRemote), spec.conflict)
  // Only clear the flag if the row was not edited again while uploading.
  await db.transaction('rw', table, async () => {
    for (const row of pending) {
      const current = await table.get(row[spec.key] as string)
      if (current && current.updated_at === row.updated_at) await table.update(row[spec.key] as string, { dirty: 0 })
    }
  })
  return pending.length
}

async function pullTable(db: AppDB, remote: Remote, spec: Spec): Promise<number> {
  const table = db[spec.local] as unknown as Table<Row, string>
  const metaKey = `pulled:${spec.remote}`
  let since = (await db.meta.get(metaKey))?.value ?? null
  let count = 0
  for (;;) {
    const rows = await remote.changedSince(spec.remote, since, PAGE)
    if (!rows.length) break
    await db.transaction('rw', table, db.meta, async () => {
      for (const row of rows) {
        const local = await table.get(row[spec.key] as string)
        // A newer local edit that has not been pushed yet wins.
        if (local?.dirty === 1 && String(local.updated_at) > String(row.updated_at)) continue
        await table.put(toLocal(row, spec.push))
      }
      since = rows[rows.length - 1].server_updated_at as string
      await db.meta.put({ key: metaKey, value: since })
    })
    count += rows.length
    if (rows.length < PAGE) break
  }
  return count
}

export type SyncResult = { pushed: number; pulled: number }

export async function sync(remote: Remote, db: AppDB = defaultDb): Promise<SyncResult> {
  let pushed = 0
  let pulled = 0
  for (const spec of TABLES) if (spec.push) pushed += await pushTable(db, remote, spec)
  for (const spec of TABLES) pulled += await pullTable(db, remote, spec)
  await db.meta.put({ key: 'lastSync', value: new Date().toISOString() })
  return { pushed, pulled }
}
