import type { Animation } from '../animation/skeleton'

export type Load = 'low' | 'medium' | 'high'

/** Joints with a reported problem; exercises loading them get stricter effort and pain rules. */
export type Region = 'knee' | 'shoulder' | 'wrist'

/**
 * Exercise class, which sets the rep/hold range and effort rules
 * (docs/EVIDENCE.md, R4 and R5).
 */
export type ExerciseClass =
  | 'strength' // 6–12 reps
  | 'endurance' // 10–20 reps, low-load prone/hip/calf work
  | 'hold' // isometric, 20–45 s
  | 'cuff' // unloaded rotator cuff, 12–20 reps with end-range hold
  | 'stretch' // static stretch, 2 × 30 s
  | 'drill' // warm-up or mobility drill, reps or seconds, never counted as a working set
  | 'flow' // timed dynamic move (Y ladders, R14–R16), 30–45 s; counts for R3 only with a strength component

export type Group = 'push' | 'core' | 'legs' | 'hips' | 'back' | 'mobility' | 'warmup' | 'cardio'

/** What a dynamic move trains (docs/EVIDENCE.md, Y table): S, M and P. */
export type Component = 'strength' | 'mobility' | 'pulse'

export type Exercise = {
  /** Ladder letter + step number, as in docs/EVIDENCE.md (e.g. "P3"); W for warm-up drills. */
  id: string
  name: string
  group: Group
  cls: ExerciseClass
  muscles: string[]
  /** Reps per set, or seconds per hold. */
  measure: 'reps' | 'seconds'
  target: readonly [number, number]
  /** Done on each side in turn; the target is per side. */
  perSide?: boolean
  kneeLoad: Load
  wristLoad: Load
  /** Problem joints this exercise loads (drives pain prompts and effort caps). */
  regions: Region[]
  cues: string[]
  cautions?: string[]
  animation: Animation
  /**
   * Set on a variation (docs/EVIDENCE.md, R12): the ID of the ladder step it
   * varies. It shares that step's range, sets and progression.
   */
  variationOf?: string
  /** A variation's difficulty compared with the standard version of its step. */
  difficulty?: 'easier' | 'similar' | 'harder'
  /** For 'flow' moves: what the move trains. Only moves with 'strength' count as sets (R16). */
  components?: Component[]
}
