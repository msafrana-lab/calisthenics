// Crawl and plank movement ladder (X) — docs/EVIDENCE.md, "Exercise variations
// and advanced steps", "New ladder X: crawl and plank movement", and R13.2.
import { add, angleTo, BODY, dir, dist, GROUND_Y, type FreeLimb, type Keyframe, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- geometry helpers

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

/** Middle joint of a two-segment limb from `base` to `end` (law of cosines). */
function middleJoint(base: Vec, end: Vec, l1: number, l2: number, bend: 1 | -1): Vec {
  const d = Math.min(dist(base, end), l1 + l2 - 1e-6)
  const alpha = Math.acos((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)) / (Math.PI / 180)
  return add(base, dir(angleTo(base, end) + bend * alpha), l1)
}

/** A free limb whose end sits at `end` (a hand or foot in the air), as joint angles. */
function freeTo(base: Vec, end: Vec, l1: number, l2: number, bend: 1 | -1): FreeLimb {
  const mid = middleJoint(base, end, l1, l2, bend)
  return { a: [angleTo(base, mid), angleTo(mid, end)] }
}

/** Leg pinned at the ankle, with the knee folding downwards. */
function legTo(hip: Vec, ankle: Vec): Limb {
  const low = (b: 1 | -1) => middleJoint(hip, ankle, BODY.thigh, BODY.shin, b)[1]
  return { pin: ankle, bend: low(1) > low(-1) ? 1 : -1 }
}

const shoulderOf = (p: Pose): Vec => add(p.hip, dir(p.torso), BODY.torso)

// ---------------------------------------------------------------- bear plank (X1–X3)
// Quadruped on hands and tucked toes: hands under the shoulders, knees under
// the hips and hovering a few centimetres above the mat, back flat.

/** Hand under the shoulder; the elbows stay soft so the hands can step. */
const BEAR_HAND: Vec = [92, HAND_FLOOR]
const BEAR_SHOULDER: Vec = [BEAR_HAND[0], HAND_FLOOR - 30.3]
/** Knee hover: about 3 units (roughly 5 cm) above the kneeling position. */
const HOVER = 3
/** Foot direction from ankle to tucked toes (toes on the mat, heel up). */
const BEAR_FOOT = 15

/** Hip on the torso circle around the shoulder at a given height. */
const hipAt = (shoulder: Vec, y: number): Vec => [shoulder[0] - Math.sqrt(BODY.torso ** 2 - (y - shoulder[1]) ** 2), y]

const BEAR_HIP = hipAt(BEAR_SHOULDER, FLOOR - HOVER - BODY.thigh)
const BEAR_KNEE: Vec = [BEAR_HIP[0], FLOOR - HOVER]
const BEAR_ANKLE_Y = TOE_Y - BODY.foot * Math.cos((BEAR_FOOT * Math.PI) / 180)
const BEAR_ANKLE: Vec = [BEAR_KNEE[0] - Math.sqrt(BODY.shin ** 2 - (BEAR_KNEE[1] - BEAR_ANKLE_Y) ** 2), BEAR_ANKLE_Y]
/** Kneeling start: the knees rest on the mat, the hands and toes do not move. */
const KNEEL_HIP = hipAt(BEAR_SHOULDER, FLOOR - BODY.thigh)


type Quad = {
  /** Body shift along the mat (crawling). */
  body?: number
  hip?: Vec
  /** Hands and ankles: a horizontal offset (pinned on the mat) or a free limb. */
  handNear?: number | Limb
  handFar?: number | Limb
  footNear?: number | Limb
  footFar?: number | Limb
}

function bearPose(q: Quad = {}): Pose {
  const b = q.body ?? 0
  const hip = add(q.hip ?? BEAR_HIP, [b, 0])
  const shoulder = add(BEAR_SHOULDER, [b, 0])
  const torso = angleTo(hip, shoulder)
  const arm = (h: number | Limb | undefined): Limb =>
    typeof h === 'object' ? h : { pin: add(BEAR_HAND, [h ?? 0, 0]), bend: -1 }
  const leg = (f: number | Limb | undefined): Limb => (typeof f === 'object' ? f : legTo(hip, add(BEAR_ANKLE, [f ?? 0, 0])))
  return {
    hip,
    torso,
    head: torso - 10,
    armNear: arm(q.handNear),
    armFar: arm(q.handFar),
    legNear: leg(q.footNear),
    legFar: leg(q.footFar),
    // Toes stay tucked; a swinging foot keeps the same shape.
    footNear: BEAR_FOOT,
    footFar: BEAR_FOOT,
  }
}

const bearPlank = bearPose()
const quadruped = bearPose({ hip: KNEEL_HIP })

/**
 * Hand on the opposite shoulder. Seen from the side both shoulders project to
 * one point, so the hand is drawn at the shoulder with the elbow down and
 * slightly back, so the hand rises forwards and up on its way to the shoulder.
 */
const tapArm = (shoulder: Vec): Limb => {
  const hand = add(shoulder, [1, 3.5])
  const back = (b: 1 | -1) => middleJoint(shoulder, hand, BODY.upperArm, BODY.forearm, b)[0]
  return freeTo(shoulder, hand, BODY.upperArm, BODY.forearm, back(1) < back(-1) ? 1 : -1)
}
const BEAR_TAP = tapArm(BEAR_SHOULDER)

// -- X3: bear crawl, diagonal pairs (near hand + far foot, far hand + near foot)

const STEP = 6
const LIFT = 3

type Placement = { hN: number; hF: number; fN: number; fF: number; b: number }

/** Landing positions after each forward step. */
function crawlPlacements(steps: number): Placement[] {
  const out: Placement[] = [{ hN: 0, hF: 0, fN: 0, fF: 0, b: 0 }]
  for (let i = 0; i < steps; i++) {
    const p = { ...out[out.length - 1] }
    if (i % 2 === 0) {
      p.hN += STEP
      p.fF += STEP
    } else {
      p.hF += STEP
      p.fN += STEP
    }
    p.b += STEP / 2
    out.push(p)
  }
  return out
}

/** Mid-step: the moving hand and foot are in the air halfway between the two placements. */
function crawlSwing(from: Placement, to: Placement): Pose {
  const b = (from.b + to.b) / 2
  const hip = add(BEAR_HIP, [b, 0])
  const shoulder = add(BEAR_SHOULDER, [b, 0])
  const handInAir = (x0: number, x1: number): Limb =>
    freeTo(shoulder, add(BEAR_HAND, [(x0 + x1) / 2, -LIFT]), BODY.upperArm, BODY.forearm, -1)
  const footInAir = (x0: number, x1: number): Limb => {
    const ankle = add(BEAR_ANKLE, [(x0 + x1) / 2, -LIFT])
    const low = (bd: 1 | -1) => middleJoint(hip, ankle, BODY.thigh, BODY.shin, bd)[1]
    return freeTo(hip, ankle, BODY.thigh, BODY.shin, low(1) > low(-1) ? 1 : -1)
  }
  const pick = (a: number, c: number, air: (x0: number, x1: number) => Limb) => (a === c ? a : air(a, c))
  return bearPose({
    body: b,
    handNear: pick(from.hN, to.hN, handInAir),
    handFar: pick(from.hF, to.hF, handInAir),
    footNear: pick(from.fN, to.fN, footInAir),
    footFar: pick(from.fF, to.fF, footInAir),
  })
}

const placed = (p: Placement) => bearPose({ body: p.b, handNear: p.hN, handFar: p.hF, footNear: p.fN, footFar: p.fF })

function crawlFrames(steps: number): Keyframe[] {
  const at = crawlPlacements(steps)
  const frames: Keyframe[] = [{ pose: placed(at[0]), move: 0.4, hold: 0.4, label: 'Back' }]
  for (let i = 1; i <= steps; i++) {
    frames.push({ pose: crawlSwing(at[i - 1], at[i]), move: 0.4, label: 'Forward' })
    frames.push({ pose: placed(at[i]), move: 0.4, hold: i === steps ? 0.4 : 0.05, label: 'Forward' })
  }
  for (let i = steps; i >= 1; i--) {
    frames.push({ pose: crawlSwing(at[i], at[i - 1]), move: 0.4, label: 'Back' })
    if (i > 1) frames.push({ pose: placed(at[i - 1]), move: 0.4, hold: 0.05, label: 'Back' })
  }
  return frames
}

const BEAR_VIEWBOX = [22, 50, 116, 66] as const
const CRAWL_VIEWBOX = [22, 48, 128, 68] as const

// ---------------------------------------------------------------- planks on the toes (X4–X6)

const TOE: Vec = [28, TOE_Y]

/**
 * Straight body from the toes (tucked under, foot at right angles to the shin)
 * to the head; the whole body pivots about the toes. `elevation` is the angle
 * of the body line above the horizontal. Limbs default to hands pinned at `hand`.
 */
function toePose(elevation: number, arms: { near: Limb; far: Limb }): Pose {
  const line = 90 + elevation
  const ankle = add(TOE, dir(elevation), -BODY.foot)
  const hip = add(ankle, dir(line), LEG)
  const leg = { a: [line + 180, line + 180] as const }
  return {
    hip,
    torso: line,
    head: line - 4,
    armNear: arms.near,
    armFar: arms.far,
    legNear: leg,
    legFar: leg,
    footNear: elevation,
    footFar: elevation,
  }
}

const handPin = (hand: Vec): Limb => ({ pin: hand, bend: -1 })
const toeShoulder = (e: number) => shoulderOf(toePose(e, { near: { a: [0, 0] }, far: { a: [0, 0] } }))

// Hands just behind the shoulders at the top, as in the push-up ladder.
const PUSH_HAND: Vec = [toeShoulder(17)[0] + 1.5, HAND_FLOOR]
const TOE_TOP = bisect((e) => dist(toeShoulder(e), PUSH_HAND) - STRAIGHT_ARM, 5, 30)
/** Chest a few centimetres above the mat. */
const TOE_BOTTOM = bisect((e) => toeShoulder(e)[1] - 97.5, -2, 20)

const highPlank = (near: Limb = handPin(PUSH_HAND), far: Limb = handPin(PUSH_HAND)) => toePose(TOE_TOP, { near, far })
const TOP_SHOULDER = toeShoulder(TOE_TOP)
const PLANK_TAP = tapArm(TOP_SHOULDER)

// -- X5: forearm plank, shoulders stacked over the elbows

const FA_ELEVATION = bisect((e) => toeShoulder(e)[1] - (HAND_FLOOR - BODY.upperArm), -2, 20)
const FA_SHOULDER = toeShoulder(FA_ELEVATION)
const FA_HAND: Vec = [FA_SHOULDER[0] + BODY.forearm, HAND_FLOOR]

/** Forearm flat on the mat: the hand is pinned and the elbow folds down onto the mat. */
function forearmDown(shoulder: Vec): Limb {
  const low = (b: 1 | -1) => middleJoint(shoulder, FA_HAND, BODY.upperArm, BODY.forearm, b)[1]
  return { pin: FA_HAND, bend: low(1) > low(-1) ? 1 : -1 }
}

const FOREARM = forearmDown(FA_SHOULDER)
/**
 * Arm in the air during the transition. Low (shoulders at forearm height): the
 * elbow lifts back and the hand hovers under the shoulder. Top (high plank):
 * the arm hangs with the elbow slightly bent and the hand just off the mat.
 */
const LOW_AIR: Limb = { a: [300, 80] }
const TOP_AIR: Limb = { a: [350, 30] }

type Arms = { near: Limb; far: Limb }
const lowPlank = (a: Arms) => toePose(FA_ELEVATION, a)
const topPlank = (a: Arms) => toePose(TOE_TOP, a)

/** One up-down rep leading with `lead`: up one arm at a time, then down leading with the same arm. */
function upDownFrames(lead: 'near' | 'far'): Keyframe[] {
  const arms = (leadArm: Limb, other: Limb): Arms => (lead === 'near' ? { near: leadArm, far: other } : { near: other, far: leadArm })
  const hand = handPin(PUSH_HAND)
  const lowAir = LOW_AIR
  const topAir = TOP_AIR
  return [
    { pose: lowPlank(arms(lowAir, FOREARM)), move: 0.4, label: 'Up' },
    { pose: lowPlank(arms(hand, FOREARM)), move: 0.3, label: 'Up' },
    { pose: topPlank(arms(hand, topAir)), move: 0.7, label: 'Up' },
    { pose: topPlank(arms(hand, hand)), move: 0.3, hold: 0.4, label: 'High plank' },
    { pose: topPlank(arms(topAir, hand)), move: 0.4, label: 'Down' },
    { pose: lowPlank(arms(FOREARM, hand)), move: 0.7, label: 'Down' },
    { pose: lowPlank(arms(FOREARM, lowAir)), move: 0.3, label: 'Down' },
    { pose: lowPlank(arms(FOREARM, FOREARM)), move: 0.3, hold: 0.5, label: 'Forearm plank' },
  ]
}

const PLANK_VIEWBOX = [16, 50, 128, 66] as const

// -- X6: side plank on a straight arm, seen from the front (as in the C ladder)

/** Body line for which the outer edge of the bottom foot touches the mat. */
const SIDE_LINE = 90 + (Math.asin((TOE_Y - TOP_SHOULDER[1]) / (BODY.torso + LEG + BODY.foot)) * 180) / Math.PI

/** Raised arm in line with the supporting arm. It sweeps forwards (not through the body) on the way up. */
const supportUpper = angleTo(TOP_SHOULDER, middleJoint(TOP_SHOULDER, PUSH_HAND, BODY.upperArm, BODY.forearm, -1))
const ARM_UP: Limb = { a: [supportUpper + 177, supportUpper + 177] }

function sidePlankPose(up: 'near' | 'far'): Pose {
  const hip = add(TOP_SHOULDER, dir(SIDE_LINE), -BODY.torso)
  const leg: Limb = { a: [SIDE_LINE + 180, SIDE_LINE + 180] }
  const support = handPin(PUSH_HAND)
  return {
    hip,
    torso: SIDE_LINE,
    head: SIDE_LINE,
    armNear: up === 'near' ? ARM_UP : support,
    armFar: up === 'far' ? ARM_UP : support,
    legNear: leg,
    legFar: leg,
    footNear: SIDE_LINE + 180,
    footFar: SIDE_LINE + 180,
  }
}

const T_VIEWBOX = [16, 38, 128, 78] as const

// ---------------------------------------------------------------- exercises

const WRIST_FISTS = 'Wrists: use fists if flat palms hurt.'
const SHOULDER_STOP = 'Stop the set at shoulder pain of 4/10 or more.'

const bearPlankHold: Exercise = {
  id: 'X1',
  name: 'Bear plank hold',
  group: 'core',
  cls: 'hold',
  muscles: ['Abdominals', 'Serratus anterior', 'Quadriceps'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['wrist', 'shoulder'],
  cues: [
    'On hands and knees with the toes tucked: hands (or fists) under the shoulders, knees under the hips.',
    'Brace the stomach and lift the knees 2–5 cm off the mat.',
    'Hold with the back flat and the shoulders pushing the floor away, breathing normally.',
  ],
  cautions: [WRIST_FISTS, SHOULDER_STOP],
  animation: {
    frames: [
      { pose: quadruped, move: 1.2, hold: 1, label: 'Lower' },
      { pose: bearPlank, move: 1, label: 'Lift' },
      { pose: bearPlank, move: 0.1, hold: 4, label: 'Hold' },
    ],
    viewBox: BEAR_VIEWBOX,
  },
}

const bearShoulderTaps: Exercise = {
  id: 'X2',
  name: 'Bear plank shoulder taps',
  group: 'core',
  cls: 'strength',
  muscles: ['Anti-rotation core', 'Serratus anterior', 'Shoulder stabilisers'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['wrist', 'shoulder'],
  cues: [
    'Start in a bear plank: hands under the shoulders, knees hovering just above the mat.',
    'Lift one hand and tap the opposite shoulder, keeping the hips level and still.',
    'Put the hand back down and tap with the other hand; count each side.',
  ],
  cautions: [WRIST_FISTS, SHOULDER_STOP],
  animation: {
    frames: [
      { pose: bearPlank, move: 0.8, hold: 0.3, label: 'Hand down' },
      { pose: bearPose({ handNear: BEAR_TAP }), move: 0.8, hold: 0.4, label: 'Tap' },
      { pose: bearPlank, move: 0.8, hold: 0.3, label: 'Hand down' },
      { pose: bearPose({ handFar: BEAR_TAP }), move: 0.8, hold: 0.4, label: 'Other side' },
    ],
    viewBox: BEAR_VIEWBOX,
  },
}

const bearCrawl: Exercise = {
  id: 'X3',
  name: 'Bear crawl',
  group: 'core',
  cls: 'hold',
  muscles: ['Trunk stabilisers', 'Shoulders', 'Triceps', 'Quadriceps'],
  measure: 'seconds',
  target: [20, 45],
  kneeLoad: 'medium',
  wristLoad: 'medium',
  regions: ['wrist', 'shoulder', 'knee'],
  cues: [
    'Start in a bear plank: hands under the shoulders, knees hovering just above the mat.',
    'Take small steps forwards, moving one hand and the opposite foot together.',
    'After 4 steps, crawl 4 steps back, then sideways; keep the hips low and level.',
    'Crawl continuously for the target time without the knees touching the mat.',
  ],
  cautions: [WRIST_FISTS, SHOULDER_STOP],
  animation: { frames: crawlFrames(4), viewBox: CRAWL_VIEWBOX },
}

const plankShoulderTaps: Exercise = {
  id: 'X4',
  name: 'High-plank shoulder taps',
  group: 'core',
  cls: 'strength',
  muscles: ['Anti-rotation core', 'Serratus anterior'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['wrist', 'shoulder'],
  cues: [
    'Start at the top of a push-up on hands or fists, feet wider than the hips.',
    'Lift one hand and tap the opposite shoulder without letting the hips sway or rotate.',
    'Put the hand back down and tap with the other hand; count each side.',
  ],
  cautions: [WRIST_FISTS, SHOULDER_STOP],
  animation: {
    frames: [
      { pose: highPlank(), move: 0.8, hold: 0.3, label: 'Hand down' },
      { pose: highPlank(PLANK_TAP), move: 0.8, hold: 0.4, label: 'Tap' },
      { pose: highPlank(), move: 0.8, hold: 0.3, label: 'Hand down' },
      { pose: highPlank(undefined, PLANK_TAP), move: 0.8, hold: 0.4, label: 'Other side' },
    ],
    viewBox: PLANK_VIEWBOX,
  },
}

const plankUpDown: Exercise = {
  id: 'X5',
  name: 'Plank up-down',
  group: 'core',
  cls: 'strength',
  muscles: ['Triceps', 'Chest', 'Serratus anterior', 'Anti-rotation core'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'high',
  regions: ['wrist', 'shoulder'],
  cues: [
    'Start in a forearm plank, body straight from heels to head, feet slightly apart.',
    'Place one hand under the shoulder and push up, then place the other hand: high plank.',
    'Lower back to the forearms one arm at a time, leading with the same arm.',
    'Switch the leading arm each rep and keep the hips from swaying.',
  ],
  cautions: [
    'Wrists: use fists to reduce wrist load.',
    'Elbows and wrists: the transition loads them repeatedly; slow down or stop if they ache.',
    SHOULDER_STOP,
  ],
  animation: { frames: [...upDownFrames('near'), ...upDownFrames('far')], viewBox: PLANK_VIEWBOX },
}

const pushUpToSidePlank: Exercise = {
  id: 'X6',
  name: 'Push-up to side plank',
  group: 'core',
  cls: 'strength',
  muscles: ['Chest', 'Triceps', 'Obliques', 'Shoulder stabilisers'],
  measure: 'reps',
  target: [6, 12],
  kneeLoad: 'low',
  wristLoad: 'high',
  regions: ['wrist', 'shoulder'],
  cues: [
    'Do a full push-up with the body straight from heels to head.',
    'At the top, rotate onto one hand and the sides of the feet into a straight-arm side plank, top arm to the ceiling.',
    'Return to the push-up position, do the next push-up and rotate to the other side.',
  ],
  cautions: [
    'A physiotherapist assessment is advised before trying this step.',
    'Wrists: the supporting hand carries most of the body weight; use a fist if the palm hurts.',
    SHOULDER_STOP,
  ],
  animation: {
    frames: [
      { pose: highPlank(), move: 1, hold: 0.3, label: 'Return' },
      { pose: toePose(TOE_BOTTOM, { near: handPin(PUSH_HAND), far: handPin(PUSH_HAND) }), move: 2, hold: 0.2, label: 'Lower' },
      { pose: highPlank(), move: 1.2, hold: 0.2, label: 'Push' },
      { pose: sidePlankPose('near'), move: 1.2, hold: 1.5, label: 'Rotate' },
      { pose: highPlank(), move: 1, hold: 0.3, label: 'Return' },
      { pose: toePose(TOE_BOTTOM, { near: handPin(PUSH_HAND), far: handPin(PUSH_HAND) }), move: 2, hold: 0.2, label: 'Lower' },
      { pose: highPlank(), move: 1.2, hold: 0.2, label: 'Push' },
      { pose: sidePlankPose('far'), move: 1.2, hold: 1.5, label: 'Other side' },
    ],
    viewBox: T_VIEWBOX,
  },
}

export const CRAWL: Exercise[] = [bearPlankHold, bearShoulderTaps, bearCrawl, plankShoulderTaps, plankUpDown, pushUpToSidePlank]
