// Horizontal push ladder (P) — docs/EVIDENCE.md, "Exercise candidates".
import { add, angleTo, BODY, dir, dist, GROUND_Y, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- geometry helpers

/** Hand-to-shoulder distance that reads as a straight (not locked) arm. */
const STRAIGHT_ARM = BODY.upperArm + BODY.forearm - 0.1
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

const shoulderOf = (p: Pose): Vec => add(p.hip, dir(p.torso), BODY.torso)

// ---------------------------------------------------------------- push-ups from the toes (P4–P7)

const TOE: Vec = [28, TOE_Y]

/**
 * Straight body from the toes (tucked under, foot at right angles to the shin)
 * to the head; the whole body pivots about the toes. `elevation` is the angle
 * of the body line above the horizontal.
 */
function toePushUpPose(elevation: number, hand: Vec, spine = 0): Pose {
  const line = 90 + elevation
  const ankle = add(TOE, dir(elevation), -BODY.foot)
  const hip = add(ankle, dir(line), LEG)
  const arm = { pin: hand, bend: -1 as const }
  const leg = { a: [line + 180, line + 180] as const }
  return {
    hip,
    torso: line,
    head: line - 4,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: elevation,
    footFar: elevation,
    spine,
  }
}

const toeShoulder = (elevation: number) => shoulderOf(toePushUpPose(elevation, [0, 0]))
// Hands just behind the shoulders at the top, so the forearms are near vertical at the bottom.
const PUSH_HAND: Vec = [toeShoulder(17)[0] + 1.5, HAND_FLOOR]
const TOE_TOP = bisect((e) => dist(toeShoulder(e), PUSH_HAND) - STRAIGHT_ARM, 5, 30)
/** Chest a few centimetres above the mat. */
const TOE_BOTTOM = bisect((e) => toeShoulder(e)[1] - 97.5, -2, 20)
/** Pause height for the paused push-up: just above the bottom position. */
const TOE_PAUSE = bisect((e) => toeShoulder(e)[1] - 96.5, -2, 20)

const PUSH_VIEWBOX = [16, 52, 128, 64] as const

// ---------------------------------------------------------------- knees down, toes tucked (P4)

// The knees drop straight down from the bottom of the toe push-up.
const KNEE: Vec = [add(toePushUpPose(TOE_BOTTOM, PUSH_HAND).hip, dir(270 + TOE_BOTTOM), BODY.thigh)[0], FLOOR]
const KNEE_ANKLE = upperIntersection(KNEE, BODY.shin, TOE, BODY.foot)

function kneeTuckedPose(elevation: number): Pose {
  const line = 90 + elevation
  const hip = add(KNEE, dir(line), BODY.thigh)
  const arm = { pin: PUSH_HAND, bend: -1 as const }
  const leg = { a: [line + 180, angleTo(KNEE, KNEE_ANKLE)] as const }
  const foot = angleTo(KNEE_ANKLE, TOE)
  return {
    hip,
    torso: line,
    head: line - 4,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: foot,
    footFar: foot,
  }
}

const kneeShoulder = (e: number) => shoulderOf(kneeTuckedPose(e))
const KNEE_TOP = bisect((e) => dist(kneeShoulder(e), PUSH_HAND) - STRAIGHT_ARM, 5, 45)
const KNEE_BOTTOM = bisect((e) => kneeShoulder(e)[1] - 97.5, 0, 30)

// ---------------------------------------------------------------- wall push-ups (P1, P2)

/** Wall surface; the person faces the wall, which is on the right. */
const WALL_SURFACE = 100
const WALL_HAND: Vec = [WALL_SURFACE - 2.1, 37]
const WALL_TOE: Vec = [WALL_SURFACE - 52, ANKLE_FLOOR]

/**
 * Straight body leaning `lean` degrees from vertical towards the wall. The
 * ball of the foot stays on the floor; the heel stays down until the ankle
 * reaches about 20° of dorsiflexion and then lifts slightly.
 */
function wallPushUpPose(lean: number, spine = 0): Pose {
  const line = 180 - lean
  const foot = Math.min(90, 110 - lean)
  const ankle = add(WALL_TOE, dir(foot), -BODY.foot)
  const hip = add(ankle, dir(line), LEG)
  const arm = { pin: WALL_HAND, bend: -1 as const }
  const leg = { a: [line + 180, line + 180] as const }
  return {
    hip,
    torso: line,
    head: line - 3,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: foot,
    footFar: foot,
    spine,
  }
}

const wallShoulder = (lean: number) => shoulderOf(wallPushUpPose(lean))
const WALL_TOP = bisect((l) => dist(wallShoulder(l), WALL_HAND) - STRAIGHT_ARM, 5, 40)
/** Lowest point: the face a few centimetres from the wall. */
const WALL_BOTTOM = bisect((l) => {
  const p = wallPushUpPose(l)
  return add(shoulderOf(p), dir(p.head), BODY.neck + BODY.headR)[0] + BODY.headR - (WALL_SURFACE - 3)
}, 5, 60)

const WALL_VIEWBOX = [30, 8, 84, 108] as const

/**
 * Protraction ("plus") cannot be drawn directly: the arms stay straight and
 * the upper back rises slightly between the shoulder blades.
 */
const PLUS_SPINE = 2

// ---------------------------------------------------------------- exercises

const SHOULDER_STOP = 'Stop the set at shoulder pain of 4/10 or more.'
const WRIST_FISTS = 'Wrists: use fists or a raised surface if flat palms hurt.'

const wallPushUp: Exercise = {
  id: 'P1',
  name: 'Wall push-up',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Stand facing a wall, hands on it at shoulder height and slightly wider than the shoulders.',
    'Keep the body straight from heels to head and lower the chest towards the wall, elbows about 30–45° from the body.',
    'Push back until the arms are straight. Step the feet further back to make it harder.',
  ],
  cautions: ['Low load: a good entry step when the shoulder is irritable.', SHOULDER_STOP],
  animation: {
    frames: [
      { pose: wallPushUpPose(WALL_TOP), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: wallPushUpPose(WALL_BOTTOM), move: 2, hold: 0.3, label: 'Lower' },
    ],
    wall: { x: WALL_SURFACE + 6 },
    viewBox: WALL_VIEWBOX,
  },
}

