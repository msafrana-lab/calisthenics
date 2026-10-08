import { describe, expect, it } from 'vitest'
import { BODY, dist, duration, sample, solve, type Pose } from './skeleton'
import { EXERCISES } from '../exercises/library'

const LIMBS = ['armNear', 'armFar', 'legNear', 'legFar'] as const

function lengths(key: (typeof LIMBS)[number]) {
  return key.startsWith('arm') ? [BODY.upperArm, BODY.forearm] : [BODY.thigh, BODY.shin]
}

describe('skeleton', () => {
  it('pins limbs exactly when the target is reachable', () => {
    const pose: Pose = {
      hip: [50, 60],
      torso: 180,
      head: 180,
      armNear: { pin: [60, 45], bend: 1 },
      armFar: { a: [0, 0] },
      legNear: { pin: [60, 100], bend: 1 },
      legFar: { a: [0, 0] },
    }
    const f = solve(pose)
    expect(dist(f.armNear.end, [60, 45])).toBeLessThan(1e-6)
    expect(dist(f.legNear.end, [60, 100])).toBeLessThan(1e-6)
  })
})

describe.each(EXERCISES.map((e) => [e.id, e] as const))('exercise %s', (_id, ex) => {
  it('reaches every contact point in every keyframe', () => {
    for (const { pose } of ex.animation.frames) {
      const f = solve(pose)
      for (const key of LIMBS) {
        const limb = pose[key]
        if ('pin' in limb) expect(dist(f[key].end, limb.pin)).toBeLessThan(0.01)
      }
    }
  })

  it('keeps segment lengths constant throughout the movement', () => {
    const total = duration(ex.animation)
    for (let t = 0; t < total; t += total / 60) {
      const f = solve(sample(ex.animation, t).pose)
      for (const key of LIMBS) {
        const [l1, l2] = lengths(key)
        expect(dist(f[key].base, f[key].mid)).toBeCloseTo(l1, 5)
        expect(dist(f[key].mid, f[key].end)).toBeCloseTo(l2, 5)
      }
    }
  })

  it('stays inside its frame (no clipped head, hands or feet)', () => {
    const [x, y, w, h] = ex.animation.viewBox ?? [15, 22, 130, 92]
    const total = duration(ex.animation)
    const margin = 3 // half the thickest stroke
    // In side view the floor strip may be cut at the bottom; in top view nothing may be.
    const bottomMargin = ex.animation.view === 'top' ? margin : 0
    for (let t = 0; t < total; t += total / 60) {
      const f = solve(sample(ex.animation, t).pose)
      const points = [f.hip, f.shoulder, ...LIMBS.flatMap((k) => [f[k].mid, f[k].end]), f.legNear.toe, f.legFar.toe]
      const r = BODY.headR
      expect(f.headCenter[0] - r).toBeGreaterThanOrEqual(x)
      expect(f.headCenter[0] + r).toBeLessThanOrEqual(x + w)
      expect(f.headCenter[1] - r).toBeGreaterThanOrEqual(y)
      expect(f.headCenter[1] + r).toBeLessThanOrEqual(y + h)
      for (const p of points) {
        expect(p[0] - margin).toBeGreaterThanOrEqual(x)
        expect(p[0] + margin).toBeLessThanOrEqual(x + w)
        expect(p[1] - margin).toBeGreaterThanOrEqual(y)
        expect(p[1] + bottomMargin).toBeLessThanOrEqual(y + h)
      }
    }
  })

  it.skipIf(ex.animation.view === 'top')('never puts a joint below the floor', () => {
    const total = duration(ex.animation)
    for (let t = 0; t < total; t += total / 60) {
      const f = solve(sample(ex.animation, t).pose)
      const points = [f.hip, f.shoulder, ...LIMBS.flatMap((k) => [f[k].mid, f[k].end])]
      for (const p of points) expect(p[1]).toBeLessThanOrEqual(110.5)
    }
  })
})
