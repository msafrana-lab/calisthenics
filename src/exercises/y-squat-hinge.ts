// Squat and hinge flows (Y7–Y12) — docs/EVIDENCE.md, "Y. Dynamic jump-free moves".
//
// All are drawn from the side. The squat flows (Y7–Y9) reuse the K3 squat
// geometry from legs.ts with the toes fixed, so the heels can rise onto the
// balls of the feet as in F1. The hinge flows (Y10–Y12) reuse the H7 and
// single-leg hinge geometry from hips.ts and hip-variants.ts. Those helpers
// are not exported, so the ones needed are copied here.
import { add, BODY, dir, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- shared text

const KNEE_DEPTH = 'Knees: use a depth where pain stays at 2/10 or below. At 4/10, stop and go shallower.'
const SQUAT_DEPTH_CUE = 'Squat no deeper than your current squat step, knees in line with the toes.'
const NO_HOP = 'Rise onto the toes and lower with control; never hop.'

// ---------------------------------------------------------------- shared poses

/** Arm hanging relaxed by the side. */
const ARM_HANGING: Limb = { a: [4, 8] }
/** Hand resting on the hip. */
const handOnHip = (hip: Vec, torso: number): Limb => ({ pin: add(hip, dir(torso), 5), bend: -1 })

// ---------------------------------------------------------------- squat flows (Y7–Y9)
// K3 geometry (legs.ts) with the toes fixed: `heel` 0 = heels down,
// 1 = full rise onto the balls of the feet (as F1).

const SQUAT_TOE: Vec = [73, ANKLE_FLOOR]

type SquatShape = {
  /** Knee flexion in degrees (0 = straight). */
  knee: number
  /** Forward tilt of the shin from vertical. */
  shin: number
  /** Forward lean of the torso from vertical. */
  lean: number
  /** 0 = heels down, 1 = up on the toes. */
  heel: number
}

function squatFrame({ knee, shin, lean, heel }: SquatShape) {
  const foot = 90 - 50 * heel
  const ankle = add(SQUAT_TOE, dir(foot), -BODY.foot)
  const kneePoint = add(ankle, dir(180 - shin), BODY.shin)
  const hip = add(kneePoint, dir(180 - shin + knee), BODY.thigh)
  const torso = 180 - lean
  return { ankle, foot, hip, torso, head: torso + Math.min(lean, 10) * 0.5 }
}

/** Both feet planted; both arms alike. */
function squatPose(shape: SquatShape, arm: Limb): Pose {
  const { ankle, foot, hip, torso, head } = squatFrame(shape)
  const leg = { pin: ankle, bend: 1 as const }
  return { hip, torso, head, armNear: arm, armFar: arm, legNear: leg, legFar: leg, footNear: foot, footFar: foot }
}

const SQUAT_STAND: SquatShape = { knee: 6, shin: 2, lean: 2, heel: 0 }
/** About 55° of knee bend: the partial squat of K3. */
const SQUAT_BOTTOM: SquatShape = { knee: 55, shin: 18, lean: 28, heel: 0 }
const SQUAT_RISE: SquatShape = { knee: 3, shin: 4, lean: 2, heel: 1 }

/** Arms reaching forward for balance at chest height. */
const ARMS_COUNTER: Limb = { a: [66, 72] }
/** Arms reaching forward at shoulder height. */
const ARMS_SHOULDER: Limb = { a: [86, 88] }
/** Arms reaching up overhead, close to the line of the trunk. */
const ARMS_OVERHEAD: Limb = { a: [165, 170] }

const SQUAT_VIEW = [20, 2, 104, 114] as const

const squatCalfRaise: Exercise = {
  id: 'Y7',
  name: 'Squat to calf raise',
  group: 'legs',
  cls: 'flow',
  components: ['strength', 'pulse'],
  muscles: ['Quadriceps', 'Gluteals', 'Calves'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Feet hip-width apart; send the hips back into a partial squat, arms forward for balance.',
    SQUAT_DEPTH_CUE,
    'Stand tall, then rise onto the balls of the feet and lower the heels slowly. Never hop.',
    'Fingertips on a wall are fine if balance is shaky.',
  ],
  cautions: ['Depth never deeper than your current squat step.', KNEE_DEPTH],
  animation: {
    frames: [
      { pose: squatPose(SQUAT_STAND, ARM_HANGING), move: 1.2, hold: 0.3, label: 'Heels down' },
      { pose: squatPose(SQUAT_BOTTOM, ARMS_COUNTER), move: 2, hold: 0.3, label: 'Squat' },
      { pose: squatPose(SQUAT_STAND, ARM_HANGING), move: 1.2, label: 'Stand' },
      { pose: squatPose(SQUAT_RISE, ARM_HANGING), move: 1, hold: 0.6, label: 'Rise' },
    ],
    viewBox: SQUAT_VIEW,
  },
}

const squatReach: Exercise = {
  id: 'Y8',
  name: 'Squat with reach-up',
  group: 'legs',
  cls: 'flow',
  components: ['strength', 'pulse', 'mobility'],
  muscles: ['Quadriceps', 'Gluteals', 'Calves', 'Thoracic extensors', 'Middle trapezius'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee', 'shoulder'],
  cues: [
    'Feet hip-width apart; lower into a partial squat with the arms by your sides.',
    SQUAT_DEPTH_CUE,
    'As you stand, reach both arms forward and up overhead and rise onto the toes.',
    'Lower the heels and the arms together, ribs down, back flat. ' + NO_HOP,
  ],
  cautions: [
    'Shoulder: raise the arms only as far as is pain-free; keep them at shoulder height if the shoulder pinches.',
    'Stop at shoulder pain 3/10.',
    'Depth never deeper than your current squat step.',
    KNEE_DEPTH,
  ],
  animation: {
    frames: [
      { pose: squatPose(SQUAT_STAND, ARM_HANGING), move: 1.2, hold: 0.3, label: 'Lower arms' },
      { pose: squatPose(SQUAT_BOTTOM, { a: [12, 16] }), move: 2, hold: 0.3, label: 'Squat' },
      { pose: squatPose(SQUAT_STAND, { a: [70, 76] }), move: 1.1, label: 'Stand' },
      { pose: squatPose(SQUAT_RISE, ARMS_OVERHEAD), move: 0.9, hold: 0.8, label: 'Reach up' },
    ],
    viewBox: [20, -16, 104, 132],
  },
}

// Y9: the stance foot stays planted on its heel; the other knee drives to hip height.

/** Thigh level with the hip, shin hanging, toes relaxed. */
const KNEE_DRIVE: Limb = { a: [90, 4] }
/** Running-style arm swing: forward with the elbow bent (hand below the shoulder), or back. */
const ARM_FORWARD: Limb = { a: [36, 108] }
const ARM_BACK: Limb = { a: [344, 14] }

function kneeDrivePose(side: 'near' | 'far'): Pose {
  const { ankle, hip, torso, head } = squatFrame(SQUAT_STAND)
  const stance = { pin: ankle, bend: 1 as const }
  const near = side === 'near'
  return {
    hip,
    torso,
    head,
    // The arm opposite the driving knee swings forward.
    armNear: near ? ARM_BACK : ARM_FORWARD,
    armFar: near ? ARM_FORWARD : ARM_BACK,
    legNear: near ? KNEE_DRIVE : stance,
    legFar: near ? stance : KNEE_DRIVE,
    footNear: near ? 70 : 90,
    footFar: near ? 90 : 70,
  }
}

const squatKneeDrive: Exercise = {
  id: 'Y9',
  name: 'Squat to alternating knee drive',
  group: 'legs',
  cls: 'flow',
  components: ['strength', 'pulse'],
  muscles: ['Quadriceps', 'Gluteals', 'Hip flexors', 'Single-leg balance'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Lower into a partial squat, no deeper than your current squat step.',
    'Stand and drive one knee up to hip height; balance on the other leg for a second.',
    'Put the foot down softly and squat again; drive the other knee next time.',
    'Trunk tall; fingertips on a wall are fine for balance.',
  ],
  cautions: ['Depth never deeper than your current squat step.', 'Keep the standing foot on the floor; no hop.', KNEE_DEPTH],
  animation: {
    frames: [
      { pose: squatPose(SQUAT_STAND, ARM_HANGING), move: 0.9, hold: 0.2, label: 'Stand' },
      { pose: squatPose(SQUAT_BOTTOM, ARMS_COUNTER), move: 2, hold: 0.3, label: 'Squat' },
      { pose: kneeDrivePose('near'), move: 1.2, hold: 1, label: 'Knee up' },
      { pose: squatPose(SQUAT_STAND, ARM_HANGING), move: 0.9, hold: 0.2, label: 'Stand' },
      { pose: squatPose(SQUAT_BOTTOM, ARMS_COUNTER), move: 2, hold: 0.3, label: 'Squat' },
      { pose: kneeDrivePose('far'), move: 1.2, hold: 1, label: 'Other knee' },
    ],
    viewBox: SQUAT_VIEW,
  },
}

// ---------------------------------------------------------------- Y10 good morning to reach (H7 geometry, hips.ts)

const HINGE_ANKLE: Vec = [62, ANKLE_FLOOR]

type HingeShape = { knee: number; shin: number; lean: number }

/** Standing leg with the heel down at `ankle`: knee bent `knee`°, shin tilted `shin`° forward. */
function hingeHip({ knee, shin }: HingeShape, ankle: Vec): Vec {
  const kneePoint = add(ankle, dir(180 - shin), BODY.shin)
  return add(kneePoint, dir(180 - shin + knee), BODY.thigh)
}

function goodMorningPose(shape: HingeShape, arm: Limb): Pose {
  const hip = hingeHip(shape, HINGE_ANKLE)
  const torso = 180 - shape.lean
  const leg = { pin: HINGE_ANKLE, bend: 1 as const }
  return {
    hip,
    torso,
    head: torso,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

const goodMorningReach: Exercise = {
  id: 'Y10',
  name: 'Good morning to reach',
  group: 'hips',
  cls: 'flow',
  components: ['strength', 'mobility'],
  muscles: ['Hamstrings', 'Gluteals', 'Spinal extensors', 'Middle trapezius'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Feet hip-width apart, knees soft; push the hips back and let the arms hang as the chest comes forward.',
    'Keep the back flat and the neck in line; stop at a stretch in the back of the thighs.',
    'On the way up, reach both arms forward to shoulder height, no higher, and squeeze the shoulder blades together.',
  ],
  cautions: ['Neutral spine; hinge only as far as the hamstrings allow.', 'Arms stop at shoulder height.'],
  animation: {
    frames: [
      { pose: goodMorningPose({ knee: 6, shin: 2, lean: 0 }, ARMS_SHOULDER), move: 1.3, hold: 0.8, label: 'Reach' },
      { pose: goodMorningPose({ knee: 22, shin: 3, lean: 58 }, { a: [6, 8] }), move: 2, hold: 0.4, label: 'Hinge' },
    ],
    viewBox: [26, 2, 96, 114],
  },
}

// ---------------------------------------------------------------- single-leg hinges (Y11, Y12; hip-variants.ts)
// The working (front or stance) leg is the far leg; the back or free leg and the
// arm opposite the working leg are the near limbs, so the parts that move are dark.

const SL_ANKLE: Vec = [70, ANKLE_FLOOR]

// Y11: the back foot rests on its toes a short step behind, heel up (the kickstand).
const KICKSTAND_TOE: Vec = [SL_ANKLE[0] - 17, ANKLE_FLOOR]
const KICKSTAND_FOOT = 40
const KICKSTAND_ANKLE = add(KICKSTAND_TOE, dir(KICKSTAND_FOOT), -BODY.foot)

function kickstandPose(shape: HingeShape, reach: Limb): Pose {
  const hip = hingeHip(shape, SL_ANKLE)
  const torso = 180 - shape.lean
  return {
    hip,
    torso,
    head: torso,
    armNear: reach,
    armFar: handOnHip(hip, torso),
    legNear: { pin: KICKSTAND_ANKLE, bend: 1 },
    legFar: { pin: SL_ANKLE, bend: 1 },
    footNear: KICKSTAND_FOOT,
    footFar: 90,
  }
}

const KICKSTAND_TOP: HingeShape = { knee: 8, shin: 3, lean: 4 }
const KICKSTAND_BOTTOM: HingeShape = { knee: 24, shin: 5, lean: 60 }

const kickstandHinge: Exercise = {
  id: 'Y11',
  name: 'Kickstand hinge with reach',
  group: 'hips',
  cls: 'flow',
  components: ['strength', 'mobility'],
  muscles: ['Gluteus maximus', 'Hamstrings', 'Gluteus medius'],
  measure: 'seconds',
  target: [30, 45],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Short staggered stance: most of the weight on the front foot, the back foot on its toes as a kickstand.',
    'Hinge on the front leg, knee soft, and reach the opposite hand towards the front shin.',
    'Back flat and hips square; squeeze the front glute to stand. Work one side, then switch.',
  ],
  cautions: [
    'The other hand may touch a wall for balance.',
    'Neutral spine; reach only as far as the hamstrings allow.',
  ],
  animation: {
    frames: [
      { pose: kickstandPose(KICKSTAND_TOP, ARM_HANGING), move: 1.3, hold: 0.5, label: 'Stand' },
      { pose: kickstandPose(KICKSTAND_BOTTOM, { a: [344, 338] }), move: 2, hold: 0.5, label: 'Reach' },
    ],
    viewBox: [26, 2, 96, 114],
  },
}

// Y12: fingertips of the stance-side hand on a wall in front (as H8r). The free
// hip turning outwards cannot be drawn literally from the side: it is shown as
// the bent free knee swinging up and back while the foot drops (the pelvis
// opening towards the ceiling), then turning back down (closing).
const WALL_SURFACE = 103
const wallHand = (y: number): Limb => ({ pin: [WALL_SURFACE - 2, y], bend: -1 })

/** Free leg just off the floor, a little behind the stance leg. */
const FREE_UNDER: Limb = { a: [350, 322] }
/** Hip closed: free knee pointing at the floor, shin back. */
const FREE_CLOSED: Limb = { a: [2, 284] }
/** Hip open: free knee turned out and up, shin hanging. */
const FREE_OPEN: Limb = { a: [282, 348] }

function airplanePose(shape: HingeShape, free: Limb, freeFoot: number, handY: number): Pose {
  const hip = hingeHip(shape, SL_ANKLE)
  const torso = 180 - shape.lean
  return {
    hip,
    torso,
    head: torso,
    armNear: handOnHip(hip, torso),
    armFar: wallHand(handY),
    legNear: free,
    legFar: { pin: SL_ANKLE, bend: 1 },
    footNear: freeFoot,
    footFar: 90,
  }
}

const AIRPLANE_TOP: HingeShape = { knee: 10, shin: 3, lean: 6 }
const AIRPLANE_HINGE: HingeShape = { knee: 20, shin: 4, lean: 45 }

const hipAirplane: Exercise = {
  id: 'Y12',
  name: 'Hip airplane with wall support',
  group: 'hips',
  cls: 'flow',
  components: ['strength', 'mobility'],
  muscles: ['Gluteus medius', 'Deep hip rotators', 'Gluteus maximus', 'Balance'],
  measure: 'seconds',
  target: [30, 45],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand on one leg, knee soft, fingertips of the same-side hand on a wall in front.',
    'Hinge to about 45°, back flat, the free knee bent and pointing at the floor.',
    'Slowly turn the pelvis open, free hip and knee rotating out towards the ceiling, then turn it back closed.',
    'The standing knee stays in line with the toes. Work one side, then switch.',
  ],
  cautions: ['Slow; small range first.', 'Use the wall for balance only.', KNEE_DEPTH],
  animation: {
    frames: [
      { pose: airplanePose(AIRPLANE_TOP, FREE_UNDER, 75, 32), move: 1.4, hold: 0.5, label: 'Stand' },
      { pose: airplanePose(AIRPLANE_HINGE, FREE_CLOSED, 20, 50), move: 2, hold: 0.5, label: 'Hinge' },
      { pose: airplanePose(AIRPLANE_HINGE, FREE_OPEN, 80, 50), move: 2, hold: 1, label: 'Open hip' },
      { pose: airplanePose(AIRPLANE_HINGE, FREE_CLOSED, 20, 50), move: 1.8, hold: 0.5, label: 'Close' },
    ],
    wall: { x: WALL_SURFACE + 6 },
    viewBox: [20, 2, 96, 114],
  },
}

export const Y_SQUAT_HINGE: Exercise[] = [
  squatCalfRaise,
  squatReach,
  squatKneeDrive,
  goodMorningReach,
  kickstandHinge,
  hipAirplane,
]
