// Hip variations (H1c, H1f, H1a, H4c, H8r, A1h) and advanced steps (H9, E5)
// — docs/EVIDENCE.md, "Exercise variations and advanced steps".
//
// The geometry helpers below are copied from hips.ts and abduction.ts, which do
// not export them.
import { add, BODY, dir, dist, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- bridges (H1c, H1f, H1a, H4c)

const BRIDGE_SHOULDER: Vec = [45, FLOOR]
/** Heel position of the standard bridge (H1, H4). */
const BRIDGE_FOOT_X = 103
const BRIDGE_VIEW = [20, 40, 110, 76] as const

const planted = (x: number): Limb => ({ pin: [x, ANKLE_FLOOR], bend: 1 })

/** A foot lifted off the mat with the knee bent about 90°, the thigh near vertical. */
const KNEE_UP: Limb = { a: [172, 82] }

/**
 * Supine bridge with the heels at `footX`. The hips rotate about the shoulders,
 * which stay on the mat; `lift` is the angle of the shoulder–hip line above the floor.
 */
function bridgePose(lift: number, footX: number, legFar?: Limb): Pose {
  const towardHip = 90 + lift
  const hip = add(BRIDGE_SHOULDER, dir(towardHip), BODY.torso)
  const arm = { pin: [75, HAND_FLOOR] as Vec, bend: 1 as const }
  const far = legFar ?? planted(footX)
  return {
    hip,
    torso: towardHip + 180,
    head: 262,
    armNear: arm,
    armFar: arm,
    legNear: planted(footX),
    legFar: far,
    footNear: 90,
    footFar: 'pin' in far ? 90 : undefined,
  }
}

/** Lift at which shoulders, hips and knees form a straight line for heels at `footX`. */
function bridgeTop(footX: number): number {
  const ankle: Vec = [footX, ANKLE_FLOOR]
  const kneeAt = (lift: number) => add(BRIDGE_SHOULDER, dir(90 + lift), BODY.torso + BODY.thigh)
  let lo = 0
  let hi = 60
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (dist(kneeAt(mid), ankle) < BODY.shin) lo = mid
    else hi = mid
  }
  return lo
}

/** Heel position that gives a knee flexion of `flexion`° with the hips on the mat. */
function footForKneeFlexion(flexion: number): number {
  const hip = add(BRIDGE_SHOULDER, dir(90), BODY.torso)
  const inner = ((180 - flexion) * Math.PI) / 180
  const reach = Math.sqrt(BODY.thigh ** 2 + BODY.shin ** 2 - 2 * BODY.thigh * BODY.shin * Math.cos(inner))
  return hip[0] + Math.sqrt(reach ** 2 - (hip[1] - ANKLE_FLOOR) ** 2)
}

/** Feet close to the buttocks: knees bent about 135° at the bottom. */
const CLOSE_FOOT_X = footForKneeFlexion(135)
/** Feet far from the buttocks: knees bent about 65° at the bottom, heels down. */
const FAR_FOOT_X = footForKneeFlexion(65)

const BRIDGE_START = 'Lie on your back, arms by your sides'

const bridgeFeetClose: Exercise = {
  id: 'H1c',
  name: 'Glute bridge, feet close',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteals'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    `${BRIDGE_START}, feet flat and hip-width apart, heels close to the buttocks (knees bent about 135°).`,
    'Squeeze your glutes and push through your heels to lift your hips.',
    'Stop when shoulders, hips and knees form a straight line; do not arch the lower back.',
    'Lower slowly.',
  ],
  animation: {
    frames: [
      { pose: bridgePose(0, CLOSE_FOOT_X), move: 1.5, hold: 0.6, label: 'Lower' },
      { pose: bridgePose(bridgeTop(CLOSE_FOOT_X), CLOSE_FOOT_X), move: 1.2, hold: 1.2, label: 'Squeeze' },
    ],
    viewBox: BRIDGE_VIEW,
  },
  variationOf: 'H1',
  difficulty: 'similar',
}

