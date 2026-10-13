// Timeline of a timed-interval session: the work and rest segments the player
// runs through, in order. Pure, so the timing can be tested without a clock.

export type Interval = {
  /** Index of the plan item (exercise) this interval belongs to. */
  item: number
  /** Round of this item, from 1. */
  round: number
  /** Work time in seconds; for a per-side exercise, the time for each side. */
  work: number
  /** Rest after the interval, in seconds (0 for none). */
  rest: number
  perSide: boolean
}

export type Segment = {
  kind: 'work' | 'rest'
  /** Plan item of the work segment, or of the next work segment for a rest. */
  item: number
  round: number
  /** 1 or 2 for the sides of a per-side exercise. */
  side?: 1 | 2
  seconds: number
  /** Start time from the beginning of the session, in seconds. */
  start: number
}

/** Pause between the two sides of a per-side exercise, to change position. */
export const SIDE_SWITCH_SECONDS = 5

export function buildTimeline(intervals: Interval[]): Segment[] {
  const out: Segment[] = []
  let t = 0
  const push = (s: Omit<Segment, 'start'>) => {
    if (s.seconds <= 0) return
    out.push({ ...s, start: t })
    t += s.seconds
  }
  intervals.forEach((iv, i) => {
    if (iv.perSide) {
      push({ kind: 'work', item: iv.item, round: iv.round, side: 1, seconds: iv.work })
      push({ kind: 'rest', item: iv.item, round: iv.round, side: 2, seconds: SIDE_SWITCH_SECONDS })
      push({ kind: 'work', item: iv.item, round: iv.round, side: 2, seconds: iv.work })
    } else {
      push({ kind: 'work', item: iv.item, round: iv.round, seconds: iv.work })
    }
    const next = intervals[i + 1]
    // No rest after the last interval; a rest belongs to the exercise that follows it.
    if (next) push({ kind: 'rest', item: next.item, round: next.round, seconds: iv.rest })
  })
  return out
}

export const totalSeconds = (segments: Segment[]) => (segments.length ? segments.at(-1)!.start + segments.at(-1)!.seconds : 0)

/** The segment running at `elapsed` seconds and the time left in it; null once the session is over. */
export function position(segments: Segment[], elapsed: number): { index: number; left: number } | null {
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]
    if (elapsed < s.start + s.seconds) return { index: i, left: s.start + s.seconds - elapsed }
  }
  return null
}
