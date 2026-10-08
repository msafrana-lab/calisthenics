import { describe, expect, it } from 'vitest'
import { rideIntensityByDay, withImportedRides } from './rides'

const ride = (at: string, intensity: 'easy' | 'hard') => ({ recorded_at: at, duration_s: 1800, details: { intensity } })

describe('imported rides', () => {
  it('keeps the hardest ride of each day', () => {
    const m = rideIntensityByDay([ride('2026-10-08T07:00:00', 'easy'), ride('2026-10-08T18:00:00', 'hard'), ride('2026-10-09T07:00:00', 'easy')])
    expect(m.get('2026-10-08')).toBe('hard')
    expect(m.get('2026-10-09')).toBe('easy')
  })

  it('fills days without a setting and never overrides one', () => {
    const days = [
      { day: '2026-10-08', cycling: 'easy' as const, morning: null },
      { day: '2026-10-09', cycling: null, morning: { knee: 'same' as const } },
    ]
    const merged = withImportedRides(days, [ride('2026-10-08T07:00:00', 'hard'), ride('2026-10-09T07:00:00', 'hard'), ride('2026-10-10T07:00:00', 'easy')])
    expect(merged).toEqual([
      { day: '2026-10-08', cycling: 'easy', morning: null },
      { day: '2026-10-09', cycling: 'hard', morning: { knee: 'same' } },
      { day: '2026-10-10', cycling: 'easy', morning: null },
    ])
  })
})
