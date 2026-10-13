// Wall-to-floor plank ladder (`ywall`: Y18–Y21) and two standing mobility
// moves from the `yflow` pool (Y25, Y26) — docs/EVIDENCE.md, "Y. Dynamic
// jump-free moves (Y ladders)" and R14–R17.
import { add, angleTo, BODY, dir, dist, GROUND_Y, type FreeLimb, type Keyframe, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, HAND_FLOOR } from './helpers'
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

/** Upper (smaller y) intersection of two circles. */
function upperIntersection(c1: Vec, r1: number, c2: Vec, r2: number): Vec {
  const d = dist(c1, c2)
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a))
  const u: Vec = [(c2[0] - c1[0]) / d, (c2[1] - c1[1]) / d]
  const m = add(c1, u, a)
  const p = add(m, [-u[1], u[0]], h)
  const q = add(m, [u[1], -u[0]], h)
  return p[1] < q[1] ? p : q
}

/**
 * Hand on the opposite shoulder (as X4). Seen from the side both shoulders
 * project to one point, so the hand is drawn at the shoulder with the elbow
 * down and slightly back.
 */
function tapArm(shoulder: Vec): Limb {
  const hand = add(shoulder, [1, 3.5])
  const back = (b: 1 | -1) => middleJoint(shoulder, hand, BODY.upperArm, BODY.forearm, b)[0]
  return freeTo(shoulder, hand, BODY.upperArm, BODY.forearm, back(1) < back(-1) ? 1 : -1)
}

/** Wall drawn with its surface at `surface` (the scenery rectangle is 6 units thick). */
const wallAt = (surface: number) => ({ x: surface + 6 })

// ---------------------------------------------------------------- leaning wall planks (Y18–Y20)

/**
 * Straight body leaning `lean` degrees from vertical towards the wall (on the
 * right). The ball of the foot stays on the floor at `toe`; the heel lifts a
 * little once the ankle passes about 20° of dorsiflexion (as P1).
 */
type Lean = { toe: Vec; lean: number }

function leanBase({ toe, lean }: Lean) {
  const line = 180 - lean
  const foot = Math.min(90, 110 - lean)
  const ankle = add(toe, dir(foot), -BODY.foot)
  const hip = add(ankle, dir(line), LEG)
  return { line, foot, hip, shoulder: add(hip, dir(line), BODY.torso) }
}

/** A knee driven forwards: hip flexion and knee flexion relative to the body line. */
type Knee = { hip: number; knee: number }

function leanPose(l: Lean, arms: { near: Limb; far: Limb }, knee: { near?: Knee; far?: Knee } = {}): Pose {
  const { line, foot, hip } = leanBase(l)
  const straight: Limb = { a: [line + 180, line + 180] }
  const leg = (k?: Knee): Limb => {
    if (!k) return straight
    const thigh = line + 180 + k.hip
    return { a: [thigh, thigh - k.knee] }
  }
  // A lifted foot relaxes a little below the right angle to the shin.
  const footOf = (k?: Knee) => (k ? line + 180 + k.hip - k.knee + 80 : foot)
  return {
    hip,
    torso: line,
    head: line - 3,
    armNear: arms.near,
    armFar: arms.far,
    legNear: leg(knee.near),
    legFar: leg(knee.far),
    footNear: footOf(knee.near),
    footFar: footOf(knee.far),
  }
}

// -- Y18: forearms on the wall, elbows at shoulder height

const Y18: Lean = { toe: [34, ANKLE_FLOOR], lean: 22 }
const Y18_SHOULDER = leanBase(Y18).shoulder
/** Upper arm almost level, so the elbow sits just below shoulder height. */
const Y18_ELBOW = add(Y18_SHOULDER, dir(88), BODY.upperArm)
/** Forearm flat on the wall, pointing up from the elbow. */
const Y18_HAND: Vec = [Y18_ELBOW[0], Y18_ELBOW[1] - BODY.forearm]
const Y18_WALL = Y18_ELBOW[0] + 2.1

function forearmOnWall(): Limb {
  const toWall = (b: 1 | -1) => middleJoint(Y18_SHOULDER, Y18_HAND, BODY.upperArm, BODY.forearm, b)[0]
  return { pin: Y18_HAND, bend: toWall(1) > toWall(-1) ? 1 : -1 }
}
const Y18_ARMS = { near: forearmOnWall(), far: forearmOnWall() }
const MARCH: Knee = { hip: 88, knee: 95 }

// -- Y19 and Y20: hands on the wall at chest height, arms straight

