// Anterior and lateral core ladder (C) — docs/EVIDENCE.md, "Exercise candidates".
import { add, angleTo, BODY, dir, dist, GROUND_Y, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- geometry helpers

/** Height of the toe tip when the toes are tucked under on the mat. */
const TOE_Y = GROUND_Y - 2.5
const LEG = BODY.thigh + BODY.shin

/** Root of a monotonic function on [lo, hi] by bisection. */
function bisect(f: (x: number) => number, lo: number, hi: number): number {
  const sLo = Math.sign(f(lo))
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (Math.sign(f(mid)) === sLo) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

/** Upper (smaller y) intersection of two circles. */
function upperIntersection(c1: Vec, r1: number, c2: Vec, r2: number): Vec {
  const d = dist(c1, c2)
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const u: Vec = [(c2[0] - c1[0]) / d, (c2[1] - c1[1]) / d]
  const m = add(c1, u, a)
  const p = add(m, [-u[1], u[0]], h)
  const q = add(m, [u[1], -u[0]], h)
  return p[1] < q[1] ? p : q
}

/** Middle joint of a two-segment limb from `base` to `end` (law of cosines). */
function middleJoint(base: Vec, end: Vec, l1: number, l2: number, bend: 1 | -1): Vec {
  const d = Math.min(dist(base, end), l1 + l2 - 1e-6)
  const alpha = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)) / (Math.PI / 180)
  return add(base, dir(angleTo(base, end) + bend * alpha), l1)
}

// ---------------------------------------------------------------- lying on the back (C1–C3)

const SUPINE_HIP: Vec = [80, FLOOR]
/** Head resting on the mat. */
const SUPINE_HEAD = 258

type Supine = { arm: Limb; leg: Limb }

function supinePose(near: Supine, far: Supine, extra: Partial<Pose> = {}): Pose {
  return {
    hip: SUPINE_HIP,
    torso: 270,
    head: SUPINE_HEAD,
    armNear: near.arm,
    armFar: far.arm,
    legNear: near.leg,
    legFar: far.leg,
    ...extra,
  }
}

const ARM_UP: Limb = { a: [180, 180] }
/** Overhead, hovering just above the mat. */
const ARM_OVERHEAD: Limb = { a: [263, 263] }
const LEG_TABLETOP: Limb = { a: [180, 90] }
const LEG_STRAIGHT_UP: Limb = { a: [170, 170] }
/** Straight, the heel hovering a few centimetres above the mat. */
const LEG_LOW: Limb = { a: [97, 97] }

function deadBugFrames(start: Limb) {
  const rest = supinePose({ arm: ARM_UP, leg: start }, { arm: ARM_UP, leg: start })
  return [
    { pose: rest, move: 1.5, hold: 0.4, label: 'Return' },
    { pose: supinePose({ arm: ARM_OVERHEAD, leg: start }, { arm: ARM_UP, leg: LEG_LOW }), move: 2, hold: 1, label: 'Reach' },
    { pose: rest, move: 1.5, hold: 0.4, label: 'Return' },
    { pose: supinePose({ arm: ARM_UP, leg: LEG_LOW }, { arm: ARM_OVERHEAD, leg: start }), move: 2, hold: 1, label: 'Other side' },
  ]
}

// C3: lying with knees bent, then curled into the tucked hollow position.
const CROOK_LEG: Limb = { pin: [SUPINE_HIP[0] + 38, ANKLE_FLOOR], bend: 1 }
const ARM_BY_SIDE: Limb = { a: [86, 86] }
const crookLying = supinePose({ arm: ARM_BY_SIDE, leg: CROOK_LEG }, { arm: ARM_BY_SIDE, leg: CROOK_LEG }, { footNear: 90, footFar: 90 })
const HOLLOW_TORSO = 255
const tuckedHollow = supinePose(
  { arm: { a: [93, 93] }, leg: { a: [190, 95] } },
  { arm: { a: [93, 93] }, leg: { a: [190, 95] } },
  // Lower back stays on the mat while the shoulder blades lift: a rounded upper back.
  { torso: HOLLOW_TORSO, spine: 2.5, head: HOLLOW_TORSO - 8 },
)

// ---------------------------------------------------------------- forearm support (C4–C8)

const ELBOW: Vec = [104, HAND_FLOOR]
const FOREARM_HAND: Vec = [ELBOW[0] + BODY.forearm, HAND_FLOOR]
/** Shoulder stacked over the elbow. */
const STACKED: Vec = [ELBOW[0], HAND_FLOOR - BODY.upperArm]

/** Forearm flat on the mat: the hand is pinned, and the elbow folds down onto the mat. */
function forearmOnFloor(shoulder: Vec): Limb {
  const low = (b: 1 | -1) => middleJoint(shoulder, FOREARM_HAND, BODY.upperArm, BODY.forearm, b)[1]
  return { pin: FOREARM_HAND, bend: low(1) > low(-1) ? 1 : -1 }
}

