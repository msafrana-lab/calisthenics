import type { Animation } from '../animation/skeleton'

export type Load = 'low' | 'medium' | 'high'

export type Exercise = {
  /** Ladder letter + step number, as in docs/EVIDENCE.md (e.g. "P3"). */
  id: string
  ladder: string
  step: number
  name: string
  muscles: string[]
  /** Reps per set, or seconds per hold. */
  measure: 'reps' | 'seconds'
  target: readonly [number, number]
  kneeLoad: Load
  wristLoad: Load
  cues: string[]
  cautions?: string[]
  animation: Animation
}
