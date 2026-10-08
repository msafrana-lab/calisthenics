// Mobility and stretching pool (M) — docs/EVIDENCE.md, "Exercise candidates" (M table) and R9.
import { add, angleTo, BODY, dir, dist, type Keyframe, type Pose, type Vec } from '../animation/skeleton'
import { ANKLE_FLOOR, FLOOR, HAND_FLOOR } from './helpers'
import type { Exercise } from './types'

const STRETCH_CUE = 'Hold at mild tension, not pain, and breathe slowly.'

/** Static stretch: ease into the stretch, hold, release (the loop starts at `start`). */
function stretchFrames(start: Pose, end: Pose, easeIn = 2.2, inLabel = 'Ease in'): Keyframe[] {
  return [
    { pose: end, move: easeIn, label: inLabel },
    { pose: end, move: 0.2, hold: 3.5, label: 'Hold' },
    { pose: start, move: 1.6, hold: 1, label: 'Release' },
  ]
}

const ARM = BODY.upperArm + BODY.forearm
/**
 * The figure has no hands: the arm ends at the wrist. A hand holding `target`
 * is drawn as a straight-ish arm pointing at it, the wrist up to a hand's
 * length short of it (the round line caps close most of that gap).
 */
const HAND = 4.5
function holdAt(shoulder: Vec, target: Vec, reach = ARM - 0.6): Vec {
  const d = dist(shoulder, target)
  if (d - reach > HAND) throw new Error(`target out of reach by ${(d - reach - HAND).toFixed(1)}`)
  return add(shoulder, dir(angleTo(shoulder, target)), Math.min(d, reach))
}

// ---------------------------------------------------------------- M1 half-kneeling hip flexor stretch

const M1_KNEE: Vec = [52, FLOOR]
const M1_FRONT_ANKLE: Vec = [86, ANKLE_FLOOR]

/** `lean`: how far the back thigh tilts behind vertical as the pelvis moves forward (hip extension). */
function hipFlexorPose(lean: number): Pose {
  const thigh = 360 - lean // direction hip → back knee
  const hip = add(M1_KNEE, dir(thigh), -BODY.thigh)
  return {
    hip,
    torso: 180,
    head: 180,
    armNear: { a: [6, 18] },
    armFar: { a: [10, 22] },
    legNear: { a: [thigh, 270] },
    legFar: { pin: M1_FRONT_ANKLE, bend: 1 },
    footNear: 270,
    footFar: 90,
  }
}

const hipFlexorStretch: Exercise = {
  id: 'M1',
  name: 'Half-kneeling hip flexor stretch',
  group: 'mobility',
  cls: 'stretch',
  muscles: ['Hip flexors'],
  measure: 'seconds',
  target: [30, 30],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Kneel on one knee on a folded mat or pad, front foot flat with the front knee above the ankle.',
    'Tuck the pelvis under and squeeze the glute of the back leg.',
    'Shift the hips slightly forward, trunk upright, until you feel the front of the back hip stretch.',
    STRETCH_CUE,
  ],
  cautions: [
    'Knees: always pad the kneeling knee; if kneeling hurts, do the stretch standing in a split stance instead.',
  ],
  animation: {
    frames: stretchFrames(hipFlexorPose(0), hipFlexorPose(18)),
    viewBox: [16, 26, 100, 90],
  },
}

// ---------------------------------------------------------------- supine base (M2, M3, M12)

const SUP_HIP: Vec = [78, FLOOR]
const SUP_SHOULDER = add(SUP_HIP, dir(270), BODY.torso)
const SUP_HEAD = 262
/** Bent knee, foot flat on the mat. */
const supineFoot = (x: number) => ({ pin: [x, ANKLE_FLOOR] as Vec, bend: 1 as const })

// ---------------------------------------------------------------- M2 supine hamstring stretch

const HAM_THIGH = 193 // about 100° hip flexion, thigh held still with both hands

/** `knee`: knee flexion of the raised leg in degrees. */
function hamstringPose(knee: number): Pose {
  const hand = { pin: holdAt(SUP_SHOULDER, add(SUP_HIP, dir(HAM_THIGH), 15)), bend: 1 as const }
  return {
    hip: SUP_HIP,
    torso: 270,
    head: SUP_HEAD,
    armNear: hand,
    armFar: hand,
    legNear: { a: [HAM_THIGH, HAM_THIGH - knee] },
    legFar: supineFoot(SUP_HIP[0] + 30),
    footFar: 90,
  }
}

