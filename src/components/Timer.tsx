import { useEffect, useRef, useState } from 'react'
import { Pause, Play, Plus, RotateCcw, SkipForward } from 'lucide-react'
import { Ring } from '../ui'

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

export const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Short vibration where supported (not on iPhone Safari); harmless elsewhere. */
const buzz = () => navigator.vibrate?.(200)

/** Rest countdown that starts immediately; calls onDone at zero or when skipped. */
export function RestTimer({ seconds, onDone, nextLabel }: { seconds: number; onDone: () => void; nextLabel?: string }) {
  const [elapsed] = useTicker(true)
  const [total, setTotal] = useState(seconds)
  const left = Math.max(0, total - elapsed)
  useEffect(() => {
    if (left === 0) {
      buzz()
      onDone()
    }
  }, [left, onDone])
  return (
    <div className="flex flex-col items-center gap-5 py-4">
      <Ring value={left / total} size={200} stroke={12}>
        <div className="eyebrow">Rest</div>
        <div className="text-[44px] leading-none font-semibold tabular-nums">{fmt(left)}</div>
      </Ring>
      {nextLabel && <p className="text-sm text-[var(--muted)]">Next: {nextLabel}</p>}
      <div className="flex gap-2">
        <button className="btn btn-secondary" onClick={() => setTotal((t) => t + 15)}>
          <Plus size={17} /> 15 s
        </button>
        <button className="btn btn-primary" onClick={onDone}>
          <SkipForward size={17} /> Skip rest
        </button>
      </div>
    </div>
  )
}

/** Countdown for a hold or stretch, started by the user. */
export function HoldTimer({ seconds }: { seconds: number }) {
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
    <div className="flex flex-col items-center gap-4">
      <Ring value={left / seconds} size={150} stroke={10}>
        <div className="text-[34px] leading-none font-semibold tabular-nums">{fmt(left)}</div>
      </Ring>
      {left > 0 ? (
        <button className="btn btn-secondary" onClick={() => setRunning((r) => !r)}>
          {running ? <Pause size={17} /> : <Play size={17} />} {running ? 'Pause' : elapsed > 0 ? 'Resume' : 'Start timer'}
        </button>
      ) : (
        <button className="btn btn-secondary" onClick={() => setElapsed(0)}>
          <RotateCcw size={17} /> Again
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
    <button
      className={`btn w-full ${running ? 'btn-primary' : 'btn-secondary'}`}
      onClick={() => {
        if (running) onStop(Math.round(elapsed))
        else setElapsed(0)
        setRunning(!running)
      }}
    >
      {running ? <Pause size={17} /> : <Play size={17} />}
      {running ? `Stop at ${fmt(elapsed)}` : 'Time the hold'}
    </button>
  )
}