/** Top hand resting on the top hip (side planks), as free joint angles. */
function handOnHip(shoulder: Vec, hip: Vec, torso: number): Limb {
  const hand = add(add(hip, dir(torso), 3), dir(torso + 90), 4.5)
  const high = (b: 1 | -1) => middleJoint(shoulder, hand, BODY.upperArm, BODY.forearm, b)
  const elbow = high(1)[1] < high(-1)[1] ? high(1) : high(-1)
  return { a: [angleTo(shoulder, elbow), angleTo(elbow, hand)] }
}

type Side = 'front' | 'side'

/** Arms for a forearm plank seen from the side (both forearms down) or a side plank seen from the front. */
function arms(kind: Side, shoulder: Vec, hip: Vec, torso: number) {
  const floor = forearmOnFloor(shoulder)
  return kind === 'front' ? { armNear: floor, armFar: floor } : { armNear: handOnHip(shoulder, hip, torso), armFar: floor }
}

const headFor = (kind: Side, torso: number) => (kind === 'front' ? torso - 4 : torso)

// -- knees on the mat, shins resting on the mat (C4, C7)

/** Knee on the mat, in line with hip and stacked shoulder. */
const PLANK_KNEE: Vec = [STACKED[0] - Math.sqrt((BODY.thigh + BODY.torso) ** 2 - (FLOOR - STACKED[1]) ** 2), FLOOR]
const SHIN_ON_MAT = { shin: 268, foot: 275 }

function kneePlankPose(kind: Side): Pose {
  const line = angleTo(PLANK_KNEE, STACKED)
  const hip = add(PLANK_KNEE, dir(line), BODY.thigh)
  const leg: Limb = { a: [line + 180, SHIN_ON_MAT.shin] }
  return {
    hip,
    torso: line,
    head: headFor(kind, line),
    ...arms(kind, STACKED, hip, line),
    legNear: leg,
    legFar: leg,
    footNear: SHIN_ON_MAT.foot,
    footFar: SHIN_ON_MAT.foot,
  }
}

/** Lying on the mat propped on the forearm(s), hips down; `angle` is the upper arm's tilt. */
function proppedHip(angle: number) {
  const shoulder = add(ELBOW, dir(angle), BODY.upperArm)
  const hip: Vec = [shoulder[0] - Math.sqrt(BODY.torso ** 2 - (FLOOR - shoulder[1]) ** 2), FLOOR]
  return { shoulder, hip }
}

// Shoulder position that keeps the knee on the same spot of the mat when the hips lift.
const PROPPED_ANGLE = bisect((a) => proppedHip(a).hip[0] - BODY.thigh - PLANK_KNEE[0], 178, 200)

function proppedKneesPose(kind: Side): Pose {
  const { shoulder, hip } = proppedHip(PROPPED_ANGLE)
  const torso = angleTo(hip, shoulder)
  const leg: Limb = { a: [270, SHIN_ON_MAT.shin] }
  return {
    hip,
    torso,
    head: kind === 'front' ? torso - 8 : torso,
    ...arms(kind, shoulder, hip, torso),
    legNear: leg,
    legFar: leg,
    footNear: SHIN_ON_MAT.foot,
    footFar: SHIN_ON_MAT.foot,
  }
}

// -- on the toes (C5, C6): body straight from the tucked toes to the head

function toePlank(shoulder: Vec) {
  // Body line angle for which the tucked toes touch the mat.
  const e = bisect((x) => shoulder[1] + 79 * Math.sin((x * Math.PI) / 180) + BODY.foot * Math.cos((x * Math.PI) / 180) - TOE_Y, -10, 40)
  const line = 90 + e
  const hip = add(shoulder, dir(line), -BODY.torso)
  const toe = add(add(hip, dir(line), -LEG), dir(e), BODY.foot)
  return { e, line, hip, toe }
}

function toePlankPose(shoulder: Vec): Pose {
  const { e, line, hip } = toePlank(shoulder)
  const leg: Limb = { a: [line + 180, line + 180] }
  return {
    hip,
    torso: line,
    head: line - 4,
    ...arms('front', shoulder, hip, line),
    legNear: leg,
    legFar: leg,
    footNear: e,
    footFar: e,
  }
}

