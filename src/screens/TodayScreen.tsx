import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FigureView } from '../animation/FigureView'
import { EXERCISES, exerciseById } from '../exercises/library'
import { ExerciseHeader, ExerciseInfo } from '../components/ExerciseDetail'
import { SetLogger } from '../components/SetLogger'
import { db } from '../lib/db'
import { activeSession, discardSession, finishSession, startSession } from '../lib/sessions'
import type { Account } from '../lib/useAccount'

export function TodayScreen({ account }: { account: Account }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const session = useLiveQuery(() => activeSession(), [])
  const setCounts = useLiveQuery(async () => {
    if (!session) return {}
    const sets = await db.sets.where('session_id').equals(session.id).filter((s) => !s.deleted).toArray()
    return sets.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.exercise_id]: (acc[s.exercise_id] ?? 0) + 1 }), {})
  }, [session?.id])

  const open = openId ? exerciseById(openId) : undefined
  if (open) {
    return (
      <div className="space-y-4">
        <ExerciseHeader exercise={open} onBack={() => setOpenId(null)} />
        <ExerciseInfo exercise={open} />
        {session && <SetLogger exercise={open} sessionId={session.id} />}
      </div>
    )
  }

  const finish = async () => {
    if (!session) return
    await finishSession(session.id, null)
    account.syncNow()
  }

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-[var(--muted)]">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="text-2xl font-bold">Today</h1>
      </header>

      <div className="rounded-2xl bg-[var(--accent-soft)] p-4 text-sm">
        <b>Preview session.</b> The personalised daily rotation (push, legs, back and shoulder blades, mobility) arrives in the next
        build. These four exercises let you try the animations and set logging now.
      </div>

      {!session ? (
        <button className="btn btn-primary w-full" onClick={() => startSession('preview')}>
          Start session
        </button>
      ) : (
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" onClick={finish}>
            Finish session
          </button>
          <button className="btn btn-secondary" onClick={() => confirm('Discard this session and its sets?') && discardSession(session.id)}>
            Discard
          </button>
        </div>
      )}

      <ul className="space-y-3">
        {EXERCISES.map((e) => (
          <li key={e.id}>
            <button className="card flex w-full items-center gap-3 overflow-hidden p-2 text-left" onClick={() => setOpenId(e.id)}>
              <div className="w-32 shrink-0 overflow-hidden rounded-xl">
                <FigureView animation={e.animation} showLabel={false} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{e.name}</div>
                <div className="text-sm text-[var(--muted)]">
                  {e.target[0]}–{e.target[1]} {e.measure === 'reps' ? 'reps' : 's'}
                </div>
                {session && <div className="mt-1 text-xs font-medium text-[var(--accent)]">{setCounts?.[e.id] ?? 0} sets logged</div>}
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
