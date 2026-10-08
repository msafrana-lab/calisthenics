import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { exerciseById } from '../exercises/library'

export function ProgressScreen() {
  const sessions = useLiveQuery(async () => {
    const all = await db.sessions.filter((s) => !s.deleted && s.ended_at !== null).toArray()
    return all.sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 20)
  }, [])
  const sets = useLiveQuery(() => db.sets.filter((s) => !s.deleted).toArray(), [])
  const latestWeight = useLiveQuery(async () => {
    const w = await db.health.where('[kind+recorded_at]').between(['weight', ''], ['weight', '￿']).last()
    return w
  }, [])

  const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString()
  const thisWeek = sessions?.filter((s) => s.started_at >= weekAgo).length ?? 0

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Progress</h1>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-[var(--muted)]">Sessions, last 7 days</div>
          <div className="text-3xl font-bold tabular-nums">{thisWeek}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-[var(--muted)]">Latest weight</div>
          <div className="text-3xl font-bold tabular-nums">{latestWeight ? `${latestWeight.value.toFixed(1)}` : '—'}</div>
          <div className="text-xs text-[var(--muted)]">{latestWeight ? `kg · ${new Date(latestWeight.recorded_at).toLocaleDateString('en-GB')}` : 'Apple Health link comes later'}</div>
        </div>
      </div>

      <h2 className="pt-2 font-semibold">Recent sessions</h2>
      {!sessions?.length && <p className="text-sm text-[var(--muted)]">No finished sessions yet.</p>}
      <ul className="space-y-2">
        {sessions?.map((s) => {
          const own = sets?.filter((x) => x.session_id === s.id) ?? []
          const byExercise = [...new Set(own.map((x) => x.exercise_id))]
          return (
            <li key={s.id} className="card p-3 text-sm">
              <div className="font-semibold">
                {new Date(s.started_at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                <span className="font-normal text-[var(--muted)]"> · {own.length} sets</span>
              </div>
              <div className="text-[var(--muted)]">
                {byExercise
                  .map((id) => {
                    const ex = exerciseById(id)
                    const best = Math.max(...own.filter((x) => x.exercise_id === id).map((x) => x.reps ?? x.seconds ?? 0))
                    return `${ex?.name ?? id} (best ${best}${ex?.measure === 'seconds' ? ' s' : ''})`
                  })
                  .join(' · ')}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
