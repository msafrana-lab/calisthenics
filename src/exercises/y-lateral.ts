// Lateral Y moves (docs/EVIDENCE.md, "Y. Dynamic jump-free moves"): Y5 skater
// step, Y6 lateral shuffle with low reach, Y16 wide-stance side shift and Y17
// Cossack shift with forward reach.
//
// All four are drawn from the front, as in squat-variants.ts (K3w, K10, K11):
// the near (dark) leg is on the right of the screen, the far (faded) leg on the
// left, and both legs start at the single hip point. Knee bend shows as the
// knee travelling out over the turned-out toes. Weight-bearing feet are pinned;
// a stepping foot is pinned to a point just above the floor while it is in the
// air, so one foot is always on the floor and nothing passes through it.
import { add, BODY, dir, dist, type Limb, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR } from './helpers'
import type { Exercise } from './types'

const RAD = Math.PI / 180

// ---------------------------------------------------------------- front-view geometry (as in squat-variants.ts)

const CX = 70
const LEG = BODY.thigh + BODY.shin
/** Ankle height when the heel is lifted and the foot rests on its ball. */
const ANKLE_TOES = ANKLE_FLOOR - 3
/** Ankle height of a foot moving just above the floor. */
const ANKLE_AIR = ANKLE_FLOOR - 6

/** Ankle-to-hip distance for a knee bent by `flexion` degrees. */
const legSpan = (flexion: number) =>
  Math.sqrt(BODY.thigh ** 2 + BODY.shin ** 2 + 2 * BODY.thigh * BODY.shin * Math.cos(flexion * RAD))

/** Rotate a body-frame offset (x right, y down along an upright torso) by the torso tilt. */
function onTorso(origin: Vec, torso: number, [x, y]: Vec): Vec {
  const t = (180 - torso) * RAD
  return [origin[0] + x * Math.cos(t) - y * Math.sin(t), origin[1] + x * Math.sin(t) + y * Math.cos(t)]
}

/**
 * Hip position for a side shift: the knee over `bent` is flexed by `flexion`
 * degrees and the leg to `straight` is almost straight.
 */
function shiftHip(bent: Vec, straight: Vec, flexion: number): Vec {
  const r1 = legSpan(flexion)
  const r2 = LEG - 0.15
  const d = dist(bent, straight)
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d)
  const h = Math.sqrt(r1 * r1 - a * a)
  const ux = (straight[0] - bent[0]) / d
  const uy = (straight[1] - bent[1]) / d
  const base: Vec = [bent[0] + a * ux, bent[1] + a * uy]
  // The intersection above the floor.
  const p1: Vec = [base[0] - h * uy, base[1] + h * ux]
  const p2: Vec = [base[0] + h * uy, base[1] - h * ux]
  return p1[1] < p2[1] ? p1 : p2
}

/** Hip height over an ankle `dx` away sideways with the knee bent by `flexion` degrees. */
const hipY = (dx: number, flexion: number, ankleY = ANKLE_FLOOR) => ankleY - Math.sqrt(legSpan(flexion) ** 2 - dx ** 2)

const shoulderOf = (hip: Vec, torso: number) => add(hip, dir(torso), BODY.torso)

type Arms = { armNear: Limb; armFar: Limb }

/** Hands together in front of the chest (or reaching forward at chest height), elbows out. */
function chestArms(hip: Vec, torso: number, spread = 1.2, down = 17): Arms {
  const s = shoulderOf(hip, torso)
  return {
    armNear: { pin: onTorso(s, torso, [spread, down]), bend: 1 },
    armFar: { pin: onTorso(s, torso, [-spread, down]), bend: -1 },
  }
}

/** Hands on the hips, elbows out. */
function hipArms(hip: Vec, torso: number): Arms {
  return {
    armNear: { pin: onTorso(hip, torso, [5.5, -6]), bend: 1 },
    armFar: { pin: onTorso(hip, torso, [-5.5, -6]), bend: -1 },
  }
}

