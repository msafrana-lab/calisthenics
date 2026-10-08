import { describe, expect, it } from 'vitest'
import { EXERCISES } from './library'

describe('exercise library', () => {
  it('has unique ids', () => {
    const ids = EXERCISES.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(EXERCISES.map((e) => [e.id, e] as const))('%s is complete and consistent', (_id, e) => {
    expect(e.name.length).toBeGreaterThan(2)
    expect(e.cues.length).toBeGreaterThanOrEqual(2)
    expect(e.muscles.length).toBeGreaterThanOrEqual(1)
    expect(e.target[0]).toBeGreaterThan(0)
    expect(e.target[0]).toBeLessThanOrEqual(e.target[1])
    expect(e.animation.frames.length).toBeGreaterThanOrEqual(2)
    for (const f of e.animation.frames) expect(f.move).toBeGreaterThan(0)
    if (e.cls === 'hold' || e.cls === 'stretch') expect(e.measure).toBe('seconds')
    if (e.cls === 'strength' || e.cls === 'endurance' || e.cls === 'cuff') expect(e.measure).toBe('reps')
    if (e.kneeLoad !== 'low') expect(e.regions).toContain('knee')
  })
})

describe('programme references', () => {
  it('only uses exercises that exist in the library', async () => {
    const { LADDERS, TEMPLATES } = await import('../programme/ladders')
    const { exerciseById } = await import('./library')
    const ids = [
      ...Object.values(LADDERS).flatMap((l) => l.steps.map((s) => s.id)),
      ...Object.values(TEMPLATES).flatMap((t) => [...t.warmup, ...t.cooldown, ...t.main.flatMap((s) => ('exercise' in s ? [s.exercise] : []))]),
    ]
    expect(ids.filter((id) => !exerciseById(id))).toEqual([])
  })
})
