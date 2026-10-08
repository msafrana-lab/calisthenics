// Body shapes for the exercise figure: tapered limbs with rounded joints and a
// torso that follows the spine curve. Pure geometry, rendered by FigureView.
import { BODY, type Figure, type LimbPoints, type Vec } from './skeleton'

const f2 = (n: number) => n.toFixed(2)

/** Widths (diameters) at each joint, in figure units. */
export const WIDTH = {
  hip: 11,
  waist: 9.5,
  chest: 12,
  shoulder: 10,
  neck: 4.6,
  thigh: [9, 6.2],
  shin: [6.2, 4.2],
  foot: [4.2, 2.6],
  upperArm: [5.6, 4.2],
  forearm: [4.2, 3.2],
  hand: 3.6,
} as const

/** A segment from a to b whose width changes from wa to wb, with round ends. */
export function capsule(a: Vec, b: Vec, wa: number, wb: number): string {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy) || 1e-6
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const ra = wa / 2
  const rb = wb / 2
  const p = (o: Vec, r: number, s: number): string => `${f2(o[0] + nx * r * s)} ${f2(o[1] + ny * r * s)}`
  return `M${p(a, ra, 1)} L${p(b, rb, 1)} A${f2(rb)} ${f2(rb)} 0 0 0 ${p(b, rb, -1)} L${p(a, ra, -1)} A${f2(ra)} ${f2(ra)} 0 0 0 ${p(a, ra, 1)}Z`
}

/** Point and tangent on the quadratic spine curve at t. */
function spineAt(f: Figure, t: number): { p: Vec; d: Vec } {
  const [a, c, b] = [f.hip, f.spineControl, f.shoulder]
  const u = 1 - t
  const p: Vec = [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]
  const d: Vec = [2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]), 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1])]
  return { p, d }
}

/** Torso width along the spine: hips, narrower waist, chest, shoulders. */
function torsoWidth(t: number): number {
  const stops: [number, number][] = [
    [0, WIDTH.hip],
    [0.35, WIDTH.waist],
    [0.75, WIDTH.chest],
    [1, WIDTH.shoulder],
  ]
  for (let i = 1; i < stops.length; i++) {
    const [t0, w0] = stops[i - 1]
    const [t1, w1] = stops[i]
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0)
      const s = 0.5 - 0.5 * Math.cos(Math.PI * k)
      return w0 + (w1 - w0) * s
    }
  }
  return WIDTH.shoulder
}

/** Torso outline following the (possibly curved) spine, with rounded ends. */
export function torso(f: Figure): string {
  const n = 14
  const left: Vec[] = []
  const right: Vec[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const { p, d } = spineAt(f, t)
    const len = Math.hypot(d[0], d[1]) || 1e-6
    const nx = -d[1] / len
    const ny = d[0] / len
    const r = torsoWidth(t) / 2
    left.push([p[0] + nx * r, p[1] + ny * r])
    right.push([p[0] - nx * r, p[1] - ny * r])
  }
  const rTop = WIDTH.shoulder / 2
  const rBottom = WIDTH.hip / 2
  const pts = (list: Vec[]) => list.map((q) => `${f2(q[0])} ${f2(q[1])}`).join(' L')
  const back = [...right].reverse()
  return `M${pts(left)} A${f2(rTop)} ${f2(rTop)} 0 0 0 ${pts([back[0]])} L${pts(back)} A${f2(rBottom)} ${f2(rBottom)} 0 0 0 ${pts([left[0]])}Z`
}

export function arm(l: LimbPoints): string[] {
  return [capsule(l.base, l.mid, WIDTH.upperArm[0], WIDTH.upperArm[1]), capsule(l.mid, l.end, WIDTH.forearm[0], WIDTH.forearm[1])]
}

export function leg(l: LimbPoints & { toe: Vec }): string[] {
  return [
    capsule(l.base, l.mid, WIDTH.thigh[0], WIDTH.thigh[1]),
    capsule(l.mid, l.end, WIDTH.shin[0], WIDTH.shin[1]),
    capsule(l.end, l.toe, WIDTH.foot[0], WIDTH.foot[1]),
  ]
}

/** Neck from the shoulders towards the head. */
export function neck(f: Figure): string {
  const dx = f.headCenter[0] - f.shoulder[0]
  const dy = f.headCenter[1] - f.shoulder[1]
  const len = Math.hypot(dx, dy) || 1
  const top: Vec = [f.shoulder[0] + (dx / len) * (len - BODY.headR * 0.6), f.shoulder[1] + (dy / len) * (len - BODY.headR * 0.6)]
  return capsule(f.shoulder, top, WIDTH.neck, WIDTH.neck * 0.9)
}
