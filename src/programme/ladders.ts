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

type StepOpts = { minWeek?: number; variants?: string[]; gate?: Gate }
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
}

/** Variations not used on a day that already has the named exercise (R12: S2e is close to E1). */
export const NOT_WITH: Record<string, string[]> = { S2e: ['E1'] }

/**
 * A slot in a session: a ladder (progressing exercise) or a fixed exercise.
 * With several ladders, the slot rotates through them on successive sessions
 * of the same type (e.g. plank one push day, dead bug the next).
 */
export type Slot = { ladder: string | string[]; sets: number } | { exercise: string; sets: number }

export type Template = { warmup: string[]; main: Slot[]; cooldown: string[] }

// Sessions are sized for about 15 minutes (user's choice, October 2026):
// - Warm-up: one drill matched to the day, then one easy set of the first
//   exercise (R2's "potentiate" step). Shorter than R2's 3–4 min by choice.
// - Main: 3 exercises, about 7 working sets (R2: 6–9). Secondary exercises
//   alternate between the two sessions of each type in a week, which keeps
//   weekly sets per group within R3's 6–10 (12 at most).
// - Cool-down: one optional stretch, 1 × 30 s per side. Most of the stretching
//   dose (R9) moves to the mobility day; full-range strength work also
//   improves flexibility (Afonso 2021).
// Knee caution: no child's pose (M9) or side-lying quad stretch (M5) by default.
export const TEMPLATES: Record<SessionType, Template> = {
  A: {
    warmup: ['W2'],
    main: [
      { ladder: 'push', sets: 3 },
      { ladder: 'serratus', sets: 2 },
      { ladder: ['plank', 'deadbug', 'crawl'], sets: 2 },
    ],
    cooldown: ['M8'],
  },
  B: {
    warmup: ['H7'],
    main: [
      { ladder: 'knee', sets: 3 },
      { ladder: 'bridge', sets: 2 },
      { ladder: ['abduction', 'calf'], sets: 2 },
    ],
    cooldown: ['M2'],
  },
  C: {
    warmup: ['M7'],
    main: [
      { ladder: 'prone', sets: 3 },
      { ladder: 'extension', sets: 2 },
      { ladder: ['sweep', 'sideplank'], sets: 2 },
    ],
    cooldown: ['M3'],
  },
  D: {
    warmup: ['W1'],
    main: [
      { exercise: 'M1', sets: 2 },
      { exercise: 'M2', sets: 2 },
      { exercise: 'M4', sets: 1 },
      { exercise: 'M8', sets: 1 },
      { exercise: 'M3', sets: 1 },
      { exercise: 'M6', sets: 1 },
      { ladder: 'cuff', sets: 2 },
    ],
    cooldown: [],
  },
}
