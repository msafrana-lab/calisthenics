// Variations of the split squats and reverse lunge (K6l, K8l, K7l, K7b) and the
// K9 skater squat — docs/EVIDENCE.md, "Exercise variations and advanced steps".
// Pose helpers are copied from legs.ts (not exported there).
import { add, angleTo, BODY, dir, GROUND_Y, solve, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR } from './helpers'
import type { Exercise } from './types'

const RAD = Math.PI / 180

// ---------------------------------------------------------------- shared text (as legs.ts)

const KNEE_DEPTH = 'Knees: use a depth where pain stays at 2/10 or below. At 4/10, stop the set and go shallower or switch to a wall sit.'
const KNEE_PROGRESS = 'Add depth about one hand-width at a time, and only after a full session at the current depth with pain at 2/10 or below that has settled by the next morning.'
const KNEE_RED_FLAGS = 'Stop and seek assessment if the knee swells, locks, gives way or the pain is sharp.'
const STEP_BACK_NOTE = 'Stepping back is commonly considered easier on the knee than stepping forward; this is not well tested.'

// ---------------------------------------------------------------- shared poses (copied from legs.ts)

/** Both arms on the hips (hands on the iliac crests, elbows back). */
function handsOnHips(hip: Vec, torso: number): Limb {
  return { pin: add(hip, dir(torso), 5), bend: -1 }
}

/** A wall whose surface faces the figure from the front (the wall drawing extends to the left of `x`). */
const wallInFront = (surface: number) => ({ x: surface + 6 })

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
    const phi = angleTo(hip, ankle)
    const alpha = Math.acos((BODY.thigh ** 2 + d * d - BODY.shin ** 2) / (2 * BODY.thigh * d)) / RAD
    const knee = add(hip, dir(phi + alpha), BODY.thigh)
    const err = Math.abs(((angleTo(knee, ankle) + 90 - foot + 540) % 360) - 180)
    if (err < best.err) best = { foot, err }
  }
  return { leg: { pin: add(toe, dir(best.foot), -BODY.foot), bend: 1 }, foot: best.foot }
}

/** Hip above `hipX`, placed so the front knee is bent by `flexion` degrees. */
function splitHip(hipX: number, flexion: number, front: Vec): Vec {
  const d2 = BODY.thigh ** 2 + BODY.shin ** 2 + 2 * BODY.thigh * BODY.shin * Math.cos(flexion * RAD)
  return [hipX, front[1] - Math.sqrt(d2 - (front[0] - hipX) ** 2)]
}

/** Draw the back (stepping) leg on the near side and the front leg on the far side. */
function swapLegs(p: Pose): Pose {
  return { ...p, legNear: p.legFar, legFar: p.legNear, footNear: p.footFar, footFar: p.footNear }
}

// ---------------------------------------------------------------- long-stance split squat (K6l, K8l)

// About 6 units (some 10 cm) longer than the K6/K8 stance (front ankle 84, back toes 37).
const LONG_FRONT: Vec = [88, ANKLE_FLOOR]
const LONG_BACK_TOE: Vec = [35, GROUND_Y - 5]
const LONG_LEAN = 24

type LongSplit = { hip: Vec; lean: number; arms: 'wall' | 'hips'; front: Vec; backToe: Vec }

// Fingertips on a wall in front: front toes a few centimetres from it.
const LONG_WALL_SURFACE = LONG_FRONT[0] + BODY.foot + 3.5

function longSplitPose({ hip, lean, arms, front, backToe }: LongSplit, wallHand?: Vec): Pose {
  const torso = 180 - lean
  const back = backLeg(hip, backToe)
  const onHips = handsOnHips(hip, torso)
  return {
    hip,
    torso,
    // Head in line with the inclined trunk, gaze a little ahead.
    head: torso + 6,
    armNear: arms === 'wall' && wallHand ? { pin: wallHand, bend: -1 } : onHips,
    armFar: arms === 'wall' ? { a: [8 - lean * 0.6, 14 - lean * 0.6] } : onHips,
    legNear: { pin: front, bend: 1 },
    legFar: back.leg,
    footNear: 90,
    footFar: back.foot,
  }
}