const hamstringStretch: Exercise = {
  id: 'M2',
  name: 'Supine hamstring stretch',
  group: 'mobility',
  cls: 'stretch',
  muscles: ['Hamstrings'],
  measure: 'seconds',
  target: [30, 30],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Lie on your back with the other knee bent and that foot flat.',
    'Lift one leg and hold behind the thigh with both hands, hip bent to about 90°.',
    'Slowly straighten the knee until you feel a stretch behind the thigh; it can stay slightly bent.',
    STRETCH_CUE,
  ],
  animation: {
    frames: stretchFrames(hamstringPose(85), hamstringPose(25)),
    viewBox: [22, 44, 110, 72],
  },
}

// ---------------------------------------------------------------- M3 supine figure-4 stretch

/** `crossed`: false = both feet flat; true = ankle resting on the other thigh just above the knee. */
function figure4Pose(crossed: boolean): Pose {
  const support = supineFoot(SUP_HIP[0] + 26)
  // Support knee, solved from the planted foot as the renderer does.
  const d = dist(SUP_HIP, support.pin)
  const alpha = (Math.acos((BODY.thigh ** 2 + d * d - BODY.shin ** 2) / (2 * BODY.thigh * d)) * 180) / Math.PI
  const knee = add(SUP_HIP, dir(angleTo(SUP_HIP, support.pin) + alpha), BODY.thigh)
  const arm = { a: [93, 93] as const }
  return {
    hip: SUP_HIP,
    torso: 270,
    head: SUP_HEAD,
    armNear: arm,
    armFar: arm,
    legNear: crossed ? { pin: add(knee, dir(angleTo(knee, SUP_HIP)), 3), bend: 1 } : support,
    legFar: support,
    footNear: crossed ? undefined : 90,
    footFar: 90,
  }
}

const figure4Stretch: Exercise = {
  id: 'M3',
  name: 'Supine figure-4 stretch',
  group: 'mobility',
  cls: 'stretch',
  muscles: ['Gluteals', 'Piriformis'],
  measure: 'seconds',
  target: [30, 30],
  perSide: true,
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Lie on your back, knees bent, feet flat.',
    'Cross one ankle over the other thigh, just above the knee, and let the crossed knee open out to the side.',
    'For more stretch, lift the support foot and draw that thigh gently towards you with your hands behind it.',
    STRETCH_CUE,
  ],
  cautions: [
    'Knees: ease off if the knee of the crossed leg is irritated; keep the support foot on the floor for a lighter stretch.',
  ],
  animation: {
    frames: stretchFrames(figure4Pose(false), figure4Pose(true), 2, 'Cross'),
    viewBox: [22, 44, 110, 72],
  },
}

// ---------------------------------------------------------------- M4 wall calf stretch

// The figure faces left, towards the wall.
const CALF_WALL = 30
const CALF_BACK_ANKLE: Vec = [CALF_WALL + 60, ANKLE_FLOOR]
const CALF_FRONT_ANKLE: Vec = [CALF_WALL + 33, ANKLE_FLOOR]
const CALF_HAND: Vec = [CALF_WALL + 1, 35]

/** `lean`: tilt of the straight back leg from vertical; `kneeBend`: how far the hips sink to bend the back knee. */
function calfPose(lean: number, kneeBend: number): Pose {
  const legLine = 180 + lean // back ankle → hip, leaning towards the wall
  let hip = add(CALF_BACK_ANKLE, dir(legLine), BODY.thigh + BODY.shin - 0.6)
  hip = add(hip, [-kneeBend * 0.35, kneeBend])
  const torso = 180 + lean + 3
  const hand = { pin: CALF_HAND, bend: 1 as const }
  return {
    hip,
    torso,
    head: torso - 3,
    armNear: hand,
    armFar: hand,
    legNear: { pin: CALF_BACK_ANKLE, bend: -1 },
    legFar: { pin: CALF_FRONT_ANKLE, bend: -1 },
    footNear: 270,
    footFar: 270,
  }
}

const CALF_START = calfPose(20.5, 0)
const CALF_STRAIGHT = calfPose(25, 0)
const CALF_BENT = calfPose(24, 5)

