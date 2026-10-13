import { useState } from 'react'
import { ChevronRight, ChevronsDown, ChevronsUp, FlaskConical, Lock, RotateCcw, TriangleAlert } from 'lucide-react'
import { exerciseById } from '../exercises/library'
import { LADDERS } from '../programme/ladders'
import { isOpen, stepIndex, testId, type EngineInput, type PlanItem } from '../programme/engine'
import { setLadderStep } from '../lib/programme'
import { logSet } from '../lib/sessions'
import { Card, Segmented } from '../ui'

// Choosing a version or step for today (R12, "just today"), and the readiness
// test card (R13 G6). Shared by the session players.

function StepButton({ dir, name, locked, onPick }: { dir: 'easier' | 'harder'; name?: string; locked?: boolean; onPick: () => void }) {
  const Icon = locked ? Lock : dir === 'easier' ? ChevronsDown : ChevronsUp
  return (
    <button
      disabled={!name || locked}
      className="flex items-center gap-2 rounded-2xl bg-[var(--surface)] px-3 py-2.5 text-left text-[13px] ring-1 ring-[var(--border)] disabled:opacity-40"
      onClick={onPick}
    >
      <Icon size={17} className="shrink-0 text-[var(--accent)]" />
      <span className="min-w-0">
        <span className="block text-[11px] text-[var(--muted)]">{locked ? 'Unlocks with a readiness test' : dir === 'easier' ? 'Easier' : 'Harder'}</span>
        <span className="block truncate font-medium">{name ?? '—'}</span>
      </span>
    </button>
  )
}

/**
 * Easier and Harder options from the ladder. Each asks whether the change is
 * for today only (the ladder stays where it is) or from now on.
 */