type Front = {
  hip: Vec
  torso?: number
  /** Far leg (left on screen) and near leg (right on screen): ankle points. */
  left: Vec
  right: Vec
  arms: Arms
  /** Foot directions: 270 = toes out to the left, 90 = out to the right. */
  footLeft?: number
  footRight?: number
  /** Knee fold direction of each leg; the default folds the knees outwards. */
  bendLeft?: 1 | -1
  bendRight?: 1 | -1
}

function frontPose({ hip, torso = 180, left, right, arms, footLeft = 270, footRight = 90, bendLeft = -1, bendRight = 1 }: Front): Pose {
  return {
    hip,
    torso,
    head: torso,
    ...arms,
    legNear: { pin: right, bend: bendRight },
    legFar: { pin: left, bend: bendLeft },
    footNear: footRight,
    footFar: footLeft,
  }
}

/** Mirror a pose about the vertical line x = CX, swapping the near and far sides. */
function mirror(p: Pose): Pose {
  const mx = (v: Vec): Vec => [2 * CX - v[0], v[1]]
  const ma = (a: number) => (360 - a) % 360
  const limb = (l: Limb): Limb => ('pin' in l ? { pin: mx(l.pin), bend: (-l.bend) as 1 | -1 } : { a: [ma(l.a[0]), ma(l.a[1])] })
  return {
    hip: mx(p.hip),
    torso: ma(p.torso),
    head: ma(p.head),
    armNear: limb(p.armFar),
    armFar: limb(p.armNear),
    legNear: limb(p.legFar),
    legFar: limb(p.legNear),
    footNear: p.footFar === undefined ? undefined : ma(p.footFar),
    footFar: p.footNear === undefined ? undefined : ma(p.footNear),
  }
}

// ---------------------------------------------------------------- shared text

const KNEE_DEPTH_STEP = 'No deeper than your current squat step allows.'
const KNEE_RED_FLAGS = 'Stop and seek assessment if the knee swells, locks, gives way or the pain is sharp.'
const ARMS_LOW = 'Arms stay at or below shoulder height.'

// ---------------------------------------------------------------- Y5 skater step

// Stance on the right (near) foot, knee bent about 30°; the left foot rests
// on its ball diagonally behind and just past the right foot; the left hand
// reaches across towards the right knee, the right arm swings back.
const SK_RIGHT: Vec = [CX + 11, ANKLE_FLOOR]
const SK_LEFT: Vec = [CX - 11, ANKLE_FLOOR]
const SK_FLEX = 30
const SK_HIP: Vec = [SK_RIGHT[0] - 3, hipY(3, SK_FLEX)]
const SK_TORSO = 186
const SK_BEHIND: Vec = [SK_RIGHT[0] + 7, ANKLE_TOES]

function skaterArms(hip: Vec, torso: number): Arms {
  const s = shoulderOf(hip, torso)
  return {
    // Right arm swings back and out to the side.
    armNear: { a: [52, 70] },
    // Left hand across the body towards the right knee.
    armFar: { pin: [s[0] + 10, s[1] + 29], bend: -1 },
  }
}

const SK_A = frontPose({
  hip: SK_HIP,
  torso: SK_TORSO,
  left: SK_BEHIND,
  right: SK_RIGHT,
  arms: skaterArms(SK_HIP, SK_TORSO),
  footLeft: 60,
})
// The left foot leaves the floor and swings out to the side, just above it.
const SK_SWING_HIP: Vec = [CX + 3, hipY(SK_RIGHT[0] - CX - 3, 12)]
const SK_SWING = frontPose({
  hip: SK_SWING_HIP,
  left: [CX - 6, ANKLE_AIR],
  right: SK_RIGHT,
  arms: chestArms(SK_SWING_HIP, 180, 3, 22),
})
// The left foot lands; the weight moves over it.
const SK_LAND_HIP: Vec = [CX - 1, hipY(SK_RIGHT[0] - CX + 1, 10)]
const SK_LAND = frontPose({
  hip: SK_LAND_HIP,
  left: SK_LEFT,
  right: SK_RIGHT,
  arms: chestArms(SK_LAND_HIP, 180, 3, 22),
})
// The right foot lifts to pass behind the left.
const SK_LIFT_HIP: Vec = [SK_LEFT[0] + 4, hipY(4, 20)]
const SK_LIFT = frontPose({
  hip: SK_LIFT_HIP,
  torso: 177,
  left: SK_LEFT,
  right: [CX - 2, ANKLE_AIR],
  arms: chestArms(SK_LIFT_HIP, 177, 3, 22),
})
const SK_B = mirror(SK_A)