const calfStretch: Exercise = {
  id: 'M4',
  name: 'Wall calf stretch',
  group: 'mobility',
  cls: 'stretch',
  muscles: ['Gastrocnemius', 'Soleus'],
  measure: 'seconds',
  target: [30, 30],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: [],
  cues: [
    'Hands on the wall, one foot a long step back, both feet pointing at the wall.',
    'Keep the back heel down and the back knee straight; lean the hips towards the wall.',
    'Then bend the back knee slightly, heel still down, to move the stretch lower in the calf.',
    STRETCH_CUE,
  ],
  animation: {
    frames: [
      { pose: CALF_STRAIGHT, move: 2, label: 'Ease in' },
      { pose: CALF_STRAIGHT, move: 0.2, hold: 3.5, label: 'Hold' },
      { pose: CALF_BENT, move: 1.5, label: 'Bend knee' },
      { pose: CALF_BENT, move: 0.2, hold: 3.5, label: 'Hold' },
      { pose: CALF_START, move: 1.6, hold: 1, label: 'Release' },
    ],
    wall: { x: CALF_WALL },
    viewBox: [14, 4, 100, 112],
  },
}

// ---------------------------------------------------------------- top view, lying on the side (M5, M6)
// Head to the right, front of the body towards the top of the frame, back towards the bottom.

const SIDE_HIP: Vec = [66, 60]

// ---------------------------------------------------------------- M5 side-lying quadriceps stretch

/** `pull`: false = top leg resting on the bottom one; true = heel drawn towards the buttock, hand at the ankle. */
function quadPose(pull: boolean): Pose {
  const shoulder = add(SIDE_HIP, dir(90), BODY.torso)
  const bottomLeg = { a: [235, 290] as const } // hip and knee bent forward for balance
  const thigh = 280 // about 10° of hip extension
  const shin = thigh + 150 - 360 // knee bent about 150°
  const ankle = add(add(SIDE_HIP, dir(thigh), BODY.thigh), dir(shin), BODY.shin)
  return {
    hip: SIDE_HIP,
    torso: 90,
    head: 90,
    armNear: pull ? { pin: holdAt(shoulder, ankle), bend: 1 } : { a: [284, 284] },
    armFar: { a: [175, 95] }, // under the head
    legNear: pull ? { a: [thigh, shin] } : bottomLeg,
    legFar: bottomLeg,
    footNear: pull ? shin - 60 : 180,
    footFar: 180,
  }
}

const quadStretch: Exercise = {
  id: 'M5',
  name: 'Side-lying quadriceps stretch',
  group: 'mobility',
  cls: 'stretch',
  muscles: ['Quadriceps'],
  measure: 'seconds',
  target: [30, 30],
  perSide: true,
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee'],
  cues: [
    'Lie on your side with the bottom knee bent forward for balance; rest your head on the bottom arm.',
    'Bend the top knee and take hold of the ankle (or a towel around it).',
    'Draw the heel towards the buttock and push the hip gently forward; keep the knees level.',
    STRETCH_CUE,
  ],
  cautions: [
    'Knees: only do this if deep knee bending is pain-free; otherwise use a towel and stop well short of the buttock, or skip it.',
  ],
  animation: {
    frames: stretchFrames(quadPose(false), quadPose(true)),
    view: 'top',
    viewBox: [6, 16, 116, 80],
  },
}

// ---------------------------------------------------------------- M6 side-lying thoracic open book

function openBookPose(phase: 'closed' | 'up' | 'open'): Pose {
  const top = { closed: 180, up: 90, open: 0 }[phase]
  return {
    hip: [58, 62],
    torso: 90,
    head: phase === 'open' ? 80 : 90,
    armNear: { a: [top, top] },
    armFar: { a: [180, 180] },
    // Hips and knees bent about 90° and stacked.
    legNear: { a: [178, 270] },
    legFar: { a: [182, 270] },
    footNear: 180,
    footFar: 180,
    lift: { arms: phase === 'up' ? 1 : 0, chest: phase === 'open' ? 0.4 : 0 },
  }
}