/** Start and finish of C5/C6: knees on the mat, toes still tucked, forearms in place. */
function kneesDownToesPose(shoulder: Vec): Pose {
  const { toe } = toePlank(shoulder)
  const knee: Vec = [shoulder[0] - Math.sqrt((BODY.thigh + BODY.torso) ** 2 - (FLOOR - shoulder[1]) ** 2), FLOOR]
  const line = angleTo(knee, shoulder)
  const hip = add(knee, dir(line), BODY.thigh)
  const ankle = upperIntersection(knee, BODY.shin, toe, BODY.foot)
  const leg: Limb = { a: [line + 180, angleTo(knee, ankle)] }
  const foot = angleTo(ankle, toe)
  return {
    hip,
    torso: line,
    head: line - 4,
    ...arms('front', shoulder, hip, line),
    legNear: leg,
    legFar: leg,
    footNear: foot,
    footFar: foot,
  }
}

/** Long lever: elbows ahead of the shoulders. */
const LONG_LEVER: Vec = add(ELBOW, dir(28), -BODY.upperArm)

// -- side plank on the feet (C8): seen from the front, legs straight and stacked

/** Side of the bottom foot on the mat; drawn in line with the leg. */
const SIDE_LINE = 90 + (Math.asin((TOE_Y - STACKED[1]) / (BODY.torso + LEG + BODY.foot)) * 180) / Math.PI
const SIDE_TOE: Vec = add(STACKED, dir(SIDE_LINE), -(BODY.torso + LEG + BODY.foot))

function sidePlankPose(): Pose {
  const hip = add(STACKED, dir(SIDE_LINE), -BODY.torso)
  const leg: Limb = { a: [SIDE_LINE + 180, SIDE_LINE + 180] }
  return {
    hip,
    torso: SIDE_LINE,
    head: SIDE_LINE,
    ...arms('side', STACKED, hip, SIDE_LINE),
    legNear: leg,
    legFar: leg,
    footNear: SIDE_LINE + 180,
    footFar: SIDE_LINE + 180,
  }
}

function sideLyingPose(): Pose {
  const hip: Vec = [SIDE_TOE[0] + Math.sqrt((LEG + BODY.foot) ** 2 - (SIDE_TOE[1] - FLOOR) ** 2), FLOOR]
  const shoulder = upperIntersection(hip, BODY.torso, ELBOW, BODY.upperArm)
  const torso = angleTo(hip, shoulder)
  const legAngle = angleTo(hip, SIDE_TOE)
  const leg: Limb = { a: [legAngle, legAngle] }
  return {
    hip,
    torso,
    head: torso,
    ...arms('side', shoulder, hip, torso),
    legNear: leg,
    legFar: leg,
    footNear: legAngle,
    footFar: legAngle,
  }
}

/** Get into position, hold, lower back down. */
function holdFrames(rest: Pose, hold: Pose) {
  return [
    { pose: rest, move: 1.5, hold: 1, label: 'Lower' },
    { pose: hold, move: 1.5, label: 'Lift' },
    { pose: hold, move: 0.1, hold: 4, label: 'Hold' },
  ]
}

const SUPINE_VIEWBOX = [10, 44, 132, 72] as const
const PLANK_VIEWBOX = [10, 50, 128, 66] as const

// ---------------------------------------------------------------- exercises

const SHOULDER_OVERHEAD = 'Shoulder: shorten the overhead reach if it is painful.'
const KNEE_MAT = 'Knees: kneel on a folded mat.'
const SHOULDER_STOP = 'Stop the set at shoulder pain of 4/10 or more.'

const deadBug: Exercise = {
  id: 'C1',
  name: 'Dead bug (bent knees)',
  group: 'core',
  cls: 'endurance',
  muscles: ['Deep abdominals'],
  measure: 'reps',
  target: [8, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie on your back, arms pointing to the ceiling, hips and knees bent to 90°.',
    'Press the lower back gently into the mat and keep it there.',
    'Slowly reach one arm overhead and straighten the opposite leg until both hover just above the mat.',
    'Return and switch sides.',
  ],
  cautions: [SHOULDER_OVERHEAD],
  animation: { frames: deadBugFrames(LEG_TABLETOP), viewBox: SUPINE_VIEWBOX },
}

const deadBugExtended: Exercise = {
  id: 'C2',
  name: 'Dead bug (legs extended)',
  group: 'core',
  cls: 'endurance',
  muscles: ['Abdominals', 'Hip flexors'],
  measure: 'reps',
  target: [8, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie on your back, arms pointing to the ceiling, legs straight up towards the ceiling.',
    'Press the lower back gently into the mat and keep it there.',
    'Slowly lower one straight leg and reach the opposite arm overhead until both hover just above the mat.',
    'Return and switch sides; lower the leg less far if the back starts to arch.',
  ],
  cautions: [SHOULDER_OVERHEAD],
  animation: { frames: deadBugFrames(LEG_STRAIGHT_UP), viewBox: SUPINE_VIEWBOX },
}

