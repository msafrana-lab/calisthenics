// Calf variations and advanced step (F1b, F2b, F1t, F4) and shoulder-ladder
// variations (S0f, S2e) — docs/EVIDENCE.md, "Exercise variations and advanced steps".
import { add, BODY, dir, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- shared calf geometry (as legs.ts)

const CALF_TOE: Vec = [70, ANKLE_FLOOR]
const CALF_WALL_SURFACE = CALF_TOE[0] + 21
const CALF_HAND_Y = 38
const CALF_VIEW = [32, 2, 76, 114] as const

/** A wall whose surface faces the figure from the front (copied from legs.ts). */
const wallInFront = (surface: number) => ({ x: surface + 6 })

/** Ankle position with the ball of the foot fixed; `heel`: 0 = heel down, 1 = full rise. */
function calfAnkle(heel: number): { ankle: Vec; foot: number } {
  const foot = 90 - 50 * heel
  return { ankle: add(CALF_TOE, dir(foot), -BODY.foot), foot }
}

/** Straight-knee calf raise (copy of `calfPose` in legs.ts), with an optional arm override. */
function calfPose(heel: number, single: boolean, arms?: { near: Limb; far: Limb }): Pose {
  const { ankle, foot } = calfAnkle(heel)
  const hip = add(ankle, dir(177), BODY.thigh + BODY.shin - 0.05)
  const stance = { pin: ankle, bend: 1 as const }
  const hand = { pin: [CALF_WALL_SURFACE - 2, CALF_HAND_Y] as Vec, bend: -1 as const }
  return {
    hip,
    torso: 178,
    head: 180,
    armNear: arms?.near ?? hand,
    armFar: arms?.far ?? hand,
    legNear: stance,
    legFar: single ? { a: [8, 290] } : stance,
    footNear: foot,
    footFar: single ? 20 : foot,
  }
}

// Bent-knee raise: about 38° of knee flexion, held while the heels rise.
// The shin leans forward 22° and the thigh back 16°; the trunk leans forward a little.
const BENT_SHIN = 180 - 22
const BENT_THIGH = 180 + 16
const BENT_TORSO = 168
const BENT_HAND_Y = 42

function bentCalfPose(heel: number, single: boolean): Pose {
  const { ankle, foot } = calfAnkle(heel)
  const knee = add(ankle, dir(BENT_SHIN), BODY.shin)
  const hip = add(knee, dir(BENT_THIGH), BODY.thigh)
  const stance = { pin: ankle, bend: 1 as const }
  const hand = { pin: [CALF_WALL_SURFACE - 2, BENT_HAND_Y] as Vec, bend: -1 as const }
  return {
    hip,
    torso: BENT_TORSO,
    head: BENT_TORSO + 6,
    armNear: hand,
    armFar: hand,
    legNear: stance,
    legFar: single ? { a: [22, 300] } : stance,
    footNear: foot,
    footFar: single ? 30 : foot,
  }
}

const BENT_KNEE_CAUTIONS = [
  'Knees: skip this version if standing with bent knees hurts, and use the straight-knee version instead.',
  'The shift towards the soleus is small; the main change is the knee position.',
]

// ---------------------------------------------------------------- F1b bent-knee calf raise

const bentCalfRaise: Exercise = {
  id: 'F1b',
  name: 'Bent-knee calf raise',
  group: 'legs',
  cls: 'endurance',
  muscles: ['Soleus', 'Gastrocnemius'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand facing a wall, feet hip-width apart, fingertips on the wall for balance.',
    'Bend the knees about 30–45° and keep that bend throughout.',
    'Rise as high as you can onto the balls of the feet, then lower the heels slowly.',
  ],
  cautions: BENT_KNEE_CAUTIONS,
  animation: {
    frames: [
      { pose: bentCalfPose(0, false), move: 1.6, hold: 0.4, label: 'Lower' },
      { pose: bentCalfPose(1, false), move: 1, hold: 0.6, label: 'Rise' },
    ],
    wall: wallInFront(CALF_WALL_SURFACE),
    viewBox: CALF_VIEW,
  },
  variationOf: 'F1',
  difficulty: 'similar',
}

// ---------------------------------------------------------------- F2b single-leg bent-knee calf raise

const singleBentCalfRaise: Exercise = {
  id: 'F2b',
  name: 'Single-leg bent-knee calf raise',
  group: 'legs',
  cls: 'endurance',
  muscles: ['Soleus', 'Gastrocnemius'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand on one foot facing a wall, fingertips on the wall, other foot lifted behind.',
    'Bend the standing knee about 30–45° and keep that bend throughout.',
    'Rise as high as you can onto the ball of the foot, then lower slowly; do all reps, then switch legs.',
  ],
  cautions: BENT_KNEE_CAUTIONS,
  animation: {
    frames: [
      { pose: bentCalfPose(0, true), move: 1.6, hold: 0.4, label: 'Lower' },
      { pose: bentCalfPose(1, true), move: 1, hold: 0.6, label: 'Rise' },
    ],
    wall: wallInFront(CALF_WALL_SURFACE),
    viewBox: CALF_VIEW,
  },
  variationOf: 'F2',
  difficulty: 'similar',
}

// ---------------------------------------------------------------- F1t toes out / toes in
// Foot rotation is not visible from the side: the movement is the F1 raise and
// the labels name the foot position (one set each way).

const toesCalfRaise: Exercise = {
  id: 'F1t',
  name: 'Calf raise, toes out or toes in',
  group: 'legs',
  cls: 'endurance',
  muscles: ['Gastrocnemius', 'Soleus'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand facing a wall, fingertips on the wall; turn the toes out about 30° for this set, and in about 30° for the next.',
    'Keep the knees pointing the same way as the toes.',
    'Rise as high as you can onto the balls of the feet, then lower the heels slowly.',
  ],
  cautions: ['Knees: keep them over the toes in both foot positions; do not let them cave in or bow out.'],
  animation: {
    frames: [
      { pose: calfPose(0, false), move: 1.6, hold: 0.6, label: 'Toes out' },
      { pose: calfPose(1, false), move: 1, hold: 0.6, label: 'Toes out' },
      { pose: calfPose(0, false), move: 1.6, hold: 0.6, label: 'Toes in' },
      { pose: calfPose(1, false), move: 1, hold: 0.6, label: 'Toes in' },
    ],
    wall: wallInFront(CALF_WALL_SURFACE),
    viewBox: CALF_VIEW,
  },
  variationOf: 'F1',
  difficulty: 'similar',
}

// ---------------------------------------------------------------- F4 single-leg calf raise, no hands

const BALANCE_ARMS = { near: { a: [24, 40] } as Limb, far: { a: [16, 30] } as Limb }

const freeCalfRaise: Exercise = {
  id: 'F4',
  name: 'Single-leg calf raise without hand support',
  group: 'legs',
  cls: 'endurance',
  muscles: ['Gastrocnemius', 'Soleus', 'Ankle stabilisers'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand on one foot within reach of a wall but not touching it; arms a little out from the body for balance.',
    'Rise as high as you can onto the ball of the foot without the ankle rolling outwards.',
    'Lower the heel slowly; do all reps, then switch legs.',
  ],
  cautions: ['Balance: if you lose balance, touch the wall briefly and carry on.'],
  animation: {
    frames: [
      { pose: calfPose(0, true, BALANCE_ARMS), move: 1.6, hold: 0.4, label: 'Lower' },
      { pose: calfPose(1, true, BALANCE_ARMS), move: 1, hold: 0.6, label: 'Rise' },
    ],
    viewBox: CALF_VIEW,
  },
}

// ---------------------------------------------------------------- S0f side-lying forward flexion
// Forward flexion in side-lying moves the arm in a plane parallel to the floor,
// which a front or side camera sees edge-on. It is therefore shown from above:
// the figure lies on its side in profile, head to the right, front facing down
// the screen. The near arm is the top arm; the far arm is the bottom arm, under
// the head. Arm angle 270 = along the trunk to the hip, 0 = straight out in
// front of the chest (90° of flexion, shoulder height).

const SL_TOP_HIP: Vec = [62, 54]
const SL_LEG: Limb = { a: [296, 262] }

function sideLyingFlexionPose(flexion: number): Pose {
  const arm = 270 + flexion
  return {
    hip: SL_TOP_HIP,
    torso: 90,
    head: 92,
    armNear: { a: [arm, arm] },
    // Bottom arm reaching past the head on the mat, head resting on it.
    armFar: { a: [84, 90] },
    legNear: SL_LEG,
    legFar: SL_LEG,
    lift: { arms: 0.6, legs: 0.3, chest: 0.3 },
  }
}

const sideLyingFlexion: Exercise = {
  id: 'S0f',
  name: 'Side-lying forward flexion',
  group: 'back',
  cls: 'cuff',
  muscles: ['Lower trapezius', 'Middle trapezius', 'Front deltoid'],
  measure: 'reps',
  target: [12, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie on your side, head on your lower arm or a pillow, knees slightly bent.',
    'Top arm straight, resting along your side with the hand on the thigh.',
    'Keeping the elbow straight, raise the arm forwards until it points straight out in front of the chest (shoulder height), no further; hold 2 s.',
    'Lower slowly to the thigh; do not roll the body backwards.',
  ],
  cautions: [
    'Shoulder: stop at shoulder height (90°). Overhead work is excluded, so this limit is permanent.',
    'Stop the set at shoulder pain of 4/10 or more.',
  ],
  animation: {
    frames: [
      { pose: sideLyingFlexionPose(5), move: 2, hold: 0.5, label: 'Lower' },
      { pose: sideLyingFlexionPose(90), move: 1.5, hold: 2, label: 'Raise' },
    ],
    view: 'top',
    viewBox: [6, 24, 132, 76],
  },
  variationOf: 'S0',
  difficulty: 'similar',
}

// ---------------------------------------------------------------- S2e prone extension
// Side view, prone (copy of `pronePose` in back.ts). The arms lie by the sides
// and lift back towards the ceiling; the chest stays on the floor.

const PRONE_HIP: Vec = [60, FLOOR]
/** Head angle that keeps a flat-lying head above the floor, gaze down. */
const PRONE_HEAD = 104

function proneExtensionPose(arm: Limb): Pose {
  return {
    hip: PRONE_HIP,
    torso: 90,
    head: PRONE_HEAD,
    armNear: arm,
    armFar: arm,
    legNear: { a: [270, 270] },
    legFar: { a: [270, 270] },
    footNear: 282,
    footFar: 282,
  }
}

const ARM_SIDE_DOWN: Limb = { a: [272, 271] }
// About 20° of shoulder extension: the hands lift towards the ceiling.
const ARM_SIDE_LIFT: Limb = { a: [251, 251] }

const proneExtension: Exercise = {
  id: 'S2e',
  name: 'Prone extension',
  group: 'back',
  cls: 'endurance',
  muscles: ['Rear deltoid', 'Middle trapezius', 'Lower trapezius'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie face down, forehead on a folded towel, arms straight by the sides, palms facing in or thumbs turned out.',
    'Draw the shoulder blades back and down and lift the straight arms back towards the ceiling.',
    'Hold 2–3 s without shrugging or lifting the chest, then lower slowly.',
  ],
  cautions: ['Shoulder: lift only through the pain-free range; stop the set at pain of 4/10 or more.'],
  animation: {
    frames: [
      { pose: proneExtensionPose(ARM_SIDE_DOWN), move: 2, hold: 0.6, label: 'Lower' },
      { pose: proneExtensionPose(ARM_SIDE_LIFT), move: 1.2, hold: 2, label: 'Lift' },
    ],
    viewBox: [0, 50, 130, 66],
  },
  variationOf: 'S2',
  difficulty: 'similar',
}

export const SMALL_VARIANTS: Exercise[] = [
  bentCalfRaise,
  singleBentCalfRaise,
  toesCalfRaise,
  freeCalfRaise,
  sideLyingFlexion,
  proneExtension,
]
