// Rotation and hip-mobility Y moves (Y13, Y14, Y15, Y22, Y23) and the M10
// 90/90 hip switches — docs/EVIDENCE.md, "Y. Dynamic jump-free moves" and the
// M pool.
//
// How rotation is shown: a trunk turning about the vertical axis cannot be
// drawn with a single shoulder point, so Y13 and Y14 show it from the side by
// what the arms do. The hands are crossed on the chest; as the trunk turns
// towards the front (near) leg, the near elbow sweeps back across the chest
// and the far elbow comes forward. Y22 (hip circles) is drawn from the front,
// so the knee's circle lies in the picture plane. M10 (90/90 switches) is
// drawn from above, the one view where both legs lie flat at their true length.
//
// Pose helpers are copied from legs.ts and squat-variants.ts (not exported there).
import { add, angleTo, BODY, dir, dist, solve, GROUND_Y, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR } from './helpers'
import type { Exercise } from './types'

const RAD = Math.PI / 180

// ---------------------------------------------------------------- shared text

const KNEE_DEPTH = 'Knees: use a depth where pain stays at 2/10 or below; never deeper than your current knee step.'
const KNEE_RED_FLAGS = 'Stop and seek assessment if the knee swells, locks, gives way or the pain is sharp.'
const UPPER_BACK = 'Rotate from the upper back, not the knees or the lower back; hips and knees stay facing forward.'

// ---------------------------------------------------------------- shared poses

/** Both arms on the hips (hands on the iliac crests, elbows back). As legs.ts. */
function handsOnHips(hip: Vec, torso: number): Limb {
  return { pin: add(hip, dir(torso), 5), bend: -1 }
}

/**
 * Hands crossed on the chest, seen from the side, with the trunk turned by
 * `turn` (0 = square, 1 = turned towards the near side, about 60–70°).
 * Square: both elbows in front of the chest, below shoulder height, hands
 * back at the opposite shoulders. Turned: the near shoulder goes back, so the
 * near elbow sweeps back to below the shoulder; the far elbow comes forward.
 * Angles are relative to the torso, so a forward lean carries the arms with it.
 */
function crossedArms(torso: number, turn: number): { armNear: Limb; armFar: Limb } {
  const lerp = (a: number, b: number) => a + (b - a) * turn
  const rel = (deg: number) => torso - 180 + deg
  return {
    armNear: { a: [rel(lerp(42, -12)), rel(lerp(205, 125))] },
    armFar: { a: [rel(lerp(48, 72)), rel(lerp(212, 250))] },
  }
}

/**
 * Back leg on the ball of the foot: the ankle is placed so the foot keeps a
 * neutral angle to the shin, with the toes fixed on the mat. As legs.ts.
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

/** Hip above `hipX`, placed so the front knee is bent by `flexion` degrees. As legs.ts. */
function splitHip(hipX: number, flexion: number, front: Vec): Vec {
  const d2 = BODY.thigh ** 2 + BODY.shin ** 2 + 2 * BODY.thigh * BODY.shin * Math.cos(flexion * RAD)
  return [hipX, front[1] - Math.sqrt(d2 - (front[0] - hipX) ** 2)]
}

const STAND_VIEW = [18, 2, 106, 114] as const

// ---------------------------------------------------------------- Y13 split-stance thoracic rotation

// Short staggered stance: front (near) foot ahead, back (far) foot flat behind, knees soft.
const Y13_FRONT: Vec = [82, ANKLE_FLOOR]
const Y13_BACK: Vec = [56, ANKLE_FLOOR]
const Y13_HIP: Vec = [68, ANKLE_FLOOR - 45.6]

function splitRotationPose(turn: number): Pose {
  const torso = 178
  return {
    hip: Y13_HIP,
    torso,
    head: torso,
    ...crossedArms(torso, turn),
    legNear: { pin: Y13_FRONT, bend: 1 },
    legFar: { pin: Y13_BACK, bend: 1 },
    footNear: 90,
    footFar: 90,
  }
}