/** Straight arm from the shoulder, slightly downwards to chest height. */
const handFrom = (l: Lean): Vec => add(leanBase(l).shoulder, dir(86), STRAIGHT_ARM)

const Y19: Lean = { toe: [26, ANKLE_FLOOR], lean: 36 }
const Y19_HAND = handFrom(Y19)
const Y19_WALL = Y19_HAND[0] + 2.1
const Y19_ARMS = { near: { pin: Y19_HAND, bend: -1 } as Limb, far: { pin: Y19_HAND, bend: -1 } as Limb }
/** Knee drives towards the wall; the foot stays clear of the floor. */
const CLIMB: Knee = { hip: 92, knee: 100 }

const Y20: Lean = { toe: [30, ANKLE_FLOOR], lean: 30 }
const Y20_HAND = handFrom(Y20)
const Y20_WALL = Y20_HAND[0] + 2.1
const Y20_PIN: Limb = { pin: Y20_HAND, bend: -1 }
const Y20_TAP = tapArm(leanBase(Y20).shoulder)

// ---------------------------------------------------------------- Y21 inchworm walk-out on fists

/** The toes stay in one place; the heels lift as the body lowers into the plank. */
const IW_TOE_X = 30
/** Foot angle (ankle to toes) when up on the toes in the plank. */
const IW_FOOT_UP = 22
/** Shoulder just behind the fists. */
const IW_SHOULDER_BACK = 2
const IW_ARM = STRAIGHT_ARM - 0.3

function iwAnkle(heel: number): Vec {
  const foot = 90 + (IW_FOOT_UP - 90) * heel
  const toe: Vec = [IW_TOE_X, ANKLE_FLOOR + (TOE_Y - ANKLE_FLOOR) * heel]
  return add(toe, dir(foot), -BODY.foot)
}

const iwFoot = (heel: number) => 90 + (IW_FOOT_UP - 90) * heel
/** Soft knees in the hinge, almost straight in the plank. */
const iwLegLength = (p: number) => 45.5 + (LEG - 0.15 - 45.5) * p
const iwHeel = (p: number) => p * p

function iwShoulder(hN: number, hF: number): Vec {
  const xm = (hN + hF) / 2
  const spread = Math.abs(hN - hF) / 2 + IW_SHOULDER_BACK
  return [xm - IW_SHOULDER_BACK, HAND_FLOOR - Math.sqrt(IW_ARM ** 2 - spread ** 2)]
}

/** First touch: fists just in front of the toes. */
const IW_START = IW_TOE_X + 18
/** Plank: legs, torso and the fists' reach in one straight line. */
const IW_END = bisect((x) => dist(iwAnkle(1), iwShoulder(x, x)) - (LEG - 0.15 + BODY.torso - 0.05), IW_START, IW_START + 120)
const IW_STEPS = 5
const IW_D = (IW_END - IW_START) / IW_STEPS

/**
 * Body with the fists at `hN` and `hF` (pinned) or with one hand in the air.
 * Progress `p` (0 at the first touch, 1 in the plank) sets the knee bend and
 * the heel lift; the hip is placed as high as the legs allow.
 */
function iwPose(hN: number, hF: number, air?: 'near' | 'far'): Pose {
  const p = ((hN + hF) / 2 - IW_START) / (IW_END - IW_START)
  const heel = iwHeel(p)
  const ankle = iwAnkle(heel)
  const shoulder = iwShoulder(hN, hF)
  const hip = upperIntersection(ankle, iwLegLength(p), shoulder, BODY.torso)
  const torso = angleTo(hip, shoulder)
  const leg: Limb = { pin: ankle, bend: 1 }
  const fist = (x: number, inAir: boolean): Limb =>
    inAir ? freeTo(shoulder, [x, HAND_FLOOR - 4], BODY.upperArm, BODY.forearm, -1) : { pin: [x, HAND_FLOOR], bend: -1 }
  return {
    hip,
    torso,
    head: torso - 4 * p,
    armNear: fist(hN, air === 'near'),
    armFar: fist(hF, air === 'far'),
    legNear: leg,
    legFar: leg,
    footNear: iwFoot(heel),
    footFar: iwFoot(heel),
  }
}

const IW_STAND: Pose = (() => {
  const ankle = iwAnkle(0)
  const hip: Vec = [ankle[0] + 1, ankle[1] - (LEG - 0.4)]
  const leg: Limb = { pin: ankle, bend: 1 }
  const arm: Limb = { a: [2, 6] }
  return { hip, torso: 180, head: 180, armNear: arm, armFar: arm, legNear: leg, legFar: leg, footNear: 90, footFar: 90 }
})()

