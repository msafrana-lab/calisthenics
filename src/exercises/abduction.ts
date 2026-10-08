// Hip abduction and rotation ladder (A) — docs/EVIDENCE.md, "Exercise candidates".
//
// All five use the "lying on the side" convention (docs/ANIMATION.md): seen from
// the front, head to the right, the top leg is the near leg and abduction lifts
// it upwards on screen. The bottom leg and arm are the far limbs.
import { add, BODY, dir, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- lying on the side (A1–A3)

const HIP: Vec = [62, 105]
const LEG = BODY.thigh + BODY.shin
/** Bottom leg straight along the mat. */
const BOTTOM_LEG = 271
/** Top leg resting on the bottom leg. */
const TOP_LEG_REST = 266

function lyingPose(topLeg: Limb, footNear: number): Pose {
  return {
    hip: HIP,
    torso: 90,
    head: 100,
    // Top arm resting along the body, hand on the hip.
    armNear: { a: [264, 268] },
    // Bottom arm along the mat under the head.
    armFar: { a: [86, 88] },
    legNear: topLeg,
    legFar: { a: [BOTTOM_LEG, BOTTOM_LEG] },
    footNear,
    footFar: BOTTOM_LEG,
  }
}

const straightLeg = (angle: number): Limb => ({ a: [angle, angle] })
const LYING_VIEWBOX = [0, 50, 132, 66] as const

// A1: the knees are bent and the hips flexed, which points the thighs at the
// camera; in this view the legs therefore look almost straight. The top knee
// lifts while the top foot stays on the bottom foot.
const CLAM_OPEN_ANKLE = add(HIP, dir(TOP_LEG_REST), LEG - 7)

const clamshell: Exercise = {
  id: 'A1',
  name: 'Clamshell',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus medius', 'Hip external rotators'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your side, head supported, hips bent about 45° and knees about 90°, feet together.',
    'Keep the feet touching and lift the top knee as far as you can without the pelvis rolling back.',
    'Hold 2–3 s at the top, then lower slowly.',
  ],
  animation: {
    frames: [
      { pose: lyingPose(straightLeg(TOP_LEG_REST), TOP_LEG_REST), move: 1.8, hold: 0.5, label: 'Close' },
      { pose: lyingPose({ pin: CLAM_OPEN_ANKLE, bend: -1 }, 272), move: 1.2, hold: 2, label: 'Open' },
    ],
    viewBox: LYING_VIEWBOX,
  },
}

/** About 30° of abduction above the resting position. */
const TOP_LEG_UP = TOP_LEG_REST - 30

const SIDE_LYING_CUES = [
  'Lie on your side in a straight line, head supported; bend the bottom knee or put the top hand on the mat in front if you need more balance.',
  'Take the top leg slightly behind the body with the toes pointing forwards, not up.',
]

const sideLyingAbduction: Exercise = {
  id: 'A2',
  name: 'Side-lying hip abduction',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus medius'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    ...SIDE_LYING_CUES,
    'Lift the straight leg to about 30–40° without rolling the pelvis back, then lower with control.',
  ],
  animation: {
    frames: [
      { pose: lyingPose(straightLeg(TOP_LEG_REST), TOP_LEG_REST), move: 1.8, hold: 0.4, label: 'Lower' },
      { pose: lyingPose(straightLeg(TOP_LEG_UP), TOP_LEG_UP), move: 1.2, hold: 1, label: 'Lift' },
    ],
    viewBox: LYING_VIEWBOX,
  },
}

const sideLyingAbductionHold: Exercise = {
  id: 'A3',
  name: 'Side-lying hip abduction with 3 s hold',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus medius'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    ...SIDE_LYING_CUES,
    'Lift the straight leg to about 30–40° and hold for 3 s.',
    'Lower over about 3 s, without letting the leg drop.',
  ],
  animation: {
    frames: [
      { pose: lyingPose(straightLeg(TOP_LEG_REST), TOP_LEG_REST), move: 3, hold: 0.4, label: 'Lower slowly' },
      { pose: lyingPose(straightLeg(TOP_LEG_UP), TOP_LEG_UP), move: 1.2, label: 'Lift' },
      { pose: lyingPose(straightLeg(TOP_LEG_UP), TOP_LEG_UP), move: 0.1, hold: 3, label: 'Hold 3 s' },
    ],
    viewBox: LYING_VIEWBOX,
  },
}

// ---------------------------------------------------------------- side plank (A4, A5)
// Bottom forearm on the mat with the elbow under the shoulder; the forearm,
// which really points at the camera, is drawn along the mat towards the head.

const ELBOW: Vec = [92, HAND_FLOOR]
const PLANK_SHOULDER: Vec = [ELBOW[0], ELBOW[1] - BODY.upperArm]

