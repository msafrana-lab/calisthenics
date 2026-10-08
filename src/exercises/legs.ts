// Knee-dominant ladder (K) and calf ladder (F) — docs/EVIDENCE.md, "Exercise candidates".
import { add, angleTo, BODY, dir, GROUND_Y, solve, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

const RAD = Math.PI / 180

// ---------------------------------------------------------------- shared text

const KNEE_DEPTH = 'Knees: use a depth where pain stays at 2/10 or below. At 4/10, stop the set and go shallower or switch to a wall sit.'
const KNEE_PROGRESS = 'Add depth about one hand-width at a time, and only after a full session at the current depth with pain at 2/10 or below that has settled by the next morning.'
const KNEE_RED_FLAGS = 'Stop and seek assessment if the knee swells, locks, gives way or the pain is sharp.'

// ---------------------------------------------------------------- shared poses

/** Both arms on the hips (hands on the iliac crests, elbows back). */
function handsOnHips(hip: Vec, torso: number): Limb {
  return { pin: add(hip, dir(torso), 5), bend: -1 }
}

/** A wall whose surface faces the figure from the front (the wall drawing extends to the left of `x`). */
const wallInFront = (surface: number) => ({ x: surface + 6 })

// ---------------------------------------------------------------- K0 supine straight-leg raise

const SLR_HIP: Vec = [68, FLOOR]
const SLR_BENT_ANKLE: Vec = [SLR_HIP[0] + 36, ANKLE_FLOOR]

function straightLegRaisePose(lift: number): Pose {
  // Arms resting along the sides, almost straight.
  const arm = { pin: [SLR_HIP[0] + 0.7, HAND_FLOOR] as Vec, bend: 1 as const }
  return {
    hip: SLR_HIP,
    torso: 270,
    head: 262,
    armNear: arm,
    armFar: arm,
    // Working leg: straight, thigh tightened, toes pulled up.
    legNear: { a: [90 + lift, 90 + lift] },
    // Other leg bent, foot flat on the mat.
    legFar: { pin: SLR_BENT_ANKLE, bend: 1 },
    footFar: 90,
  }
}

// Lift until the knees are level: the straight leg's knee reaches the bent knee's height.
const SLR_TOP = (() => {
  const bentKnee = solve(straightLegRaisePose(0)).legFar.mid
  return Math.asin((SLR_HIP[1] - bentKnee[1]) / BODY.thigh) / RAD
})()

const straightLegRaise: Exercise = {
  id: 'K0',
  name: 'Supine straight-leg raise',
  group: 'legs',
  cls: 'endurance',
  muscles: ['Quadriceps', 'Hip flexors'],
  measure: 'reps',
  target: [10, 15],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Lie on your back with one knee bent and that foot flat; the other leg straight on the mat.',
    'Tighten the front of the straight thigh and pull the toes up so the knee locks straight.',
    'Lift the straight leg until the knees are level, then lower slowly without letting the knee bend.',
  ],
  cautions: ['Keep the lower back resting on the mat; the bent leg helps with this.'],
  animation: {
    frames: [
      { pose: straightLegRaisePose(0), move: 2, hold: 0.6, label: 'Lower' },
      { pose: straightLegRaisePose(SLR_TOP), move: 1.4, hold: 1, label: 'Lift' },
    ],
    viewBox: [14, 46, 118, 70],
  },
}

// ---------------------------------------------------------------- K1/K2 wall sit

const WALL_X = 38
const WALL_ANKLE: Vec = [WALL_X + 3 + 17.7, GROUND_Y - 6]
const WALL_HIP_X = WALL_X + 4

