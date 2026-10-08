// Hip extension and hinge ladder (H) — docs/EVIDENCE.md, "Exercise candidates".
import { add, angleTo, BODY, dir, dist, solve, type Keyframe, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

// ---------------------------------------------------------------- bridges (H1–H6)

const BRIDGE_SHOULDER: Vec = [45, FLOOR]
const BRIDGE_FOOT_X = 103

const planted = (x: number): Limb => ({ pin: [x, ANKLE_FLOOR], bend: 1 })

type BridgeLegs = {
  legNear?: Limb
  legFar?: Limb
  footNear?: number
  footFar?: number
}

/**
 * Supine bridge. The hips rotate about the shoulders, which stay on the mat;
 * `lift` is the angle of the shoulder–hip line above the floor.
 */
function bridgePose(lift: number, legs: BridgeLegs = {}): Pose {
  const towardHip = 90 + lift
  const hip = add(BRIDGE_SHOULDER, dir(towardHip), BODY.torso)
  const arm = { pin: [75, HAND_FLOOR] as Vec, bend: 1 as const }
  const legNear = legs.legNear ?? planted(BRIDGE_FOOT_X)
  const legFar = legs.legFar ?? planted(BRIDGE_FOOT_X)
  return {
    hip,
    torso: towardHip + 180,
    head: 262,
    armNear: arm,
    armFar: arm,
    legNear,
    legFar,
    footNear: legs.footNear ?? ('pin' in legNear ? 90 : undefined),
    footFar: legs.footFar ?? ('pin' in legFar ? 90 : undefined),
  }
}

/**
 * Top of the bridge: the lift at which shoulders, hips and knees form a
 * straight line for heels at `footX` (no arching past the line).
 */
function bridgeTop(footX: number): number {
  const ankle: Vec = [footX, ANKLE_FLOOR]
  const kneeAt = (lift: number) => add(BRIDGE_SHOULDER, dir(90 + lift), BODY.torso + BODY.thigh)
  let lo = 0
  let hi = 60
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    // Raising the line moves the knee away from the heel once past the solution.
    if (dist(kneeAt(mid), ankle) < BODY.shin) lo = mid
    else hi = mid
  }
  return lo
}

const BRIDGE_TOP = bridgeTop(BRIDGE_FOOT_X)

/** Thigh direction of a planted leg in a given bridge pose. */
function thighAngle(lift: number, footX = BRIDGE_FOOT_X): number {
  const f = solve(bridgePose(lift, { legNear: planted(footX) }))
  return angleTo(f.legNear.base, f.legNear.mid)
}

/** A foot lifted off the mat with the knee bent about 90°, the thigh near vertical. */
const KNEE_UP: Limb = { a: [172, 82] }

/** A leg held with the knee straight, parallel to the planted thigh. */
const straightLeg = (lift: number): Limb => {
  const a = thighAngle(lift)
  return { a: [a, a] }
}

const BRIDGE_VIEW = [20, 40, 110, 76] as const

const gluteBridge: Exercise = {
  id: 'H1',
  name: 'Glute bridge',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus maximus', 'Hamstrings'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your back, knees bent, feet flat and hip-width apart.',
    'Squeeze your glutes and push through your heels to lift your hips.',
    'Stop when shoulders, hips and knees form a straight line; do not arch the lower back.',
    'Lower slowly.',
  ],
  animation: {
    frames: [
      { pose: bridgePose(0), move: 1.5, hold: 0.6, label: 'Lower' },
      { pose: bridgePose(BRIDGE_TOP), move: 1.2, hold: 1.2, label: 'Squeeze' },
    ],
    viewBox: [20, 50, 110, 66],
  },
}

const bridgeHold: Exercise = {
  id: 'H2',
  name: 'Glute bridge with 3–5 s top hold',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteus maximus', 'Hamstrings'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your back, knees bent, feet flat and hip-width apart.',
    'Push through your heels to lift the hips until shoulders, hips and knees are in line.',
    'Hold for 3–5 s, squeezing the glutes without arching the lower back.',
    'Lower slowly.',
  ],
  animation: {
    frames: [
      { pose: bridgePose(0), move: 1.5, hold: 0.6, label: 'Lower' },
      { pose: bridgePose(BRIDGE_TOP), move: 1.2, hold: 4, label: 'Hold 3–5 s' },
    ],
    viewBox: [20, 50, 110, 66],
  },
}

const bridgeMarch: Exercise = {
  id: 'H3',
  name: 'Bridge march',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Gluteals', 'Hamstrings', 'Trunk (anti-rotation)'],
  measure: 'reps',
  target: [10, 20],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lift into a glute bridge: shoulders, hips and knees in line.',
    'Keeping the hips level, lift one foot a few centimetres, knee staying bent.',
    'Put it down and lift the other foot; the hips must not drop or twist.',
  ],
  animation: {
    frames: [
      { pose: bridgePose(0), move: 1.4, hold: 0.4, label: 'Lower' },
      { pose: bridgePose(BRIDGE_TOP), move: 1.2, hold: 0.4, label: 'Bridge' },
      { pose: bridgePose(BRIDGE_TOP, { legNear: KNEE_UP }), move: 0.9, hold: 0.6, label: 'Lift' },
      { pose: bridgePose(BRIDGE_TOP), move: 0.9, hold: 0.3, label: 'Down' },
      { pose: bridgePose(BRIDGE_TOP, { legFar: KNEE_UP }), move: 0.9, hold: 0.6, label: 'Lift' },
      { pose: bridgePose(BRIDGE_TOP), move: 0.9, hold: 0.3, label: 'Down' },
    ],
    viewBox: BRIDGE_VIEW,
  },
}