const openBook: Exercise = {
  id: 'M6',
  name: 'Side-lying thoracic open book',
  group: 'mobility',
  cls: 'drill',
  muscles: ['Thoracic spine (rotation)', 'Chest'],
  measure: 'reps',
  target: [6, 10],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie on your side, hips and knees bent to about 90°, arms straight out in front at shoulder height.',
    'Keep the knees together and sweep the top arm up and over, turning the chest to the ceiling; follow the hand with your eyes.',
    'Let the arm settle towards the floor behind you only as far as is comfortable, then return.',
  ],
  cautions: ['Shoulders: bend the elbow or stop short of the floor if the shoulder is irritable.'],
  animation: {
    frames: [
      { pose: openBookPose('up'), move: 1.3, label: 'Open' },
      { pose: openBookPose('open'), move: 1.3, hold: 1.5, label: 'Open' },
      { pose: openBookPose('up'), move: 1.2, label: 'Close' },
      { pose: openBookPose('closed'), move: 1.2, hold: 0.6, label: 'Close' },
    ],
    view: 'top',
    viewBox: [14, 16, 116, 88],
  },
}

// ---------------------------------------------------------------- M7 cat-cow (on forearms)

const CAT_KNEE: Vec = [50, FLOOR]
const CAT_HIP: Vec = [CAT_KNEE[0], FLOOR - BODY.thigh]
const CAT_SHOULDER_Y = HAND_FLOOR - BODY.upperArm - 1
const CAT_SHOULDER: Vec = [CAT_HIP[0] + Math.sqrt(BODY.torso ** 2 - (CAT_SHOULDER_Y - CAT_HIP[1]) ** 2), CAT_SHOULDER_Y]
const CAT_TORSO = angleTo(CAT_HIP, CAT_SHOULDER)

function catCowPose(spine: number, head: number): Pose {
  const forearm = { pin: [CAT_SHOULDER[0] + 14, HAND_FLOOR] as Vec, bend: -1 as const }
  const kneeling = { a: [0, 270] as const }
  return {
    hip: CAT_HIP,
    torso: CAT_TORSO,
    head,
    spine,
    armNear: forearm,
    armFar: forearm,
    legNear: kneeling,
    legFar: kneeling,
    footNear: 270,
    footFar: 270,
  }
}

const catCow: Exercise = {
  id: 'M7',
  name: 'Cat-cow',
  group: 'mobility',
  cls: 'drill',
  muscles: ['Spine (flexion and extension)'],
  measure: 'reps',
  target: [6, 10],
  kneeLoad: 'medium',
  wristLoad: 'low',
  regions: ['knee', 'shoulder'],
  cues: [
    'On forearms and knees, elbows under the shoulders, knees under the hips, on a folded mat.',
    'Round the back up towards the ceiling and let the head drop.',
    'Then let the back sink into a gentle arch and look slightly forward; move slowly with the breath.',
  ],
  cautions: [
    'Knees: pad the knees; kneeling can irritate sore knees.',
    'Wrists: the forearm version shown avoids wrist extension; on the hands it loads the wrists.',
  ],
  animation: {
    frames: [
      { pose: catCowPose(7, CAT_TORSO - 30), move: 2, hold: 0.8, label: 'Round' },
      { pose: catCowPose(-5, CAT_TORSO + 14), move: 2, hold: 0.8, label: 'Arch' },
    ],
    viewBox: [14, 46, 110, 70],
  },
}

// ---------------------------------------------------------------- M8 floor pec stretch (top view, prone)
// Head to the right; the stretched arm lies out to the side, below shoulder height.

function pecPose(rolled: boolean): Pose {
  return {
    hip: [64, 54],
    torso: 90,
    head: 90,
    armNear: { a: [348, 348] }, // about 80° from the body, palm down
    armFar: rolled ? { a: [200, 120] } : { a: [215, 125] },
    legNear: { a: [272, 272] },
    legFar: rolled ? { a: [320, 268] } : { a: [268, 268] },
    footNear: 270,
    footFar: 270,
    lift: rolled ? { chest: 1 } : undefined,
  }
}

const pecStretch: Exercise = {
  id: 'M8',
  name: 'Floor pec stretch',
  group: 'mobility',
  cls: 'stretch',
  muscles: ['Chest', 'Front of the shoulder'],
  measure: 'seconds',
  target: [30, 30],
  perSide: true,
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie face down with one arm straight out to the side, at or below shoulder height, palm down.',
    'Push with the other hand and roll away from the arm; bend the top knee and plant that foot behind you.',
    'Roll only until the chest and front of the shoulder stretch. Standing alternative: forearm on a wall or door frame, elbow at or below shoulder height, turn the body away.',
    STRETCH_CUE,
  ],
  cautions: ['Shoulders: keep the arm lower than shown if the shoulder is irritable, and roll only part of the way.'],
  animation: {
    frames: stretchFrames(pecPose(false), pecPose(true)),
    view: 'top',
    viewBox: [2, 10, 122, 88],
  },
}