// ---------------------------------------------------------------- Y6 lateral shuffle with low reach

// Half-squat, feet a hip-width apart ("together") or about twice that ("wide").
// Two step-together steps to the right, reach low on the right, then two back
// to the left and reach low on the left. The stepping foot moves just above the
// floor; the feet never cross.
const SH_FLEX = 45
const SH_HIP_Y = hipY(6, SH_FLEX) + 1
const SH_NARROW = 5
const SH_WIDE = 11
const SH_REACH_TORSO = 152

type Feet = { l: number; r: number }

function shufflePose(feet: { l: Vec; r: Vec }, hipX: number, hipDy = 0): Pose {
  const hip: Vec = [hipX, SH_HIP_Y + hipDy]
  return frontPose({ hip, left: feet.l, right: feet.r, arms: chestArms(hip, 180, 2.5, 18) })
}

/** Reach low towards the outside of the lead knee (dir 1 = right, -1 = left). */
function shuffleReach(feet: Feet, side: 1 | -1): Pose {
  const c = (feet.l + feet.r) / 2
  const hip: Vec = [c - side * 2, SH_HIP_Y + 4]
  const p = frontPose({
    hip,
    torso: SH_REACH_TORSO,
    left: [feet.l, ANKLE_FLOOR],
    right: [feet.r, ANKLE_FLOOR],
    arms: {
      armNear: { a: [25, 10] },
      armFar: { pin: onTorso(shoulderOf(hip, SH_REACH_TORSO), SH_REACH_TORSO, [7, 17]), bend: -1 },
    },
  })
  return side === 1 ? p : mirror(p)
}

function buildShuffle() {
  const frames: { pose: Pose; move: number; hold?: number; label?: string }[] = []
  const LIFT = 0.25
  const PLANT = 0.25
  // Start wide on the left, ready to step to the right.
  let feet: Feet = { l: CX - 12 - SH_WIDE, r: CX - 12 + SH_WIDE }
  const passes: (1 | -1)[] = [1, -1]
  for (const side of passes) {
    // Two step-together steps: the trailing foot comes in, then the lead foot steps out.
    const lead = side === 1 ? 'r' : 'l'
    const trail = side === 1 ? 'l' : 'r'
    const moves: ('lead' | 'trail')[] = ['trail', 'lead', 'trail', 'lead']
    for (const m of moves) {
      const key = m === 'lead' ? lead : trail
      const from = feet[key]
      const to = from + side * 2 * (SH_WIDE - SH_NARROW)
      const next = { ...feet, [key]: to }
      const cNow = (feet.l + feet.r) / 2
      const cNext = (next.l + next.r) / 2
      const air: Vec = [(from + to) / 2, ANKLE_AIR + 2]
      const pinned = (k: 'l' | 'r', f: Feet): Vec => [f[k], ANKLE_FLOOR]
      const liftFeet = key === 'l' ? { l: air, r: pinned('r', feet) } : { l: pinned('l', feet), r: air }
      frames.push({ pose: shufflePose(liftFeet, (cNow + cNext) / 2, -0.8), move: LIFT, label: 'Shuffle' })
      frames.push({ pose: shufflePose({ l: pinned('l', next), r: pinned('r', next) }, cNext), move: PLANT, label: 'Shuffle' })
      feet = next
    }
    frames.push({ pose: shuffleReach(feet, side), move: 0.7, hold: 0.3, label: 'Reach' })
  }
  return frames
}

