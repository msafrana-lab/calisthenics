import { useCallback, useEffect, useRef, useState } from 'react'
import { position, type Segment } from '../programme/timeline'

export type ClockEvent =
  | { type: 'segment'; index: number }
  | { type: 'countdown'; index: number; seconds: 1 | 2 | 3 }
  | { type: 'halfway'; index: number }
  | { type: 'done' }

/**
 * Runs a session timeline. Time is measured from timestamps, not by counting
 * ticks, so it stays right if the phone throttles the timer; after a long gap
 * only the latest segment change is announced.
 */
export function useIntervalClock(segments: Segment[], onEvent: (e: ClockEvent) => void) {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const base = useRef(0) // elapsed seconds when the clock was last started
  const since = useRef<number | null>(null) // timestamp of that start
  const last = useRef<{ index: number; whole: number; done: boolean }>({ index: -1, whole: -1, done: false })
  const handler = useRef(onEvent)
  handler.current = onEvent

  const now = () => base.current + (since.current === null ? 0 : (performance.now() - since.current) / 1000)

  const emit = useCallback(
    (t: number) => {
      const pos = position(segments, t)
      const prev = last.current
      if (!pos) {
        if (!prev.done) {
          last.current = { ...prev, done: true }
          handler.current({ type: 'done' })
        }
        return
      }
      const whole = Math.ceil(pos.left)
      if (pos.index !== prev.index) {
        handler.current({ type: 'segment', index: pos.index })
      } else if (whole !== prev.whole) {
        const seg = segments[pos.index]
        if (whole <= 3 && whole >= 1 && seg.seconds >= 5) handler.current({ type: 'countdown', index: pos.index, seconds: whole as 1 | 2 | 3 })
        if (seg.kind === 'work' && seg.seconds >= 40 && whole === Math.ceil(seg.seconds / 2)) handler.current({ type: 'halfway', index: pos.index })
      }
      last.current = { index: pos.index, whole, done: false }
    },
    [segments],
  )

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const t = now()
      setElapsed(t)
      emit(t)
    }, 200)
    return () => clearInterval(id)
  }, [running, emit])

  const start = useCallback(() => {
    since.current = performance.now()
    setRunning(true)
    emit(base.current)
  }, [emit])

  const pause = useCallback(() => {
    base.current = now()
    since.current = null
    setElapsed(base.current)
    setRunning(false)
  }, [])

  /** Jumps to the start of a segment (skip or go back). */
  const seek = useCallback(
    (index: number) => {
      const seg = segments[Math.max(0, Math.min(index, segments.length - 1))]
      if (!seg) return
      base.current = seg.start
      if (since.current !== null) since.current = performance.now()
      setElapsed(seg.start)
      last.current = { index: -1, whole: -1, done: false }
      if (since.current !== null) emit(seg.start)
    },
    [segments, emit],
  )

  const pos = position(segments, elapsed)
  return { elapsed, running, index: pos?.index ?? segments.length, left: pos?.left ?? 0, done: !pos, start, pause, seek }
}