const LONG_TOP_HIP = splitHip(60, 28, LONG_FRONT)
const LONG_SHORT_HIP = splitHip(61, 55, LONG_FRONT)
const LONG_DEEP_HIP = splitHip(65, 95, LONG_FRONT)

const longShape = (hip: Vec, arms: 'wall' | 'hips', lean = LONG_LEAN): LongSplit => ({
  hip,
  lean,
  arms,
  front: LONG_FRONT,
  backToe: LONG_BACK_TOE,
})

// Fingertip height between the shoulder heights at the top and the bottom of K6l.
const LONG_WALL_HAND: Vec = (() => {
  const top = solve(longSplitPose(longShape(LONG_TOP_HIP, 'hips'))).shoulder
  const bottom = solve(longSplitPose(longShape(LONG_SHORT_HIP, 'hips'))).shoulder
  return [LONG_WALL_SURFACE - 2, (top[1] + bottom[1]) / 2 + 4]
})()

const longStaticSplitSquat: Exercise = {
  id: 'K6l',
  name: 'Long-stance static split squat with forward lean',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals', 'Hamstrings'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Take a longer split stance than usual facing a wall, back heel lifted; fingertips on the wall or hands on the front thigh.',
    'Lean the trunk slightly forward from the hips, back straight.',
    'Lower straight down a short way, front shin close to vertical and the knee over the middle of the foot.',
    'Push through the front heel to come back up; do all reps, then switch legs.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, KNEE_RED_FLAGS],
  variationOf: 'K6',
  difficulty: 'similar',
  animation: {
    frames: [
      { pose: longSplitPose(longShape(LONG_TOP_HIP, 'wall'), LONG_WALL_HAND), move: 1.2, hold: 0.5, label: 'Up' },
      { pose: longSplitPose(longShape(LONG_SHORT_HIP, 'wall'), LONG_WALL_HAND), move: 2, hold: 0.3, label: 'Lower' },
    ],
    wall: wallInFront(LONG_WALL_SURFACE),
    viewBox: [18, 2, 106, 114],
  },
}

const longSplitSquatSlow: Exercise = {
  id: 'K8l',
  name: 'Long-stance split squat with 3 s lowering and forward lean',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals', 'Hamstrings'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Take a longer split stance than usual, hands on hips, back heel lifted.',
    'Lean the trunk slightly forward from the hips, back straight.',
    'Lower for a slow count of three until the back knee hovers just above the mat, or to your pain-free depth; front knee in line with the toes.',
    'Push through the front heel to come up; do all reps, then switch legs.',
  ],
  cautions: [KNEE_DEPTH, KNEE_PROGRESS, KNEE_RED_FLAGS],
  variationOf: 'K8',
  difficulty: 'similar',
  animation: {
    frames: [
      { pose: longSplitPose(longShape(LONG_TOP_HIP, 'hips', LONG_LEAN - 2)), move: 1.3, hold: 0.5, label: 'Up' },
      { pose: longSplitPose(longShape(LONG_DEEP_HIP, 'hips')), move: 3, hold: 0.4, label: 'Lower 3 s' },
    ],
    viewBox: [18, 2, 106, 114],
  },
}

// ---------------------------------------------------------------- reverse lunge variations (K7l, K7b)

// Front (near) foot stays planted; the back (far) leg steps back and returns.
const LUNGE_FRONT: Vec = [84, ANKLE_FLOOR]
const LUNGE_STAND_HIP: Vec = [LUNGE_FRONT[0] - 1, ANKLE_FLOOR - (BODY.thigh + BODY.shin - 0.2)]
/** K7 steps back 47 units from the front ankle to the back toes; K7l a little further. */
const LONG_LUNGE_BACK_TOE: Vec = [LUNGE_FRONT[0] - 53, GROUND_Y - 5]
const LUNGE_BACK_TOE: Vec = [LUNGE_FRONT[0] - 47, GROUND_Y - 5]

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