const SH_FRAMES = buildShuffle()

// ---------------------------------------------------------------- Y16 wide-stance side shift

// Feet about twice hip width; shift with the knee bent about 40° (≤45°), the
// other leg straight, heels flat, hands on the hips.
const SS_HALF = 19
const SS_LEFT: Vec = [CX - SS_HALF, ANKLE_FLOOR]
const SS_RIGHT: Vec = [CX + SS_HALF, ANKLE_FLOOR]
const SS_CENTRE_HIP: Vec = [CX, hipY(SS_HALF, 8)]
const SS_SHIFT_HIP = shiftHip(SS_RIGHT, SS_LEFT, 40)

const SS_CENTRE = frontPose({ hip: SS_CENTRE_HIP, left: SS_LEFT, right: SS_RIGHT, arms: hipArms(SS_CENTRE_HIP, 180) })
const SS_SHIFT_TORSO = 177
const SS_SHIFT = frontPose({
  hip: SS_SHIFT_HIP,
  torso: SS_SHIFT_TORSO,
  left: SS_LEFT,
  right: SS_RIGHT,
  arms: hipArms(SS_SHIFT_HIP, SS_SHIFT_TORSO),
})

// ---------------------------------------------------------------- Y17 Cossack shift with forward reach

// Wider than Y16; the bent knee goes to about 80°, shallower than K11 (hips at
// y 82 there). Hands reach forward at chest height as a counterbalance; seen
// from the front they sit in front of the chest.
const CS_HALF = 27
const CS_LEFT: Vec = [CX - CS_HALF, ANKLE_FLOOR]
const CS_RIGHT: Vec = [CX + CS_HALF, ANKLE_FLOOR]
const CS_CENTRE_HIP: Vec = [CX, hipY(CS_HALF, 10)]
const CS_SHIFT_HIP = shiftHip(CS_RIGHT, CS_LEFT, 80)
const CS_SHIFT_TORSO = 174

const CS_CENTRE = frontPose({ hip: CS_CENTRE_HIP, left: CS_LEFT, right: CS_RIGHT, arms: chestArms(CS_CENTRE_HIP, 180, 1.2, 15) })
const CS_SHIFT = frontPose({
  hip: CS_SHIFT_HIP,
  torso: CS_SHIFT_TORSO,
  left: CS_LEFT,
  right: CS_RIGHT,
  arms: chestArms(CS_SHIFT_HIP, CS_SHIFT_TORSO, 4, 20),
})

const FRONT_VIEW = [CX - 54, 2, 108, 114] as const
const SHUFFLE_VIEW = [CX - 64, 2, 128, 114] as const

// ---------------------------------------------------------------- exercises

const skaterStep: Exercise = {
  id: 'Y5',
  name: 'Skater step (no hop)',
  group: 'legs',
  cls: 'flow',
  components: ['pulse', 'strength'],
  muscles: ['Gluteus medius', 'Gluteus maximus', 'Quadriceps', 'Adductors'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Shift onto one foot and step the other foot diagonally behind it, landing lightly on the ball of the foot.',
    'Bend the front knee to about 30°, no deeper than your current squat step; heel flat, knee over the toes.',
    'Reach the opposite hand across towards the front knee, at or below chest height.',
    'Step the back foot out to the side and switch sides; keep a steady rhythm.',
  ],
  cautions: ['Never hop: one foot stays on the floor at all times.', 'The front knee tracks over the toes.', KNEE_DEPTH_STEP, KNEE_RED_FLAGS],
  animation: {
    frames: [
      { pose: SK_A, move: 0.45, hold: 0.25, label: 'Reach' },
      { pose: SK_SWING, move: 0.35, label: 'Step out' },
      { pose: SK_LAND, move: 0.3, label: 'Step out' },
      { pose: SK_LIFT, move: 0.25, label: 'Step back' },
      { pose: SK_B, move: 0.45, hold: 0.25, label: 'Reach' },
      { pose: mirror(SK_SWING), move: 0.35, label: 'Step out' },
      { pose: mirror(SK_LAND), move: 0.3, label: 'Step out' },
      { pose: mirror(SK_LIFT), move: 0.25, label: 'Step back' },
    ],
    viewBox: FRONT_VIEW,
  },
}

