// Pulse moves from the Y ladders (Y1–Y4), the wall slide from the `yflow` pool
// (Y24) and wrist circles (M11) — docs/EVIDENCE.md, "Y. Dynamic jump-free
// moves (Y ladders)" and the M pool.
//
// Every move keeps one foot on the floor. Y4 and Y24 take the arms overhead,
// within a pain-free range. Y1–Y3 and Y24 are drawn from the side. Y4 is lateral and drawn from
// the front, as in squat-variants.ts: the near (dark) leg and arm are on the
// right of the screen, the far (faded) ones on the left, both starting at the
// single hip and shoulder points.
import { add, angleTo, BODY, dir, dist, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR } from './helpers'
import type { Exercise } from './types'

const RAD = Math.PI / 180
const LEG = BODY.thigh + BODY.shin

/** Hip height above an ankle `dx` away sideways when that leg is `slack` short of straight. */
const hipYOver = (dx: number, slack = 0.6) => ANKLE_FLOOR - Math.sqrt((LEG - slack) ** 2 - dx ** 2)

/**
 * Free limb whose end reaches `target` from `base` (two-bone IK, as in
 * skeleton.ts). Used for a foot in the air, so it moves by its joint angles
 * rather than sliding between two floor points.
 */
function reach(base: Vec, target: Vec, bend: 1 | -1, l1: number = BODY.thigh, l2: number = BODY.shin): Limb {
  const d = Math.min(dist(base, target), l1 + l2 - 1e-6)
  const phi = angleTo(base, target)
  const alpha = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)) / RAD
  const upper = phi + bend * alpha
  const mid = add(base, dir(upper), l1)
  return { a: [upper, angleTo(mid, target)] }
}

const shoulderOf = (hip: Vec, torso: number) => add(hip, dir(torso), BODY.torso)

// ---------------------------------------------------------------- side view: standing

const STAND_X = 58
const STAND_ANKLE: Vec = [STAND_X, ANKLE_FLOOR]
/** Standing with soft knees. */
const STAND_HIP: Vec = [STAND_X, hipYOver(0)]
const standingLeg: Limb = { pin: STAND_ANKLE, bend: 1 }
const STAND_VIEW = [16, 4, 92, 112] as const

/** Loose guard: elbows bent, fists in front of the chest. */
const GUARD: Limb = { a: [18, 150] }
/** Boxing guard: fists in front of the chin. */
const FIST_UP: Limb = { a: [12, 162] }
/** Straight punch forward at chest height, elbow not locked. */
const PUNCH: Limb = { a: [80, 86] }

// ---------------------------------------------------------------- Y1 standing cross-body knee to elbow

const KNEE_LEAN = 20 // slight forward lean as the elbow comes down; no deep crunch
const KNEE_THIGH = 115 // knee a little above hip height

function kneeToElbowPose(up: 'near' | 'far' | 'none'): Pose {
  if (up === 'none') {
    return {
      hip: STAND_HIP,
      torso: 180,
      head: 180,
      armNear: GUARD,
      armFar: GUARD,
      legNear: standingLeg,
      legFar: standingLeg,
      footNear: 90,
      footFar: 90,
    }
  }
  const torso = 180 - KNEE_LEAN
  const shoulder = shoulderOf(STAND_HIP, torso)
  const knee = add(STAND_HIP, dir(KNEE_THIGH), BODY.thigh)
  const towardKnee = angleTo(shoulder, knee)
  // The opposite elbow drives down and across to the lifted knee.
  const elbow: Limb = { a: [towardKnee, towardKnee + 130] }
  // The same-side arm draws back by the waist as the trunk turns.
  const back: Limb = { a: [335, 25] }
  const lifted: Limb = { a: [KNEE_THIGH, 8] }
  return {
    hip: STAND_HIP,
    torso,
    head: torso + 6,
    spine: 1.2,
    armNear: up === 'near' ? back : elbow,
    armFar: up === 'near' ? elbow : back,
    legNear: up === 'near' ? lifted : standingLeg,
    legFar: up === 'far' ? lifted : standingLeg,
    footNear: up === 'near' ? 100 : 90,
    footFar: up === 'far' ? 100 : 90,
  }
}

