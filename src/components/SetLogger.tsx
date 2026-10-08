import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { deleteSet, logSet } from '../lib/sessions'
import type { Exercise } from '../exercises/types'
import { Stopwatch } from './Timer'

export function Chips({ values, value, onChange, label }: { values: number[]; value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {values.map((v) => (
        <button
          key={v}
          role="radio"
          aria-checked={v === value}
          onClick={() => onChange(v)}
          className={`h-10 min-w-10 rounded-xl px-2 text-sm font-semibold ${v === value ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--accent-soft)]'}`}
        >
          {v}
        </button>
      ))}
    </div>
  )
}

export function SetLogger({
  exercise,
  sessionId,
  suggested,
  rirTarget,
  onSaved,
}: {
  exercise: Exercise
  sessionId: string
  suggested?: number
  rirTarget?: number | null
  onSaved?: () => void
}) {
  const isReps = exercise.measure === 'reps'
  const [amount, setAmount] = useState(suggested ?? exercise.target[0])
  const [rir, setRir] = useState(rirTarget ?? 3)
  const [pain, setPain] = useState(0)

  const sets = useLiveQuery(
    () => db.sets.where('session_id').equals(sessionId).filter((s) => s.exercise_id === exercise.id && !s.deleted).sortBy('set_index'),
    [sessionId, exercise.id],
  )

  const save = async () => {
    await logSet({
      session_id: sessionId,
      exercise_id: exercise.id,
      reps: isReps ? amount : null,
      seconds: isReps ? null : amount,
      rir,
      pain,
    })
    onSaved?.()
  }

  return (
    <div className="card space-y-4 p-4">
      <h2 className="font-semibold">Log a set{exercise.perSide ? ' (per side)' : ''}</h2>
      {!isReps && <Stopwatch onStop={setAmount} />}

      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--muted)]">{isReps ? 'Reps' : 'Seconds'}</span>
        <div className="flex items-center gap-3">
          <button className="btn btn-secondary w-11 px-0" onClick={() => setAmount((a) => Math.max(0, a - (isReps ? 1 : 5)))} aria-label="Less">
            −
          </button>
          <span className="w-10 text-center text-2xl font-bold tabular-nums">{amount}</span>
          <button className="btn btn-secondary w-11 px-0" onClick={() => setAmount((a) => a + (isReps ? 1 : 5))} aria-label="More">
            +
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm text-[var(--muted)]">
          {isReps ? 'Reps in reserve: how many more could you have done with good form?' : 'Seconds in reserve, in units of 5 s: how much longer could you have held?'}
          {rirTarget != null && <b> Aim for {rirTarget}.</b>}
        </div>
        <Chips label="Reps in reserve" values={[0, 1, 2, 3, 4, 5]} value={rir} onChange={setRir} />
      </div>

      <div className="space-y-2">
        <div className="text-sm text-[var(--muted)]">Highest joint pain during the set (0 = none, 10 = worst)</div>
        <Chips label="Pain" values={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} value={pain} onChange={setPain} />
        {pain >= 4 && (
          <p className="rounded-xl bg-[var(--warn-soft)] px-3 py-2 text-sm">
            {pain > 5
              ? 'Stop this exercise for today and switch to an easier, pain-free option.'
              : 'Stop this set and switch to an easier variation. No progression next time.'}
          </p>
        )}
      </div>

      <button className="btn btn-primary w-full" onClick={save}>
        Save set
      </button>

      {!!sets?.length && (
        <ul className="divide-y divide-[var(--border)] text-sm">
          {sets.map((s, i) => (
            <li key={s.id} className="flex items-center justify-between py-2">
              <span>
                Set {i + 1}: <b>{s.reps ?? s.seconds}</b> {isReps ? 'reps' : 's'} · RIR {s.rir} · pain {s.pain}
              </span>
              <button className="text-[var(--muted)] underline" onClick={() => deleteSet(s.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