/** Hand placements, leading hands alternating: near d, far 2d, near 3d … until both are level. */
function iwPlacements(): { hN: number; hF: number; moved: 'near' | 'far' }[] {
  const out: { hN: number; hF: number; moved: 'near' | 'far' }[] = []
  let hN = IW_START
  let hF = IW_START
  for (let i = 1; i <= IW_STEPS + 1; i++) {
    const target = Math.min(IW_START + i * IW_D, IW_END)
    if (i % 2 === 1) hN = target
    else hF = target
    out.push({ hN, hF, moved: i % 2 === 1 ? 'near' : 'far' })
  }
  return out
}

function inchwormFrames(): Keyframe[] {
  const steps = iwPlacements()
  const STEP = 0.35
  const frames: Keyframe[] = [
    { pose: IW_STAND, move: 1.4, hold: 0.4, label: 'Stand' },
    { pose: iwPose(IW_START, IW_START), move: 1.6, hold: 0.2, label: 'Hinge' },
  ]
  let prev = { hN: IW_START, hF: IW_START }
  for (const s of steps) {
    const midN = s.moved === 'near' ? (prev.hN + s.hN) / 2 : s.hN
    const midF = s.moved === 'far' ? (prev.hF + s.hF) / 2 : s.hF
    frames.push({ pose: iwPose(midN, midF, s.moved), move: STEP, label: 'Walk out' })
    frames.push({ pose: iwPose(s.hN, s.hF), move: STEP, label: 'Walk out' })
    prev = s
  }
  frames[frames.length - 1] = { ...frames[frames.length - 1], hold: 1, label: 'Plank' }
  const back = [{ hN: IW_START, hF: IW_START }, ...steps]
  for (let i = back.length - 1; i >= 1; i--) {
    const from = back[i]
    const to = back[i - 1]
    const moved = steps[i - 1].moved
    const midN = moved === 'near' ? (from.hN + to.hN) / 2 : to.hN
    const midF = moved === 'far' ? (from.hF + to.hF) / 2 : to.hF
    frames.push({ pose: iwPose(midN, midF, moved), move: STEP, label: 'Walk back' })
    frames.push({ pose: iwPose(to.hN, to.hF), move: STEP, label: 'Walk back' })
  }
  frames[frames.length - 1] = { ...frames[frames.length - 1], hold: 0.3 }
  return frames
}

// ---------------------------------------------------------------- standing hinges (Y25, Y26)

type HingeShape = { knee: number; shin: number; lean: number }

/** Standing leg with the heel down: knee bent `knee`°, shin tilted `shin`° forward. */
function hingeHip(ankle: Vec, { knee, shin }: HingeShape): Vec {
  const kneePoint = add(ankle, dir(180 - shin), BODY.shin)
  return add(kneePoint, dir(180 - shin + knee), BODY.thigh)
}

// -- Y25: hands on the wall at chest height, hinged with a flat back

const TN_ANKLE: Vec = [40, ANKLE_FLOOR]
const TN_SHAPE: HingeShape = { knee: 18, shin: 4, lean: 48 }
const TN_HIP = hingeHip(TN_ANKLE, TN_SHAPE)
const TN_TORSO = 180 - TN_SHAPE.lean
const TN_SHOULDER = add(TN_HIP, dir(TN_TORSO), BODY.torso)
const TN_HAND = add(TN_SHOULDER, dir(86), STRAIGHT_ARM - 0.5)
const TN_WALL = TN_HAND[0] + 2.1

