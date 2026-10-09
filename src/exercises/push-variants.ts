// Horizontal push variations (P3n, P3w, P5n, P5w, P5s) and advanced steps
// (P10, P9k, P9) — docs/EVIDENCE.md, "Exercise variations and advanced steps".
//
// Hand width cannot be seen from the side, so the side-view variations show
// what does change in that plane: narrow hands sit a little further back under
// the chest so the elbows travel back along the ribs; wide hands stop higher
// (chest at fist height). The archer push-ups are drawn from above, where the
// wide hands, the shift towards one hand and the straight far arm are visible.
import { add, BODY, dir, dist, GROUND_Y, type Lift, type Pose, type Vec } from '../animation/skeleton'
import { FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- geometry helpers (as in push.ts)

/** Hand-to-shoulder distance that reads as a straight (not locked) arm. */
const STRAIGHT_ARM = BODY.upperArm + BODY.forearm - 0.1
/** Height of the toe tip when the toes are tucked under on the mat. */
const TOE_Y = GROUND_Y - 2.5
const LEG = BODY.thigh + BODY.shin

/** Root of a monotonic function on [lo, hi] by bisection. */
function bisect(f: (x: number) => number, lo: number, hi: number): number {
  const sLo = Math.sign(f(lo))
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (Math.sign(f(mid)) === sLo) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

const shoulderOf = (p: Pose): Vec => add(p.hip, dir(p.torso), BODY.torso)

// ---------------------------------------------------------------- knee push-up (P3n, P3w)

const KNEE: Vec = [62, FLOOR]

/** Body straight from the knees to the head; shins on the mat, feet resting. */
function kneePushUpPose(elevation: number, hand: Vec): Pose {
  const line = 90 + elevation // direction from knee to shoulders
  const hip = add(KNEE, dir(line), BODY.thigh)
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

const KNEE_PUSH_HAND: Vec = [111, HAND_FLOOR]
/** Narrow hands sit under the chest, a little behind the standard position. */
const KNEE_NARROW_HAND: Vec = [KNEE_PUSH_HAND[0] - 3, HAND_FLOOR]

const kneeShoulder = (e: number) => shoulderOf(kneePushUpPose(e, KNEE_PUSH_HAND))
const kneeTop = (hand: Vec) => bisect((e) => dist(kneeShoulder(e), hand) - STRAIGHT_ARM, 10, 45)
/** Chest a few centimetres above the mat (as P3). */
const KNEE_BOTTOM = bisect((e) => kneeShoulder(e)[1] - 97.5, 0, 30)
/** Wide hands: stop with the chest at about fist height. */
const KNEE_WIDE_BOTTOM = bisect((e) => kneeShoulder(e)[1] - 92.5, 0, 30)

const KNEE_VIEWBOX = [22, 52, 122, 64] as const

// ---------------------------------------------------------------- push-up from the toes (P5n, P5w, P5s, P10)

const TOE: Vec = [28, TOE_Y]

/**
 * Straight body from the toes (tucked under) to the head, pivoting about the
 * toes. `elevation` is the angle of the body line above the horizontal.
 */
function toePushUpPose(elevation: number, handNear: Vec, handFar: Vec = handNear): Pose {
  const line = 90 + elevation
  const ankle = add(TOE, dir(elevation), -BODY.foot)
  const hip = add(ankle, dir(line), LEG)
  const leg = { a: [line + 180, line + 180] as const }
  return {
    hip,
    torso: line,
    head: line - 4,
    armNear: { pin: handNear, bend: -1 },
    armFar: { pin: handFar, bend: -1 },
    legNear: leg,
    legFar: leg,
    footNear: elevation,
    footFar: elevation,
  }
}

const toeShoulder = (elevation: number) => shoulderOf(toePushUpPose(elevation, [0, 0]))
// Hands just behind the shoulders at the top (as P5).
const PUSH_HAND: Vec = [toeShoulder(17)[0] + 1.5, HAND_FLOOR]
const NARROW_HAND: Vec = [PUSH_HAND[0] - 3, HAND_FLOOR]
/** Highest elevation at which every hand is reached with a straight arm. */
const toeTop = (...hands: Vec[]) =>
  bisect((e) => Math.max(...hands.map((h) => dist(toeShoulder(e), h))) - STRAIGHT_ARM, 5, 30)
const TOE_BOTTOM = bisect((e) => toeShoulder(e)[1] - 97.5, -2, 20)
const TOE_WIDE_BOTTOM = bisect((e) => toeShoulder(e)[1] - 92.5, -2, 20)

// Staggered hands: the near hand about a hand-length ahead of the far hand.
const STAGGER_FRONT: Vec = [PUSH_HAND[0] + 2, HAND_FLOOR]
const STAGGER_BACK: Vec = [PUSH_HAND[0] - 7, HAND_FLOOR]

const PUSH_VIEWBOX = [16, 52, 128, 64] as const

// ---------------------------------------------------------------- top view (P10, P9k, P9)
// The camera looks down at the mat, head to the right; the near side is the
// lower half of the picture. Shadows show how high each part is off the mat.
// From above, the arms are drawn in the floor plane, so a supporting arm
// that is near vertical shows as a bent arm with the elbow pointing back.

const TOP_PIVOT: Vec = [22, 60]
const LEG_SPREAD = 4
const cosd = (deg: number) => Math.cos(deg * (Math.PI / 180))

/**
 * Body line rotated `shift` degrees towards the near side about the toes, or
 * about the knees when kneeling.
 */
function topBody(knees: boolean, shift: number) {
  const line = 90 - shift
  const hip = knees
    ? add(add(TOP_PIVOT, [BODY.shin, 0]), dir(line), BODY.thigh * cosd(LEG_SPREAD))
    : add(TOP_PIVOT, dir(line), LEG * cosd(LEG_SPREAD))
  return { line, hip, shoulder: add(hip, dir(line), BODY.torso) }
}

/** Near and far hands, `width` from the body line and slightly behind the shoulder. */
const topHands = (knees: boolean, width: number): [Vec, Vec] => {
  const s = topBody(knees, 0).shoulder
  return [
    [s[0] - 3, s[1] + width],
    [s[0] - 3, s[1] - width],
  ]
}

type TopLegs = { near?: readonly [number, number]; far?: readonly [number, number] }

function topPushUpPose(o: { knees: boolean; shift: number; width: number; lift: Lift; legs?: TopLegs }): Pose {
  const { line, hip } = topBody(o.knees, o.shift)
  const [handNear, handFar] = topHands(o.knees, o.width)
  const thighNear = line + 180 + LEG_SPREAD
  const thighFar = line + 180 - LEG_SPREAD
  // From the knees the shins stay where they rest on the mat.
  const near = o.legs?.near ?? [thighNear, o.knees ? 270 + LEG_SPREAD : thighNear]
  const far = o.legs?.far ?? [thighFar, o.knees ? 270 - LEG_SPREAD : thighFar]
  return {
    hip,
    torso: line,
    head: line,
    // Elbows point back towards the hips.
    armNear: { pin: handNear, bend: -1 },
    armFar: { pin: handFar, bend: 1 },
    legNear: { a: near },
    legFar: { a: far },
    footNear: near[1] + 2,
    footFar: far[1] - 2,
    lift: o.lift,
  }
}

const TOP_VIEWBOX = [8, 24, 136, 72] as const

// ---------------------------------------------------------------- P10 Spiderman push-up

const SPIDER_WIDTH = 15
const PUSH_TOP_LIFT: Lift = { chest: 1, arms: 0.6, legs: 0.6 }
const PUSH_BOTTOM_LIFT: Lift = { chest: 0.3, arms: 0.3, legs: 0.4 }
/** Knee out to the side and forwards towards the elbow; shin pointing back, foot off the mat. */
const KNEE_TO_ELBOW = [42, 280] as const
const mirrorLeg = (l: readonly [number, number]) => [180 - l[0], 180 - l[1]] as const

const spiderPose = (lift: Lift, legs?: TopLegs) => topPushUpPose({ knees: false, shift: 0, width: SPIDER_WIDTH, lift, legs })

// ---------------------------------------------------------------- P9k, P9 archer push-up
// The hands are wide; the body rotates a few degrees about the knees or toes
// so the shoulders move towards the near hand, whose elbow bends, while the
// far arm straightens.

const ARCHER_WIDTH = 25

/** Shift at which the far arm is straight. */
const archerShift = (knees: boolean) =>
  bisect((s) => dist(topBody(knees, s).shoulder, topHands(knees, ARCHER_WIDTH)[1]) - STRAIGHT_ARM, 0, 20)

const archerPose = (knees: boolean, shift: number, lift: Lift) =>
  topPushUpPose({ knees, shift, width: ARCHER_WIDTH, lift })

// ---------------------------------------------------------------- exercises

const SHOULDER_STOP = 'Stop the set at shoulder pain of 4/10 or more.'
const WRIST_FISTS = 'Wrists: use fists or a raised surface if flat palms hurt.'
const KNEE_MAT = 'Knees: kneel on a folded mat.'
const NARROW_ELBOW =
  'Higher elbow load than the standard hand position. Skip it if wrist or elbow pain was above 2/10 in the last 2 weeks.'
const WIDE_SHOULDER =
  'Shoulder: skip it while shoulder pain is above 2/10 at the bottom of the standard push-up. Stop the descent with the chest at fist height.'

const kneeNarrow: Exercise = {
  id: 'P3n',
  name: 'Knee push-up, narrow hands',
  group: 'push',
  cls: 'strength',
  muscles: ['Triceps', 'Chest', 'Front deltoid'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist', 'knee'],
  cues: [
    'Kneel on a folded mat with the hands just inside shoulder width, under the chest; the hands do not touch.',
    'Lower the chest towards the floor, keeping the elbows close to the ribs and pointing back.',
    'Push back up with the body straight from knees to head.',
  ],
  cautions: [NARROW_ELBOW, WRIST_FISTS, SHOULDER_STOP],
  variationOf: 'P3',
  difficulty: 'harder',
  animation: {
    frames: [
      { pose: kneePushUpPose(kneeTop(KNEE_NARROW_HAND), KNEE_NARROW_HAND), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: kneePushUpPose(KNEE_BOTTOM, KNEE_NARROW_HAND), move: 2, hold: 0.3, label: 'Lower, elbows in' },
    ],
    viewBox: KNEE_VIEWBOX,
  },
}

const kneeWide: Exercise = {
  id: 'P3w',
  name: 'Knee push-up, wide hands',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Front deltoid', 'Triceps'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'medium',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist', 'knee'],
  cues: [
    'Kneel on a folded mat with the hands wider than the shoulders, at most about 1.5 times shoulder width.',
    'Lower the chest until it is at about the height of a fist above the floor.',
    'Push back up with the body straight from knees to head.',
  ],
  cautions: [WIDE_SHOULDER, WRIST_FISTS, SHOULDER_STOP],
  variationOf: 'P3',
  difficulty: 'easier',
  animation: {
    frames: [
      { pose: kneePushUpPose(kneeTop(KNEE_PUSH_HAND), KNEE_PUSH_HAND), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: kneePushUpPose(KNEE_WIDE_BOTTOM, KNEE_PUSH_HAND), move: 2, hold: 0.3, label: 'Hands wide, lower' },
    ],
    viewBox: KNEE_VIEWBOX,
  },
}

const fullNarrow: Exercise = {
  id: 'P5n',
  name: 'Full push-up, narrow hands',
  group: 'push',
  cls: 'strength',
  muscles: ['Triceps', 'Chest', 'Front deltoid', 'Core'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Hands just inside shoulder width, under the chest, body straight from heels to head; the hands do not touch.',
    'Lower the chest towards the floor, keeping the elbows close to the ribs and pointing back.',
    'Push back up to straight arms without letting the hips sag or pike.',
  ],
  cautions: [NARROW_ELBOW, WRIST_FISTS, SHOULDER_STOP],
  variationOf: 'P5',
  difficulty: 'harder',
  animation: {
    frames: [
      { pose: toePushUpPose(toeTop(NARROW_HAND), NARROW_HAND), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: toePushUpPose(TOE_BOTTOM, NARROW_HAND), move: 2, hold: 0.3, label: 'Lower, elbows in' },
    ],
    viewBox: PUSH_VIEWBOX,
  },
}

const fullWide: Exercise = {
  id: 'P5w',
  name: 'Full push-up, wide hands',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Front deltoid', 'Triceps', 'Core'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Hands wider than the shoulders, at most about 1.5 times shoulder width, body straight from heels to head.',
    'Lower the chest until it is at about the height of a fist above the floor.',
    'Push back up to straight arms without letting the hips sag or pike.',
  ],
  cautions: [WIDE_SHOULDER, WRIST_FISTS, SHOULDER_STOP],
  variationOf: 'P5',
  difficulty: 'easier',
  animation: {
    frames: [
      { pose: toePushUpPose(toeTop(PUSH_HAND), PUSH_HAND), move: 1.2, hold: 0.5, label: 'Push' },
      { pose: toePushUpPose(TOE_WIDE_BOTTOM, PUSH_HAND), move: 2, hold: 0.3, label: 'Hands wide, lower' },
    ],
    viewBox: PUSH_VIEWBOX,
  },
}

const staggered: Exercise = {
  id: 'P5s',
  name: 'Staggered-hand push-up',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid', 'Core'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Full push-up position with one hand about a hand-length ahead of the other, body straight from heels to head.',
    'Lower the chest towards the floor without letting the hips twist; the rear arm takes more of the load.',
    'Push back up to straight arms. Swap the forward hand each set.',
  ],
  cautions: ['Shoulder: skip it while shoulder pain is above 2/10.', WRIST_FISTS, SHOULDER_STOP],
  variationOf: 'P5',
  difficulty: 'harder',
  animation: {
    frames: [
      {
        pose: toePushUpPose(toeTop(STAGGER_FRONT, STAGGER_BACK), STAGGER_FRONT, STAGGER_BACK),
        move: 1.2,
        hold: 0.5,
        label: 'Push',
      },
      { pose: toePushUpPose(TOE_BOTTOM, STAGGER_FRONT, STAGGER_BACK), move: 2, hold: 0.3, label: 'Near hand ahead, lower' },
    ],
    viewBox: PUSH_VIEWBOX,
  },
}

const spiderman: Exercise = {
  id: 'P10',
  name: 'Spiderman push-up',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid', 'Obliques', 'Hip flexors'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Start at the top of a full push-up, body straight from heels to head.',
    'As you lower, lift one foot and bring that knee out to the side towards the elbow on the same side.',
    'Push back up and return the foot to the floor.',
    'Alternate sides; count every rep.',
  ],
  cautions: [
    'Keep the hips level and the lower back still; shorten the knee drive if the back is uncomfortable.',
    WRIST_FISTS,
    SHOULDER_STOP,
  ],
  animation: {
    frames: [
      { pose: spiderPose(PUSH_TOP_LIFT), move: 1.3, hold: 0.4, label: 'Push' },
      { pose: spiderPose(PUSH_BOTTOM_LIFT, { near: KNEE_TO_ELBOW }), move: 2, hold: 0.3, label: 'Lower, knee to elbow' },
      { pose: spiderPose(PUSH_TOP_LIFT), move: 1.3, hold: 0.4, label: 'Push' },
      { pose: spiderPose(PUSH_BOTTOM_LIFT, { far: mirrorLeg(KNEE_TO_ELBOW) }), move: 2, hold: 0.3, label: 'Other side' },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}

const ARCHER_CUES_END = [
  'Lower the chest towards one hand, bending that elbow, while the other arm straightens out to the side.',
  'Push back to the centre. Do all reps on one side, then switch sides.',
]

const archerKnees: Exercise = {
  id: 'P9k',
  name: 'Archer push-up from the knees',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'high',
  regions: ['shoulder', 'wrist', 'knee'],
  cues: [
    'Kneel on a folded mat with the hands about twice shoulder width apart, body straight from knees to head.',
    ...ARCHER_CUES_END,
  ],
  cautions: [
    'Shoulder: high load near end range on the working side. Lower only as far as is pain-free.',
    'Wrist: the straight arm loads the wrist at an angle; use fists if flat palms hurt.',
    KNEE_MAT,
    SHOULDER_STOP,
  ],
  animation: {
    frames: [
      { pose: archerPose(true, 0, { chest: 0.9, arms: 0.6, legs: 0.15 }), move: 1.3, hold: 0.5, label: 'Push to centre' },
      {
        pose: archerPose(true, archerShift(true), { chest: 0.3, arms: 0.3, legs: 0.1 }),
        move: 2.5,
        hold: 0.3,
        label: 'Shift, lower to near hand',
      },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}

const archer: Exercise = {
  id: 'P9',
  name: 'Archer push-up',
  group: 'push',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Front deltoid', 'Core'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'high',
  regions: ['shoulder', 'wrist'],
  cues: [
    'Full push-up position on the toes with the hands about twice shoulder width apart, body straight from heels to head.',
    ...ARCHER_CUES_END,
  ],
  cautions: [
    'Shoulder: high load at end range. A physiotherapist assessment is advised before starting this step.',
    'Wrist: high load on the straight arm; use fists if flat palms hurt.',
    SHOULDER_STOP,
  ],
  animation: {
    frames: [
      { pose: archerPose(false, 0, { chest: 1, arms: 0.6, legs: 0.6 }), move: 1.3, hold: 0.5, label: 'Push to centre' },
      {
        pose: archerPose(false, archerShift(false), { chest: 0.3, arms: 0.3, legs: 0.4 }),
        move: 2.5,
        hold: 0.3,
        label: 'Shift, lower to near hand',
      },
    ],
    view: 'top',
    viewBox: TOP_VIEWBOX,
  },
}

export const PUSH_VARIANTS: Exercise[] = [
  kneeNarrow,
  kneeWide,
  fullNarrow,
  fullWide,
  staggered,
  spiderman,
  archerKnees,
  archer,
]