const splitStanceRotation: Exercise = {
  id: 'Y13',
  name: 'Split-stance thoracic rotation',
  group: 'mobility',
  cls: 'flow',
  components: ['mobility'],
  muscles: ['Thoracic rotators', 'Obliques'],
  measure: 'seconds',
  target: [30, 45],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Short staggered stance, knees soft, hands crossed on the chest.',
    'Turn the chest slowly towards the front leg, keeping the hips square.',
    'Return to the centre and repeat; switch legs at the signal.',
  ],
  cautions: [UPPER_BACK],
  animation: {
    frames: [
      { pose: splitRotationPose(0), move: 1.8, hold: 0.5, label: 'Centre' },
      { pose: splitRotationPose(1), move: 2, hold: 0.8, label: 'Rotate' },
    ],
    viewBox: [26, 2, 96, 114],
  },
}

// ---------------------------------------------------------------- Y14 reverse lunge with rotation

// As K7 in legs.ts: the front (near) foot stays planted, the back (far) leg steps back and returns.
const LUNGE_FRONT: Vec = [78, ANKLE_FLOOR]
const LUNGE_BACK_TOE: Vec = [LUNGE_FRONT[0] - 45, GROUND_Y - 5]
const LUNGE_STAND_HIP: Vec = [LUNGE_FRONT[0] - 1, ANKLE_FLOOR - (BODY.thigh + BODY.shin - 0.2)]
/** Shallow lunge: front knee bent about 60°. */
const LUNGE_BOTTOM_HIP = splitHip(LUNGE_FRONT[0] - 22, 60, LUNGE_FRONT)
const LUNGE_LEAN = 4

function lungeStand(): Pose {
  const leg = { pin: LUNGE_FRONT, bend: 1 as const }
  return {
    hip: LUNGE_STAND_HIP,
    torso: 180,
    head: 180,
    ...crossedArms(180, 0),
    legNear: leg,
    legFar: leg,
    footNear: 90,
    footFar: 90,
  }
}

function lungeSwing(hip: Vec, lean: number, thigh: number, shin: number, foot: number): Pose {
  const torso = 180 - lean
  return {
    hip,
    torso,
    head: torso,
    ...crossedArms(torso, 0),
    legNear: { pin: LUNGE_FRONT, bend: 1 },
    legFar: { a: [thigh, shin] },
    footNear: 90,
    footFar: foot,
  }
}

function lungePose(hip: Vec, turn: number): Pose {
  const torso = 180 - LUNGE_LEAN
  const back = backLeg(hip, LUNGE_BACK_TOE)
  return {
    hip,
    torso,
    head: torso,
    ...crossedArms(torso, turn),
    legNear: { pin: LUNGE_FRONT, bend: 1 },
    legFar: back.leg,
    footNear: 90,
    footFar: back.foot,
  }
}

const reverseLungeRotation: Exercise = {
  id: 'Y14',
  name: 'Reverse lunge with rotation',
  group: 'legs',
  cls: 'flow',
  components: ['strength', 'mobility'],
  muscles: ['Quadriceps', 'Gluteals', 'Obliques', 'Thoracic rotators'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Stand tall, hands crossed on the chest; fingertips on a wall for balance if needed.',
    'Step one foot back into a shallow lunge.',
    'At the bottom, turn the chest towards the front leg, then back to the centre.',
    'Push through the front foot to stand; alternate legs each rep.',
  ],
  cautions: [
    'Only once the knee ladder is at K6 or above.',
    KNEE_DEPTH,
    UPPER_BACK,
    KNEE_RED_FLAGS,
  ],
  animation: {
    frames: [
      { pose: lungeStand(), move: 1, hold: 0.4, label: 'Stand' },
      { pose: lungeSwing(add(LUNGE_STAND_HIP, [-10, 3]), 4, 332, 292, 30), move: 0.8, label: 'Step back' },
      { pose: lungePose(splitHip(LUNGE_FRONT[0] - 23, 20, LUNGE_FRONT), 0), move: 0.5, label: 'Step back' },
      { pose: lungePose(LUNGE_BOTTOM_HIP, 0), move: 1.5, hold: 0.2, label: 'Lower' },
      { pose: lungePose(LUNGE_BOTTOM_HIP, 1), move: 1.6, hold: 0.5, label: 'Rotate' },
      { pose: lungePose(LUNGE_BOTTOM_HIP, 0), move: 1.3, label: 'Centre' },
      { pose: lungeSwing(add(LUNGE_STAND_HIP, [-7, 3]), 4, 354, 300, 25), move: 1.2, label: 'Drive up' },
    ],
    viewBox: STAND_VIEW,
  },
}

