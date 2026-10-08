import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Minus, Plus, TriangleAlert, X } from 'lucide-react'
import { db } from '../lib/db'
import { deleteSet, logSet } from '../lib/sessions'
import type { Exercise } from '../exercises/types'
import { Segmented } from '../ui'
import { Stopwatch } from './Timer'

/** Logged sets of this exercise in the session, as removable chips. */
export function LoggedSets({ exercise, sessionId }: { exercise: Exercise; sessionId: string }) {
  const sets = useLiveQuery(
    () => db.sets.where('session_id').equals(sessionId).filter((s) => s.exercise_id === exercise.id && !s.deleted).sortBy('set_index'),
    [sessionId, exercise.id],
  )
  if (!sets?.length) return null
  const unit = exercise.measure === 'reps' ? '' : ' s'
  return (
    <div className="flex flex-wrap gap-1.5">
      {sets.map((s, i) => (
        <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-soft)] py-1 pr-1 pl-3 text-[13px] text-[var(--accent-ink)]">
          <b>Set {i + 1}</b> {s.reps ?? s.seconds}
          {unit} · RIR {s.rir}
          {s.pain ? ` · pain ${s.pain}` : ''}
          <button aria-label={`Remove set ${i + 1}`} className="rounded-full p-1 hover:bg-[var(--surface)]" onClick={() => deleteSet(s.id)}>
            <X size={13} />
          </button>
        </span>
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
  const step = isReps ? 1 : 5

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
    <div className="space-y-5">
      {!isReps && <Stopwatch onStop={setAmount} />}

      <div className="flex items-center justify-between">
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] active:scale-95" onClick={() => setAmount((a) => Math.max(0, a - step))} aria-label="Less">
          <Minus size={24} />
        </button>
        <div className="text-center">
          <div className="text-[56px] leading-none font-semibold tabular-nums">{amount}</div>
          <div className="mt-1 text-[13px] text-[var(--muted)]">
            {isReps ? 'reps' : 'seconds'}
            {exercise.perSide ? ' per side' : ''}
          </div>
        </div>
        <button className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] active:scale-95" onClick={() => setAmount((a) => a + step)} aria-label="More">
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 text-[13px]">
          <span className="font-medium">{isReps ? 'Reps left in the tank' : 'Could have held longer by (× 5 s)'}</span>
          {rirTarget != null && <span className="text-[var(--muted)]">aim for {rirTarget}</span>}
        </div>
        <Segmented
          size="sm"
          label="Reps in reserve"
          value={rir}
          onChange={setRir}
          options={[0, 1, 2, 3, 4, 5].map((v) => ({ value: v, label: v === 5 ? '5+' : String(v) }))}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium">Highest joint pain</span>
          <span className={`font-semibold tabular-nums ${pain >= 4 ? 'text-[var(--warn)]' : 'text-[var(--muted)]'}`}>{pain === 0 ? 'None' : `${pain} / 10`}</span>
        </div>
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={pain}
          onChange={(e) => setPain(Number(e.target.value))}
          aria-label="Highest joint pain, 0 to 10"
          className="w-full accent-[var(--accent)]"
        />
        {pain >= 4 && (
          <div className="flex gap-2 rounded-2xl bg-[var(--warn-soft)] px-3 py-2.5 text-[13px]">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[var(--warn)]" />
            {pain > 5 ? 'Stop this exercise for today and switch to an easier, pain-free option.' : 'Stop this set and switch to an easier variation. No progression next time.'}
          </div>
        )}
      </div>

      <button className="btn btn-primary w-full text-[17px]" onClick={save}>
        Log set
      </button>
    </div>
  )
}
