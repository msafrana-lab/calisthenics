// Warm-up drills (W): raise and mobilise parts of the RAMP warm-up (R2) — docs/EVIDENCE.md, "Exercise candidates".
import { BODY, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR } from './helpers'
import type { Exercise } from './types'

const STAND_X = 58
const STAND_ANKLE: Vec = [STAND_X, ANKLE_FLOOR]
/** Hip height standing with the knees almost straight. */
const STAND_HIP: Vec = [STAND_X, ANKLE_FLOOR - (BODY.thigh + BODY.shin - 0.3)]
const standingLeg: Limb = { pin: STAND_ANKLE, bend: -1 }

// ---------------------------------------------------------------- W1 march on the spot

// Walking arm swing: elbow bent about 90°, upper arm forward or back.
const ARM_FORWARD: Limb = { a: [32, 122] }
const ARM_BACK: Limb = { a: [335, 65] }
const KNEE_UP: Limb = { a: [88, 2] } // thigh about level with the hip, shin hanging

const ARM_DOWN: Limb = { a: [2, 40] }

/** `up`: which knee is lifted; 'none' = both feet down between steps. */
function marchPose(up: 'near' | 'far' | 'none'): Pose {
  return {
    hip: STAND_HIP,
    torso: 180,
    head: 180,
    armNear: up === 'near' ? ARM_BACK : up === 'far' ? ARM_FORWARD : ARM_DOWN,
    armFar: up === 'near' ? ARM_FORWARD : up === 'far' ? ARM_BACK : ARM_DOWN,
    legNear: up === 'near' ? KNEE_UP : standingLeg,
    legFar: up === 'far' ? KNEE_UP : standingLeg,
    footNear: up === 'near' ? 95 : 90,
    footFar: up === 'far' ? 95 : 90,
  }
}

const march: Exercise = {
  id: 'W1',
  name: 'March on the spot',
  group: 'warmup',
  cls: 'drill',
  muscles: ['Hip flexors', 'Whole body (raise heart rate)'],
  measure: 'seconds',
  target: [60, 90],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand tall and march in place, lifting each knee towards hip height.',
    'Swing the opposite arm forward with a relaxed, bent elbow.',
    'Land softly; build the pace gradually until you are breathing a little harder.',
  ],
  cautions: ['Skip this part if you have just been cycling.'],
  animation: {
    frames: [
      { pose: marchPose('near'), move: 0.35, hold: 0.1, label: 'Lift' },
      { pose: marchPose('none'), move: 0.3, label: 'Lift' },
      { pose: marchPose('far'), move: 0.35, hold: 0.1, label: 'Switch' },
      { pose: marchPose('none'), move: 0.3, label: 'Switch' },
    ],
    viewBox: [16, 4, 92, 112],
  },
}

// ---------------------------------------------------------------- W2 arm swings below shoulder height

const SWING_FORWARD = 75 // shoulder flexion, kept below 90°
const SWING_BACK = 330 // about 30° of extension

function armSwingPose(nearForward: boolean): Pose {
  const forward: Limb = { a: [SWING_FORWARD, SWING_FORWARD + 12] }
  const back: Limb = { a: [SWING_BACK, SWING_BACK + 8] }
  return {
    hip: STAND_HIP,
    torso: 180,
    head: 180,
    armNear: nearForward ? forward : back,
    armFar: nearForward ? back : forward,
    legNear: standingLeg,
    legFar: standingLeg,
    footNear: 90,
    footFar: 90,
  }
}

const armSwings: Exercise = {
  id: 'W2',
  name: 'Arm swings below shoulder height',
  group: 'warmup',
  cls: 'drill',
  muscles: ['Shoulders', 'Upper back'],
  measure: 'reps',
  target: [10, 10],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Stand tall, knees soft, arms relaxed.',
    'Swing the arms alternately forward and back, like an exaggerated walk.',
    'Keep the forward swing below shoulder height and the movement easy and pain-free.',
  ],
  cautions: ['Shoulders: keep the swing below shoulder height; make it smaller if it pinches.'],
  animation: {
    frames: [
      { pose: armSwingPose(true), move: 0.9, hold: 0.1, label: 'Swing' },
      { pose: armSwingPose(false), move: 0.9, hold: 0.1, label: 'Swing' },
    ],
    viewBox: [16, 4, 92, 112],
  },
}

export const WARMUP: Exercise[] = [march, armSwings]