export function VariationSwitch({ item, planned, input, onToday }: { item: PlanItem; planned: string; input: EngineInput; onToday: (exerciseId: string | null) => void }) {
  const [pending, setPending] = useState<number | null>(null)
  if (!item.ladderId) return null
  const ladder = LADDERS[item.ladderId]
  const step = stepIndex(ladder, item.exerciseId)
  const own = stepIndex(ladder, planned)
  const at = (i: number) => (i >= 0 && i < ladder.steps.length ? exerciseById(ladder.steps[i].id) : undefined)
  const easier = at(step - 1)
  const harder = at(step + 1)
  // An advanced step opens only through its readiness test (R13).
  const stored = isOpen(input, ladder) ? Math.min(input.steps[ladder.id] ?? ladder.start, ladder.steps.length - 1) : -1
  const harderLocked = !!ladder.steps[step + 1]?.gate && step + 1 > stored
  const target = pending === null ? undefined : at(pending)
  const versions = [ladder.steps[step].id, ...(ladder.steps[step].variants ?? [])].filter((id) => exerciseById(id))

  return (
    <div className="space-y-2">
      {step !== own && (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-[var(--accent-soft)] px-3 py-2 text-[13px] text-[var(--accent-ink)]">
          <span>
            Just today: {step > own ? 'harder' : 'easier'} than your step ({exerciseById(planned)?.name}).
          </span>
          <button className="inline-flex shrink-0 items-center gap-1 font-semibold" onClick={() => onToday(null)}>
            <RotateCcw size={14} /> Undo
          </button>
        </div>
      )}
      {versions.length > 1 && (
        <div className="space-y-1.5">
          <div className="text-[12px] font-medium text-[var(--muted)]">Version</div>
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {versions.map((id) => {
              const ex = exerciseById(id)!
              const active = id === item.exerciseId
              return (
                <button
                  key={id}
                  onClick={() => onToday(id === planned ? null : id)}
                  className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${
                    active ? 'bg-[var(--accent)] text-[var(--accent-text)]' : 'bg-[var(--surface)] text-[var(--muted)] ring-1 ring-[var(--border)]'
                  }`}
                >
                  {ex.variationOf ? variationLabel(ex.name, exerciseById(ex.variationOf)?.name) : 'Standard'}
                </button>
              )
            })}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <StepButton dir="easier" name={easier?.name} onPick={() => setPending(step - 1)} />
        <StepButton dir="harder" name={harder?.name} locked={harderLocked} onPick={() => setPending(step + 1)} />
      </div>
      {target && pending !== null && (
        <Card className="space-y-3 p-4">
          <p className="text-[14px]">
            Switch to <b>{target.name}</b>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn btn-secondary"
              onClick={() => {
                onToday(pending === own ? null : target.id)
                setPending(null)
              }}
            >
              Just today
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                await setLadderStep(ladder.id, pending)
                onToday(null)
                setPending(null)
              }}
            >
              From now on
            </button>
          </div>
          <button className="w-full text-center text-[13px] text-[var(--muted)]" onClick={() => setPending(null)}>
            Cancel
          </button>
        </Card>
      )}
    </div>
  )
}

/** Short chip label: the part of a variation's name that differs from its step ("narrow hands"). */
function variationLabel(name: string, baseName?: string): string {
  if (baseName && name.toLowerCase().startsWith(baseName.toLowerCase())) {
    const rest = name.slice(baseName.length).replace(/^[\s,]+/, '')
    if (rest) return rest.charAt(0).toUpperCase() + rest.slice(1)
  }
  return name
}

/** Readiness test for an advanced step (R13 G6): the user does it and records the result. */
export function ReadinessTest({ item, sessionId, done, onNext }: { item: PlanItem; sessionId: string; done: boolean; onNext: () => void }) {
  const t = item.test!
  const [result, setResult] = useState<'yes' | 'no' | null>(null)
  const [pain, setPain] = useState(0)
  const name = exerciseById(t.stepId)?.name ?? t.stepId
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
          <FlaskConical size={20} />
        </span>
        <div>
          <h2 className="text-[17px] font-semibold">Readiness test</h2>
          <p className="text-[13px] text-[var(--muted)]">Optional. Passing it unlocks {name}.</p>
        </div>
      </div>
      <p className="text-[15px]">{t.text}</p>
      {t.caution && (
        <div className="flex gap-2 rounded-2xl bg-[var(--warn-soft)] px-3 py-2.5 text-[13px]">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[var(--warn)]" />
          This step loads a sensitive joint heavily. A physiotherapist assessment is advised before trying it.
        </div>
      )}
      {done ? (
        <>
          <p className="text-sm text-[var(--muted)]">Result saved. It counts when you finish the session.</p>
          <button className="btn btn-primary w-full" onClick={onNext}>
            Next <ChevronRight size={18} />
          </button>
        </>
      ) : (
        <>
          <Segmented
            label="Test result"
            value={result}
            onChange={setResult}
            options={[
              { value: 'yes' as const, label: 'Done as described' },
              { value: 'no' as const, label: 'Not yet' },
            ]}
          />
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="font-medium">Highest joint pain</span>
              <span className={`font-semibold tabular-nums ${pain > t.painMax ? 'text-[var(--warn)]' : 'text-[var(--muted)]'}`}>{pain === 0 ? 'None' : `${pain} / 10`}</span>
            </div>
            <input type="range" min={0} max={10} step={1} value={pain} onChange={(e) => setPain(Number(e.target.value))} aria-label="Highest joint pain, 0 to 10" className="w-full accent-[var(--accent)]" />
            <p className="text-[12px] text-[var(--muted)]">To pass: as described, with pain {t.painMax}/10 or less.</p>
          </div>
          <button
            className="btn btn-primary w-full"
            disabled={result === null}
            onClick={async () => {
              await logSet({ session_id: sessionId, exercise_id: testId(t.stepId), reps: result === 'yes' ? 1 : 0, seconds: null, rir: null, pain })
              onNext()
            }}
          >
            Save result
          </button>
        </>
      )}
    </Card>
  )
}
