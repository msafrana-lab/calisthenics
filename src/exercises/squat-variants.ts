// Squat variations (K3h, K3w, K4h, K4w) and the lateral advanced steps K10
// (lateral lunge) and K11 (supported Cossack squat) — docs/EVIDENCE.md,
// "Exercise variations and advanced steps".
//
// Hip-biased squats are drawn from the side, like K3/K4 in legs.ts.
// Wide-stance squats and the lateral movements are drawn from the front, as
// legs.ts and abduction.ts do for side-lying work: the near (dark) leg is on the
// right of the screen, the far (faded) leg on the left, and both legs start at
// the single hip point. Knee bend shows as the knees travelling out over the
// turned-out toes.
import { add, BODY, dir, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR } from './helpers'
import type { Exercise } from './types'

const RAD = Math.PI / 180

// ---------------------------------------------------------------- shared text (as in legs.ts)

const KNEE_DEPTH = 'Knees: use a depth where pain stays at 2/10 or below. At 4/10, stop the set and go shallower or switch to a wall sit.'
const KNEE_PROGRESS = 'Add depth about one hand-width at a time, and only after a full session at the current depth with pain at 2/10 or below that has settled by the next morning.'
const KNEE_RED_FLAGS = 'Stop and seek assessment if the knee swells, locks, gives way or the pain is sharp.'

const HIP_BIAS_BACK = 'More forward lean means more load on the lower back; skip this version if the back is sore.'
const WIDE_GROIN = 'Do not combine a wide stance with toes pointing straight forward. Skip this version if the groin or the inner knee hurts.'
const LATERAL_KNEE = 'Side lunges load the front of the knee more than forward lunges at mid-to-deep knee bend; stay shallow until deeper squats and lunges are pain-free.'

// ---------------------------------------------------------------- side view: hip-biased squats (copied from legs.ts)

const SQUAT_ANKLE: Vec = [66, ANKLE_FLOOR]

type SquatShape = {
  /** Knee flexion in degrees (0 = straight). */
  knee: number
  /** Forward tilt of the shin from vertical (knees travelling over the toes). */
  shin: number
  /** Forward lean of the torso from vertical. */
  lean: number
  /** Arm angle: 5 = hanging by the sides, 85 = reaching forward at shoulder height. */
  arms: number
}