/** Hip on the straight line from the shoulder to a floor contact `reach` away from it. */
function plankLine(contact: Vec, hipToContact: number) {
  const reach = Math.hypot(PLANK_SHOULDER[0] - contact[0], PLANK_SHOULDER[1] - contact[1])
  const k = hipToContact / reach
  const hip: Vec = [contact[0] + (PLANK_SHOULDER[0] - contact[0]) * k, contact[1] + (PLANK_SHOULDER[1] - contact[1]) * k]
  const line = Math.atan2(PLANK_SHOULDER[0] - hip[0], PLANK_SHOULDER[1] - hip[1]) * (180 / Math.PI)
  return { hip, line }
}

function plankPose(hip: Vec, line: number, legFar: Limb, topLeg: number, footFar?: number): Pose {
  return {
    hip,
    torso: line,
    head: line,
    // Top hand on the hip.
    armNear: { pin: add(hip, [3, -5]), bend: -1 },
    armFar: { pin: add(ELBOW, [BODY.forearm, 0]), bend: -1 },
    legNear: { a: [topLeg, topLeg] },
    legFar,
    footNear: topLeg,
    footFar,
  }
}

// A4: bottom knee on the mat, lower leg behind the body (drawn along the mat).
const KNEE_X = PLANK_SHOULDER[0] - Math.sqrt((BODY.torso + BODY.thigh) ** 2 - (FLOOR - PLANK_SHOULDER[1]) ** 2)
const KNEE: Vec = [KNEE_X, FLOOR]
const KNEELING = plankLine(KNEE, BODY.thigh)
const KNEELING_LEG: Limb = { a: [KNEELING.line + 180, 250] }
const kneelingPlank = (topLeg: number) => plankPose(KNEELING.hip, KNEELING.line, KNEELING_LEG, topLeg, 250)
// Top leg straight with the foot resting on the mat, or lifted about 30° above the body line.
const KNEELING_TOP_REST = 270 + (Math.asin((FLOOR - KNEELING.hip[1]) / LEG) * 180) / Math.PI
const KNEELING_TOP_UP = KNEELING.line + 180 - 30

const kneelingSidePlankAbduction: Exercise = {
  id: 'A4',
  name: 'Side plank from knees with top-leg abduction',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus medius', 'Obliques'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['shoulder', 'knee'],
  cues: [
    'Lie on your side on a folded mat: elbow under the shoulder, bottom knee bent, top leg straight.',
    'Lift the hips so shoulders, hips and bottom knee are in a straight line.',
    'Holding the hips up, lift the top leg to about 30°, toes forwards, then lower with control.',
  ],
  cautions: [
    'Shoulder: loaded in side support; keep the shoulder stacked over the elbow and stop the set at pain of 4/10 or more.',
    'Knee: kneel on a folded mat.',
  ],
  animation: {
    frames: [
      { pose: kneelingPlank(KNEELING_TOP_REST), move: 1.8, hold: 0.4, label: 'Lower' },
      { pose: kneelingPlank(KNEELING_TOP_UP), move: 1.2, hold: 1, label: 'Lift' },
    ],
    viewBox: [0, 50, 132, 66],
  },
}

// A5: feet stacked, body straight from the shoulders to the feet.
const ANKLE_SIDE = FLOOR
const FULL_ANKLE: Vec = [PLANK_SHOULDER[0] - Math.sqrt((BODY.torso + LEG) ** 2 - (ANKLE_SIDE - PLANK_SHOULDER[1]) ** 2), ANKLE_SIDE]
const FULL = plankLine(FULL_ANKLE, LEG)
const FULL_LEG: Limb = { pin: FULL_ANKLE, bend: 1 }
const fullPlank = (topLeg: number) => plankPose(FULL.hip, FULL.line, FULL_LEG, topLeg, FULL.line + 180)
// Top leg resting on the bottom leg, or lifted about 30° above the body line.
const FULL_TOP_REST = FULL.line + 180 - 5
const FULL_TOP_UP = FULL.line + 180 - 30

const sidePlankAbduction: Exercise = {
  id: 'A5',
  name: 'Side plank with top-leg abduction',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus medius', 'Obliques', 'Quadratus lumborum'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Side plank on the forearm: elbow under the shoulder, legs straight and feet stacked.',
    'Keep shoulders, hips and feet in a straight line; do not let the hips sag.',
    'Lift the top leg to about 30°, toes forwards, then lower with control.',
  ],
  cautions: ['Shoulder: loaded in side support; keep the shoulder stacked over the elbow and stop the set at pain of 4/10 or more.'],
  animation: {
    frames: [
      { pose: fullPlank(FULL_TOP_REST), move: 1.8, hold: 0.4, label: 'Lower' },
      { pose: fullPlank(FULL_TOP_UP), move: 1.2, hold: 1, label: 'Lift' },
    ],
    viewBox: [0, 50, 132, 66],
  },
}

export const ABDUCTION: Exercise[] = [clamshell, sideLyingAbduction, sideLyingAbductionHold, kneelingSidePlankAbduction, sidePlankAbduction]