function threadPose(near: Limb, head: number): Pose {
  const leg: Limb = { pin: TN_ANKLE, bend: 1 }
  return {
    hip: TN_HIP,
    torso: TN_TORSO,
    head,
    armNear: near,
    armFar: { pin: TN_HAND, bend: -1 },
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

/** Hand reaching under the supporting arm towards the far side (seen from the side: down and slightly back). */
const THREAD: Limb = { a: [346, 342] }
/** On the way out the elbow bends as the arm turns outwards. */
const THREAD_TURN: Limb = { a: [318, 220] }
/** Opened to the side: the hand level with the shoulder, no higher. */
const OPEN: Limb = { a: [270, 268] }

// -- Y26: hands on the thighs, spine rounding and arching

const CC_ANKLE: Vec = [56, ANKLE_FLOOR]
const CC_SHAPE: HingeShape = { knee: 38, shin: 8, lean: 64 }
const CC_HIP = hingeHip(CC_ANKLE, CC_SHAPE)
const CC_TORSO = 180 - CC_SHAPE.lean
const CC_KNEE = add(CC_ANKLE, dir(180 - CC_SHAPE.shin), BODY.shin)
const CC_SHOULDER = add(CC_HIP, dir(CC_TORSO), BODY.torso)
/** Hands rest on the front of the thighs, as far down as a soft, nearly straight arm reaches. */
const thighPoint = (f: number): Vec => {
  const a = angleTo(CC_HIP, CC_KNEE)
  return add(add(CC_HIP, dir(a), BODY.thigh * f), dir(a + 90), 2.5)
}
const CC_HAND = thighPoint(bisect((f) => dist(CC_SHOULDER, thighPoint(f)) - (STRAIGHT_ARM - 1), 0.3, 0.95))

function catCowPose(spine: number, head: number): Pose {
  const leg: Limb = { pin: CC_ANKLE, bend: 1 }
  const hand: Limb = { pin: CC_HAND, bend: -1 }
  return {
    hip: CC_HIP,
    torso: CC_TORSO,
    head,
    spine,
    armNear: hand,
    armFar: hand,
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

// ---------------------------------------------------------------- exercises

const FLOW_TARGET = [30, 45] as const

const wallPlankMarch: Exercise = {
  id: 'Y18',
  name: 'Wall plank march',
  group: 'core',
  cls: 'flow',
  components: ['strength', 'pulse'],
  muscles: ['Abdominals', 'Serratus anterior', 'Hip flexors'],
  measure: 'seconds',
  target: FLOW_TARGET,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Forearms on the wall with the elbows at shoulder height; step back until the body leans in a straight line.',
    'Brace the stomach and lift one knee towards the wall, then put the foot down.',
    'Alternate legs at a steady march, keeping the hips level and the body straight.',
  ],
  animation: {
    frames: [
      { pose: leanPose(Y18, Y18_ARMS), move: 0.6, hold: 0.2, label: 'Plank' },
      { pose: leanPose(Y18, Y18_ARMS, { near: MARCH }), move: 0.7, hold: 0.3, label: 'March' },
      { pose: leanPose(Y18, Y18_ARMS), move: 0.6, hold: 0.2, label: 'Plank' },
      { pose: leanPose(Y18, Y18_ARMS, { far: MARCH }), move: 0.7, hold: 0.3, label: 'Other knee' },
    ],
    wall: wallAt(Y18_WALL),
    viewBox: [22, 4, 94, 112],
  },
}

const wallMountainClimber: Exercise = {
  id: 'Y19',
  name: 'Wall mountain climber step-ins',
  group: 'core',
  cls: 'flow',
  components: ['pulse', 'strength'],
  muscles: ['Abdominals', 'Hip flexors', 'Serratus anterior', 'Shoulders'],
  measure: 'seconds',
  target: FLOW_TARGET,
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['wrist', 'shoulder'],
  cues: [
    'Hands or fists on the wall at chest height; walk the feet back until the body leans in a straight line.',
    'Bring one knee towards the wall, then step it back and bring in the other knee.',
    'Keep a steady pace with the hips level; one foot is always on the floor.',
  ],
  cautions: [
    'Steady pace only: one foot stays on the floor, no hop.',
    'Wrists: use fists, or forearms on the wall, if wrist pain is above 2/10.',
  ],
  animation: {
    frames: [
      { pose: leanPose(Y19, Y19_ARMS), move: 0.5, label: 'Step back' },
      { pose: leanPose(Y19, Y19_ARMS, { near: CLIMB }), move: 0.5, hold: 0.1, label: 'Knee in' },
      { pose: leanPose(Y19, Y19_ARMS), move: 0.5, label: 'Step back' },
      { pose: leanPose(Y19, Y19_ARMS, { far: CLIMB }), move: 0.5, hold: 0.1, label: 'Other knee' },
    ],
    wall: wallAt(Y19_WALL),
    viewBox: [14, 14, 102, 102],
  },
}

const wallShoulderTaps: Exercise = {
  id: 'Y20',
  name: 'Wall plank shoulder taps',
  group: 'core',
  cls: 'flow',
  components: ['strength', 'pulse'],
  muscles: ['Anti-rotation core', 'Serratus anterior', 'Shoulder stabilisers'],
  measure: 'seconds',
  target: FLOW_TARGET,
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['wrist', 'shoulder'],
  cues: [
    'Hands on the wall at chest height, feet wide, body leaning in a straight line.',
    'Lift one hand and tap the opposite shoulder without letting the hips sway or rotate.',
    'Put the hand back on the wall and tap with the other hand; keep alternating.',
  ],
  cautions: ['Skip this move while shoulder pain is above 2/10.', 'Wrists: use fists if flat palms hurt.'],
  animation: {
    frames: [
      { pose: leanPose(Y20, { near: Y20_PIN, far: Y20_PIN }), move: 0.8, hold: 0.3, label: 'Hand back' },
      { pose: leanPose(Y20, { near: Y20_TAP, far: Y20_PIN }), move: 0.8, hold: 0.4, label: 'Tap' },
      { pose: leanPose(Y20, { near: Y20_PIN, far: Y20_PIN }), move: 0.8, hold: 0.3, label: 'Hand back' },
      { pose: leanPose(Y20, { near: Y20_PIN, far: Y20_TAP }), move: 0.8, hold: 0.4, label: 'Other side' },
    ],
    wall: wallAt(Y20_WALL),
    viewBox: [18, 8, 98, 108],
  },
}

const inchworm: Exercise = {
  id: 'Y21',
  name: 'Inchworm walk-out to a short plank',
  group: 'core',
  cls: 'flow',
  components: ['strength', 'mobility', 'pulse'],
  muscles: ['Abdominals', 'Shoulders', 'Triceps', 'Hamstrings (stretch)'],
  measure: 'seconds',
  target: FLOW_TARGET,
  kneeLoad: 'low',
  wristLoad: 'medium',
  regions: ['wrist', 'shoulder'],
  cues: [
    'Stand tall, soften the knees and hinge forwards until the fists reach the floor.',
    'Walk the fists out, one at a time, to a plank with the shoulders over the fists.',
    'Hold for 1 second with the body straight, then walk the fists back and stand up.',
  ],
  cautions: [
    'On fists by default, to keep the wrists straight.',
    'The head is briefly below the hips at the start and end of each rep.',
  ],
  animation: {
    frames: inchwormFrames(),
    viewBox: [12, 4, 126, 112],
  },
}

const standingThreadNeedle: Exercise = {
  id: 'Y25',
  name: 'Standing thread the needle',
  group: 'mobility',
  cls: 'flow',
  components: ['mobility'],
  muscles: ['Thoracic rotators', 'Rear shoulder'],
  measure: 'seconds',
  target: FLOW_TARGET,
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Hands on the wall at chest height; step back and hinge at the hips until the back is flat.',
    'Slide one arm under the other, turning the upper back and letting the head follow.',
    'Turn the other way and open the arm out to the side, to shoulder height and no higher.',
    'Move slowly; switch sides halfway through.',
  ],
  cautions: ['Rotate from the upper back, not the hips; keep the opening arm at or below shoulder height.'],
  animation: {
    frames: [
      { pose: threadPose({ pin: TN_HAND, bend: -1 }, TN_TORSO - 4), move: 1.2, hold: 0.4, label: 'Hands on wall' },
      { pose: threadPose(THREAD, TN_TORSO - 40), move: 1.8, hold: 1, label: 'Thread' },
      { pose: threadPose(THREAD_TURN, TN_TORSO - 4), move: 1, label: 'Open' },
      { pose: threadPose(OPEN, TN_TORSO + 30), move: 1, hold: 1.2, label: 'Open' },
    ],
    wall: wallAt(TN_WALL),
    viewBox: [6, 10, 110, 106],
  },
}

const standingCatCow: Exercise = {
  id: 'Y26',
  name: 'Standing cat-cow',
  group: 'mobility',
  cls: 'flow',
  components: ['mobility'],
  muscles: ['Spinal flexors', 'Spinal extensors'],
  measure: 'seconds',
  target: FLOW_TARGET,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand with the feet hip-width apart, knees slightly bent, hands on the thighs above the knees.',
    'Round the back towards the ceiling and let the head drop.',
    'Then arch the back gently and look slightly forward; move slowly with the breath.',
  ],
  animation: {
    frames: [
      { pose: catCowPose(6, CC_TORSO - 40), move: 2.2, hold: 0.8, label: 'Round' },
      { pose: catCowPose(-4, CC_TORSO + 14), move: 2.2, hold: 0.8, label: 'Arch' },
    ],
    viewBox: [24, 14, 100, 102],
  },
}

export const Y_WALL: Exercise[] = [
  wallPlankMarch,
  wallMountainClimber,
  wallShoulderTaps,
  inchworm,
  standingThreadNeedle,
  standingCatCow,
]
