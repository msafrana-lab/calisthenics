import { useLiveQuery } from 'dexie-react-hooks'
import { exerciseById } from '../exercises/library'
import { evaluate, localDay, morningUpdates, type EngineInput, type LadderUpdate, type Morning } from '../programme/engine'
import { withImportedRides } from '../programme/rides'
import { db, now, type DayLogRow } from './db'
import { finishSession } from './sessions'

export const today = () => localDay(new Date())

export async function loadEngineInput(day = today()): Promise<EngineInput> {
  const [sessions, sets, ladders, days, rides] = await Promise.all([
    db.sessions.toArray(),
    db.sets.toArray(),
    db.ladders.toArray(),
    db.days.toArray(),
    db.health.where('[kind+recorded_at]').between(['cycling', ''], ['cycling', '\uffff']).toArray(),
  ])
  return {
    today: day,
    sessions,
    sets,
    steps: Object.fromEntries(ladders.map((l) => [l.ladder_id, l.step])),
    days: withImportedRides(
      days.map((d) => ({ day: d.day, cycling: d.cycling, morning: d.morning })),
      rides,
    ),
    catalogue: exerciseById,
  }
}

/** Live engine input; re-renders whenever the training data changes. */
export function useEngineInput(): EngineInput | undefined {
  return useLiveQuery(() => loadEngineInput(), [])
}

async function updateDay(day: string, change: Partial<Pick<DayLogRow, 'cycling' | 'morning'>>) {
  const existing = await db.days.get(day)
  await db.days.put({ day, cycling: null, morning: null, ...existing, ...change, updated_at: now(), dirty: 1 })
}

export const setCycling = (day: string, cycling: DayLogRow['cycling']) => updateDay(day, { cycling })

export async function setLadderStep(ladderId: string, step: number) {
  await db.ladders.put({ ladder_id: ladderId, step, updated_at: now(), dirty: 1 })
}

async function apply(updates: LadderUpdate[]) {
  for (const u of updates) await setLadderStep(u.ladderId, u.to)
}

/** Records the next-morning check-in and applies the resulting step changes (R7). */
export async function saveMorning(day: string, sessionId: string, morning: Morning): Promise<LadderUpdate[]> {
  const input = await loadEngineInput()
  const updates = morningUpdates(input, sessionId, morning)
  await updateDay(day, { morning })
  await apply(updates)
  return updates
}

/** Ends the session and applies the progression rules to what was logged (R6, R7). */
export async function finishProgrammeSession(sessionId: string, effort: number | null): Promise<LadderUpdate[]> {
  await finishSession(sessionId, effort)
  const updates = evaluate(await loadEngineInput(), sessionId)
  await apply(updates)
  return updates
}