const bridgeFeetFar: Exercise = {
  id: 'H1f',
  name: 'Glute bridge, feet far',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Hamstrings', 'Gluteus maximus'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    `${BRIDGE_START}, heels on the floor further from the buttocks (knees bent only about 60–70°).`,
    'Push down through your heels to lift your hips; you should feel the back of the thighs working.',
    'Stop when shoulders, hips and knees form a straight line; do not arch the lower back.',
    'Lower slowly.',
  ],
  cautions: ['Stop if the hamstrings cramp; use the feet-close bridge (H1c) instead.'],
  animation: {
    frames: [
      { pose: bridgePose(0, FAR_FOOT_X), move: 1.5, hold: 0.6, label: 'Lower' },
      { pose: bridgePose(bridgeTop(FAR_FOOT_X), FAR_FOOT_X), move: 1.2, hold: 1.2, label: 'Squeeze' },
    ],
    viewBox: BRIDGE_VIEW,
  },
  variationOf: 'H1',
  difficulty: 'similar',
}

// H1a: the knees are pushed apart, which a side view cannot show; the figure
// is the standard bridge and the labels and cues carry the knee position.
const bridgeWideKnees: Exercise = {
  id: 'H1a',
  name: 'Wide-knee bridge',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus maximus', 'Hip abductors'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    `${BRIDGE_START}, knees bent, feet flat and a little wider than the hips, toes turned slightly out.`,
    'Push the knees out to about 30° from the midline, in line with the toes, and keep them there.',
    'Squeeze your glutes and lift your hips until shoulders, hips and knees form a straight line.',
    'Lower slowly, keeping the knees out.',
  ],
  cautions: ['Keep the knees in line with the toes.', 'Skip this variation if the inner knee hurts.'],
  animation: {
    frames: [
      { pose: bridgePose(0, BRIDGE_FOOT_X), move: 1.5, hold: 0.6, label: 'Knees out' },
      { pose: bridgePose(bridgeTop(BRIDGE_FOOT_X), BRIDGE_FOOT_X), move: 1.2, hold: 1.2, label: 'Lift, knees out' },
    ],
    viewBox: BRIDGE_VIEW,
  },
  variationOf: 'H1',
  difficulty: 'similar',
}

const singleLegBridgeClose: Exercise = {
  id: 'H4c',
  name: 'Single-leg glute bridge, working knee bent about 135°',
  group: 'hips',
  cls: 'strength',
  muscles: ['Gluteals'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your back with one heel close to the buttocks (knee bent about 135°) and the other knee lifted, bent at about 90°.',
    'Push through the heel of the planted foot to lift the hips until shoulder, hip and knee are in line.',
    'Keep the pelvis level; lower slowly. Do all reps, then switch legs.',
  ],
  animation: {
    frames: [
      { pose: bridgePose(0, CLOSE_FOOT_X, KNEE_UP), move: 1.6, hold: 0.5, label: 'Lower' },
      { pose: bridgePose(bridgeTop(CLOSE_FOOT_X), CLOSE_FOOT_X, KNEE_UP), move: 1.3, hold: 1, label: 'Lift' },
    ],
    viewBox: BRIDGE_VIEW,
  },
  variationOf: 'H4',
  difficulty: 'similar',
}

// ---------------------------------------------------------------- single-leg hinges (H8r, H9, E5)
// The stance leg is the far leg; the free leg and the reaching arm (opposite
// the stance leg) are the near limbs, so the parts that move are drawn dark.

const SL_ANKLE: Vec = [70, ANKLE_FLOOR]

type HingeShape = { knee: number; shin: number; lean: number }

/** Standing leg with the heel down: knee bent `knee`°, shin tilted `shin`° forward. */
function hingeHip({ knee, shin }: HingeShape): Vec {
  const kneePoint = add(SL_ANKLE, dir(180 - shin), BODY.shin)
  return add(kneePoint, dir(180 - shin + knee), BODY.thigh)
}

type HingeLimbs = { free: Limb; freeFoot: number; reach: Limb; other: Limb | ((hip: Vec, torso: number) => Limb) }

function singleLegPose(shape: HingeShape, o: HingeLimbs): Pose {
  const hip = hingeHip(shape)
  const torso = 180 - shape.lean
  return {
    hip,
    torso,
    head: torso,
    armNear: o.reach,
    armFar: typeof o.other === 'function' ? o.other(hip, torso) : o.other,
    legNear: o.free,
    legFar: { pin: SL_ANKLE, bend: 1 },
    footNear: o.freeFoot,
    footFar: 90,
  }
}

