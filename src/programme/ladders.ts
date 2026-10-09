// Progression ladders and session templates — docs/EVIDENCE.md, rules R1–R4 and
// "Exercise candidates". A ladder lists exercises from easiest to hardest; the
// user's current step on each ladder is stored in `ladder_progress`.

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
}

export type Ladder = { id: string; name: string; steps: Step[]; start: number }

const s = (id: string, minWeek?: number): Step => ({ id, minWeek })

export const LADDERS: Record<string, Ladder> = {
  push: { id: 'push', name: 'Push-up', steps: [s('P1'), s('P3'), s('P4'), s('P5'), s('P7')], start: 1 },
  serratus: { id: 'serratus', name: 'Push-up plus', steps: [s('P2'), s('P6', 3)], start: 0 },
  plank: { id: 'plank', name: 'Plank', steps: [s('C4'), s('C5', 2), s('C6')], start: 0 },
  deadbug: { id: 'deadbug', name: 'Dead bug and hollow', steps: [s('C1'), s('C2'), s('C3')], start: 0 },
  sideplank: { id: 'sideplank', name: 'Side plank', steps: [s('C7'), s('C8')], start: 0 },
  knee: {
    id: 'knee',
    name: 'Squat',
    // Progress by depth and pain (R6.5): isometric and partial range first.
    steps: [s('K0'), s('K1'), s('K3'), s('K2'), s('K4'), s('K5'), s('K6'), s('K7'), s('K8')],
    start: 1,
  },
  bridge: { id: 'bridge', name: 'Bridge', steps: [s('H1'), s('H2', 2), s('H3'), s('H4'), s('H5'), s('H6')], start: 0 },
  hinge: { id: 'hinge', name: 'Hip hinge', steps: [s('H7'), s('H8', 3)], start: 0 },
  abduction: { id: 'abduction', name: 'Side-lying hip', steps: [s('A1'), s('A2'), s('A3', 2), s('A4'), s('A5')], start: 0 },
  calf: { id: 'calf', name: 'Calf raise', steps: [s('F1'), s('F2'), s('F3')], start: 0 },
  prone: { id: 'prone', name: 'Prone shoulder blade', steps: [s('S1'), s('S2'), s('S3', 2), s('S4')], start: 0 },
  sweep: { id: 'sweep', name: 'Prone arm sweep', steps: [s('S5'), s('S6')], start: 0 },
  extension: { id: 'extension', name: 'Back extension', steps: [s('E1'), s('E2'), s('E3', 2), s('E4')], start: 0 },
  cuff: { id: 'cuff', name: 'Rotator cuff', steps: [s('S0')], start: 0 },
}

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
      { ladder: ['plank', 'deadbug'], sets: 2 },
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