function squatPose({ knee, shin, lean, arms }: SquatShape): Pose {
  const kneePoint = add(SQUAT_ANKLE, dir(180 - shin), BODY.shin)
  const hip = add(kneePoint, dir(180 - shin + knee), BODY.thigh)
  const leg = { pin: SQUAT_ANKLE, bend: 1 as const }
  const arm = { a: [arms, arms + 4] as const }
  const torso = 180 - lean
  return {
    hip,
    torso,
    head: torso + Math.min(lean, 10) * 0.5,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

const SQUAT_TOP: SquatShape = { knee: 6, shin: 2, lean: 2, arms: 6 }
// Same knee range as K3 (55°) and K4 (108°), with the shins kept more upright
// and the hips sent further back, so the trunk leans further forward.
const HIP_PARTIAL_BOTTOM: SquatShape = { knee: 55, shin: 7, lean: 44, arms: 82 }
const HIP_PARALLEL_BOTTOM: SquatShape = { knee: 105, shin: 18, lean: 58, arms: 78 }

const SQUAT_VIEW = [20, 2, 104, 114] as const

// ---------------------------------------------------------------- front view: shared geometry

const CX = 70
const LEG = BODY.thigh + BODY.shin

/** Hip height above an ankle `dx` away sideways when that leg is `slack` short of straight. */
const hipYOver = (dx: number, slack = 0.4) => ANKLE_FLOOR - Math.sqrt((LEG - slack) ** 2 - dx ** 2)

/** Ankle-to-hip distance for a knee bent by `flexion` degrees. */
const legSpan = (flexion: number) =>
  Math.sqrt(BODY.thigh ** 2 + BODY.shin ** 2 + 2 * BODY.thigh * BODY.shin * Math.cos(flexion * RAD))

/** Rotate a body-frame offset (x right, y down along an upright torso) by the torso tilt. */
function onTorso(origin: Vec, torso: number, [x, y]: Vec): Vec {
  const t = (180 - torso) * RAD
  return [origin[0] + x * Math.cos(t) - y * Math.sin(t), origin[1] + x * Math.sin(t) + y * Math.cos(t)]
}

type Arms = 'chest' | 'hips' | 'wall'

/**
 * Arms seen from the front, elbows out to the sides.
 * chest: hands together in front of the chest; hips: hands on the hips;
 * wall: hands resting on a wall in front at chest height.
 */
function frontArms(hip: Vec, torso: number, arms: Arms): { armNear: Limb; armFar: Limb } {
  const shoulder = add(hip, dir(torso), BODY.torso)
  const hand = (side: 1 | -1): Vec => {
    if (arms === 'hips') return onTorso(hip, torso, [side * 5.5, -6])
    if (arms === 'wall') return onTorso(shoulder, torso, [side * 5, 19])
    return onTorso(shoulder, torso, [side * 1.2, 17])
  }
  return { armNear: { pin: hand(1), bend: 1 }, armFar: { pin: hand(-1), bend: -1 } }
}

type FrontShape = {
  hip: Vec
  /** Ankles: left (far leg) and right (near leg). A free leg is given as joint angles. */
  left: Vec
  right: Vec | { a: readonly [number, number] }
  torso?: number
  arms: Arms
  /** Foot directions: 270 = toes out to the left, 90 = out to the right, 180 = toes up. */
  footLeft?: number
  footRight?: number
}

function frontPose({ hip, left, right, torso = 180, arms, footLeft = 270, footRight = 90 }: FrontShape): Pose {
  return {
    hip,
    torso,
    head: torso,
    ...frontArms(hip, torso, arms),
    legNear: 'a' in right ? right : { pin: right, bend: 1 },
    legFar: { pin: left, bend: -1 },
    footNear: footRight,
    footFar: footLeft,
  }
}

const FRONT_VIEW = [CX - 54, 2, 108, 114] as const

// ---------------------------------------------------------------- wide-stance squats

/** Half the distance between the ankles: about 1.5× hip width. */
const WIDE_HALF = 14
const WIDE_LEFT: Vec = [CX - WIDE_HALF, ANKLE_FLOOR]
const WIDE_RIGHT: Vec = [CX + WIDE_HALF, ANKLE_FLOOR]

/** Wide squat with the knees bent by `flexion` degrees (straight down, centred). */
function widePose(flexion: number): Pose {
  const y = ANKLE_FLOOR - Math.sqrt(legSpan(flexion) ** 2 - WIDE_HALF ** 2)
  return frontPose({ hip: [CX, y], left: WIDE_LEFT, right: WIDE_RIGHT, arms: 'chest' })
}

// ---------------------------------------------------------------- K10 lateral lunge

// Bottom: the near (right) shin nearly upright, knee bent about 70°, the far leg straight.
const LL_FLEX = 70
const LL_SHIN = 6
const LL_RIGHT: Vec = [CX + 27, ANKLE_FLOOR]
const LL_BOTTOM_HIP = add(add(LL_RIGHT, dir(180 - LL_SHIN), BODY.shin), dir(180 - LL_SHIN + LL_FLEX), BODY.thigh)
const LL_LEFT: Vec = [LL_BOTTOM_HIP[0] - Math.sqrt((LEG - 0.1) ** 2 - (ANKLE_FLOOR - LL_BOTTOM_HIP[1]) ** 2), ANKLE_FLOOR]
// Standing: feet hip-width apart, the right foot next to the left.
const LL_RIGHT_IN: Vec = [LL_LEFT[0] + 10, ANKLE_FLOOR]
const LL_STAND_HIP: Vec = [LL_LEFT[0] + 5, hipYOver(5)]
// Right foot planted out wide, both legs nearly straight, before sitting into the hip.
const LL_PLANT_HIP: Vec = [(LL_LEFT[0] + LL_RIGHT[0]) / 2, hipYOver((LL_RIGHT[0] - LL_LEFT[0]) / 2, 0.8)]

const LL_STAND = frontPose({ hip: LL_STAND_HIP, left: LL_LEFT, right: LL_RIGHT_IN, arms: 'chest', footLeft: 270, footRight: 90 })
const LL_SWING_OUT = frontPose({ hip: add(LL_STAND_HIP, [-1, 0.6]), left: LL_LEFT, right: { a: [32, 22] }, arms: 'chest' })
const LL_PLANT = frontPose({ hip: LL_PLANT_HIP, left: LL_LEFT, right: LL_RIGHT, arms: 'chest' })
const LL_BOTTOM = frontPose({ hip: LL_BOTTOM_HIP, left: LL_LEFT, right: LL_RIGHT, torso: 175, arms: 'chest' })
const LL_SWING_IN = frontPose({ hip: add(LL_STAND_HIP, [1, 0.8]), left: LL_LEFT, right: { a: [26, 14] }, arms: 'chest' })

// ---------------------------------------------------------------- K11 supported Cossack squat

const COSSACK_HALF = 32
const COSSACK_LEFT: Vec = [CX - COSSACK_HALF, ANKLE_FLOOR]
const COSSACK_RIGHT: Vec = [CX + COSSACK_HALF, ANKLE_FLOOR]
const COSSACK_TOP_HIP: Vec = [CX, hipYOver(COSSACK_HALF, 1.2)]
// Bottom: hips low over the right foot, right heel flat, left leg straight with the toes up.
const COSSACK_BOTTOM_Y = 82
const COSSACK_BOTTOM_HIP: Vec = [
  COSSACK_LEFT[0] + Math.sqrt((LEG - 0.1) ** 2 - (ANKLE_FLOOR - COSSACK_BOTTOM_Y) ** 2),
  COSSACK_BOTTOM_Y,
]

const COSSACK_TOP = frontPose({ hip: COSSACK_TOP_HIP, left: COSSACK_LEFT, right: COSSACK_RIGHT, arms: 'wall' })
const COSSACK_BOTTOM = frontPose({
  hip: COSSACK_BOTTOM_HIP,
  left: COSSACK_LEFT,
  right: COSSACK_RIGHT,
  torso: 174,
  arms: 'wall',
  footLeft: 185,
})

// ---------------------------------------------------------------- exercises

const hipPartialSquat: Exercise = {
  id: 'K3h',
  name: 'Hip-biased partial squat',
  group: 'legs',
  cls: 'strength',
  muscles: ['Gluteals', 'Hamstrings', 'Quadriceps'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Feet hip-width apart; fingertips on a wall for balance if needed.',
    'Sit the hips back first, shins staying nearly upright, chest leaning further forward than in the standard squat.',
    'Partial range: stop at about 50–60° of knee bend, knees in line with the toes.',
    'Drive the hips forward to stand up.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, HIP_BIAS_BACK, KNEE_RED_FLAGS],
  variationOf: 'K3',
  difficulty: 'similar',
  animation: {
    frames: [
      { pose: squatPose(SQUAT_TOP), move: 1.2, hold: 0.5, label: 'Stand' },
      { pose: squatPose(HIP_PARTIAL_BOTTOM), move: 2.2, hold: 0.3, label: 'Sit back' },
    ],
    viewBox: SQUAT_VIEW,
  },
}

const widePartialSquat: Exercise = {
  id: 'K3w',
  name: 'Wide-stance partial squat',
  group: 'legs',
  cls: 'strength',
  muscles: ['Gluteals', 'Quadriceps', 'Adductors'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Feet about 1.5× hip width, toes turned out about 20–30°; hands together in front of the chest.',
    'Hips back and down, knees pushing out over the toes; heels stay down.',
    'Partial range: stop at about 50–60° of knee bend.',
    'Push through the whole foot to stand up.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, WIDE_GROIN, KNEE_RED_FLAGS],
  variationOf: 'K3',
  difficulty: 'similar',
  animation: {
    frames: [
      { pose: widePose(6), move: 1.2, hold: 0.5, label: 'Stand' },
      { pose: widePose(55), move: 2, hold: 0.3, label: 'Lower' },
    ],
    viewBox: FRONT_VIEW,
  },
}

const hipSquat: Exercise = {
  id: 'K4h',
  name: 'Hip-biased squat to pain-free depth',
  group: 'legs',
  cls: 'strength',
  muscles: ['Gluteals', 'Hamstrings', 'Quadriceps'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Feet hip-width apart; fingertips on a wall for balance if needed.',
    'Sit the hips back first, shins staying nearly upright, chest leaning well forward with a straight back.',
    'Go to pain-free depth, up to thighs parallel to the floor, knees in line with the toes.',
    'Drive the hips forward to stand up.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, HIP_BIAS_BACK, KNEE_RED_FLAGS],
  variationOf: 'K4',
  difficulty: 'similar',
  animation: {
    frames: [
      { pose: squatPose(SQUAT_TOP), move: 1.3, hold: 0.5, label: 'Stand' },
      { pose: squatPose(HIP_PARALLEL_BOTTOM), move: 2.4, hold: 0.3, label: 'Sit back' },
    ],
    viewBox: SQUAT_VIEW,
  },
}

const wideSquat: Exercise = {
  id: 'K4w',
  name: 'Wide-stance squat to pain-free depth',
  group: 'legs',
  cls: 'strength',
  muscles: ['Gluteals', 'Quadriceps', 'Adductors'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Feet about 1.5× hip width, toes turned out about 20–30°; hands together in front of the chest.',
    'Hips back and down, knees pushing out over the toes; heels stay down.',
    'Go to pain-free depth, up to thighs parallel to the floor.',
    'Push through the whole foot to stand up.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, WIDE_GROIN, KNEE_RED_FLAGS],
  variationOf: 'K4',
  difficulty: 'similar',
  animation: {
    frames: [
      { pose: widePose(6), move: 1.3, hold: 0.5, label: 'Stand' },
      { pose: widePose(95), move: 2.4, hold: 0.3, label: 'Lower' },
    ],
    viewBox: FRONT_VIEW,
  },
}

const lateralLunge: Exercise = {
  id: 'K10',
  name: 'Lateral lunge',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals', 'Adductors'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand tall, feet hip-width apart, hands together in front of the chest.',
    'Take a wide step to the side, then sit back into that hip; the other leg stays straight, both feet flat.',
    'Knee in line with the toes; go shallow at first (about 45° of knee bend), later to pain-free depth.',
    'Push off the stepping foot to return to standing; do all reps, then switch sides.',
  ],
  cautions: [KNEE_DEPTH, LATERAL_KNEE, KNEE_PROGRESS, KNEE_RED_FLAGS],
  animation: {
    frames: [
      { pose: LL_STAND, move: 0.8, hold: 0.5, label: 'Stand' },
      { pose: LL_SWING_OUT, move: 0.7, label: 'Step out' },
      { pose: LL_PLANT, move: 0.6, label: 'Step out' },
      { pose: LL_BOTTOM, move: 2, hold: 0.4, label: 'Sit back' },
      { pose: LL_SWING_IN, move: 1.2, label: 'Push back' },
    ],
    viewBox: FRONT_VIEW,
  },
}

const cossackSquat: Exercise = {
  id: 'K11',
  name: 'Cossack squat, supported',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals', 'Adductors'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Very wide stance facing a wall, hands resting on it at chest height for support; toes turned out slightly.',
    'Shift your weight to one side and sit down into that hip, heel flat; the other leg straightens, toes pointing up.',
    'Go only to pain-free depth, knee in line with the toes; let the hands slide down the wall.',
    'Push back up to the middle; do all reps, then switch sides.',
  ],
  cautions: [
    'A physiotherapist assessment is advised before trying this step: it combines deep knee bend with sideways loading.',
    KNEE_DEPTH,
    LATERAL_KNEE,
    KNEE_RED_FLAGS,
  ],
  animation: {
    frames: [
      { pose: COSSACK_TOP, move: 1.5, hold: 0.5, label: 'Centre' },
      { pose: COSSACK_BOTTOM, move: 2.5, hold: 0.5, label: 'Shift down' },
    ],
    viewBox: FRONT_VIEW,
  },
}

export const SQUAT_VARIANTS: Exercise[] = [
  hipPartialSquat,
  widePartialSquat,
  hipSquat,
  wideSquat,
  lateralLunge,
  cossackSquat,
]
