import { db, newId, now, type SetLog, type WorkoutSession } from './db'

export async function startSession(dayType: string): Promise<WorkoutSession> {
  const t = now()
  const s: WorkoutSession = {
    id: newId(),
    day_type: dayType,
    started_at: t,
    ended_at: null,
    effort: null,
    notes: null,
    deleted: false,
    updated_at: t,
    dirty: 1,
  }
  await db.sessions.add(s)
  return s
}

export async function finishSession(id: string, effort: number | null) {
  const t = now()
  await db.sessions.update(id, { ended_at: t, effort, updated_at: t, dirty: 1 })
}

export async function discardSession(id: string) {
  const t = now()
  await db.transaction('rw', db.sessions, db.sets, async () => {
    await db.sessions.update(id, { deleted: true, updated_at: t, dirty: 1 })
    await db.sets.where('session_id').equals(id).modify({ deleted: true, updated_at: t, dirty: 1 })
  })
}

export async function logSet(input: Pick<SetLog, 'session_id' | 'exercise_id' | 'reps' | 'seconds' | 'rir' | 'pain'>) {
  const existing = await db.sets
    .where('session_id')
    .equals(input.session_id)
    .filter((s) => s.exercise_id === input.exercise_id && !s.deleted)
    .count()
  const t = now()
  await db.sets.add({ ...input, id: newId(), set_index: existing, deleted: false, updated_at: t, dirty: 1 })
}

export async function deleteSet(id: string) {
  const t = now()
  await db.sets.update(id, { deleted: true, updated_at: t, dirty: 1 })
}

export async function activeSession(): Promise<WorkoutSession | undefined> {
  const open = await db.sessions.filter((s) => !s.deleted && s.ended_at === null).toArray()
  return open.sort((a, b) => b.started_at.localeCompare(a.started_at))[0]
}