/** Front foot planted, back leg free (stepping back, driving forward, or held up). */
function lungeSwing(hip: Vec, lean: number, thigh: number, shin: number, foot: number): Pose {
  const torso = 180 - lean
  const arms = handsOnHips(hip, torso)
  return {
    hip,
    torso,
    head: torso + Math.min(lean, 6),
    armNear: arms,
    armFar: arms,
    legNear: { pin: LUNGE_FRONT, bend: 1 },
    legFar: { a: [thigh, shin] },
    footNear: 90,
    footFar: foot,
  }
}

const lungePose = (hip: Vec, lean: number, backToe: Vec) =>
  longSplitPose({ hip, lean, arms: 'hips', front: LUNGE_FRONT, backToe })

const LEAN_LUNGE = 22

const leaningReverseLunge: Exercise = {
  id: 'K7l',
  name: 'Reverse lunge with forward trunk lean',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals', 'Hamstrings'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand tall with hands on hips.',
    'Take a long step back onto the ball of the foot and lean the trunk slightly forward from the hips, back straight.',
    'Lower until both knees are bent, or to your pain-free depth; front shin close to vertical.',
    'Push through the front heel to bring the back foot forward and stand up; do all reps, then switch legs.',
  ],
  cautions: [KNEE_DEPTH, STEP_BACK_NOTE, KNEE_RED_FLAGS],
  variationOf: 'K7',
  difficulty: 'similar',
  animation: {
    frames: [
      { pose: lungeStand(), move: 0.8, hold: 0.5, label: 'Stand' },
      { pose: lungeSwing(add(LUNGE_STAND_HIP, [-11, 3]), 10, 330, 290, 30), move: 0.8, label: 'Step back' },
      { pose: lungePose(splitHip(LUNGE_FRONT[0] - 27, 28, LUNGE_FRONT), LEAN_LUNGE - 4, LONG_LUNGE_BACK_TOE), move: 0.5, label: 'Step back' },
      { pose: lungePose(splitHip(LUNGE_FRONT[0] - 21, 96, LUNGE_FRONT), LEAN_LUNGE, LONG_LUNGE_BACK_TOE), move: 2, hold: 0.4, label: 'Lower' },
      { pose: lungeSwing(add(LUNGE_STAND_HIP, [-8, 3]), 10, 354, 300, 25), move: 1.2, label: 'Drive up' },
    ],
    viewBox: [18, 2, 106, 114],
  },
}

// Knee drive: standing on the front leg, back knee raised to hip height.
const kneeDrivePose = (): Pose => lungeSwing(add(LUNGE_STAND_HIP, [-1, 0.2]), 2, 90, 2, 90)

