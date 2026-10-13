// Progression ladders and session templates — docs/EVIDENCE.md, rules R1–R4 and
// "Exercise candidates". A ladder lists exercises from easiest to hardest; the
// user's current step on each ladder is stored in `ladder_progress`.

import type { Region } from '../exercises/types'

export type SessionType = 'A' | 'B' | 'C' | 'D'

/** Names of the programme sessions and of the optional stretch top-up ('S'). */
export const SESSION_NAMES: Record<SessionType | 'S', string> = {
  A: 'Push and front core',
  B: 'Legs and hips',
  C: 'Back, shoulder blades and side core',
  D: 'Mobility',
  S: 'Stretch top-up',
}

/** Default week (R1). Missed days do not skip ahead: the sequence simply continues. */
export const ROTATION: SessionType[] = ['A', 'B', 'C', 'D', 'A', 'B', 'C']

export type Step = {
  id: string
  /** Not offered before this programme week (R10: overhead or more demanding variants). */
  minWeek?: number
  /** Variations of this step in priority order (R12). They share its range and progression. */
  variants?: string[]
  /** Advanced step: unlocked by R13 (mastery, pain history, timing and a readiness test), never by R6 alone. */
  gate?: Gate
  /** Other ladders that must be at or past a step before this one is used (Y ladders). */
  requires?: { ladder: string; atLeast: string }[]
  /** Joints that must have had no pain of 3/10 or more in the last 14 days. */
  calm?: Region[]
}

export type Gate = {
  /** Step whose mastery is required (R13 G1); a readiness test is offered while training it. */
  prereq: string
  /** Further steps that must also be mastered (G1). */
  alsoMastered?: string[]
  /** Other ladders that must be at or past a step. */
  requires?: { ladder: string; atLeast: string }[]
  /** Minimum programme week (G5). */
  minWeek: number
  /** Joints checked for pain and morning flare-ups (G2, G3). */
  regions: Region[]
  /** The readiness test (G6), as shown to the user. */
  test: string
  /** Highest pain allowed in the test (default 2/10). */
  painMax?: number
  /** Show a caution recommending a physiotherapist assessment before the test. */
  caution?: boolean
}

export type Ladder = { id: string; name: string; steps: Step[]; start: number }

type StepOpts = { minWeek?: number; variants?: string[]; gate?: Gate; requires?: Step['requires']; calm?: Region[] }
const s = (id: string, minWeekOrOpts?: number | StepOpts): Step =>
  typeof minWeekOrOpts === 'object' ? { id, ...minWeekOrOpts } : { id, minWeek: minWeekOrOpts }
const g = (prereq: string, minWeek: number, regions: Region[], test: string, more: Partial<Gate> = {}): Gate => ({ prereq, minWeek, regions, test, ...more })

const SH_WR: Region[] = ['shoulder', 'wrist']

