import { describe, expect, it } from 'vitest'
import { buildTimeline, position, SIDE_SWITCH_SECONDS, totalSeconds } from './timeline'

describe('interval timeline', () => {
  it('alternates work and rest, with no rest after the last interval', () => {
    const t = buildTimeline([
      { item: 0, round: 1, work: 40, rest: 20, perSide: false },
      { item: 1, round: 1, work: 40, rest: 20, perSide: false },
    ])
    expect(t.map((s) => [s.kind, s.item, s.start, s.seconds])).toEqual([
      ['work', 0, 0, 40],
      ['rest', 1, 40, 20],
      ['work', 1, 60, 40],
    ])
    expect(totalSeconds(t)).toBe(100)
  })

  it('runs both sides of a per-side exercise with a short switch', () => {
    const t = buildTimeline([{ item: 0, round: 1, work: 30, rest: 15, perSide: true }])
    expect(t.map((s) => [s.kind, s.side, s.seconds])).toEqual([
      ['work', 1, 30],
      ['rest', 2, SIDE_SWITCH_SECONDS],
      ['work', 2, 30],
    ])
  })

  it('skips zero-length rests, as in a continuous ramp', () => {
    const t = buildTimeline([
      { item: 0, round: 1, work: 30, rest: 0, perSide: false },
      { item: 1, round: 1, work: 30, rest: 0, perSide: false },
    ])
    expect(t.map((s) => s.kind)).toEqual(['work', 'work'])
  })

  it('finds the running segment and the time left', () => {
    const t = buildTimeline([
      { item: 0, round: 1, work: 40, rest: 20, perSide: false },
      { item: 1, round: 1, work: 40, rest: 20, perSide: false },
    ])
    expect(position(t, 0)).toEqual({ index: 0, left: 40 })
    expect(position(t, 45)).toEqual({ index: 1, left: 15 })
    expect(position(t, 99.5)).toEqual({ index: 2, left: 0.5 })
    expect(position(t, 100)).toBeNull()
  })
})