const lateralShuffle: Exercise = {
  id: 'Y6',
  name: 'Lateral shuffle with low reach',
  group: 'legs',
  cls: 'flow',
  components: ['pulse', 'strength'],
  muscles: ['Gluteus medius', 'Quadriceps', 'Hamstrings', 'Calves'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Half-squat, feet hip-width apart, hands in front of the chest; no deeper than your current squat step.',
    'Take 2–3 step-together steps sideways: the lead foot steps out, the other follows; the feet never cross.',
    'Hinge at the hips and reach one hand towards knee height, back flat, heels down.',
    'Shuffle back the other way and reach on that side.',
  ],
  cautions: [
    'Feet never cross and never leave the floor together: no hop.',
    'Needs 2–3 m of clear floor.',
    'Skip this move if knee pain was above 2/10 on K3 in the last 2 weeks.',
    KNEE_RED_FLAGS,
  ],
  animation: { frames: SH_FRAMES, viewBox: SHUFFLE_VIEW },
}

const wideSideShift: Exercise = {
  id: 'Y16',
  name: 'Wide-stance side shift',
  group: 'mobility',
  cls: 'flow',
  components: ['mobility', 'strength'],
  muscles: ['Adductors', 'Quadriceps', 'Gluteals'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Feet about twice hip width, toes turned out slightly, hands on the hips (or fingertips on a wall).',
    'Shift your weight to one side, bending that knee no more than about 45°; the other leg stays straight.',
    'Heels flat, knee over the toes; shift smoothly through the middle to the other side.',
  ],
  cautions: ['Heels stay flat; the bent knee tracks over the toes.', KNEE_RED_FLAGS],
  animation: {
    frames: [
      { pose: SS_CENTRE, move: 0.9, label: 'Centre' },
      { pose: SS_SHIFT, move: 1.2, hold: 0.4, label: 'Shift' },
      { pose: SS_CENTRE, move: 0.9, label: 'Centre' },
      { pose: mirror(SS_SHIFT), move: 1.2, hold: 0.4, label: 'Shift' },
    ],
    viewBox: FRONT_VIEW,
  },
}

const cossackShift: Exercise = {
  id: 'Y17',
  name: 'Cossack shift with forward reach',
  group: 'legs',
  cls: 'flow',
  components: ['strength', 'mobility'],
  muscles: ['Quadriceps', 'Gluteals', 'Adductors'],
  measure: 'seconds',
  target: [30, 45],
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Wide stance, toes turned out slightly; reach both hands forward at chest height.',
    'Shift to one side and sit into that hip to pain-free depth, heel flat; the other leg straightens.',
    'Stay shallower than your lateral lunge or Cossack squat step; knee over the toes.',
    'Push back up through the middle and shift to the other side.',
  ],
  cautions: [
    'Requires the knee ladder at K4 or above.',
    'Skip this move if knee pain was 3/10 or more in the last 2 weeks.',
    'Side lunges load the front of the knee more than forward lunges at mid-to-deep knee bend; stay shallower than K10 and K11.',
    ARMS_LOW,
    KNEE_RED_FLAGS,
  ],
  animation: {
    frames: [
      { pose: CS_CENTRE, move: 1, label: 'Centre' },
      { pose: CS_SHIFT, move: 1.4, hold: 0.4, label: 'Shift' },
      { pose: CS_CENTRE, move: 1, label: 'Centre' },
      { pose: mirror(CS_SHIFT), move: 1.4, hold: 0.4, label: 'Shift' },
    ],
    viewBox: FRONT_VIEW,
  },
}

export const Y_LATERAL: Exercise[] = [skaterStep, lateralShuffle, wideSideShift, cossackShift]