/** Free leg just off the floor, a little behind the stance leg. */
const FREE_UNDER: Limb = { a: [350, 322] }
/** Free leg in line with the torso, knee almost straight. */
const freeBehind = (lean: number): Limb => ({ a: [360 - lean - 2, 360 - lean - 8] })
/** Toes of the free foot pointing at the floor. */
const freeFootBehind = (lean: number) => 92 - lean
/** Arm hanging relaxed by the side. */
const ARM_HANGING: Limb = { a: [4, 10] }
/** Hand resting on the hip. */
const handOnHip = (hip: Vec, torso: number): Limb => ({ pin: add(hip, dir(torso), 5), bend: -1 })

// H8r: fingertips of the stance-side hand trace down a wall in front, as in H8.
const WALL_SURFACE = 103
const wallHand = (y: number): Limb => ({ pin: [WALL_SURFACE - 2, y], bend: -1 })

const H8R_TOP: HingeShape = { knee: 10, shin: 3, lean: 6 }
const H8R_BOTTOM: HingeShape = { knee: 26, shin: 5, lean: 52 }

const reachRdl: Exercise = {
  id: 'H8r',
  name: 'Single-leg RDL with opposite-hand reach',
  group: 'hips',
  cls: 'strength',
  muscles: ['Gluteus maximus', 'Hamstrings', 'Gluteus medius', 'Balance', 'Trunk (anti-rotation)'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand on one leg, knee soft, fingertips of the same-side hand on a wall in front.',
    'Hinge at the hip as the other leg reaches back, and reach the opposite hand down towards the floor.',
    'Keep the hips level and square to the floor and the back flat; do not twist towards the reaching hand.',
    'Squeeze the glute of the standing leg to return upright. Do all reps, then switch legs.',
  ],
  cautions: [
    'Keep the reach within the hamstring stretch you can control.',
    'Use the wall for balance only; let the fingertips slide on it.',
    'Knees: keep pain at 2/10 or below.',
  ],
  animation: {
    frames: [
      {
        pose: singleLegPose(H8R_TOP, { free: FREE_UNDER, freeFoot: 75, reach: ARM_HANGING, other: wallHand(32) }),
        move: 1.4,
        hold: 0.5,
        label: 'Stand',
      },
      {
        pose: singleLegPose(H8R_BOTTOM, {
          free: freeBehind(H8R_BOTTOM.lean),
          freeFoot: freeFootBehind(H8R_BOTTOM.lean),
          reach: { a: [2, 0] },
          other: wallHand(62),
        }),
        move: 2,
        hold: 0.6,
        label: 'Reach',
      },
    ],
    wall: { x: WALL_SURFACE + 6 },
    viewBox: [6, 2, 112, 114],
  },
  variationOf: 'H8',
  difficulty: 'harder',
}

const H9_TOP: HingeShape = { knee: 10, shin: 3, lean: 6 }
const H9_BOTTOM: HingeShape = { knee: 28, shin: 5, lean: 72 }

const freeRdl: Exercise = {
  id: 'H9',
  name: 'Free-standing single-leg RDL with opposite-hand reach',
  group: 'hips',
  cls: 'strength',
  muscles: ['Gluteus maximus', 'Hamstrings', 'Gluteus medius', 'Balance'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand on one leg without support, knee soft, the same-side hand on the hip.',
    'Hinge at the hip as the other leg reaches back, and reach the opposite hand down towards the floor.',
    'Keep the hips level and the back flat, body in one line from head to back heel.',
    'Squeeze the glute of the standing leg to return upright. Do all reps, then switch legs.',
  ],
  cautions: [
    'Keep the reach within the hamstring stretch you can control.',
    'Stand near a wall so you can touch it if you lose balance.',
    'Knees: keep pain at 2/10 or below.',
  ],
  animation: {
    frames: [
      {
        pose: singleLegPose(H9_TOP, { free: FREE_UNDER, freeFoot: 75, reach: ARM_HANGING, other: handOnHip }),
        move: 1.4,
        hold: 0.5,
        label: 'Stand',
      },
      {
        pose: singleLegPose(H9_BOTTOM, {
          free: freeBehind(H9_BOTTOM.lean),
          freeFoot: freeFootBehind(H9_BOTTOM.lean),
          reach: { a: [2, 0] },
          other: handOnHip,
        }),
        move: 2,
        hold: 0.6,
        label: 'Reach',
      },
    ],
    viewBox: [0, 2, 112, 114],
  },
}