// ---------------------------------------------------------------- Y15 standing world's greatest stretch

// Long split stance, back knee off the floor; the hips stay still (isometric split stance).
const WGS_FRONT: Vec = [94, ANKLE_FLOOR]
const WGS_BACK_TOE: Vec = [31, GROUND_Y - 5]
const WGS_HIP = splitHip(70, 85, WGS_FRONT)
const WGS_BACK = backLeg(WGS_HIP, WGS_BACK_TOE)

function wgsBase(lean: number): Omit<Pose, 'armNear' | 'armFar'> {
  const torso = 180 - lean
  return {
    hip: WGS_HIP,
    torso,
    head: torso + Math.min(lean, 40) * 0.2,
    legNear: { pin: WGS_FRONT, bend: 1 },
    legFar: WGS_BACK.leg,
    footNear: 90,
    footFar: WGS_BACK.foot,
  }
}

/** Front (near) thigh, a fraction `k` of the way from hip to knee. */
const WGS_KNEE = solve({ ...wgsBase(0), armNear: { a: [0, 0] }, armFar: { a: [0, 0] } }).legNear.mid
const onFrontThigh = (k: number): Vec => add(WGS_HIP, [(WGS_KNEE[0] - WGS_HIP[0]) * k, (WGS_KNEE[1] - WGS_HIP[1]) * k - 3])

/** A pinned hand that must be within reach of the shoulder (the tests check every pin is reached). */
function reach(base: Omit<Pose, 'armNear' | 'armFar'>, hand: Vec, bend: 1 | -1): Limb {
  const shoulder = add(base.hip, dir(base.torso), BODY.torso)
  const d = dist(shoulder, hand)
  if (d > BODY.upperArm + BODY.forearm - 0.3) throw new Error(`Y15: hand out of reach by ${(d - 31).toFixed(1)}`)
  return { pin: hand, bend }
}

const WGS_FAR_HAND = onFrontThigh(0.62)

function wgsSet(): Pose {
  const base = wgsBase(32)
  return { ...base, armNear: reach(base, onFrontThigh(0.78), -1), armFar: reach(base, WGS_FAR_HAND, -1) }
}

function wgsElbow(): Pose {
  const base = wgsBase(62)
  const shoulder = add(base.hip, dir(base.torso), BODY.torso)
  // Upper arm aimed at the inside of the front knee, forearm hanging towards the foot.
  const upper = angleTo(shoulder, add(WGS_KNEE, [-2, 0]))
  return { ...base, armNear: { a: [upper, 4] }, armFar: reach(base, WGS_FAR_HAND, -1) }
}

function wgsOpen(): Pose {
  const base = wgsBase(42)
  // Arm opened back level with the shoulder: never above it.
  return { ...base, armNear: { a: [270, 270] }, armFar: reach(base, WGS_FAR_HAND, -1) }
}

const standingWorldsGreatest: Exercise = {
  id: 'Y15',
  name: "Standing world's greatest stretch",
  group: 'mobility',
  cls: 'flow',
  components: ['mobility', 'strength'],
  muscles: ['Hip flexors (back leg)', 'Adductors', 'Thoracic rotators', 'Quadriceps'],
  measure: 'seconds',
  target: [30, 45],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Long split stance, back knee off the floor, hands on the front thigh.',
    'Lean forward and lower the same-side elbow towards the inside of the front knee.',
    'Turn the chest open and take that arm out to shoulder height, no higher.',
    'Return the hand to the thigh and repeat; then switch sides.',
  ],
  cautions: [
    'No hand on the floor (wrist-free).',
    'Only once the knee ladder is at K6 or above.',
    'Optional half-kneeling version (pad under the knee) only if kneeling pain is 2/10 or below (as M1).',
    UPPER_BACK,
  ],
  animation: {
    frames: [
      { pose: wgsSet(), move: 2, hold: 0.5, label: 'Hands on thigh' },
      { pose: wgsElbow(), move: 2, hold: 1, label: 'Elbow down' },
      { pose: wgsOpen(), move: 2, hold: 1.5, label: 'Open' },
    ],
    viewBox: [6, 10, 120, 106],
  },
}

