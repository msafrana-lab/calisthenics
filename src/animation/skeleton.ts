// 2D side-view stick figure.
//
// Angle convention (degrees, absolute, SVG coordinates with y pointing down):
//   0 = segment points straight down, 90 = points right (the way the figure faces),
//   180 = points up, 270 = points left.
// A pose fixes the hip position, the torso and head directions, and each limb.
// A limb is either free (two segment angles) or pinned: its end is fixed to a
// point (a hand on the floor, a foot on the mat) and the middle joint is solved.

export type Vec = readonly [number, number]

export const BODY = {
  torso: 30,
  neck: 4,
  headR: 6.5,
  upperArm: 16,
  forearm: 15,
  thigh: 25,
  shin: 24,
  foot: 7,
} as const

export const GROUND_Y = 110

/** Free limb: absolute angles of the upper and lower segment. */
export type FreeLimb = { a: readonly [number, number] }
/** Pinned limb: end point fixed in the scene; `bend` picks which way the middle joint folds. */
export type PinnedLimb = { pin: Vec; bend: 1 | -1 }
export type Limb = FreeLimb | PinnedLimb

export type Pose = {
  hip: Vec
  torso: number
  head: number
  armNear: Limb
  armFar: Limb
  legNear: Limb
  legFar: Limb
  /** Foot angles; default is perpendicular to the shin, toes forward. */
  footNear?: number
  footFar?: number
  /**
   * Spine curve: how far the middle of the back bulges away from the straight
   * hip–shoulder line. Positive rounds the back (flexion, "cat"), negative
   * arches it (extension, "cow"). Hip and shoulder positions are unchanged.
   */
  spine?: number
  /** Top view only: how far each part is lifted off the floor (0–1), shown as a shadow. */
  lift?: Lift
}

export type Lift = { arms?: number; legs?: number; chest?: number }

export type LimbPoints = { base: Vec; mid: Vec; end: Vec }
export type Figure = {
  hip: Vec
  shoulder: Vec
  /** Control point of the quadratic curve drawn from hip to shoulder. */
  spineControl: Vec
  headCenter: Vec
  armNear: LimbPoints
  armFar: LimbPoints
  legNear: LimbPoints & { toe: Vec }
  legFar: LimbPoints & { toe: Vec }
}

const RAD = Math.PI / 180

export function dir(deg: number): Vec {
  return [Math.sin(deg * RAD), Math.cos(deg * RAD)]
}

export function add(p: Vec, v: Vec, k = 1): Vec {
  return [p[0] + v[0] * k, p[1] + v[1] * k]
}

/** Angle (in this file's convention) of the vector from `a` to `b`. */
export function angleTo(a: Vec, b: Vec): number {
  return Math.atan2(b[0] - a[0], b[1] - a[1]) / RAD
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function solveLimb(base: Vec, limb: Limb, l1: number, l2: number): LimbPoints {
  if ('a' in limb) {
    const mid = add(base, dir(limb.a[0]), l1)
    return { base, mid, end: add(mid, dir(limb.a[1]), l2) }
  }
  // Two-bone inverse kinematics (law of cosines).
  const d = Math.min(Math.max(dist(base, limb.pin), Math.abs(l1 - l2) + 1e-6), l1 + l2 - 1e-6)
  const phi = angleTo(base, limb.pin)
  const alpha = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)) / RAD
  const mid = add(base, dir(phi + limb.bend * alpha), l1)
  return { base, mid, end: add(mid, dir(angleTo(mid, limb.pin)), l2) }
}

export function solve(p: Pose): Figure {
  const shoulder = add(p.hip, dir(p.torso), BODY.torso)
  const headCenter = add(shoulder, dir(p.head), BODY.neck + BODY.headR)
  const legNear = solveLimb(p.hip, p.legNear, BODY.thigh, BODY.shin)
  const legFar = solveLimb(p.hip, p.legFar, BODY.thigh, BODY.shin)
  const toe = (leg: LimbPoints, angle: number | undefined): Vec =>
    add(leg.end, dir(angle ?? angleTo(leg.mid, leg.end) + 90), BODY.foot)
  // Normal pointing towards the figure's back (left of an upright figure facing right).
  const d = dir(p.torso)
  const back: Vec = [d[1], -d[0]]
  const middle: Vec = [(p.hip[0] + shoulder[0]) / 2, (p.hip[1] + shoulder[1]) / 2]
  return {
    hip: p.hip,
    shoulder,
    // A quadratic curve peaks at half its control offset.
    spineControl: add(middle, back, 2 * (p.spine ?? 0)),
    headCenter,
    armNear: solveLimb(shoulder, p.armNear, BODY.upperArm, BODY.forearm),
    armFar: solveLimb(shoulder, p.armFar, BODY.upperArm, BODY.forearm),
    legNear: { ...legNear, toe: toe(legNear, p.footNear) },
    legFar: { ...legFar, toe: toe(legFar, p.footFar) },
  }
}