const wallPushUpPlus: Exercise = {
  id: 'P2',
  name: 'Wall push-up plus',
  group: 'push',
  cls: 'strength',
  muscles: ['Serratus anterior', 'Chest'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Do a wall push-up with the body straight from heels to head.',
    'At the top, keep the elbows straight and push the wall further away so the shoulder blades spread apart and the upper back rises slightly.',
    'Let the shoulder blades come back together, then lower for the next rep.',
  ],
  cautions: ['Low load: a good early step for the serratus anterior.', SHOULDER_STOP],
  animation: {
    frames: [
      { pose: wallPushUpPose(WALL_TOP), move: 1.2, hold: 0.2, label: 'Push' },
      { pose: wallPushUpPose(WALL_TOP, PLUS_SPINE), move: 0.8, hold: 1, label: 'Plus' },
      { pose: wallPushUpPose(WALL_BOTTOM), move: 2, hold: 0.3, label: 'Lower' },
    ],
    wall: { x: WALL_SURFACE + 6 },
    viewBox: WALL_VIEWBOX,
  },
}

// ---------------------------------------------------------------- P3 knee push-up

function kneePushUpPose(elevation: number, hand: Vec): Pose {
  const knee: Vec = [62, FLOOR]
  const line = 90 + elevation // direction from knee to shoulders
  const hip = add(knee, dir(line), BODY.thigh)
  const arm = { pin: hand, bend: -1 as const }
  const leg = { a: [line + 180, 268] as const }
  return {
    hip,
    torso: line,
    head: line - 4,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: 275,
    footFar: 275,
  }
}

const KNEE_PUSH_HAND: Vec = [111, HAND_FLOOR]

const kneePushUp: Exercise = {
  id: 'P3',
  name: 'Knee push-up',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist', 'knee'],
  cues: [
    'Kneel on a folded mat, hands under the shoulders, body straight from knees to head.',
    'Lower the chest towards the floor with elbows about 30–45° from the body.',
    'Push back up without letting the hips sag.',
  ],
  cautions: [WRIST_FISTS, SHOULDER_STOP],
  animation: {
    frames: [
      { pose: kneePushUpPose(31, KNEE_PUSH_HAND), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: kneePushUpPose(9, KNEE_PUSH_HAND), move: 2, hold: 0.3, label: 'Lower' },
    ],
    viewBox: [22, 52, 122, 64],
  },
}

