// Prone/side-lying shoulder and scapular ladder (S) and spinal extension ladder (E)
// — docs/EVIDENCE.md, "Exercise candidates".
import { add, angleTo, BODY, type Limb, type Lift, type Pose, type Vec } from '../animation/skeleton'
import { FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- S0 side-lying external rotation
// "Lying on the side" convention: seen from the front, head to the right, the
// top (near) arm is the working arm. The upper arm lies along the top side of
// the trunk with the elbow at the waist; the forearm starts across the belly
// (in front of the trunk) and rotates up until it points at the ceiling.

const SL_HIP: Vec = [62, 105]
const SL_SHOULDER = add(SL_HIP, [BODY.torso, 0])
// Elbow resting on the top side of the trunk, at the waist.
const ER_ELBOW: Vec = [SL_SHOULDER[0] - 15.5, SL_HIP[1] - 4]
const ER_UPPER = angleTo(SL_SHOULDER, ER_ELBOW)

function sideLyingErPose(forearm: number): Pose {
  return {
    hip: SL_HIP,
    torso: 90,
    head: 100,
    armNear: { a: [ER_UPPER, forearm] },
    // Lower arm along the floor under the head.
    armFar: { a: [86, 88] },
    legNear: { a: [266, 266] },
    legFar: { a: [271, 271] },
    footNear: 266,
    footFar: 271,
  }
}

const sideLyingEr: Exercise = {
  id: 'S0',
  name: 'Side-lying external rotation',
  group: 'back',
  cls: 'cuff',
  muscles: ['Infraspinatus', 'Teres minor'],
  measure: 'reps',
  target: [12, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your side, head on a pillow or your lower arm, knees slightly bent.',
    'Top elbow bent 90° and against your side (a rolled towel between elbow and ribs is optional); forearm across your belly.',
    'Keeping the elbow on your side, rotate the forearm up towards the ceiling; hold 2–3 s.',
    'Lower slowly; do not roll the body backwards.',
  ],
  cautions: ['Shoulder: rotate only through the pain-free range; stop the set at pain of 4/10 or more.'],
  animation: {
    frames: [
      { pose: sideLyingErPose(78), move: 2, hold: 0.5, label: 'Lower' },
      { pose: sideLyingErPose(176), move: 1.5, hold: 2.5, label: 'Rotate out' },
    ],
    viewBox: [0, 54, 132, 62],
  },
}

// ---------------------------------------------------------------- top view (S1–S6)
// The camera looks down at the mat; head to the right. Near limbs are drawn
// below the trunk on screen, far limbs above. Arm angles are mirrored:
// elevation e from the side of the body gives 270 + e (near) and 270 − e (far).

const TOP_HIP: Vec = [70, 60]
const TOP_VIEWBOX = [4, 22, 140, 76] as const

type ArmShape = { upper: number; lower: number } // near-side angles
const mirror = (a: number) => 180 - a

function topPose(arm: ArmShape, lift: Lift): Pose {
  return {
    hip: TOP_HIP,
    torso: 90,
    head: 90,
    armNear: { a: [arm.upper, arm.lower] },
    armFar: { a: [mirror(arm.upper), mirror(arm.lower)] },
    legNear: { a: [274, 274] },
    legFar: { a: [266, 266] },
    footNear: 276,
    footFar: 264,
    lift,
  }
}

/** Straight arm at a given elevation from the side of the body (0 = by the hip, 90 = T, 180 = overhead). */
const straight = (elevation: number): ArmShape => ({ upper: 270 + elevation, lower: 270 + elevation })
/** W: upper arm about 45° from the body, elbow bent 90°, forearm pointing forwards and out. */
const W_REST: ArmShape = { upper: 324, lower: 52 }
const W_SQUEEZE: ArmShape = { upper: 318, lower: 50 }

const DOWN: Lift = { arms: 0, chest: 0 }
const ARMS_UP: Lift = { arms: 1, chest: 0 }
const HOVER: Lift = { arms: 0.7, chest: 0.5 }

const proneW: Exercise = {
  id: 'S1',
  name: 'Prone W',
  group: 'back',
  cls: 'endurance',
  muscles: ['Middle trapezius', 'Lower trapezius', 'Rhomboids', 'External rotators'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie face down, forehead on a folded towel; elbows bent about 90° and out to the sides in a W.',
    'Squeeze the shoulder blades down and back and lift elbows and hands a few centimetres.',
    'Hold 2–3 s with the neck long, then lower slowly.',
  ],
  cautions: ['Shoulder: arms stay below 90° of elevation; stop the set at pain of 4/10 or more.'],
  animation: {
    frames: [
      { pose: topPose(W_REST, DOWN), move: 2, hold: 0.6, label: 'Lower' },
      { pose: topPose(W_SQUEEZE, ARMS_UP), move: 1.2, hold: 2, label: 'Squeeze' },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}

const proneT: Exercise = {
  id: 'S2',
  name: 'Prone T',
  group: 'back',
  cls: 'endurance',
  muscles: ['Middle trapezius', 'Rear deltoid', 'Rhomboids'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie face down, forehead on a folded towel; arms straight out to the sides, thumbs pointing up.',
    'Draw the shoulder blades together and lift the arms a few centimetres.',
    'Hold 2–3 s without shrugging, then lower slowly.',
  ],
  cautions: ['Shoulder: lower the arms slightly towards the hips if the T position is uncomfortable.'],
  animation: {
    frames: [
      { pose: topPose(straight(90), DOWN), move: 2, hold: 0.6, label: 'Lower' },
      { pose: topPose(straight(90), ARMS_UP), move: 1.2, hold: 2, label: 'Lift' },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}

const proneY: Exercise = {
  id: 'S3',
  name: 'Prone Y',
  group: 'back',
  cls: 'endurance',
  muscles: ['Lower trapezius', 'Middle trapezius'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie face down, forehead on a folded towel; arms overhead in a Y (about 120–135° from the body), thumbs up.',
    'Draw the shoulder blades down towards the back pockets and lift the arms a few centimetres.',
    'Hold 2–3 s without shrugging, then lower slowly.',
  ],
  cautions: [
    'Shoulder: above 90° of elevation. Add it once overhead positions are pain-free; narrow the Y or switch to the T if it hurts.',
  ],
  animation: {
    frames: [
      { pose: topPose(straight(130), DOWN), move: 2, hold: 0.6, label: 'Lower' },
      { pose: topPose(straight(130), ARMS_UP), move: 1.2, hold: 2, label: 'Lift' },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}


const wToY: Exercise = {
  id: 'S4',
  name: 'Prone W-to-Y floor pulldown',
  group: 'back',
  cls: 'endurance',
  muscles: ['Lower trapezius', 'Middle trapezius', 'Latissimus dorsi', 'Spinal extensors'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie face down with the arms overhead in a Y, thumbs up; lift the chest slightly, eyes on the floor.',
    'Pull the elbows down towards the ribs into a W, as if pulling yourself forwards; squeeze the shoulder blades.',
    'Slide back out to the Y slowly, keeping the chest lifted and the arms just off the floor.',
  ],
  cautions: ['Shoulder: use slow, controlled movement; shorten the Y if reaching overhead hurts.'],
  animation: {
    frames: [
      { pose: topPose(straight(130), HOVER), move: 2, hold: 0.5, label: 'Reach' },
      { pose: topPose(W_SQUEEZE, HOVER), move: 1.5, hold: 1.5, label: 'Pull down' },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}

const snowAngel: Exercise = {
  id: 'S5',
  name: 'Reverse snow angel',
  group: 'back',
  cls: 'endurance',
  muscles: ['Lower trapezius', 'Middle trapezius', 'Rear deltoid', 'Spinal extensors'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie face down, arms by the hips, palms down; lift the chest and arms slightly off the floor.',
    'Sweep the straight arms out to the sides and overhead, turning the thumbs up as they pass shoulder height.',
    'Sweep back to the hips; keep the arms hovering and the neck long throughout.',
  ],
  cautions: ['Shoulder: stop the sweep before any painful arc and return from there.'],
  animation: {
    frames: [
      { pose: topPose(straight(20), HOVER), move: 2.5, hold: 0.5, label: 'Sweep down' },
      { pose: topPose(straight(160), HOVER), move: 2.5, hold: 0.8, label: 'Sweep up' },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}

// Hands on the lower back, elbows bent and out to the sides of the waist.
const SWIM_BACK: ArmShape = { upper: 302, lower: 238 }

const swimmer: Exercise = {
  id: 'S6',
  name: 'Prone swimmer',
  group: 'back',
  cls: 'endurance',
  muscles: ['Lower trapezius', 'Middle trapezius', 'Rotator cuff', 'Spinal extensors'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie face down with the arms overhead in a Y, chest and arms slightly off the floor.',
    'Sweep the arms out and down towards the hips, then bend the elbows and bring the hands onto the lower back.',
    'Reverse the movement back to the Y; keep the arms hovering throughout.',
  ],
  cautions: [
    'Shoulder: reaching behind the back can provoke pain at the front of the shoulder; shorten the range if needed.',
    'Stop the overhead part before any painful arc.',
  ],
  animation: {
    frames: [
      { pose: topPose(straight(130), HOVER), move: 2, hold: 0.5, label: 'Reach' },
      { pose: topPose(straight(25), HOVER), move: 2, label: 'Sweep' },
      { pose: topPose(SWIM_BACK, HOVER), move: 1.2, hold: 1, label: 'Hands back' },
      { pose: topPose(straight(25), HOVER), move: 1.2, label: 'Release' },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}

// ---------------------------------------------------------------- prone side view (E1, E3, E4)

const PRONE_HIP: Vec = [60, FLOOR]
/** Head angle that keeps a flat-lying head above the floor, gaze down. */
const PRONE_HEAD = 104

type ProneOpts = {
  chest: number // degrees the trunk is lifted from the floor
  armNear: Limb
  armFar: Limb
  legNear?: number // leg angle (270 = on the floor)
  legFar?: number
}

function pronePose(o: ProneOpts): Pose {
  const legNear = o.legNear ?? 270
  const legFar = o.legFar ?? 270
  return {
    hip: PRONE_HIP,
    torso: 90 + o.chest,
    head: Math.max(PRONE_HEAD, 90 + o.chest + 2),
    spine: -o.chest / 6,
    armNear: o.armNear,
    armFar: o.armFar,
    legNear: { a: [legNear, legNear] },
    legFar: { a: [legFar, legFar] },
    footNear: legNear + 12,
    footFar: legFar + 12,
  }
}

// Arms by the sides, resting on the floor or lifted towards the feet.
const ARM_SIDE_DOWN: Limb = { a: [272, 271] }
const ARM_SIDE_UP: Limb = { a: [266, 268] }

const cobra: Exercise = {
  id: 'E1',
  name: 'Prone cobra',
  group: 'back',
  cls: 'endurance',
  muscles: ['Spinal extensors', 'Lower trapezius', 'Middle trapezius'],
  measure: 'reps',
  target: [10, 15],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie face down, arms by the sides, palms facing the body.',
    'Draw the shoulder blades back and down, turn the thumbs out and lift the chest and hands a few centimetres.',
    'Keep the eyes on the floor so the neck stays long; hold 2–3 s and lower slowly.',
  ],
  cautions: ['Lift only as high as is comfortable for the lower back; the arms by the sides avoid overhead loading.'],
  animation: {
    frames: [
      { pose: pronePose({ chest: 0, armNear: ARM_SIDE_DOWN, armFar: ARM_SIDE_DOWN }), move: 2, hold: 0.6, label: 'Lower' },
      { pose: pronePose({ chest: 10, armNear: ARM_SIDE_UP, armFar: ARM_SIDE_UP }), move: 1.3, hold: 2, label: 'Lift' },
    ],
    viewBox: [0, 50, 130, 66],
  },
}

// Arms overhead (Y), resting on the floor or lifted.
const ARM_OVER_DOWN: Limb = { a: [87, 86] }
const ARM_OVER_UP: Limb = { a: [102, 102] }
const LEG_UP = 262

const altSuperman: Exercise = {
  id: 'E3',
  name: 'Alternating Superman',
  group: 'back',
  cls: 'endurance',
  muscles: ['Spinal extensors', 'Gluteals', 'Lower trapezius'],
  measure: 'reps',
  target: [8, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie face down, arms overhead in a Y, forehead just off the floor.',
    'Lift one arm and the opposite leg a few centimetres, keeping both straight and the hips on the floor.',
    'Hold 2 s, lower slowly and switch sides.',
  ],
  cautions: ['Shoulder: use a W arm position if the overhead Y is painful.', 'Keep the lift small; do not crank the neck up.'],
  animation: {
    frames: [
      { pose: pronePose({ chest: 0, armNear: ARM_OVER_DOWN, armFar: ARM_OVER_DOWN }), move: 1.8, hold: 0.4, label: 'Lower' },
      { pose: pronePose({ chest: 3, armNear: ARM_OVER_UP, armFar: ARM_OVER_DOWN, legFar: LEG_UP }), move: 1.2, hold: 1.5, label: 'Lift' },
      { pose: pronePose({ chest: 0, armNear: ARM_OVER_DOWN, armFar: ARM_OVER_DOWN }), move: 1.8, hold: 0.4, label: 'Lower' },
      { pose: pronePose({ chest: 3, armNear: ARM_OVER_DOWN, armFar: ARM_OVER_UP, legNear: LEG_UP }), move: 1.2, hold: 1.5, label: 'Switch' },
    ],
    viewBox: [0, 50, 132, 66],
  },
}

const supermanHold: Exercise = {
  id: 'E4',
  name: 'Superman hold',
  group: 'back',
  cls: 'hold',
  muscles: ['Spinal extensors', 'Gluteals', 'Lower trapezius'],
  measure: 'seconds',
  target: [20, 30],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie face down, arms overhead in a Y, legs straight.',
    'Lift the arms, chest and legs a few centimetres at the same time; squeeze the glutes.',
    'Hold with the eyes on the floor and breathe steadily, then lower with control.',
  ],
  cautions: ['Shoulder: use a W arm position if the overhead Y is painful.', 'Lower back: keep the lift small and stop if it pinches.'],
  animation: {
    frames: [
      { pose: pronePose({ chest: 0, armNear: ARM_OVER_DOWN, armFar: ARM_OVER_DOWN }), move: 2, hold: 0.8, label: 'Lower' },
      { pose: pronePose({ chest: 9, armNear: ARM_OVER_UP, armFar: ARM_OVER_UP, legNear: LEG_UP, legFar: LEG_UP }), move: 1.5, hold: 4, label: 'Hold' },
    ],
    viewBox: [0, 50, 132, 66],
  },
}

// ---------------------------------------------------------------- E2 bird-dog

const DOG_HIP: Vec = [60, FLOOR - BODY.thigh]
const DOG_HAND: Vec = [90, HAND_FLOOR]
const DOG_TORSO = angleTo(DOG_HIP, add(DOG_HAND, [0, -(BODY.upperArm + BODY.forearm - 1.5)]))

function birdDogPose(extended: boolean): Pose {
  const kneeling = { a: [0, 270] as const }
  const handDown = { pin: DOG_HAND, bend: -1 as const }
  return {
    hip: DOG_HIP,
    torso: DOG_TORSO,
    head: DOG_TORSO - 10,
    armNear: extended ? { a: [98, 98] } : handDown,
    armFar: handDown,
    legNear: kneeling,
    legFar: extended ? { a: [272, 272] } : kneeling,
    footNear: 270,
    footFar: extended ? 355 : 270,
  }
}

const birdDog: Exercise = {
  id: 'E2',
  name: 'Bird-dog',
  group: 'back',
  cls: 'endurance',
  muscles: ['Spinal extensors', 'Gluteals', 'Deep core'],
  measure: 'reps',
  target: [8, 12],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'medium',
  regions: ['wrist', 'knee'],
  cues: [
    'On hands and knees: hands under shoulders, knees under hips, back flat.',
    'Reach one arm forward and the opposite leg back until both are level with the body.',
    'Keep the hips square; hold briefly, return with control and switch sides.',
  ],
  cautions: ['Wrists: go onto forearms or fists if needed.', 'Keep the arm at or below shoulder height if overhead hurts.'],
  animation: {
    frames: [
      { pose: birdDogPose(false), move: 1, hold: 0.4, label: 'Brace' },
      { pose: birdDogPose(true), move: 1.4, hold: 1.5, label: 'Reach' },
    ],
    viewBox: [3, 50, 140, 66],
  },
}

export const BACK: Exercise[] = [sideLyingEr, proneW, proneT, proneY, wToY, snowAngel, swimmer, cobra, birdDog, altSuperman, supermanHold]