// ---------------------------------------------------------------- M9 child's pose (partial range)

const CHILD_KNEE: Vec = [62, FLOOR]
const CHILD_HAND: Vec = [CHILD_KNEE[0] + 42, HAND_FLOOR]

/** `sit`: how far the thigh tilts back from vertical; knee flexion is about 90° + sit. */
function childPose(sit: number, spine: number): Pose {
  const hip = add(CHILD_KNEE, dir(sit), -BODY.thigh)
  const span = dist(hip, CHILD_HAND)
  // Torso points along the hip–hand line, raised just enough that the arm reaches.
  const lift = (Math.acos(Math.min(1, (BODY.torso ** 2 + span ** 2 - (ARM - 0.4) ** 2) / (2 * BODY.torso * span))) * 180) / Math.PI
  const torso = angleTo(hip, CHILD_HAND) + lift
  const hand = { pin: CHILD_HAND, bend: -1 as const }
  return {
    hip,
    torso,
    head: torso - 8,
    spine,
    armNear: hand,
    armFar: hand,
    legNear: { a: [sit, 270] },
    legFar: { a: [sit, 270] },
    footNear: 270,
    footFar: 270,
  }
}

const childsPose: Exercise = {
  id: 'M9',
  name: "Child's pose (knees wide)",
  group: 'mobility',
  cls: 'stretch',
  muscles: ['Latissimus dorsi', 'Back', 'Hips'],
  measure: 'seconds',
  target: [30, 30],
  kneeLoad: 'high',
  wristLoad: 'low',
  regions: ['knee', 'shoulder'],
  cues: [
    'From hands and knees on a folded mat, knees wide and big toes close together.',
    'Leave the hands in place and sit the hips back only as far as the knees are comfortable.',
    'Let the chest sink between the knees and the arms lengthen.',
    STRETCH_CUE,
  ],
  cautions: [
    'Knees: deep knee bending. Use the partial range shown, a cushion between heels and buttocks, or skip it.',
    'Shoulders: rest the arms alongside the body if reaching forward hurts.',
  ],
  animation: {
    frames: stretchFrames(childPose(0, 0), childPose(34, 3), 2.4),
    viewBox: [14, 50, 110, 66],
  },
}

// ---------------------------------------------------------------- M12 supine shoulder flexion

function shoulderFlexionPose(arm: number): Pose {
  const knees = supineFoot(SUP_HIP[0] + 28)
  return {
    hip: SUP_HIP,
    torso: 270,
    head: SUP_HEAD,
    armNear: { a: [arm, arm] },
    armFar: { a: [arm, arm] },
    legNear: knees,
    legFar: knees,
    footNear: 90,
    footFar: 90,
  }
}

const shoulderFlexion: Exercise = {
  id: 'M12',
  name: 'Supine shoulder flexion with bent knees',
  group: 'mobility',
  cls: 'drill',
  muscles: ['Latissimus dorsi', 'Shoulder flexion'],
  measure: 'reps',
  target: [6, 10],
  kneeLoad: 'low',
  wristLoad: 'low',
  regions: ['shoulder'],
  cues: [
    'Lie on your back, knees bent, feet flat; keep the lower back gently in contact with the mat.',
    'With straight arms, raise them over the chest and on overhead towards the floor.',
    'Stop at the onset of pain or when the ribs start to lift; return slowly.',
  ],
  cautions: ['Shoulders: stop at the onset of pain; the hands do not need to reach the floor.'],
  animation: {
    frames: [
      { pose: shoulderFlexionPose(255), move: 2.5, hold: 1.2, label: 'Reach' },
      { pose: shoulderFlexionPose(92), move: 2, hold: 0.6, label: 'Return' },
    ],
    viewBox: [6, 40, 116, 76],
  },
}

export const MOBILITY: Exercise[] = [
  hipFlexorStretch,
  hamstringStretch,
  figure4Stretch,
  calfStretch,
  quadStretch,
  openBook,
  catCow,
  pecStretch,
  childsPose,
  shoulderFlexion,
]
