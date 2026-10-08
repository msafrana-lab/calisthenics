import { useEffect, useRef, useState } from 'react'

function useTicker(running: boolean) {
  const [elapsed, setElapsed] = useState(0)
  const started = useRef<number | null>(null)
  useEffect(() => {
    if (!running) return
    started.current = Date.now() - elapsed * 1000
    const id = setInterval(() => setElapsed((Date.now() - started.current!) / 1000), 200)
    return () => clearInterval(id)
    // Resumes from the current value; `elapsed` is deliberately not a dependency.
  }, [running])
  return [elapsed, setElapsed] as const
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Short vibration where supported (not on iPhone Safari); harmless elsewhere. */
const buzz = () => navigator.vibrate?.(200)

/** Rest countdown that starts immediately; calls onDone at zero or when skipped. */
export function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [elapsed] = useTicker(true)
  const left = Math.max(0, seconds - elapsed)
  useEffect(() => {
    if (left === 0) {
      buzz()
      onDone()
    }
  }, [left, onDone])
  return (
    <div className="card flex items-center justify-between gap-3 p-4">
      <div>
        <div className="text-sm text-[var(--muted)]">Rest</div>
        <div className="text-3xl font-bold tabular-nums">{fmt(left)}</div>
      </div>
      <button className="btn btn-secondary" onClick={onDone}>
        Skip rest
      </button>
    </div>
  )
}

/** Countdown for a hold or stretch, started by the user. */
export function HoldTimer({ seconds, label = 'Start' }: { seconds: number; label?: string }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useTicker(running)
  const left = Math.max(0, seconds - elapsed)
  useEffect(() => {
    if (running && left === 0) {
      buzz()
      setRunning(false)
    }
  }, [running, left])
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-2xl font-bold tabular-nums">{fmt(left)}</span>
      {left > 0 ? (
        <button className="btn btn-secondary" onClick={() => setRunning((r) => !r)}>
          {running ? 'Pause' : elapsed > 0 ? 'Resume' : label}
        </button>
      ) : (
        <button className="btn btn-secondary" onClick={() => setElapsed(0)}>
          Again
        </button>
      )}
    </div>
  )
}

/** Stopwatch for timed holds; reports the held seconds when stopped. */
export function Stopwatch({ onStop }: { onStop: (seconds: number) => void }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useTicker(running)
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 text-2xl font-bold tabular-nums">{fmt(elapsed)}</span>
      <button
        className="btn btn-secondary"
        onClick={() => {
          if (running) onStop(Math.round(elapsed))
          else setElapsed(0)
          setRunning(!running)
        }}
      >
        {running ? 'Stop' : 'Time the hold'}
      </button>
    </div>
  )
}