const singleLegBridgeBent: Exercise = {
  id: 'H4',
  name: 'Single-leg glute bridge (other knee bent)',
  group: 'hips',
  cls: 'strength',
  muscles: ['Gluteus maximus', 'Hamstrings'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your back with one foot flat on the mat and the other knee lifted, bent at about 90°.',
    'Push through the heel of the planted foot to lift the hips until shoulder, hip and knee are in line.',
    'Keep the pelvis level; lower slowly. Do all reps, then switch legs.',
  ],
  animation: {
    frames: [
      { pose: bridgePose(0, { legFar: KNEE_UP }), move: 1.6, hold: 0.5, label: 'Lower' },
      { pose: bridgePose(BRIDGE_TOP, { legFar: KNEE_UP }), move: 1.3, hold: 1, label: 'Lift' },
    ],
    viewBox: BRIDGE_VIEW,
  },
}

const singleLegBridgeStraight: Exercise = {
  id: 'H5',
  name: 'Single-leg glute bridge (other leg straight)',
  group: 'hips',
  cls: 'strength',
  muscles: ['Gluteus maximus', 'Hamstrings'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your back with one foot flat on the mat and the other leg straight, thighs side by side.',
    'Push through the planted heel to lift the hips; the straight leg stays in line with the other thigh.',
    'Keep the pelvis level; lower slowly. Do all reps, then switch legs.',
  ],
  animation: {
    frames: [
      { pose: bridgePose(0, { legFar: straightLeg(0) }), move: 1.6, hold: 0.5, label: 'Lower' },
      { pose: bridgePose(BRIDGE_TOP, { legFar: straightLeg(BRIDGE_TOP) }), move: 1.3, hold: 1, label: 'Lift' },
    ],
    viewBox: BRIDGE_VIEW,
  },
}

// Bridge walkout: heels walk out in small steps and back while the hips stay up.
const WALK_STEP = 6
const WALK_STEPS = 2

/** A foot lifted a little above the mat between two heel positions. */
function liftedFoot(lift: number, fromX: number, toX: number): Limb {
  const f = solve(bridgePose(lift, { legNear: { pin: [(fromX + toX) / 2, ANKLE_FLOOR - 4], bend: 1 } }))
  return { a: [angleTo(f.legNear.base, f.legNear.mid), angleTo(f.legNear.mid, f.legNear.end)] }
}

function walkout(): Keyframe[] {
  // Heel positions visited: out step by step, then back.
  const xs = Array.from({ length: WALK_STEPS + 1 }, (_, i) => BRIDGE_FOOT_X + i * WALK_STEP)
  const route = [...xs.slice(1), ...xs.slice(0, -1).reverse()]
  const frames: Keyframe[] = []
  let near = BRIDGE_FOOT_X
  let far = BRIDGE_FOOT_X
  const lift = () => bridgeTop((near + far) / 2)
  for (const x of route) {
    const out = x > near
    for (const side of ['near', 'far'] as const) {
      const from = side === 'near' ? near : far
      const l = lift()
      const air = liftedFoot(l, from, x)
      frames.push({
        pose: bridgePose(l, side === 'near' ? { legNear: air, legFar: planted(far), footNear: 92 } : { legNear: planted(near), legFar: air, footFar: 92 }),
        move: 0.45,
        label: out ? 'Walk out' : 'Walk in',
      })
      if (side === 'near') near = x
      else far = x
      frames.push({
        pose: bridgePose(lift(), { legNear: planted(near), legFar: planted(far) }),
        move: 0.4,
        hold: side === 'far' && x === xs[xs.length - 1] ? 0.6 : 0.1,
        label: out ? 'Walk out' : 'Walk in',
      })
    }
  }
  return [
    { pose: bridgePose(0), move: 1.4, hold: 0.4, label: 'Lower' },
    { pose: bridgePose(BRIDGE_TOP), move: 1.2, hold: 0.4, label: 'Bridge' },
    ...frames,
  ]
}

const bridgeWalkout: Exercise = {
  id: 'H6',
  name: 'Bridge walkout',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Hamstrings', 'Gluteals'],
  measure: 'reps',
  target: [10, 20],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Lift into a glute bridge: shoulders, hips and knees in line.',
    'Keeping the hips up, walk the heels away from you in small steps, one foot at a time.',
    'Stop while the knees are still bent and you can keep the hips up, then walk back in. One walk out and back is one rep.',
  ],
  cautions: [
    'Stop if the back of the knee or the hamstring cramps or hurts; walk out less far next time.',
    'Knees: keep pain at 2/10 or below.',
  ],
  animation: {
    frames: walkout(),
    viewBox: [20, 50, 110, 66],
  },
}

