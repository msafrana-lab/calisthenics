// Core variations and advanced steps — docs/EVIDENCE.md, "Exercise variations and
// advanced steps": C5l, C5a, C5h (variations of C5), C9 (hollow rock),
// C10 (rotational side plank) and A6 (side plank star).
//
// The plank geometry is copied from core.ts (C5, C8) and abduction.ts (A5) so this
// file stays self-contained. Side planks use the "lying on the side" convention
// (docs/ANIMATION.md): seen from the front, head to the right, the top arm and top
// leg are the near limbs.
import { add, angleTo, BODY, dir, dist, GROUND_Y, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- geometry helpers

/** Height of the toe tip when the toes are tucked under on the mat. */
const TOE_Y = GROUND_Y - 2.5
const LEG = BODY.thigh + BODY.shin
const ARM = BODY.upperArm + BODY.forearm

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

/** Straight limb (arm or leg) pointing in one direction. */
const straight = (angle: number): Limb => ({ a: [angle, angle] })

/** Straight arm from `shoulder` towards `hand`. */
const reachTo = (shoulder: Vec, hand: Vec): Limb => straight(angleTo(shoulder, hand))

// ---------------------------------------------------------------- front planks (C5l, C5a, C5h)

const ELBOW: Vec = [104, HAND_FLOOR]
const FOREARM_HAND: Vec = [ELBOW[0] + BODY.forearm, HAND_FLOOR]
/** Forearm plank: shoulder stacked over the elbow. */
const STACKED: Vec = [ELBOW[0], HAND_FLOOR - BODY.upperArm]

/** Forearm flat on the mat: the hand is pinned, and the elbow folds down onto the mat. */
function forearmOnFloor(shoulder: Vec): Limb {
  const low = (b: 1 | -1) => middleJoint(shoulder, FOREARM_HAND, BODY.upperArm, BODY.forearm, b)[1]
  return { pin: FOREARM_HAND, bend: low(1) > low(-1) ? 1 : -1 }
}

/** High plank: hand on the mat under the shoulder, arm straight with the elbow soft. */
const HIGH_HAND: Vec = [100, HAND_FLOOR]
const HIGH_SHOULDER: Vec = [HIGH_HAND[0], HAND_FLOOR - ARM + 0.1]
const HAND_ON_MAT: Limb = { pin: HIGH_HAND, bend: -1 }

/** Body line from the shoulder to the tucked toes for a plank on the toes. */
function toePlank(shoulder: Vec) {
  const e = bisect((x) => shoulder[1] + 79 * Math.sin((x * Math.PI) / 180) + BODY.foot * Math.cos((x * Math.PI) / 180) - TOE_Y, -10, 40)
  const line = 90 + e
  const hip = add(shoulder, dir(line), -BODY.torso)
  const toe = add(add(hip, dir(line), -LEG), dir(e), BODY.foot)
  return { e, line, hip, toe }
}

type Support = { armNear: Limb; armFar: Limb }

/** Plank on the toes; `lift` raises one straight leg (degrees above the body line). */
function toePlankPose(shoulder: Vec, arms: Support, lift: { near?: number; far?: number } = {}): Pose {
  const { e, line, hip } = toePlank(shoulder)
  const leg = (up = 0) => straight(line + 180 - up)
  return {
    hip,
    torso: line,
    head: line - 4,
    ...arms,
    legNear: leg(lift.near),
    legFar: leg(lift.far),
    footNear: e - (lift.near ?? 0),
    footFar: e - (lift.far ?? 0),
  }
}

/** Start and finish: knees on the mat, toes still tucked, arms in place. */
function kneesDownToesPose(shoulder: Vec, arms: Support): Pose {
  const { toe } = toePlank(shoulder)
  const knee: Vec = [shoulder[0] - Math.sqrt((BODY.thigh + BODY.torso) ** 2 - (FLOOR - shoulder[1]) ** 2), FLOOR]
  const line = angleTo(knee, shoulder)
  const hip = add(knee, dir(line), BODY.thigh)
  const ankle = upperIntersection(knee, BODY.shin, toe, BODY.foot)
  const leg: Limb = { a: [line + 180, angleTo(knee, ankle)] }
  const foot = angleTo(ankle, toe)
  return { hip, torso: line, head: line - 4, ...arms, legNear: leg, legFar: leg, footNear: foot, footFar: foot }
}

const FOREARMS: Support = { armNear: forearmOnFloor(STACKED), armFar: forearmOnFloor(STACKED) }
const HANDS: Support = { armNear: HAND_ON_MAT, armFar: HAND_ON_MAT }

/** Straight leg lifted about 10–15 cm (about 9° at the hip). */
const LEG_LIFT = 9
/** Arm reaching forward, slightly below shoulder height so it never passes above it. */
const REACH: Limb = straight(84)

const forearmPlank = toePlankPose(STACKED, FOREARMS)
const forearmKneesDown = kneesDownToesPose(STACKED, FOREARMS)

/** Lower, lift, then alternate a 2 s hold on each side. */
function alternateFrames(near: Pose, far: Pose, what: string) {
  return [
    { pose: forearmKneesDown, move: 1.5, hold: 1, label: 'Lower' },
    { pose: forearmPlank, move: 1.5, hold: 1, label: 'Lift' },
    { pose: near, move: 1, hold: 2, label: what },
    { pose: forearmPlank, move: 1, hold: 0.5, label: 'Return' },
    { pose: far, move: 1, hold: 2, label: 'Other side' },
    { pose: forearmPlank, move: 1, hold: 0.5, label: 'Return' },
  ]
}

const PLANK_VIEWBOX = [10, 50, 128, 66] as const

// ---------------------------------------------------------------- C9: hollow rock (lying on the back)

const SUPINE_HIP: Vec = [80, FLOOR]
const CROOK_LEG: Limb = { pin: [SUPINE_HIP[0] + 38, ANKLE_FLOOR], bend: 1 }
const ARM_BY_SIDE: Limb = straight(86)
const crookLying: Pose = {
  hip: SUPINE_HIP,
  torso: 270,
  head: 258,
  armNear: ARM_BY_SIDE,
  armFar: ARM_BY_SIDE,
  legNear: CROOK_LEG,
  legFar: CROOK_LEG,
  footNear: 90,
  footFar: 90,
}

/** Full hollow: shoulder blades up, back rounded, straight legs low, arms by the sides towards the feet. */
const HOLLOW_TORSO = 255
const HOLLOW_LEGS = 104
const hollow: Pose = {
  hip: SUPINE_HIP,
  torso: HOLLOW_TORSO,
  head: HOLLOW_TORSO - 8,
  spine: 2.5,
  armNear: straight(93),
  armFar: straight(93),
  legNear: straight(HOLLOW_LEGS),
  legFar: straight(HOLLOW_LEGS),
  footNear: HOLLOW_LEGS - 10,
  footFar: HOLLOW_LEGS - 10,
}

/** Rotate a pose with free limbs by `deg` about `pivot` (a rigid rock on the rounded back). */
function rock(p: Pose, pivot: Vec, deg: number): Pose {
  const turn = (l: Limb): Limb => ('a' in l ? { a: [l.a[0] + deg, l.a[1] + deg] } : l)
  const hip = add(pivot, dir(angleTo(pivot, p.hip) + deg), dist(pivot, p.hip))
  return {
    ...p,
    hip,
    torso: p.torso + deg,
    head: p.head + deg,
    armNear: turn(p.armNear),
    armFar: turn(p.armFar),
    legNear: turn(p.legNear),
    legFar: turn(p.legFar),
    footNear: p.footNear === undefined ? undefined : p.footNear + deg,
    footFar: p.footFar === undefined ? undefined : p.footFar + deg,
  }
}

// Towards the head the contact rolls up to the lower back and the hips lift a little;
// towards the feet it rolls back onto the buttocks.
const ROCK = 6
const rockToHead = rock(hollow, [SUPINE_HIP[0] - 10, FLOOR], ROCK)
const rockToFeet = rock(hollow, SUPINE_HIP, -ROCK)

// ---------------------------------------------------------------- C10: rotational side plank (as C8)

/** Side of the bottom foot on the mat; drawn in line with the leg. */
const SIDE_LINE = 90 + (Math.asin((TOE_Y - STACKED[1]) / (BODY.torso + LEG + BODY.foot)) * 180) / Math.PI

function sidePlankPose(top: Limb, extra: Partial<Pose> = {}): Pose {
  const hip = add(STACKED, dir(SIDE_LINE), -BODY.torso)
  return {
    hip,
    torso: SIDE_LINE,
    head: SIDE_LINE,
    armNear: top,
    armFar: forearmOnFloor(STACKED),
    legNear: straight(SIDE_LINE + 180),
    legFar: straight(SIDE_LINE + 180),
    footNear: SIDE_LINE + 180,
    footFar: SIDE_LINE + 180,
    ...extra,
  }
}

/** Top arm pointing at the ceiling: perpendicular to the trunk, not overhead. */
const ARM_TO_CEILING: Limb = straight(180)
/** Top hand threaded under the chest, just above the mat, behind the support arm. */
const UNDER_HAND: Vec = [STACKED[0] - 27, GROUND_Y - 6]
const sideOpen = sidePlankPose(ARM_TO_CEILING)
// The chest turns to face the mat: back rounds slightly and the head follows the hand.
const sideThread = sidePlankPose(reachTo(STACKED, UNDER_HAND), { spine: 2, head: SIDE_LINE - 25 })

// ---------------------------------------------------------------- A6: side plank star (as A5)

const A_ELBOW: Vec = [92, HAND_FLOOR]
const A_SHOULDER: Vec = [A_ELBOW[0], A_ELBOW[1] - BODY.upperArm]
const A_ANKLE: Vec = [A_SHOULDER[0] - Math.sqrt((BODY.torso + LEG) ** 2 - (FLOOR - A_SHOULDER[1]) ** 2), FLOOR]
const A_LINE = angleTo(A_ANKLE, A_SHOULDER)
const A_HIP = add(A_ANKLE, dir(A_LINE), LEG)

function starPose(topLeg: number, topArm: Limb): Pose {
  return {
    hip: A_HIP,
    torso: A_LINE,
    head: A_LINE,
    armNear: topArm,
    armFar: { pin: add(A_ELBOW, [BODY.forearm, 0]), bend: -1 },
    legNear: straight(topLeg),
    legFar: { pin: A_ANKLE, bend: 1 },
    footNear: topLeg,
    footFar: A_LINE + 180,
  }
}

const A_HAND_ON_HIP: Limb = { pin: add(A_HIP, [3, -5]), bend: -1 }
const starClosed = starPose(A_LINE + 180 - 5, A_HAND_ON_HIP)
const starOpen = starPose(A_LINE + 180 - 30, ARM_TO_CEILING)

// ---------------------------------------------------------------- exercises

const SHOULDER_STOP = 'Stop the set at shoulder pain of 4/10 or more.'
const SIDE_SHOULDER = 'Shoulder: loaded in side support; keep the shoulder stacked over the elbow.'

const plankLegLift: Exercise = {
  id: 'C5l',
  name: 'Forearm plank with alternating leg lift',
  group: 'core',
  cls: 'hold',
  muscles: ['Gluteus maximus', 'Gluteus medius', 'Abdominals'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  variationOf: 'C5',
  difficulty: 'harder',
  cues: [
    'Forearm plank: elbows under the shoulders, body straight from heels to head.',
    'Lift one straight leg about 10–15 cm and hold for 2 s, keeping the pelvis level.',
    'Lower it and lift the other leg; keep alternating for the whole hold time.',
  ],
  cautions: ['Keep the pelvis level; if the lower back feels uncomfortable, lift the leg less high.', SHOULDER_STOP],
  animation: {
    frames: alternateFrames(
      toePlankPose(STACKED, FOREARMS, { near: LEG_LIFT }),
      toePlankPose(STACKED, FOREARMS, { far: LEG_LIFT }),
      'Lift leg',
    ),
    viewBox: PLANK_VIEWBOX,
  },
}

const plankArmReach: Exercise = {
  id: 'C5a',
  name: 'Forearm plank with alternating arm reach',
  group: 'core',
  cls: 'hold',
  muscles: ['Abdominals', 'Obliques', 'Serratus anterior'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  variationOf: 'C5',
  difficulty: 'harder',
  cues: [
    'Forearm plank: elbows under the shoulders, body straight from heels to head; feet a little wider for balance.',
    'Reach one arm straight forward, no higher than the shoulder, and hold for 2 s without the hips turning.',
    'Put the forearm back down and reach with the other arm; keep alternating for the whole hold time.',
  ],
  cautions: ['Shoulder: reach no higher than shoulder height; skip this variation while shoulder pain is above 2/10.', SHOULDER_STOP],
  animation: {
    frames: alternateFrames(
      toePlankPose(STACKED, { armNear: REACH, armFar: forearmOnFloor(STACKED) }),
      toePlankPose(STACKED, { armNear: forearmOnFloor(STACKED), armFar: REACH }),
      'Reach',
    ),
    viewBox: [10, 50, 132, 66],
  },
}

const highPlank: Exercise = {
  id: 'C5h',
  name: 'High plank',
  group: 'core',
  cls: 'hold',
  muscles: ['Abdominals', 'Serratus anterior', 'Lower trapezius', 'Triceps'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  variationOf: 'C5',
  difficulty: 'similar',
  cues: [
    'Hands (or fists) on the floor under the shoulders, arms straight, knees down and toes tucked.',
    'Lift the knees so the body is straight from heels to head.',
    'Hold, breathing normally, pushing the floor away without letting the hips sag.',
  ],
  cautions: ['Wrists: use fists to keep the wrists straight; skip this variation if wrist pain on fists is above 2/10.', SHOULDER_STOP],
  animation: {
    frames: [
      { pose: kneesDownToesPose(HIGH_SHOULDER, HANDS), move: 1.5, hold: 1, label: 'Lower' },
      { pose: toePlankPose(HIGH_SHOULDER, HANDS), move: 1.5, label: 'Lift' },
      { pose: toePlankPose(HIGH_SHOULDER, HANDS), move: 0.1, hold: 4, label: 'Hold' },
    ],
    viewBox: [14, 46, 128, 66],
  },
}

const hollowRock: Exercise = {
  id: 'C9',
  name: 'Hollow rock',
  group: 'core',
  cls: 'hold',
  muscles: ['Abdominals', 'Hip flexors'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your back and press the lower back into the mat.',
    'Lift the head, shoulder blades and straight legs into the hollow position, arms by the sides reaching towards the feet.',
    'Rock gently back and forth, keeping the body shape fixed and the lower back on the mat.',
    'Make the rocks smaller, or bend the knees, if the lower back lifts.',
  ],
  cautions: ['Keep the arms by the sides; do not reach overhead.'],
  animation: {
    frames: [
      { pose: crookLying, move: 1.5, hold: 1, label: 'Lower' },
      { pose: hollow, move: 1.5, hold: 0.5, label: 'Hollow' },
      { pose: rockToHead, move: 0.7, label: 'Rock' },
      { pose: rockToFeet, move: 0.9, label: 'Rock' },
      { pose: rockToHead, move: 0.9, label: 'Rock' },
      { pose: rockToFeet, move: 0.9, label: 'Rock' },
      { pose: hollow, move: 0.7, hold: 0.5, label: 'Hollow' },
    ],
    viewBox: [10, 44, 132, 72],
  },
}

const rotationalSidePlank: Exercise = {
  id: 'C10',
  name: 'Rotational side plank',
  group: 'core',
  cls: 'strength',
  muscles: ['Obliques', 'Rectus abdominis', 'Gluteus medius', 'Back extensors'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Side plank on the forearm, elbow under the shoulder, legs straight; top arm pointing to the ceiling.',
    'Turn the chest towards the mat and thread the top hand under the body, keeping the hips up.',
    'Turn back open, arm to the ceiling, then repeat; finish the set and switch sides.',
  ],
  cautions: [SIDE_SHOULDER, 'Move slowly; stop the set if the hips drop.', SHOULDER_STOP],
  animation: {
    frames: [
      { pose: sideOpen, move: 1.5, hold: 0.5, label: 'Open' },
      { pose: sideThread, move: 2, hold: 1, label: 'Reach under' },
    ],
    viewBox: PLANK_VIEWBOX,
  },
}

const sidePlankStar: Exercise = {
  id: 'A6',
  name: 'Side plank star',
  group: 'hips',
  cls: 'hold',
  muscles: ['Gluteus medius', 'Obliques'],
  measure: 'seconds',
  target: [20, 45],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Side plank on the forearm: elbow under the shoulder, legs straight and feet stacked.',
    'Lift the top leg to about 30°, toes forwards, and point the top arm to the ceiling.',
    'Hold, keeping shoulders, hips and bottom foot in a straight line, then lower and switch sides.',
  ],
  cautions: [SIDE_SHOULDER, 'Keep the top hand on the hip if lifting the arm is uncomfortable.', SHOULDER_STOP],
  animation: {
    frames: [
      { pose: starClosed, move: 1.5, hold: 1, label: 'Close' },
      { pose: starOpen, move: 1.5, label: 'Open' },
      { pose: starOpen, move: 0.1, hold: 4, label: 'Hold' },
    ],
    viewBox: [0, 50, 132, 66],
  },
}

export const CORE_VARIANTS: Exercise[] = [plankLegLift, plankArmReach, highPlank, hollowRock, rotationalSidePlank, sidePlankStar]
