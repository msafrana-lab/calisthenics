// Overhead push ladder (O): downward-dog hold and pike push-ups — side view,
// hands pinned on the mat, hips the highest point throughout.
import { add, angleTo, BODY, dir, dist, GROUND_Y, type Keyframe, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- geometry helpers

/** Hand-to-shoulder distance that reads as a straight (not locked) arm. */
const STRAIGHT_ARM = BODY.upperArm + BODY.forearm - 0.1
/** Height of the toe tip when the toes are tucked under on the mat. */
const TOE_Y = GROUND_Y - 2.5
const LEG = BODY.thigh + BODY.shin
/** Shoulder to head centre. */
const NECK = BODY.neck + BODY.headR

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

/** Bend sign that puts the elbow behind the hand (towards the feet). */
function elbowBack(shoulder: Vec, hand: Vec): 1 | -1 {
  const x = (b: 1 | -1) => middleJoint(shoulder, hand, BODY.upperArm, BODY.forearm, b)[0]
  return x(1) < x(-1) ? 1 : -1
}

/** Bend sign that lets a soft knee move forwards (towards the hands). */
function kneeForward(hip: Vec, ankle: Vec): 1 | -1 {
  const x = (b: 1 | -1) => middleJoint(hip, ankle, BODY.thigh, BODY.shin, b)[0]
  return x(1) > x(-1) ? 1 : -1
}

/** Hands about shoulder-width apart; seen from the side both project to one point. */
const HAND: Vec = [92, HAND_FLOOR]
/** Shoulder-to-hand distance with the arms straight at the top. */
const TOP_ARM = STRAIGHT_ARM
/** Lowest head centre: the top of the head stops about 4 cm above the mat. */
const HEAD_Y = GROUND_Y - BODY.headR - 2.5

/** Ankle of a foot up on the balls of the feet, toes at `toeX`, foot at `foot` degrees. */
const ankleOnToes = (toeX: number, foot: number): Vec => add([toeX, TOE_Y], dir(foot), -BODY.foot)

type Body = { hip: Vec; torso: number; head: number }

/** Straight arms at the top; the head stays in line with the trunk. */
function topBody(hip: Vec): Body {
  const shoulder = upperIntersection(hip, BODY.torso, HAND, TOP_ARM)
  const torso = angleTo(hip, shoulder)
  return { hip, torso, head: torso - 4 }
}

/**
 * Bottom of a pike push-up: the head centre is `ahead` of the hands at
 * `headY`, the trunk points `torso` degrees (0 = straight down) and the head
 * is tucked `tuck` degrees further down than the trunk.
 */
function bottomBody(ahead: number, torso: number, tuck = 4, headY = HEAD_Y): Body {
  const head = torso - tuck
  const shoulder = add([HAND[0] + ahead, headY], dir(head), -NECK)
  return { hip: add(shoulder, dir(torso), -BODY.torso), torso, head }
}

const shoulderOf = (b: Body): Vec => add(b.hip, dir(b.torso), BODY.torso)

function pikePose(b: Body, leg: Limb, foot: number, bend: 1 | -1): Pose {
  const arm: Limb = { pin: HAND, bend }
  return { ...b, armNear: arm, armFar: arm, legNear: leg, legFar: leg, footNear: foot, footFar: foot }
}

// ---------------------------------------------------------------- pike push-ups from the feet (O3, O4)

type FeetPike = {
  /** Bottom: head centre ahead of the hands, trunk direction. */
  ahead: number
  torso: number
  /** Hip-to-hand distance at the top (how far the shoulders open). */
  reach: number
  foot: number
}

/**
 * The feet stay in place and the legs stay nearly straight, so the hips swing
 * forwards over the hands as the head travels in front of them.
 */
function feetPike(c: FeetPike) {
  const bottom = bottomBody(c.ahead, c.torso)
  const leg = LEG - 0.3
  const ankleY = ankleOnToes(0, c.foot)[1]
  const ankle: Vec = [bottom.hip[0] - Math.sqrt(leg ** 2 - (ankleY - bottom.hip[1]) ** 2), ankleY]
  const top = topBody(upperIntersection(ankle, leg, HAND, c.reach))
  const legLimb: Limb = { pin: ankle, bend: kneeForward(top.hip, ankle) }
  const bend = elbowBack(shoulderOf(bottom), HAND)
  return { top: pikePose(top, legLimb, c.foot, bend), bottom: pikePose(bottom, legLimb, c.foot, bend) }
}

const PIKE = feetPike({ ahead: 14, torso: 40, reach: 55, foot: 40 })
const STEEP = feetPike({ ahead: 12, torso: 26, reach: 57, foot: 30 })

// ---------------------------------------------------------------- pike push-up from the knees (O2)

/** Shin flat on the folded mat behind the knee, toes pointed. */
const KNEE_SHIN = 268

/**
 * From the knees the hips cannot rise above thigh height, so the arms reach
 * well forwards at the top (a kneeling downward dog) and the hips rock
 * forwards over the knees as the head lowers in front of the hands.
 */
function kneePike() {
  const tilt = 40 // thigh forward of vertical at the bottom
  const topTilt = -20 // hips behind the knees at the top
  const ahead = 9
  const tuck = 25
  const headY = HEAD_Y - 3.5
  const hipY = FLOOR - BODY.thigh * Math.cos((tilt * Math.PI) / 180)
  const torso = bisect((t) => bottomBody(ahead, t, tuck, headY).hip[1] - hipY, 30, 89)
  const bottom = bottomBody(ahead, torso, tuck, headY)
  const knee: Vec = add(bottom.hip, dir(180 - tilt), -BODY.thigh)
  const top = topBody(add(knee, dir(180 - topTilt), BODY.thigh))
  const leg = (hip: Vec): Limb => ({ a: [angleTo(hip, knee), KNEE_SHIN] })
  const bend = elbowBack(shoulderOf(bottom), HAND)
  return { top: pikePose(top, leg(top.hip), 275, bend), bottom: pikePose(bottom, leg(bottom.hip), 275, bend) }
}

const KNEE_PIKE = kneePike()

// ---------------------------------------------------------------- downward dog (O1)

// All fours (hands under the shoulders, knees under the hips, toes tucked),
// then the hips lift up and back while the hands and toes stay in place.
const DOG_TOE_X = 42
const QUAD_FOOT = 15
const DOG_FOOT = 72
const QUAD_HIP: Vec = [HAND[0] - Math.sqrt(BODY.torso ** 2 - (FLOOR - BODY.thigh - (HAND[1] - TOP_ARM)) ** 2), FLOOR - BODY.thigh]

const QUAD_ANKLE = ankleOnToes(DOG_TOE_X, QUAD_FOOT)
const DOG_ANKLE = ankleOnToes(DOG_TOE_X, DOG_FOOT)
/** Arms and back in one line; knees slightly soft. */
const DOG_HIP = upperIntersection(HAND, TOP_ARM + BODY.torso - 0.2, DOG_ANKLE, LEG - 1)

function dogPose(hip: Vec, ankle: Vec, foot: number): Pose {
  const b = topBody(hip)
  const arm: Limb = { pin: HAND, bend: -1 }
  const leg: Limb = { pin: ankle, bend: kneeForward(DOG_HIP, DOG_ANKLE) }
  return { hip, torso: b.torso, head: b.head, armNear: arm, armFar: arm, legNear: leg, legFar: leg, footNear: foot, footFar: foot }
}

const QUAD = dogPose(QUAD_HIP, QUAD_ANKLE, QUAD_FOOT)
const DOG = dogPose(DOG_HIP, DOG_ANKLE, DOG_FOOT)

// ---------------------------------------------------------------- exercises

const SHOULDER_STOP = 'Stop at shoulder pain 3/10; 4/10 or more means a step back.'
const WRIST_FISTS = 'Wrists: use fists or a folded mat edge under the palms if flat palms hurt.'
const NO_HANDSTAND = 'No handstand or feet-on-wall progression.'
const PUSH_MUSCLES = ['Front deltoid', 'Side deltoid', 'Triceps', 'Upper trapezius', 'Serratus anterior']

/** Same scale for the whole ladder; only the horizontal offset differs. */
const viewBox = (x: number) => [x, 46, 108, 70] as const

function pikeFrames(top: Pose, bottom: Pose, pause = false): Keyframe[] {
  const frames: Keyframe[] = [
    { pose: top, move: 1.3, hold: 0.5, label: 'Press' },
    { pose: bottom, move: 2, hold: pause ? 0 : 0.2, label: 'Lower' },
  ]
  if (pause) frames.push({ pose: bottom, move: 0.1, hold: 2, label: 'Pause' })
  return frames
}

const downwardDog: Exercise = {
  id: 'O1',
  name: 'Downward-dog hold',
  group: 'push',
  cls: 'hold',
  muscles: ['Shoulders', 'Hamstrings (stretch)', 'Calves (stretch)'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  cues: [
    'From hands and knees, tuck the toes and lift the hips up and back.',
    'Push the floor away so the arms and back form one line; the head stays between the arms.',
    'Let the heels sink towards the floor; bend the knees if the back rounds.',
  ],
  cautions: [SHOULDER_STOP, WRIST_FISTS],
  animation: {
    frames: [
      { pose: QUAD, move: 1.5, hold: 1, label: 'All fours' },
      { pose: DOG, move: 2, label: 'Hips up' },
      { pose: DOG, move: 0.1, hold: 4, label: 'Hold' },
    ],
    viewBox: viewBox(17),
  },
}

const kneePikePushUp: Exercise = {
  id: 'O2',
  name: 'Pike push-up from the knees',
  group: 'push',
  cls: 'strength',
  muscles: PUSH_MUSCLES,
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'high',
  regions: ['shoulder', 'wrist', 'knee'],
  cues: [
    'Kneel on a folded mat, hands shoulder-width ahead, hips high so the trunk slopes steeply.',
    'Bend the elbows, about 45° from the body, and lower the top of the head to a point in front of the hands.',
    'Press back to straight arms; the hips stay high.',
  ],
  cautions: [SHOULDER_STOP, WRIST_FISTS, 'Knees: kneel on a folded mat.', NO_HANDSTAND],
  animation: { frames: pikeFrames(KNEE_PIKE.top, KNEE_PIKE.bottom), viewBox: viewBox(6) },
}

const pikePushUp: Exercise = {
  id: 'O3',
  name: 'Pike push-up',
  group: 'push',
  cls: 'strength',
  muscles: PUSH_MUSCLES,
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'high',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Hands shoulder-width on the mat, hips high, legs straight or slightly bent.',
    'Bend the elbows, about 45° from the body, and lower the top of the head to a point in front of the hands, making a triangle.',
    'Press back to straight arms without letting the hips drop.',
  ],
  cautions: [SHOULDER_STOP, WRIST_FISTS, NO_HANDSTAND],
  animation: { frames: pikeFrames(PIKE.top, PIKE.bottom), viewBox: viewBox(23) },
}

const steepPikePushUp: Exercise = {
  id: 'O4',
  name: 'Steep pike push-up with a pause',
  group: 'push',
  cls: 'strength',
  muscles: PUSH_MUSCLES,
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'high',
  regions: ['shoulder', 'wrist'],
  cues: [
    'From the pike push-up position, walk the feet closer to the hands so the trunk is nearly vertical.',
    'Lower the head to a point in front of the hands, elbows about 45° from the body.',
    'Pause for 2 s just above the mat, then press back; the hips stay high.',
  ],
  cautions: [SHOULDER_STOP, WRIST_FISTS, NO_HANDSTAND],
  animation: { frames: pikeFrames(STEEP.top, STEEP.bottom, true), viewBox: viewBox(27) },
}

export const OVERHEAD: Exercise[] = [downwardDog, kneePikePushUp, pikePushUp, steepPikePushUp]