// Ladder order, variations and unlock rules: docs/EVIDENCE.md, "Exercise
// variations and advanced steps", R12 and R13.
export const LADDERS: Record<string, Ladder> = {
  push: {
    id: 'push',
    name: 'Push-up',
    steps: [
      s('P1'),
      s('P3', { variants: ['P3n', 'P3w'] }),
      s('P4'),
      s('P5', { variants: ['P5n', 'P5w', 'P5s'] }),
      s('P7'),
      s('P10', { gate: g('P7', 8, SH_WR, '8 full push-ups with 2 or more reps in reserve, then 30 s of forearm plank with alternating leg lifts.') }),
      s('P9k', {
        gate: g('P10', 10, SH_WR, '6 staggered-hand push-ups per side with 2 or more reps in reserve, then 3 slow wide-hand push-ups with a 2 s pause at the bottom.', { painMax: 1 }),
      }),
      s('P9', { gate: g('P9k', 14, SH_WR, '3 archer push-ups per side from the toes, with 3 or more reps in reserve.', { painMax: 1, caution: true }) }),
    ],
    start: 1,
  },
  serratus: { id: 'serratus', name: 'Push-up plus', steps: [s('P2'), s('P6', 3)], start: 0 },
  plank: { id: 'plank', name: 'Plank', steps: [s('C4'), s('C5', { minWeek: 2, variants: ['C5l', 'C5a', 'C5h'] }), s('C6')], start: 0 },
  deadbug: {
    id: 'deadbug',
    name: 'Dead bug and hollow',
    steps: [s('C1'), s('C2'), s('C3'), s('C9', { gate: g('C3', 6, [], '30 s full hollow hold with the lower back kept on the floor.') })],
    start: 0,
  },
  sideplank: {
    id: 'sideplank',
    name: 'Side plank',
    steps: [s('C7'), s('C8'), s('C10', { gate: g('C8', 8, ['shoulder'], '4 slow rotational side-plank reps per side.') })],
    start: 0,
  },
  crawl: {
    id: 'crawl',
    name: 'Crawl and plank movement',
    steps: [
      s('X1', { gate: g('C5', 5, SH_WR, '45 s forearm plank, then a 20 s bear plank hold with the knees just off the mat.') }),
      s('X2', { gate: g('X1', 6, SH_WR, '10 bear plank shoulder taps (5 per side) with the hips steady and 2 or more reps in reserve.') }),
      s('X3', { gate: g('X2', 7, ['shoulder', 'wrist', 'knee'], 'Crawl 4 steps forward and 4 back without the knees touching the mat.') }),
      s('X4', {
        gate: g('X3', 9, SH_WR, '45 s forearm plank, then 10 high-plank shoulder taps with 2 or more reps in reserve.', { requires: [{ ladder: 'push', atLeast: 'P5' }] }),
      }),
      s('X5', {
        gate: g('X4', 12, SH_WR, '4 plank up-downs (2 leading with each arm) on fists.', { painMax: 1, requires: [{ ladder: 'push', atLeast: 'P7' }] }),
      }),
      s('X6', {
        gate: g('X5', 14, SH_WR, '2 push-ups to side plank per side with 3 or more reps in reserve.', {
          painMax: 1,
          caution: true,
          requires: [{ ladder: 'sideplank', atLeast: 'C8' }],
        }),
      }),
    ],
    start: 0,
  },
  knee: {
    id: 'knee',
    name: 'Squat',
    // Progress by depth and pain (R6.5): isometric and partial range first.
    steps: [
      s('K0'),
      s('K1'),
      s('K3', { variants: ['K3h', 'K3w'] }),
      s('K2'),
      s('K4', { variants: ['K4h', 'K4w'] }),
      s('K5'),
      s('K6', { variants: ['K6l'] }),
      s('K7', { variants: ['K7l', 'K7b'] }),
      s('K8', { variants: ['K8l'] }),
      s('K10', {
        gate: g('K8', 10, ['knee'], '20 s shallow lateral-lunge hold per side (about 45° of knee bend), then 5 slow reps per side with 3 or more in reserve.', {
          alsoMastered: ['K7'],
        }),
      }),
      s('K9', {
        gate: g('K10', 14, ['knee'], '30 s on one leg per side without touching the wall, then 5 skater squats per side to a mat folded 4 times, fingertips on the wall, 3 or more in reserve.'),
      }),
      s('K11', { gate: g('K9', 16, ['knee'], 'Wide stance: shift to each side to the planned depth with the heel flat, 3 reps per side.', { painMax: 1, caution: true }) }),
    ],
    start: 1,
  },
  bridge: {
    id: 'bridge',
    name: 'Bridge',
    steps: [s('H1', { variants: ['H1c', 'H1f', 'H1a'] }), s('H2', 2), s('H3'), s('H4', { variants: ['H4c'] }), s('H5'), s('H6')],
    start: 0,
  },
  hinge: {
    id: 'hinge',
    name: 'Hip hinge',
    steps: [
      s('H7'),
      s('H8', { minWeek: 3, variants: ['H8r'] }),
      s('H9', { gate: g('H8', 8, ['knee'], '30 s on one leg per side, then 5 single-leg hinges per side without touching the wall.') }),
    ],
    start: 0,
  },
  abduction: {
    id: 'abduction',
    name: 'Side-lying hip',
    steps: [
      s('A1', { variants: ['A1h'] }),
      s('A2'),
      s('A3', 2),
      s('A4'),
      s('A5'),
      s('A6', { gate: g('A5', 8, ['shoulder'], '30 s side plank per side, then 10 top-leg lifts per side.') }),
    ],
    start: 0,
  },
  calf: {
    id: 'calf',
    name: 'Calf raise',
    steps: [s('F1', { variants: ['F1b', 'F1t'] }), s('F2', { variants: ['F2b'] }), s('F3'), s('F4', { gate: g('F3', 4, [], '30 s on one leg per side without support.') })],
    start: 0,
  },
  prone: { id: 'prone', name: 'Prone shoulder blade', steps: [s('S1'), s('S2', { variants: ['S2e'] }), s('S3', 2), s('S4')], start: 0 },
  sweep: { id: 'sweep', name: 'Prone arm sweep', steps: [s('S5'), s('S6')], start: 0 },
  extension: {
    id: 'extension',
    name: 'Back extension',
    steps: [
      s('E1'),
      s('E2'),
      s('E3', 2),
      s('E4'),
      s('E5', {
        gate: g('E4', 8, ['knee', 'shoulder'], '30 s on one leg per side, then 5 slow standing bird dogs per side with a 3 s hold.', {
          requires: [{ ladder: 'hinge', atLeast: 'H8' }],
        }),
      }),
    ],
    start: 0,
  },
  cuff: { id: 'cuff', name: 'Rotator cuff', steps: [s('S0', { variants: ['S0f'] })], start: 0 },

  // Dynamic jump-free moves for timed sessions (EVIDENCE.md, "Y ladders").
  ymarch: { id: 'ymarch', name: 'March and box', steps: [s('W1'), s('Y1'), s('Y2'), s('Y3')], start: 1 },
  ylateral: { id: 'ylateral', name: 'Lateral steps', steps: [s('Y4'), s('Y5'), s('Y6', { calm: ['knee'] })], start: 0 },
  ysquat: {
    id: 'ysquat',
    name: 'Squat flow',
    steps: [s('Y7', { requires: [{ ladder: 'knee', atLeast: 'K3' }] }), s('Y8'), s('Y9', { requires: [{ ladder: 'knee', atLeast: 'K4' }] })],
    start: 0,
  },
  yhinge: { id: 'yhinge', name: 'Hinge flow', steps: [s('Y10'), s('Y11'), s('Y12', { requires: [{ ladder: 'hinge', atLeast: 'H8' }] })], start: 0 },
  yrotate: {
    id: 'yrotate',
    name: 'Lunge and rotation',
    steps: [s('Y13'), s('Y14', { requires: [{ ladder: 'knee', atLeast: 'K6' }] }), s('Y15', { requires: [{ ladder: 'knee', atLeast: 'K6' }] })],
    start: 0,
  },
  ycossack: { id: 'ycossack', name: 'Lateral hip', steps: [s('Y16'), s('Y17', { requires: [{ ladder: 'knee', atLeast: 'K4' }], calm: ['knee'] })], start: 0 },
  ywall: {
    id: 'ywall',
    name: 'Wall to floor plank',
    steps: [
      s('Y18'),
      s('Y19'),
      s('Y20', { requires: [{ ladder: 'plank', atLeast: 'C4' }] }),
      s('Y21', {
        requires: [
          { ladder: 'plank', atLeast: 'C5' },
          { ladder: 'push', atLeast: 'P3' },
        ],
        calm: ['wrist'],
      }),
    ],
    start: 0,
  },
}