// ---------------------------------------------------------------- interpolation

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const lerpVec = (a: Vec, b: Vec, t: number): Vec => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]

/** Interpolate angles along the shortest way round. */
function lerpAngle(a: number, b: number, t: number) {
  const d = ((((b - a) % 360) + 540) % 360) - 180
  return a + d * t
}

type LimbKey = 'armNear' | 'armFar' | 'legNear' | 'legFar'

function asFree(points: LimbPoints): FreeLimb {
  return { a: [angleTo(points.base, points.mid), angleTo(points.mid, points.end)] }
}

function lerpLimb(a: Pose, b: Pose, key: LimbKey, t: number): Limb {
  let la = a[key]
  let lb = b[key]
  if ('pin' in la && 'pin' in lb) {
    return { pin: lerpVec(la.pin, lb.pin, t), bend: t < 0.5 ? la.bend : lb.bend }
  }
  // A limb that leaves or reaches a contact point (e.g. a hand lifting off the
  // floor) is interpolated through its joint angles.
  if ('pin' in la) la = asFree(solve(a)[key])
  if ('pin' in lb) lb = asFree(solve(b)[key])
  const fa = la as FreeLimb
  const fb = lb as FreeLimb
  return { a: [lerpAngle(fa.a[0], fb.a[0], t), lerpAngle(fa.a[1], fb.a[1], t)] }
}

function lerpOptAngle(a: number | undefined, b: number | undefined, t: number) {
  if (a === undefined || b === undefined) return t < 0.5 ? a : b
  return lerpAngle(a, b, t)
}

function lerpLift(a: Lift | undefined, b: Lift | undefined, t: number): Lift | undefined {
  if (!a && !b) return undefined
  const part = (k: keyof Lift) => lerp(a?.[k] ?? 0, b?.[k] ?? 0, t)
  return { arms: part('arms'), legs: part('legs'), chest: part('chest') }
}

export function interpolate(a: Pose, b: Pose, t: number): Pose {
  return {
    spine: lerp(a.spine ?? 0, b.spine ?? 0, t),
    lift: lerpLift(a.lift, b.lift, t),
    hip: lerpVec(a.hip, b.hip, t),
    torso: lerpAngle(a.torso, b.torso, t),
    head: lerpAngle(a.head, b.head, t),
    armNear: lerpLimb(a, b, 'armNear', t),
    armFar: lerpLimb(a, b, 'armFar', t),
    legNear: lerpLimb(a, b, 'legNear', t),
    legFar: lerpLimb(a, b, 'legFar', t),
    footNear: lerpOptAngle(a.footNear, b.footNear, t),
    footFar: lerpOptAngle(a.footFar, b.footFar, t),
  }
}

// ---------------------------------------------------------------- timelines

/** One step of a movement: move to `pose` over `move` seconds, then hold `hold` seconds. */
export type Keyframe = { pose: Pose; move: number; hold?: number; label?: string }

export type Animation = {
  /** Keyframes loop: after the last one the figure moves back to the first. */
  frames: Keyframe[]
  /**
   * 'side' (default): camera at floor level, floor line at GROUND_Y.
   * 'top': camera above the mat looking down; the whole frame is the mat,
   * both sides of the body are drawn alike, lifted parts cast a shadow.
   */
  view?: 'side' | 'top'
  /** Scenery drawn behind the figure (side view). */
  wall?: { x: number }
  viewBox?: readonly [number, number, number, number]
}

export function duration(anim: Animation): number {
  return anim.frames.reduce((s, f) => s + f.move + (f.hold ?? 0), 0)
}

const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t)

/** Pose and current keyframe label at time `t` seconds (looping). */
export function sample(anim: Animation, t: number): { pose: Pose; label?: string } {
  const { frames } = anim
  const total = duration(anim)
  let time = ((t % total) + total) % total
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i]
    const prev = frames[(i - 1 + frames.length) % frames.length]
    if (time < f.move) {
      return { pose: interpolate(prev.pose, f.pose, ease(time / f.move)), label: f.label }
    }
    time -= f.move
    if (time < (f.hold ?? 0)) return { pose: f.pose, label: f.label }
    time -= f.hold ?? 0
  }
  return { pose: frames[frames.length - 1].pose, label: frames[frames.length - 1].label }
}