// ---------------------------------------------------------------- front view (as squat-variants.ts)
//
// The near (dark) leg is on the right of the screen, the far (faded) leg on the
// left, and both legs start at the single hip point.

const CX = 70
const LEG = BODY.thigh + BODY.shin

/** Rotate a body-frame offset (x right, y down along an upright torso) by the torso tilt. */
function onTorso(origin: Vec, torso: number, [x, y]: Vec): Vec {
  const t = (180 - torso) * RAD
  return [origin[0] + x * Math.cos(t) - y * Math.sin(t), origin[1] + x * Math.sin(t) + y * Math.cos(t)]
}

// ---------------------------------------------------------------- Y22 standing hip circles

// Wall on the left of the screen; the far hand rests on it below shoulder height.
const HC_WALL = 40
const HC_STANCE: Vec = [CX - 4, ANKLE_FLOOR]
const HC_HIP: Vec = [CX - 2, ANKLE_FLOOR - Math.sqrt((LEG - 0.3) ** 2 - 4)]
const HC_WALL_HAND: Vec = [HC_WALL + 1.5, HC_HIP[1] - 16]

function hipCirclePose(leg: Limb, foot = 90): Pose {
  return {
    hip: HC_HIP,
    torso: 180,
    head: 180,
    // Near hand on the chest, clear of the lifting knee.
    armNear: { pin: onTorso(add(HC_HIP, dir(180), BODY.torso), 180, [1.2, 17]), bend: 1 },
    armFar: { pin: HC_WALL_HAND, bend: -1 },
    legNear: leg,
    legFar: { pin: HC_STANCE, bend: -1 },
    footNear: foot,
    footFar: 270,
  }
}

const HC_DOWN = hipCirclePose({ a: [16, 354] })
const HC_UP = hipCirclePose({ a: [140, 350] })
const HC_OUT = hipCirclePose({ a: [102, 30] })

const standingHipCircles: Exercise = {
  id: 'Y22',
  name: 'Standing hip circles',
  group: 'mobility',
  cls: 'flow',
  components: ['mobility'],
  muscles: ['Hip rotators', 'Hip flexors', 'Gluteus medius (stance leg)'],
  measure: 'seconds',
  target: [30, 45],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand side-on to a wall, the inside hand on it.',
    'Lift the outside knee, open it out to the side, then lower it.',
    'Draw slow, even circles; switch legs at the signal.',
  ],
  cautions: ['Pain-free range only.'],
  animation: {
    frames: [
      { pose: HC_DOWN, move: 2, hold: 0.3, label: 'Down' },
      { pose: HC_UP, move: 2, label: 'Knee up' },
      { pose: HC_OUT, move: 2, label: 'Knee out' },
    ],
    wall: { x: HC_WALL },
    viewBox: [CX - 40, 2, 86, 114],
  },
}

// ---------------------------------------------------------------- Y23 leg swings with wall support

// Side view. The wall is beside the figure, on the far side: the far hand rests on it
// at chest height. The far leg stands; the near leg swings.
const LS_ANKLE: Vec = [66, ANKLE_FLOOR]
const LS_HIP: Vec = [65, ANKLE_FLOOR - Math.sqrt((LEG - 0.15) ** 2 - 1)]

function legSwingPose(thigh: number, knee: number): Pose {
  const shoulder = add(LS_HIP, dir(180), BODY.torso)
  // Thigh forward (positive) or back (negative) of vertical; the knee bends a little.
  const t = (thigh + 360) % 360
  const shin = (thigh - knee + 360) % 360
  return {
    hip: LS_HIP,
    torso: 180,
    head: 180,
    armNear: handsOnHips(LS_HIP, 180),
    armFar: { pin: add(shoulder, [9, 13]), bend: -1 },
    legNear: { a: [t, shin] },
    legFar: { pin: LS_ANKLE, bend: 1 },
    footNear: (shin + 90 - (thigh > 0 ? 10 : -15) + 360) % 360,
    footFar: 90,
  }
}