/** Variations not used on a day that already has the named exercise (R12: S2e is close to E1). */
export const NOT_WITH: Record<string, string[]> = { S2e: ['E1'] }

/**
 * A slot in a timed session (R14):
 * - a ladder (or ladders that take turns on successive sessions of the type),
 *   optionally capped at a step, with a fallback exercise when the ladder
 *   can't be used and a replacement on hard ride days (R1);
 * - a fixed exercise;
 * - a primer: a ladder step `below` steps easier than the current one;
 * - `rampOf`: a Y ladder at the step below the current one (R14 ramp rule).
 */
export type Slot =
  | { ladder: string | string[]; maxStep?: string; fallback?: string; hardRide?: string; rounds?: number }
  | { exercise: string; hardRide?: string }
  | { primer: string; below: number }
  | { rampOf: string }

export type Template = { ramp: Slot[]; build: Slot[]; peak: Slot[]; winddown: Slot[] }

// Timed 15-minute sessions (R14.1, user's choice, October 2026): exercises in
// increasing complexity, so the Ramp replaces the warm-up; strength ladders in
// Build before the pulse circuit in Peak; slow mobility and stretches last.
// Knee caution: no child's pose (M9) or side-lying quad stretch (M5); M12 is
// not used (overhead).
export const TEMPLATES: Record<SessionType, Template> = {
  A: {
    ramp: [{ exercise: 'Y24' }, { exercise: 'Y4' }, { rampOf: 'ywall' }, { primer: 'push', below: 2 }],
    build: [{ ladder: 'push' }, { ladder: ['plank', 'deadbug', 'crawl'] }],
    peak: [{ ladder: 'ywall' }, { ladder: 'ymarch' }, { ladder: 'serratus' }],
    winddown: [{ exercise: 'M8' }, { exercise: 'M6' }],
  },
  B: {
    ramp: [{ exercise: 'Y23' }, { exercise: 'F1' }, { rampOf: 'yhinge' }, { primer: 'knee', below: 2 }],
    build: [{ ladder: 'knee' }, { ladder: 'bridge' }],
    // The two rotating slots change together: abduction with the squat flow, calf with the hinge flow.
    peak: [{ ladder: 'ylateral' }, { ladder: ['abduction', 'calf'] }, { ladder: ['ysquat', 'yhinge'], fallback: 'Y10' }],
    winddown: [{ exercise: 'M2' }, { exercise: 'M4' }],
  },
  C: {
    ramp: [{ exercise: 'Y26' }, { exercise: 'Y25' }, { exercise: 'Y4' }, { exercise: 'Y10' }],
    build: [{ ladder: 'prone' }, { ladder: ['sweep', 'sideplank'] }],
    peak: [{ ladder: 'ymarch' }, { ladder: 'extension' }, { ladder: 'ylateral', maxStep: 'Y5', hardRide: 'Y18' }],
    winddown: [{ exercise: 'M3' }, { exercise: 'M6' }],
  },
  D: {
    ramp: [{ exercise: 'W1' }, { exercise: 'Y23' }, { exercise: 'Y22' }, { exercise: 'Y13' }],
    build: [{ ladder: 'yrotate' }, { ladder: 'ycossack' }, { ladder: ['cuff', 'deadbug'], rounds: 1 }],
    peak: [],
    winddown: [{ exercise: 'M1' }, { exercise: 'M2' }, { exercise: 'M4' }, { exercise: 'M8' }, { exercise: 'M3' }, { exercise: 'M6' }],
  },
}

/** Ladders used by the strength part of each session type (Build and Peak). */
export const slotLadders = (t: Template) => [...t.build, ...t.peak].flatMap((s) => ('ladder' in s ? [s.ladder].flat() : []))