// ---------------------------------------------------------------- standing hinges (H7–H8)

const HINGE_ANKLE: Vec = [62, ANKLE_FLOOR]

type HingeShape = { knee: number; shin: number; lean: number }

/** Standing leg with the heel down: knee bent `knee`°, shin tilted `shin`° forward. */
function hingeHip({ knee, shin }: HingeShape): Vec {
  const kneePoint = add(HINGE_ANKLE, dir(180 - shin), BODY.shin)
  return add(kneePoint, dir(180 - shin + knee), BODY.thigh)
}

function goodMorningPose(shape: HingeShape): Pose {
  const hip = hingeHip(shape)
  const torso = 180 - shape.lean
  const leg = { pin: HINGE_ANKLE, bend: 1 as const }
  const hands = { pin: add(hip, dir(torso), 5), bend: -1 as const }
  return {
    hip,
    torso,
    head: torso,
    armNear: hands,
    armFar: hands,
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

const goodMorning: Exercise = {
  id: 'H7',
  name: 'Bodyweight hip hinge (good morning)',
  group: 'hips',
  cls: 'endurance',
  muscles: ['Hamstrings', 'Gluteals', 'Spinal extensors'],
  measure: 'reps',
  target: [10, 15],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand with feet hip-width apart, hands on hips, knees soft.',
    'Push the hips back and let the chest come forward, back flat and neck in line with it.',
    'Stop when you feel a stretch in the back of the thighs, then squeeze the glutes to stand tall.',
  ],
  cautions: ['Keep the back flat; stop the hinge before the lower back starts to round.'],
  animation: {
    frames: [
      { pose: goodMorningPose({ knee: 6, shin: 2, lean: 0 }), move: 1.3, hold: 0.5, label: 'Stand' },
      { pose: goodMorningPose({ knee: 22, shin: 3, lean: 58 }), move: 2, hold: 0.4, label: 'Hinge' },
    ],
    viewBox: [26, 2, 96, 114],
  },
}

// Single-leg Romanian deadlift: the near (stance) leg works; the far leg extends behind
// in line with the torso. The near hand's fingertips rest on a wall in front and
// trace down it as the body hinges towards the wall (a fixed hand point cannot be
// reached from both positions).
const RDL_WALL_SURFACE = 95
const rdlHand = (y: number): Vec => [RDL_WALL_SURFACE - 2, y]

function rdlPose(shape: HingeShape, freeLeg: Limb, freeFoot: number, handY: number): Pose {
  const hip = hingeHip(shape)
  const torso = 180 - shape.lean
  return {
    hip,
    torso,
    head: torso,
    armNear: { pin: rdlHand(handY), bend: -1 },
    // The other arm hangs relaxed.
    armFar: { a: [4, 10] },
    legNear: { pin: HINGE_ANKLE, bend: 1 },
    legFar: freeLeg,
    footNear: 90,
    footFar: freeFoot,
  }
}

const RDL_TOP: HingeShape = { knee: 10, shin: 3, lean: 6 }
const RDL_BOTTOM: HingeShape = { knee: 22, shin: 4, lean: 48 }
// Back leg in line with the torso, knee almost straight, toes pointing down.
const RDL_FREE_BOTTOM: Limb = { a: [360 - RDL_BOTTOM.lean - 2, 360 - RDL_BOTTOM.lean - 8] }

const singleLegRdl: Exercise = {
  id: 'H8',
  name: 'Single-leg Romanian deadlift, bodyweight',
  group: 'hips',
  cls: 'strength',
  muscles: ['Gluteus maximus', 'Hamstrings', 'Balance'],
  measure: 'reps',
  target: [6, 12],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand on one leg, knee soft, fingertips on a wall for balance.',
    'Hinge at the hip: the chest comes forward as the other leg reaches back, body in one straight line.',
    'Keep the hips level and the back flat; go only as far as the hamstrings allow.',
    'Squeeze the glute of the standing leg to return upright. Do all reps, then switch legs.',
  ],
  cautions: ['Use the wall for balance only; let the fingertips slide on it rather than leaning on it.'],
  animation: {
    frames: [
      { pose: rdlPose(RDL_TOP, { a: [350, 322] }, 75, 33), move: 1.4, hold: 0.5, label: 'Stand' },
      { pose: rdlPose(RDL_BOTTOM, RDL_FREE_BOTTOM, 40, 56), move: 2, hold: 0.5, label: 'Hinge' },
    ],
    wall: { x: RDL_WALL_SURFACE + 6 },
    viewBox: [10, 2, 104, 114],
  },
}

export const HIPS: Exercise[] = [
  gluteBridge,
  bridgeHold,
  bridgeMarch,
  singleLegBridgeBent,
  singleLegBridgeStraight,
  bridgeWalkout,
  goodMorning,
  singleLegRdl,
]