// ---------------------------------------------------------------- P4–P7

const eccentricPushUp: Exercise = {
  id: 'P4',
  name: 'Eccentric full push-up',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist', 'knee'],
  cues: [
    'Start at the top of a full push-up on the toes, body straight from heels to head.',
    'Lower slowly for 3–5 s, elbows about 30–45° from the body, until the chest is just above the floor.',
    'Put the knees down on a folded mat and push up from the knees.',
    'Lift the knees back to the full push-up position for the next rep.',
  ],
  cautions: [WRIST_FISTS, SHOULDER_STOP, 'Knees: kneel on a folded mat.'],
  animation: {
    frames: [
      { pose: toePushUpPose(TOE_TOP, PUSH_HAND), move: 1.2, hold: 0.5, label: 'Onto toes' },
      { pose: toePushUpPose(TOE_BOTTOM, PUSH_HAND), move: 4, hold: 0.3, label: 'Lower slowly' },
      { pose: kneeTuckedPose(KNEE_BOTTOM), move: 0.8, hold: 0.3, label: 'Knees down' },
      { pose: kneeTuckedPose(KNEE_TOP), move: 1.3, hold: 0.4, label: 'Push' },
    ],
    viewBox: PUSH_VIEWBOX,
  },
}

const fullPushUp: Exercise = {
  id: 'P5',
  name: 'Full push-up',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid', 'Core'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Hands under the shoulders on palms or fists, body straight from heels to head.',
    'Lower the chest towards the floor with elbows about 30–45° from the body.',
    'Push back up to straight arms without letting the hips sag or pike.',
  ],
  cautions: [WRIST_FISTS, SHOULDER_STOP],
  animation: {
    frames: [
      { pose: toePushUpPose(TOE_TOP, PUSH_HAND), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: toePushUpPose(TOE_BOTTOM, PUSH_HAND), move: 2, hold: 0.3, label: 'Lower' },
    ],
    viewBox: PUSH_VIEWBOX,
  },
}

const fullPushUpPlus: Exercise = {
  id: 'P6',
  name: 'Full push-up plus',
  group: 'push',
  cls: 'strength',
  muscles: ['Serratus anterior', 'Chest'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Do a full push-up with the body straight from heels to head.',
    'At the top, keep the elbows straight and push the floor further away so the shoulder blades spread apart and the upper back rises slightly.',
    'Let the shoulder blades come back together, then lower for the next rep.',
  ],
  cautions: [WRIST_FISTS, SHOULDER_STOP],
  animation: {
    frames: [
      { pose: toePushUpPose(TOE_TOP, PUSH_HAND), move: 1.2, hold: 0.2, label: 'Push' },
      { pose: toePushUpPose(TOE_TOP, PUSH_HAND, PLUS_SPINE), move: 0.8, hold: 1, label: 'Plus' },
      { pose: toePushUpPose(TOE_BOTTOM, PUSH_HAND), move: 2, hold: 0.3, label: 'Lower' },
    ],
    viewBox: PUSH_VIEWBOX,
  },
}

const pausedPushUp: Exercise = {
  id: 'P7',
  name: 'Tempo push-up (paused)',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid', 'Core'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Start at the top of a full push-up, body straight from heels to head.',
    'Lower for 3 s, elbows about 30–45° from the body.',
    'Pause for 1–2 s with the chest just above the floor, then push back up.',
  ],
  cautions: [
    WRIST_FISTS,
    'Shoulder: pause just above the floor and avoid a deep stretch at the front of the shoulder if it is symptomatic.',
    SHOULDER_STOP,
  ],
  animation: {
    frames: [
      { pose: toePushUpPose(TOE_TOP, PUSH_HAND), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: toePushUpPose(TOE_PAUSE, PUSH_HAND), move: 3, hold: 0, label: 'Lower 3 s' },
      { pose: toePushUpPose(TOE_PAUSE, PUSH_HAND), move: 0.1, hold: 1.5, label: 'Pause' },
    ],
    viewBox: PUSH_VIEWBOX,
  },
}

export const PUSH: Exercise[] = [
  wallPushUp,
  wallPushUpPlus,
  kneePushUp,
  eccentricPushUp,
  fullPushUp,
  fullPushUpPlus,
  pausedPushUp,
]