// E5: the reaching arm stays at or below shoulder height (user's overhead rule):
// it is never raised beyond a right angle to the trunk, so in the hinge the hand
// is below the shoulder.
const E5_TOP: HingeShape = { knee: 8, shin: 2, lean: 4 }
const E5_BOTTOM: HingeShape = { knee: 18, shin: 4, lean: 50 }

const standingBirdDog: Exercise = {
  id: 'E5',
  name: 'Standing bird dog, dynamic',
  group: 'back',
  cls: 'strength',
  muscles: ['Gluteus maximus', 'Multifidus', 'Lumbar erector spinae', 'Gluteus medius', 'Balance'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee', 'shoulder'],
  cues: [
    'Stand tall on one leg, knee soft, the same-side hand on the hip.',
    'Hinge forward as the free leg extends back and the opposite arm reaches forward.',
    'Raise the arm no higher than shoulder height (at most a right angle to the body); keep the hips level and the back flat.',
    'Return to standing with control. Do all reps, then switch sides.',
  ],
  cautions: [
    'Shoulder: no overhead reach; keep the reaching arm at or below shoulder height.',
    'Stand near a wall so you can touch it if you lose balance.',
    'Knees: keep pain at 2/10 or below.',
  ],
  animation: {
    frames: [
      {
        pose: singleLegPose(E5_TOP, { free: FREE_UNDER, freeFoot: 75, reach: ARM_HANGING, other: handOnHip }),
        move: 1.5,
        hold: 0.5,
        label: 'Stand',
      },
      {
        pose: singleLegPose(E5_BOTTOM, {
          free: freeBehind(E5_BOTTOM.lean),
          freeFoot: freeFootBehind(E5_BOTTOM.lean),
          // Right angle to the trunk: shoulder height relative to the body.
          reach: { a: [90 - E5_BOTTOM.lean, 90 - E5_BOTTOM.lean] },
          other: handOnHip,
        }),
        move: 1.8,
        hold: 1,
        label: 'Reach',
      },
    ],
    viewBox: [0, 2, 112, 114],
  },
}

// ---------------------------------------------------------------- clamshell, hips at 60° (A1h)
// Same "lying on the side" convention as A1: seen from the front, the thighs
// point at the camera, so the extra hip flexion cannot be drawn; the label and
// cues carry it.

const SIDE_HIP: Vec = [62, 105]
const LEG = BODY.thigh + BODY.shin
const BOTTOM_LEG = 271
const TOP_LEG_REST = 266
const CLAM_OPEN_ANKLE = add(SIDE_HIP, dir(TOP_LEG_REST), LEG - 7)

function lyingPose(topLeg: Limb, footNear: number): Pose {
  return {
    hip: SIDE_HIP,
    torso: 90,
    head: 100,
    armNear: { a: [264, 268] },
    armFar: { a: [86, 88] },
    legNear: topLeg,
    legFar: { a: [BOTTOM_LEG, BOTTOM_LEG] },
    footNear,
    footFar: BOTTOM_LEG,
  }
}

const clamshellHigh: Exercise = {
  id: 'A1h',
  name: 'Clamshell, hips bent about 60°',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus maximus (upper fibres)', 'Gluteus medius', 'Hip external rotators'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your side, head supported, knees bent about 90° and brought further forward than usual, hips bent about 60°; feet together.',
    'Keep the feet touching and lift the top knee as far as you can without the pelvis rolling back.',
    'Hold 2–3 s at the top, then lower slowly.',
  ],
  animation: {
    frames: [
      { pose: lyingPose({ a: [TOP_LEG_REST, TOP_LEG_REST] }, TOP_LEG_REST), move: 1.8, hold: 0.5, label: 'Knees forward' },
      { pose: lyingPose({ pin: CLAM_OPEN_ANKLE, bend: -1 }, 272), move: 1.2, hold: 2, label: 'Open' },
    ],
    viewBox: [0, 50, 132, 66],
  },
  variationOf: 'A1',
  difficulty: 'similar',
}

export const HIP_VARIANTS: Exercise[] = [
  bridgeFeetClose,
  bridgeFeetFar,
  bridgeWideKnees,
  singleLegBridgeClose,
  reachRdl,
  clamshellHigh,
  freeRdl,
  standingBirdDog,
]