const reverseLungeKneeDrive: Exercise = {
  id: 'K7b',
  name: 'Reverse lunge to knee drive',
  group: 'legs',
  cls: 'strength',
  muscles: ['Quadriceps', 'Gluteals', 'Hip flexors'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand tall with hands on hips; fingertips on a wall are allowed for balance.',
    'Step one foot back and lower until both knees are bent, or to your pain-free depth.',
    'Push through the front foot and drive the back knee forward and up to hip height.',
    'Balance on the front leg for one second, then step back into the next rep; do all reps, then switch legs.',
  ],
  cautions: [
    KNEE_DEPTH,
    'Skip this version if knee pain was above 2/10 on the reverse lunge in the last 2 weeks.',
    KNEE_RED_FLAGS,
  ],
  variationOf: 'K7',
  difficulty: 'harder',
  animation: {
    // The stepping leg is drawn on the near side so the knee drive is easy to see.
    frames: [
      { pose: swapLegs(kneeDrivePose()), move: 1, hold: 1, label: 'Knee up' },
      { pose: swapLegs(lungeSwing(add(LUNGE_STAND_HIP, [-10, 3]), 4, 332, 292, 30)), move: 0.9, label: 'Step back' },
      { pose: swapLegs(lungePose(splitHip(LUNGE_FRONT[0] - 23, 20, LUNGE_FRONT), 4, LUNGE_BACK_TOE)), move: 0.5, label: 'Step back' },
      { pose: swapLegs(lungePose(splitHip(LUNGE_FRONT[0] - 21, 95, LUNGE_FRONT), 6, LUNGE_BACK_TOE)), move: 2, hold: 0.3, label: 'Lower' },
      { pose: swapLegs(lungeSwing(add(LUNGE_STAND_HIP, [-6, 3]), 4, 10, 310, 30)), move: 0.8, label: 'Drive up' },
    ],
    viewBox: [18, 2, 106, 114],
  },
}

// ---------------------------------------------------------------- K9 skater squat

const SKATER_ANKLE: Vec = [70, ANKLE_FLOOR]

type SkaterShape = {
  /** Stance-knee flexion in degrees. */
  knee: number
  /** Forward tilt of the stance shin from vertical. */
  shin: number
  /** Forward lean of the trunk from vertical. */
  lean: number
  /** Arm angle: small = hanging, about 85 = reaching forward at shoulder height. */
  arms: number
  /** Rear leg thigh and shin angles (free, behind the body). */
  rear: readonly [number, number]
  rearFoot: number
}

function skaterPose({ knee, shin, lean, arms, rear, rearFoot }: SkaterShape): Pose {
  const kneePoint = add(SKATER_ANKLE, dir(180 - shin), BODY.shin)
  const hip = add(kneePoint, dir(180 - shin + knee), BODY.thigh)
  const torso = 180 - lean
  const arm = { a: [arms, arms + 4] as const }
  return {
    hip,
    torso,
    head: torso + Math.min(lean, 12) * 0.5,
    armNear: arm,
    armFar: arm,
    legNear: { pin: SKATER_ANKLE, bend: 1 },
    legFar: { a: rear },
    footNear: 90,
    footFar: rearFoot,
  }
}

const SKATER_TOP: SkaterShape = { knee: 8, shin: 3, lean: 6, arms: 10, rear: [352, 290], rearFoot: 330 }
// The rear knee stops a few centimetres above the floor: the height of a mat folded 3–4 times.
const SKATER_BOTTOM: SkaterShape = { knee: 108, shin: 33, lean: 48, arms: 86, rear: [346, 262], rearFoot: 296 }

const skaterSquat: Exercise = {
  id: 'K9',
  name: 'Skater squat to a folded mat',
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
    'Fold the mat 3–4 times and place it just behind your standing foot; fingertips on a wall at first.',
    'Stand on one leg, the other knee bent with the foot behind you.',
    'Sit the hips back and lean the trunk forward with a straight back, arms reaching forward, until the rear knee touches the mat lightly.',
    'Push through the whole standing foot to come up; do all reps, then switch legs.',
  ],
  cautions: [
    KNEE_DEPTH,
    'To make it shallower, add height to the mat stack.',
    KNEE_RED_FLAGS,
  ],
  animation: {
    frames: [
      { pose: skaterPose(SKATER_TOP), move: 1.4, hold: 0.5, label: 'Stand' },
      { pose: skaterPose(SKATER_BOTTOM), move: 2.5, hold: 0.3, label: 'Lower' },
    ],
    viewBox: [18, 2, 106, 114],
  },
}

export const LUNGE_VARIANTS: Exercise[] = [
  longStaticSplitSquat,
  longSplitSquatSlow,
  leaningReverseLunge,
  reverseLungeKneeDrive,
  skaterSquat,
]