const legSwings: Exercise = {
  id: 'Y23',
  name: 'Leg swings with wall support',
  group: 'mobility',
  cls: 'flow',
  components: ['mobility', 'pulse'],
  muscles: ['Hip flexors', 'Hamstrings', 'Adductors', 'Abductors'],
  measure: 'seconds',
  target: [30, 45],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Stand side-on to a wall, the inside hand on it, trunk tall.',
    'Swing the outside leg forward and back, starting small and building the range.',
    'Then swing it side to side in front of the body; switch legs at the signal.',
  ],
  cautions: ['Controlled, not ballistic: stop short of the end of your range.'],
  animation: {
    frames: [
      { pose: legSwingPose(28, 6), move: 1.3, label: 'Forward' },
      { pose: legSwingPose(-12, 8), move: 1.3, label: 'Back' },
      { pose: legSwingPose(45, 10), move: 1.4, label: 'Forward' },
      { pose: legSwingPose(-18, 10), move: 1.4, label: 'Back' },
      { pose: legSwingPose(60, 14), move: 1.5, label: 'Wider' },
      { pose: legSwingPose(-22, 12), move: 1.5, label: 'Back' },
    ],
    viewBox: [24, 2, 96, 114],
  },
}

// ---------------------------------------------------------------- M10 90/90 hip switches (seated)

// Top view (camera above, as M6): the hip is at the centre, the trunk leans back
// towards the right of the frame with the hands on the floor behind, and the legs
// lie on the mat to the left. In 90/90 the front thigh points forward with the
// shin across in front; the back thigh points to the side with the shin behind.
// Between positions both knees come up (shadow) and over to the other side.
const SEAT_HIP: Vec = [72, 60]

function seatedPose(legNear: Limb, legFar: Limb, legsUp: number): Pose {
  return {
    hip: SEAT_HIP,
    torso: 90,
    head: 90,
    armNear: { a: [44, 34] },
    armFar: { a: [136, 146] },
    legNear,
    legFar,
    footNear: undefined,
    footFar: undefined,
    lift: { chest: 0.8, legs: legsUp },
  }
}

// Knees to the near side (lower half of the frame): far leg in front, near leg to the side.
const NN_NEAR = seatedPose({ a: [6, 92] }, { a: [272, 4] }, 0)
// Knees up in the middle.
const NN_MID = seatedPose({ a: [305, 250] }, { a: [235, 290] }, 0.7)
// Knees to the far side (upper half): near leg in front, far leg to the side.
const NN_FAR = seatedPose({ a: [268, 176] }, { a: [174, 88] }, 0)

const hipSwitches: Exercise = {
  id: 'M10',
  name: '90/90 hip switches (seated)',
  group: 'mobility',
  cls: 'drill',
  muscles: ['Hip rotators'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Sit with the feet flat and wide, knees bent, hands on the floor behind you if needed.',
    'Let both knees fall to one side into a 90/90: front shin across, back shin behind.',
    'Lift the knees back through the middle and lower them to the other side.',
  ],
  cautions: ['Controlled range; ease off if either knee is irritated.'],
  animation: {
    frames: [
      { pose: NN_NEAR, move: 2, hold: 1, label: 'Switch' },
      { pose: NN_MID, move: 1.2, label: 'Knees up' },
      { pose: NN_FAR, move: 1.2, hold: 1, label: 'Switch' },
      { pose: NN_MID, move: 1.2, label: 'Knees up' },
    ],
    view: 'top',
    viewBox: [14, 14, 120, 92],
  },
}

export const Y_ROTATE: Exercise[] = [
  splitStanceRotation,
  reverseLungeRotation,
  standingWorldsGreatest,
  standingHipCircles,
  legSwings,
  hipSwitches,
]