function wallSitPose(hipY: number, ankle: Vec = WALL_ANKLE): Pose {
  const leg = { pin: ankle, bend: 1 as const }
  const arm = { a: [28, 75] as const }
  return {
    hip: [WALL_HIP_X, hipY],
    torso: 180,
    head: 180,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

// Hip height for a given knee flexion with the shin vertical above the ankle.
const wallSitHipY = (kneeFlexion: number) => WALL_ANKLE[1] - BODY.shin - BODY.thigh * Math.cos(kneeFlexion * RAD)
// Highest hip position against the wall: legs almost straight, feet still forward.
const wallStandY = (ankle: Vec) => {
  const dx = ankle[0] - WALL_HIP_X
  return ankle[1] - Math.sqrt((BODY.thigh + BODY.shin - 1) ** 2 - dx ** 2)
}
const WALL_STAND_Y = wallStandY(WALL_ANKLE)

const wallSit: Exercise = {
  id: 'K1',
  name: 'Wall sit (shallow)',
  group: 'legs',
  cls: 'hold',
  muscles: ['Quadriceps'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand with your back flat against a wall, feet about a foot in front of it.',
    'Slide down until the knees are bent about 30–45°; knees stay above the ankles.',
    'Hold, breathing normally, then slide back up.',
  ],
  cautions: ['Knees: only go deeper if pain stays at 2/10 or below during and the next morning.'],
  animation: {
    frames: [
      { pose: wallSitPose(WALL_STAND_Y), move: 1.2, hold: 0.6, label: 'Stand tall' },
      { pose: wallSitPose(wallSitHipY(45)), move: 1.8, hold: 3, label: 'Hold' },
    ],
    wall: { x: WALL_X },
    viewBox: [18, 8, 100, 108],
  },
}

// Deeper wall sit: feet further out so the shin is still vertical at about 80° of knee flexion.
const DEEP_WALL_FLEXION = 80
const DEEP_WALL_ANKLE: Vec = [WALL_HIP_X + BODY.thigh * Math.sin(DEEP_WALL_FLEXION * RAD), ANKLE_FLOOR]

const deepWallSit: Exercise = {
  id: 'K2',
  name: 'Wall sit (deeper)',
  group: 'legs',
  cls: 'hold',
  muscles: ['Quadriceps'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Back flat against the wall, feet hip-width apart and further out than for the shallow wall sit.',
    'Slide down to a pain-free depth between about 60° and 90° of knee bend; knees stay above the ankles and in line with the toes.',
    'Hold, breathing normally, then slide back up.',
  ],
  cautions: [
    'Knees: go only as deep as keeps pain at 2/10 or below; go back to the shallow wall sit if it rises to 4/10.',
    KNEE_RED_FLAGS,
  ],
  animation: {
    frames: [
      { pose: wallSitPose(wallStandY(DEEP_WALL_ANKLE), DEEP_WALL_ANKLE), move: 1.4, hold: 0.6, label: 'Start' },
      { pose: wallSitPose(wallSitHipY(DEEP_WALL_FLEXION), DEEP_WALL_ANKLE), move: 2.2, hold: 3, label: 'Hold' },
    ],
    wall: { x: WALL_X },
    viewBox: [18, 8, 100, 108],
  },
}

// ---------------------------------------------------------------- K3–K5 squats

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
const PARTIAL_BOTTOM: SquatShape = { knee: 55, shin: 18, lean: 28, arms: 84 }
const PARALLEL_BOTTOM: SquatShape = { knee: 108, shin: 31, lean: 45, arms: 86 }

const SQUAT_VIEW = [20, 2, 104, 114] as const

const partialSquat: Exercise = {
  id: 'K3',
  name: 'Partial-range bodyweight squat',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Feet hip-width apart, toes turned out slightly.',
    'Send the hips back and down while the arms reach forward for balance; heels stay down.',
    'Stop at a quarter-to-half squat (about 50–60° of knee bend), knees in line with the toes.',
    'Push through the whole foot to stand up.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, KNEE_RED_FLAGS],
  animation: {
    frames: [
      { pose: squatPose(SQUAT_TOP), move: 1.2, hold: 0.5, label: 'Stand' },
      { pose: squatPose(PARTIAL_BOTTOM), move: 2, hold: 0.3, label: 'Lower' },
    ],
    viewBox: SQUAT_VIEW,
  },
}

const fullSquat: Exercise = {
  id: 'K4',
  name: 'Bodyweight squat to pain-free depth',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals', 'Adductors'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Feet hip-width apart, toes turned out slightly.',
    'Hips back and down, chest leaning forward a little, arms reaching forward; heels stay down.',
    'Go as deep as is pain-free, up to thighs parallel to the floor, knees in line with the toes.',
    'Push through the whole foot to stand up.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, KNEE_RED_FLAGS],
  animation: {
    frames: [
      { pose: squatPose(SQUAT_TOP), move: 1.3, hold: 0.5, label: 'Stand' },
      { pose: squatPose(PARALLEL_BOTTOM), move: 2.2, hold: 0.3, label: 'Lower' },
    ],
    viewBox: SQUAT_VIEW,
  },
}

const tempoSquat: Exercise = {
  id: 'K5',
  name: 'Tempo squat (3 s down, 1 s pause)',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals', 'Adductors'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Set up as for the squat: feet hip-width apart, arms reaching forward.',
    'Lower for a slow count of three to your pain-free depth, knees in line with the toes.',
    'Pause for one second at the bottom without relaxing, then stand up at a normal speed.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, KNEE_RED_FLAGS],
  animation: {
    frames: [
      { pose: squatPose(SQUAT_TOP), move: 1.2, hold: 0.5, label: 'Stand' },
      { pose: squatPose(PARALLEL_BOTTOM), move: 3, hold: 1, label: 'Lower 3 s' },
    ],
    viewBox: SQUAT_VIEW,
  },
}

// ---------------------------------------------------------------- K6–K8 split squats and lunge

const SPLIT_FRONT: Vec = [84, ANKLE_FLOOR]
/** Ball of the back foot on the mat. */
const SPLIT_BACK_TOE: Vec = [37, GROUND_Y - 5]

/**
 * Back leg on the ball of the foot: the ankle is placed so the foot keeps a
 * neutral angle to the shin, with the toes fixed on the mat.
 */
function backLeg(hip: Vec, toe: Vec): { leg: Limb; foot: number } {
  let best = { foot: 55, err: Infinity }
  for (let foot = 25; foot <= 80; foot += 0.25) {
    const ankle = add(toe, dir(foot), -BODY.foot)
    const d = Math.hypot(ankle[0] - hip[0], ankle[1] - hip[1])
    if (d > BODY.thigh + BODY.shin - 0.3) continue
    // Knee by the same two-bone solution the renderer uses (knee forward).
    const phi = angleTo(hip, ankle)
    const alpha = Math.acos((BODY.thigh ** 2 + d * d - BODY.shin ** 2) / (2 * BODY.thigh * d)) / RAD
    const knee = add(hip, dir(phi + alpha), BODY.thigh)
    const err = Math.abs(((angleTo(knee, ankle) + 90 - foot + 540) % 360) - 180)
    if (err < best.err) best = { foot, err }
  }
  return { leg: { pin: add(toe, dir(best.foot), -BODY.foot), bend: 1 }, foot: best.foot }
}

type SplitShape = {
  /** Hip position. */
  hip: Vec
  lean: number
  /** 'wall': near hand on a wall in front; 'hips': hands on hips. */
  arms: 'wall' | 'hips'
  front?: Vec
  backToe?: Vec
}

// Front toes a few centimetres from the wall, so the hand reaches it.
const SPLIT_WALL_SURFACE = SPLIT_FRONT[0] + BODY.foot + 3.5
const SPLIT_WALL_HAND: Vec = [SPLIT_WALL_SURFACE - 2, 42]

function splitPose({ hip, lean, arms, front = SPLIT_FRONT, backToe = SPLIT_BACK_TOE }: SplitShape): Pose {
  const torso = 180 - lean
  const back = backLeg(hip, backToe)
  const onHips = handsOnHips(hip, torso)
  return {
    hip,
    torso,
    head: torso,
    armNear: arms === 'wall' ? { pin: SPLIT_WALL_HAND, bend: -1 } : onHips,
    armFar: arms === 'wall' ? { a: [8, 14] } : onHips,
    legNear: { pin: front, bend: 1 },
    legFar: back.leg,
    footNear: 90,
    footFar: back.foot,
  }
}

/** Hip above `hipX`, placed so the front knee is bent by `flexion` degrees. */
function splitHip(hipX: number, flexion: number, front: Vec = SPLIT_FRONT): Vec {
  const d2 = BODY.thigh ** 2 + BODY.shin ** 2 + 2 * BODY.thigh * BODY.shin * Math.cos(flexion * RAD)
  return [hipX, front[1] - Math.sqrt(d2 - (front[0] - hipX) ** 2)]
}

const SPLIT_TOP_HIP = splitHip(61, 20)
const SPLIT_SHORT_HIP = splitHip(62, 50)
const SPLIT_DEEP_HIP = splitHip(63, 95)

const staticSplitSquat: Exercise = {
  id: 'K6',
  name: 'Static split squat, short range',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand in a long split stance facing a wall, one hand on it for balance; back heel lifted.',
    'Keep the torso upright and lower straight down a short way, front knee over the middle of the foot.',
    'Push through the front foot to come back up; do all reps, then switch legs.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, KNEE_RED_FLAGS],
  animation: {
    frames: [
      { pose: splitPose({ hip: SPLIT_TOP_HIP, lean: 6, arms: 'wall' }), move: 1.2, hold: 0.5, label: 'Up' },
      { pose: splitPose({ hip: SPLIT_SHORT_HIP, lean: 6, arms: 'wall' }), move: 2, hold: 0.3, label: 'Lower' },
    ],
    wall: wallInFront(SPLIT_WALL_SURFACE),
    viewBox: [18, 2, 106, 114],
  },
}

const splitSquatSlow: Exercise = {
  id: 'K8',
  name: 'Split squat with 3 s lowering, full range',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Long split stance, hands on hips, back heel lifted.',
    'Lower for a slow count of three until the back knee hovers just above the mat, or to your pain-free depth.',
    'Front knee stays in line with the toes; torso tall.',
    'Push through the front foot to come up; do all reps, then switch legs.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, KNEE_RED_FLAGS],
  animation: {
    frames: [
      { pose: splitPose({ hip: SPLIT_TOP_HIP, lean: 4, arms: 'hips' }), move: 1.3, hold: 0.5, label: 'Up' },
      { pose: splitPose({ hip: SPLIT_DEEP_HIP, lean: 6, arms: 'hips' }), move: 3, hold: 0.4, label: 'Lower 3 s' },
    ],
    viewBox: [18, 2, 106, 114],
  },
}

// Reverse lunge: the front (near) foot stays planted; the back (far) leg steps back and returns.
const LUNGE_FRONT: Vec = [78, ANKLE_FLOOR]
const LUNGE_BACK_TOE: Vec = [LUNGE_FRONT[0] - 47, GROUND_Y - 5]
const LUNGE_STAND_HIP: Vec = [LUNGE_FRONT[0] - 1, ANKLE_FLOOR - (BODY.thigh + BODY.shin - 0.2)]

function lungeStand(): Pose {
  const leg = { pin: LUNGE_FRONT, bend: 1 as const }
  const arms = handsOnHips(LUNGE_STAND_HIP, 180)
  return {
    hip: LUNGE_STAND_HIP,
    torso: 180,
    head: 180,
    armNear: arms,
    armFar: arms,
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

function lungeSwing(hip: Vec, lean: number, thigh: number, shin: number, foot: number): Pose {
  const torso = 180 - lean
  const arms = handsOnHips(hip, torso)
  return {
    hip,
    torso,
    head: torso,
    armNear: arms,
    armFar: arms,
    legNear: { pin: LUNGE_FRONT, bend: 1 },
    legFar: { a: [thigh, shin] },
    footNear: 90,
    footFar: foot,
  }
}

const lungePose = (hip: Vec, lean: number) => splitPose({ hip, lean, arms: 'hips', front: LUNGE_FRONT, backToe: LUNGE_BACK_TOE })

const reverseLunge: Exercise = {
  id: 'K7',
  name: 'Reverse lunge',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand tall with hands on hips.',
    'Step one foot well back onto the ball of the foot and lower until both knees are bent, or to your pain-free depth.',
    'Front knee stays over the middle of the foot, torso tall.',
    'Push through the front heel to bring the back foot forward and stand up; do all reps, then switch legs.',
  ],
  cautions: [
    KNEE_DEPTH,
    'Stepping back is commonly considered easier on the knee than stepping forward; this is not well tested.',
    KNEE_RED_FLAGS,
  ],
  animation: {
    frames: [
      { pose: lungeStand(), move: 0.8, hold: 0.5, label: 'Stand' },
      { pose: lungeSwing(add(LUNGE_STAND_HIP, [-10, 3]), 4, 332, 292, 30), move: 0.8, label: 'Step back' },
      { pose: lungePose(splitHip(LUNGE_FRONT[0] - 23, 20, LUNGE_FRONT), 4), move: 0.5, label: 'Step back' },
      { pose: lungePose(splitHip(LUNGE_FRONT[0] - 21, 95, LUNGE_FRONT), 6), move: 2, hold: 0.4, label: 'Lower' },
      { pose: lungeSwing(add(LUNGE_STAND_HIP, [-7, 3]), 4, 354, 300, 25), move: 1.2, label: 'Drive up' },
    ],
    viewBox: [18, 2, 106, 114],
  },
}

// ---------------------------------------------------------------- F1–F3 calf raises

const CALF_TOE: Vec = [70, ANKLE_FLOOR]
const CALF_WALL_SURFACE = CALF_TOE[0] + 21
const CALF_HAND_Y = 38

/** `heel`: 0 = heels down, 1 = full rise onto the balls of the feet. */
function calfPose(heel: number, single: boolean): Pose {
  const foot = 90 - 50 * heel
  const ankle = add(CALF_TOE, dir(foot), -BODY.foot)
  const hip = add(ankle, dir(177), BODY.thigh + BODY.shin - 0.05)
  const stance = { pin: ankle, bend: 1 as const }
  const hand = { pin: [CALF_WALL_SURFACE - 2, CALF_HAND_Y] as Vec, bend: -1 as const }
  return {
    hip,
    torso: 178,
    head: 180,
    armNear: hand,
    armFar: hand,
    legNear: stance,
    legFar: single ? { a: [8, 290] } : stance,
    footNear: foot,
    footFar: single ? 20 : foot,
  }
}

const CALF_VIEW = [32, 2, 76, 114] as const

const calfRaise: Exercise = {
  id: 'F1',
  name: 'Double-leg calf raise',
  group: 'legs',
  cls: 'endurance',
  muscles: ['Gastrocnemius', 'Soleus'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand facing a wall, feet hip-width apart, fingertips on the wall for balance.',
    'Rise as high as you can onto the balls of the feet, knees straight but not locked.',
    'Lower the heels slowly to the floor.',
  ],
  animation: {
    frames: [
      { pose: calfPose(0, false), move: 1.6, hold: 0.4, label: 'Lower' },
      { pose: calfPose(1, false), move: 1, hold: 0.6, label: 'Rise' },
    ],
    wall: wallInFront(CALF_WALL_SURFACE),
    viewBox: CALF_VIEW,
  },
}

const singleCalfRaise: Exercise = {
  id: 'F2',
  name: 'Single-leg calf raise',
  group: 'legs',
  cls: 'endurance',
  muscles: ['Gastrocnemius', 'Soleus'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand on one foot facing a wall, fingertips on the wall, other foot lifted behind.',
    'Rise as high as you can onto the ball of the foot without leaning on the wall.',
    'Lower the heel slowly; do all reps, then switch legs.',
  ],
  animation: {
    frames: [
      { pose: calfPose(0, true), move: 1.6, hold: 0.4, label: 'Lower' },
      { pose: calfPose(1, true), move: 1, hold: 0.6, label: 'Rise' },
    ],
    wall: wallInFront(CALF_WALL_SURFACE),
    viewBox: CALF_VIEW,
  },
}

const slowCalfRaise: Exercise = {
  id: 'F3',
  name: 'Single-leg calf raise, 3 s lowering, 1 s top pause',
  group: 'legs',
  cls: 'endurance',
  muscles: ['Gastrocnemius', 'Soleus'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand on one foot facing a wall, fingertips on the wall, other foot lifted behind.',
    'Rise as high as you can onto the ball of the foot and pause for one second.',
    'Lower the heel for a slow count of three; do all reps, then switch legs.',
  ],
  animation: {
    frames: [
      { pose: calfPose(0, true), move: 3, hold: 0.3, label: 'Lower 3 s' },
      { pose: calfPose(1, true), move: 1, hold: 1, label: 'Pause' },
    ],
    wall: wallInFront(CALF_WALL_SURFACE),
    viewBox: CALF_VIEW,
  },
}

export const LEGS: Exercise[] = [
  straightLegRaise,
  wallSit,
  deepWallSit,
  partialSquat,
  fullSquat,
  tempoSquat,
  staticSplitSquat,
  reverseLunge,
  splitSquatSlow,
  calfRaise,
  singleCalfRaise,
  slowCalfRaise,
]
