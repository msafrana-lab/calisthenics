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

export type Group = 'push' | 'core' | 'legs' | 'hips' | 'back' | 'mobility' | 'warmup'

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
}
