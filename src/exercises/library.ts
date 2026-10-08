import { add, angleTo, BODY, dir, GROUND_Y, type Pose, type Vec } from '../animation/skeleton'
import type { Exercise } from './types'

// Height of the body's centre line when a body part rests on the mat.
const FLOOR = GROUND_Y - 4
const HAND_FLOOR = GROUND_Y - 2

// ---------------------------------------------------------------- H1 glute bridge

function bridgePose(lift: number): Pose {
  const shoulder: Vec = [45, FLOOR]
  // The hip rotates about the shoulders, which stay on the mat.
  const towardHip = 90 + lift
  const hip = add(shoulder, dir(towardHip), BODY.torso)
  const leg = { pin: [103, GROUND_Y - 6] as Vec, bend: 1 as const }
  const arm = { pin: [75, HAND_FLOOR] as Vec, bend: 1 as const }
  return {
    hip,
    torso: towardHip + 180,
    head: 262,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

const gluteBridge: Exercise = {
  id: 'H1',
  ladder: 'H',
  step: 1,
  name: 'Glute bridge',
  muscles: ['Gluteus maximus', 'Hamstrings'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  cues: [
    'Lie on your back, knees bent, feet flat and hip-width apart.',
    'Squeeze your glutes and push through your heels to lift your hips.',
    'Stop when shoulders, hips and knees form a straight line; do not arch the lower back.',
    'Lower slowly.',
  ],
  animation: {
    frames: [
      { pose: bridgePose(0), move: 1.5, hold: 0.6, label: 'Lower' },
      { pose: bridgePose(30), move: 1.2, hold: 1.2, label: 'Squeeze' },
    ],
    viewBox: [20, 50, 110, 66],
  },
}

// ---------------------------------------------------------------- P3 knee push-up

function kneePushUpPose(elevation: number, hand: Vec): Pose {
  const knee: Vec = [62, FLOOR]
  const line = 90 + elevation // direction from knee to shoulders
  const hip = add(knee, dir(line), BODY.thigh)
  const arm = { pin: hand, bend: -1 as const }
  const leg = { a: [line + 180, 268] as const }
  return {
    hip,
    torso: line,
    head: line - 4,
    armNear: arm,
    armFar: arm,
    legNear: leg,
    legFar: leg,
    footNear: 275,
    footFar: 275,
  }
}

const PUSH_HAND: Vec = [111, HAND_FLOOR]

const kneePushUp: Exercise = {
  id: 'P3',
  ladder: 'P',
  step: 3,
  name: 'Knee push-up',
  muscles: ['Chest', 'Triceps', 'Front deltoid'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'medium',
  cues: [
    'Kneel on a folded mat, hands under the shoulders, body straight from knees to head.',
    'Lower the chest towards the floor with elbows about 30–45° from the body.',
    'Push back up without letting the hips sag.',
  ],
  cautions: [
    'Wrists: use fists or a raised surface if flat palms hurt.',
    'Stop the set at shoulder pain of 4/10 or more.',
  ],
  animation: {
    frames: [
      { pose: kneePushUpPose(31, PUSH_HAND), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: kneePushUpPose(9, PUSH_HAND), move: 2, hold: 0.3, label: 'Lower' },
    ],
    viewBox: [22, 52, 122, 64],
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
  ladder: 'E',
  step: 2,
  name: 'Bird-dog',
  muscles: ['Spinal extensors', 'Gluteals', 'Deep core'],
  measure: 'reps',
  target: [8, 12],
  kneeLoad: 'medium',
  wristLoad: 'medium',
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

// ---------------------------------------------------------------- K1 shallow wall sit

const WALL_X = 38
const WALL_ANKLE: Vec = [WALL_X + 3 + 17.7, GROUND_Y - 6]

function wallSitPose(hipY: number): Pose {
  const leg = { pin: WALL_ANKLE, bend: 1 as const }
  const arm = { a: [28, 75] as const }
  return {
    hip: [WALL_X + 4, hipY],
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
const wallSitHipY = (kneeFlexion: number) => WALL_ANKLE[1] - BODY.shin - BODY.thigh * Math.cos((kneeFlexion * Math.PI) / 180)
// Highest hip position against the wall: legs almost straight, feet still forward.
const WALL_STAND_Y = (() => {
  const dx = WALL_ANKLE[0] - (WALL_X + 4)
  return WALL_ANKLE[1] - Math.sqrt((BODY.thigh + BODY.shin - 1) ** 2 - dx ** 2)
})()

const wallSit: Exercise = {
  id: 'K1',
  ladder: 'K',
  step: 1,
  name: 'Wall sit (shallow)',
  muscles: ['Quadriceps'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'low',
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

export const EXERCISES: Exercise[] = [kneePushUp, gluteBridge, birdDog, wallSit]

export const exerciseById = (id: string) => EXERCISES.find((e) => e.id === id)