const kneeToElbow: Exercise = {
  id: 'Y1',
  name: 'Standing cross-body knee to elbow',
  group: 'core',
  cls: 'flow',
  muscles: ['Obliques', 'Hip flexors', 'Rectus abdominis'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  components: ['pulse', 'strength'],
  cues: [
    'Stand tall, feet hip-width apart, hands loosely in front of the chest.',
    'Lift one knee and bring the opposite elbow down and across towards it.',
    'Return to standing and repeat on the other side, at a steady, controlled pace.',
  ],
  cautions: ['Keep the trunk tall. Do not crunch deeply.'],
  animation: {
    frames: [
      { pose: kneeToElbowPose('near'), move: 0.7, hold: 0.2, label: 'Knee to elbow' },
      { pose: kneeToElbowPose('none'), move: 0.6, label: 'Stand' },
      { pose: kneeToElbowPose('far'), move: 0.7, hold: 0.2, label: 'Other side' },
      { pose: kneeToElbowPose('none'), move: 0.6, label: 'Stand' },
    ],
    viewBox: STAND_VIEW,
  },
}

// ---------------------------------------------------------------- Y2 shadow boxing march

const MARCH_KNEE: Limb = { a: [68, 2] } // a marching knee lift, below hip height

/** `up`: which knee is lifted; the opposite arm punches. 'none' = both feet down, both fists up. */
function boxingMarchPose(up: 'near' | 'far' | 'none'): Pose {
  return {
    hip: STAND_HIP,
    torso: 180,
    head: 180,
    armNear: up === 'far' ? PUNCH : FIST_UP,
    armFar: up === 'near' ? PUNCH : FIST_UP,
    legNear: up === 'near' ? MARCH_KNEE : standingLeg,
    legFar: up === 'far' ? MARCH_KNEE : standingLeg,
    footNear: up === 'near' ? 98 : 90,
    footFar: up === 'far' ? 98 : 90,
  }
}

/** For the moves that take the arms overhead (Y4, Y24). */
const OVERHEAD_RANGE =
  "Shoulder: raise the arms only as far as is pain-free; keep them at shoulder height if the shoulder pinches."
const SHOULDER_STOP = 'Stop at shoulder pain 3/10.'

const PUNCH_CAUTIONS = [
  'Punches forward only, at or below shoulder height.',
  'Do not lock the elbows.',
  'Stop if shoulder pain goes above 2/10.',
]

const boxingMarch: Exercise = {
  id: 'Y2',
  name: 'Shadow boxing march',
  group: 'cardio',
  cls: 'flow',
  muscles: ['Shoulders', 'Serratus anterior', 'Obliques', 'Calves'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  components: ['pulse'],
  cues: [
    'Fists up in front of the chin; march on the spot.',
    'With each step, punch the opposite fist straight forward at chest height.',
    'Pull the fist back to the chin as the foot lands; keep a brisk rhythm.',
  ],
  cautions: PUNCH_CAUTIONS,
  animation: {
    frames: [
      { pose: boxingMarchPose('near'), move: 0.4, hold: 0.1, label: 'Punch' },
      { pose: boxingMarchPose('none'), move: 0.3, label: 'Punch' },
      { pose: boxingMarchPose('far'), move: 0.4, hold: 0.1, label: 'Punch' },
      { pose: boxingMarchPose('none'), move: 0.3, label: 'Punch' },
    ],
    viewBox: STAND_VIEW,
  },
}

// ---------------------------------------------------------------- Y3 shadow boxing with step-out

const STEP_X = 48
const STEP_BACK: Vec = [STEP_X, ANKLE_FLOOR]
const STEP_FRONT: Vec = [STEP_X + 18, ANKLE_FLOOR] // a short staggered stance
const STEP_STAND_HIP: Vec = [STEP_X, hipYOver(0)]
/** Weight slightly forward between the feet, knees a little bent. */
const STEP_OUT_HIP: Vec = [STEP_X + 10, ANKLE_FLOOR - Math.sqrt((LEG - 2.2) ** 2 - 10 ** 2)]
const STEP_MID_HIP: Vec = [STEP_X + 4, hipYOver(4, 1)]
const STEP_AIR: Vec = [STEP_X + 9, ANKLE_FLOOR - 5]

type StepPhase = 'stand' | 'air' | 'out'

/** `side`: the leg that steps forward; the opposite arm punches. */
function stepOutPose(side: 'near' | 'far', phase: StepPhase): Pose {
  const hip = phase === 'stand' ? STEP_STAND_HIP : phase === 'air' ? STEP_MID_HIP : STEP_OUT_HIP
  const stepping: Limb =
    phase === 'stand' ? { pin: STEP_BACK, bend: 1 } : phase === 'air' ? reach(hip, STEP_AIR, 1) : { pin: STEP_FRONT, bend: 1 }
  const planted: Limb = { pin: STEP_BACK, bend: 1 }
  const punching = phase === 'out' ? PUNCH : FIST_UP
  const torso = phase === 'out' ? 177 : 180
  return {
    hip,
    torso,
    head: torso,
    armNear: side === 'far' ? punching : FIST_UP,
    armFar: side === 'near' ? punching : FIST_UP,
    legNear: side === 'near' ? stepping : planted,
    legFar: side === 'far' ? stepping : planted,
    footNear: side === 'near' && phase === 'air' ? 98 : 90,
    footFar: side === 'far' && phase === 'air' ? 98 : 90,
  }
}

const boxingStepOut: Exercise = {
  id: 'Y3',
  name: 'Shadow boxing with step-out',
  group: 'cardio',
  cls: 'flow',
  muscles: ['Shoulders', 'Serratus anterior', 'Obliques', 'Calves', 'Quadriceps', 'Gluteals'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee', 'shoulder'],
  components: ['pulse'],
  cues: [
    'Fists up in front of the chin, feet hip-width apart.',
    'Step one foot forward (or out to the side) into a short staggered stance and punch the opposite fist straight forward.',
    'Step back to the start and repeat with the other foot; keep moving.',
  ],
  cautions: ['Short steps; knee over the toes.', ...PUNCH_CAUTIONS],
  animation: {
    frames: [
      { pose: stepOutPose('near', 'air'), move: 0.3, label: 'Step' },
      { pose: stepOutPose('near', 'out'), move: 0.3, hold: 0.15, label: 'Punch' },
      { pose: stepOutPose('near', 'air'), move: 0.3, label: 'Step back' },
      { pose: stepOutPose('near', 'stand'), move: 0.25, hold: 0.05, label: 'Step back' },
      { pose: stepOutPose('far', 'air'), move: 0.3, label: 'Step' },
      { pose: stepOutPose('far', 'out'), move: 0.3, hold: 0.15, label: 'Punch' },
      { pose: stepOutPose('far', 'air'), move: 0.3, label: 'Step back' },
      { pose: stepOutPose('far', 'stand'), move: 0.25, hold: 0.05, label: 'Step back' },
    ],
    viewBox: [16, 4, 100, 112],
  },
}

// ---------------------------------------------------------------- Y4 step-jack (front view)

const CX = 70
const FEET_HALF = 5 // feet hip-width apart
const JACK_STEP = 18 // the stepping foot lands this far out
const JACK_LIFT = 3.5 // foot height in the air

const ARMS_DOWN = { near: { a: [10, 6] } as Limb, far: { a: [350, 354] } as Limb }
/** Passing shoulder height on the way up or down, elbows soft. */
const ARMS_HALF = { near: { a: [92, 96] } as Limb, far: { a: [268, 264] } as Limb }
/** Overhead in a wide V, as in a jumping jack, elbows soft. */
const ARMS_UP = { near: { a: [158, 166] } as Limb, far: { a: [202, 194] } as Limb }

type JackPhase = 'in' | 'lift' | 'out'

/** `side`: the leg that steps out; 'right' is the near leg on screen. */
function stepJackPose(side: 'right' | 'left', phase: JackPhase): Pose {
  const s = side === 'right' ? 1 : -1
  const fixed: Vec = [CX - s * FEET_HALF, ANKLE_FLOOR]
  const home: Vec = [CX + s * FEET_HALF, ANKLE_FLOOR]
  const out: Vec = [CX + s * (FEET_HALF + JACK_STEP), ANKLE_FLOOR]
  const halfOut = (FEET_HALF * 2 + JACK_STEP) / 2
  const hip: Vec =
    phase === 'in'
      ? [CX, hipYOver(FEET_HALF)]
      : phase === 'out'
        ? [CX + s * (halfOut - FEET_HALF), hipYOver(halfOut)]
        : [CX + s * 3, hipYOver(FEET_HALF + 2, 1)]
  const bend: 1 | -1 = side === 'right' ? 1 : -1
  const stepping: Limb =
    phase === 'in'
      ? { pin: home, bend }
      : phase === 'out'
        ? { pin: out, bend }
        : reach(hip, [CX + s * (FEET_HALF + JACK_STEP / 2), ANKLE_FLOOR - JACK_LIFT], bend)
  const planted: Limb = { pin: fixed, bend: (-bend) as 1 | -1 }
  const arms = phase === 'in' ? ARMS_DOWN : phase === 'out' ? ARMS_UP : ARMS_HALF
  return {
    hip,
    torso: 180,
    head: 180,
    armNear: arms.near,
    armFar: arms.far,
    legNear: side === 'right' ? stepping : planted,
    legFar: side === 'left' ? stepping : planted,
    footNear: 90,
    footFar: 270,
  }
}

const stepJack: Exercise = {
  id: 'Y4',
  name: 'Step-jack',
  group: 'cardio',
  cls: 'flow',
  muscles: ['Hip abductors', 'Calves', 'Deltoids'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  components: ['pulse'],
  cues: [
    'Stand tall, feet together or hip-width apart, arms by your sides.',
    'Step one foot out to the side as both arms sweep out to the sides and up overhead.',
    'Step back in as the arms sweep down, then step out to the other side.',
  ],
  cautions: [
    OVERHEAD_RANGE,
    SHOULDER_STOP,
    'Soft knees.',
    'Never hop: one foot always stays on the floor.',
  ],
  animation: {
    frames: [
      { pose: stepJackPose('right', 'lift'), move: 0.22, label: 'Step out' },
      { pose: stepJackPose('right', 'out'), move: 0.22, hold: 0.1, label: 'Step out' },
      { pose: stepJackPose('right', 'lift'), move: 0.22, label: 'Step in' },
      { pose: stepJackPose('right', 'in'), move: 0.22, label: 'Step in' },
      { pose: stepJackPose('left', 'lift'), move: 0.22, label: 'Step out' },
      { pose: stepJackPose('left', 'out'), move: 0.22, hold: 0.1, label: 'Step out' },
      { pose: stepJackPose('left', 'lift'), move: 0.22, label: 'Step in' },
      { pose: stepJackPose('left', 'in'), move: 0.22, label: 'Step in' },
    ],
    viewBox: [CX - 54, -8, 108, 124],
  },
}

// ---------------------------------------------------------------- Y24 wall slide

/** Wall surface; the person faces the wall, which is on the right. */
const WALL_SURFACE = 100
/** Line of the forearms resting flat on the wall. */
const FOREARM_X = WALL_SURFACE - 1.9
const SLIDE_ANKLE: Vec = [80, ANKLE_FLOOR]
const SLIDE_LOW = 50 // upper arm angle at the bottom: elbows below the chest
const SLIDE_MID = 90 // elbows passing shoulder height
const SLIDE_HIGH = 140 // arms near full elevation, elbows a little straighter

/**
 * Forearms vertical on the wall; `upper` is the upper-arm angle and `lean` the
 * trunk's lean towards the wall. The shoulders sit where the elbows touch the
 * wall, and the hips follow, so the elbows stay on the wall as they rise and fall.
 */
function wallSlidePose(upper: number, lean: number, spine = 0): Pose {
  const shoulderX = FOREARM_X - BODY.upperArm * Math.sin(upper * RAD)
  const hipX = shoulderX - BODY.torso * Math.sin(lean * RAD)
  const hip: Vec = [hipX, hipYOver(hipX - SLIDE_ANKLE[0])]
  const torso = 180 - lean
  const arm: Limb = { a: [upper, 180] }
  const leg: Limb = { pin: SLIDE_ANKLE, bend: 1 }
  return {
    hip,
    torso,
    head: torso,
    spine,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

const SLIDE_BOTTOM = wallSlidePose(SLIDE_LOW, 8)
const SLIDE_PASS = wallSlidePose(SLIDE_MID, 3)
const SLIDE_TOP = wallSlidePose(SLIDE_HIGH, 6)

const wallSlide: Exercise = {
  id: 'Y24',
  name: 'Wall slide',
  group: 'back',
  cls: 'flow',
  muscles: ['Serratus anterior', 'Lower trapezius'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  components: ['mobility', 'strength'],
  cues: [
    'Stand facing a wall, forearms on it, elbows below chest height.',
    'Slide the forearms up the wall towards overhead, letting the elbows straighten a little as the arms rise.',
    'At the top, add a small "plus": push the forearms into the wall so the shoulder blades move forward and up.',
    'Slide back down slowly and repeat.',
  ],
  cautions: [OVERHEAD_RANGE, SHOULDER_STOP],
  animation: {
    frames: [
      { pose: SLIDE_BOTTOM, move: 1, hold: 0.3, label: 'Slide down' },
      { pose: SLIDE_PASS, move: 0.8, label: 'Slide up' },
      { pose: SLIDE_TOP, move: 0.9, hold: 0.2, label: 'Slide up' },
      { pose: wallSlidePose(SLIDE_HIGH, 6, 2), move: 0.6, hold: 0.8, label: 'Plus' },
      { pose: SLIDE_PASS, move: 1, label: 'Slide down' },
    ],
    wall: { x: WALL_SURFACE + 6 },
    viewBox: [40, -8, 76, 124],
  },
}

// ---------------------------------------------------------------- M11 wrist circles

/**
 * Elbows bent by the sides, forearms forward. The figure has no separate hand,
 * so the end of the forearm (the hand) tilts down for flexion and up for extension.
 */
function wristPose(forearm: number): Pose {
  const arm: Limb = { a: [8, forearm] }
  return {
    hip: STAND_HIP,
    torso: 180,
    head: 180,
    armNear: arm,
    armFar: arm,
    legNear: standingLeg,
    legFar: standingLeg,
    footNear: 90,
    footFar: 90,
  }
}

const wristCircles: Exercise = {
  id: 'M11',
  name: 'Wrist circles',
  group: 'mobility',
  cls: 'drill',
  muscles: ['Wrist flexors', 'Wrist extensors', 'Forearm rotators'],
  measure: 'seconds',
  target: [30, 40],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['wrist'],
  cues: [
    'Stand tall, elbows bent by your sides, forearms forward.',
    'Bend the hands slowly down and up at the wrists.',
    'Then turn the palms up and down, and draw slow circles with the hands in both directions.',
  ],
  cautions: ['Gentle, pain-free range only.'],
  animation: {
    frames: [
      { pose: wristPose(62), move: 0.9, hold: 0.3, label: 'Flex' },
      { pose: wristPose(118), move: 0.9, hold: 0.3, label: 'Extend' },
    ],
    viewBox: STAND_VIEW,
  },
}

export const Y_PULSE: Exercise[] = [kneeToElbow, boxingMarch, boxingStepOut, stepJack, wallSlide, wristCircles]