const hollowHold: Exercise = {
  id: 'C3',
  name: 'Hollow hold (tucked)',
  group: 'core',
  cls: 'hold',
  muscles: ['Abdominals'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie on your back and press the lower back into the mat.',
    'Lift the head and shoulder blades, bring the knees over the hips with the shins level, and reach the arms towards the feet.',
    'Hold while breathing normally; the lower back stays on the mat.',
    'To progress, straighten the legs lower and take the arms overhead (full hollow hold).',
  ],
  cautions: ['Shoulder: keep the arms by the sides if overhead is painful.'],
  animation: {
    frames: [
      { pose: crookLying, move: 1.5, hold: 1, label: 'Lower' },
      { pose: tuckedHollow, move: 1.5, label: 'Lift' },
      { pose: tuckedHollow, move: 0.1, hold: 4, label: 'Hold' },
    ],
    viewBox: SUPINE_VIEWBOX,
  },
}

const kneePlank: Exercise = {
  id: 'C4',
  name: 'Forearm plank from knees',
  group: 'core',
  cls: 'hold',
  muscles: ['Abdominals', 'Serratus anterior'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['shoulder', 'knee'],
  cues: [
    'Lie face down on a folded mat, forearms on the floor, elbows under the shoulders.',
    'Lift the hips so the body is straight from knees to head.',
    'Hold, breathing normally, without letting the hips sag or the shoulders sink.',
  ],
  cautions: [KNEE_MAT, 'Wrists: the forearm position avoids wrist extension.', SHOULDER_STOP],
  animation: { frames: holdFrames(proppedKneesPose('front'), kneePlankPose('front')), viewBox: PLANK_VIEWBOX },
}

const forearmPlank: Exercise = {
  id: 'C5',
  name: 'Forearm plank',
  group: 'core',
  cls: 'hold',
  muscles: ['Abdominals', 'Serratus anterior', 'Gluteals'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Forearms on the floor with elbows under the shoulders, knees down and toes tucked.',
    'Lift the knees so the body is straight from heels to head; squeeze the glutes.',
    'Hold, breathing normally. For more serratus work, push the floor away so the shoulder blades spread ("plank plus").',
  ],
  cautions: [SHOULDER_STOP],
  animation: { frames: holdFrames(kneesDownToesPose(STACKED), toePlankPose(STACKED)), viewBox: PLANK_VIEWBOX },
}

const longLeverPlank: Exercise = {
  id: 'C6',
  name: 'Long-lever forearm plank',
  group: 'core',
  cls: 'hold',
  muscles: ['Abdominals'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Forearms on the floor with the elbows a little ahead of the shoulders, knees down and toes tucked.',
    'Lift the knees so the body is straight from heels to head.',
    'Hold, breathing normally, without letting the lower back arch.',
  ],
  cautions: ['Shoulder: higher shoulder demand than the standard forearm plank.', SHOULDER_STOP],
  animation: { frames: holdFrames(kneesDownToesPose(LONG_LEVER), toePlankPose(LONG_LEVER)), viewBox: PLANK_VIEWBOX },
}

const kneeSidePlank: Exercise = {
  id: 'C7',
  name: 'Side plank from knees',
  group: 'core',
  cls: 'hold',
  muscles: ['Obliques', 'Gluteus medius'],
  measure: 'seconds',
  target: [20, 45],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['shoulder', 'knee'],
  cues: [
    'Lie on your side on a folded mat, propped on the forearm with the elbow under the shoulder, knees bent behind you.',
    'Lift the hips so the body is straight from knees to head; top hand on the hip.',
    'Hold, breathing normally, then lower and switch sides.',
  ],
  cautions: [KNEE_MAT, 'Shoulder: keep the shoulder stacked over the elbow.', SHOULDER_STOP],
  animation: { frames: holdFrames(proppedKneesPose('side'), kneePlankPose('side')), viewBox: PLANK_VIEWBOX },
}

const sidePlank: Exercise = {
  id: 'C8',
  name: 'Side plank',
  group: 'core',
  cls: 'hold',
  muscles: ['Obliques', 'Gluteus medius', 'Quadratus lumborum'],
  measure: 'seconds',
  target: [20, 45],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie on your side propped on the forearm, elbow under the shoulder, legs straight with the feet stacked or staggered.',
    'Lift the hips so the body is straight from feet to head; top hand on the hip.',
    'Hold, breathing normally, then lower and switch sides.',
  ],
  cautions: ['Shoulder: keep the shoulder stacked over the elbow.', SHOULDER_STOP],
  animation: { frames: holdFrames(sideLyingPose(), sidePlankPose()), viewBox: PLANK_VIEWBOX },
}

export const CORE: Exercise[] = [
  deadBug,
  deadBugExtended,
  hollowHold,
  kneePlank,
  forearmPlank,
  longLeverPlank,
  kneeSidePlank,
  sidePlank,
]
