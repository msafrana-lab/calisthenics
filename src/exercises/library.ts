import { ABDUCTION } from './abduction'
import { BACK } from './back'
import { CORE } from './core'
import { HIPS } from './hips'
import { LEGS } from './legs'
import { MOBILITY } from './mobility'
import { PUSH } from './push'
import { WARMUP } from './warmup'
import { PUSH_VARIANTS } from './push-variants'
import { CORE_VARIANTS } from './core-variants'
import { CRAWL } from './crawl'
import { SQUAT_VARIANTS } from './squat-variants'
import { LUNGE_VARIANTS } from './lunge-variants'
import { HIP_VARIANTS } from './hip-variants'
import { SMALL_VARIANTS } from './small-variants'
import { Y_PULSE } from './y-pulse'
import { Y_LATERAL } from './y-lateral'
import { Y_SQUAT_HINGE } from './y-squat-hinge'
import { Y_ROTATE } from './y-rotate'
import { Y_WALL } from './y-wall'
import type { Exercise } from './types'

export const EXERCISES: Exercise[] = [
  ...PUSH,
  ...CORE,
  ...LEGS,
  ...HIPS,
  ...ABDUCTION,
  ...BACK,
  ...MOBILITY,
  ...WARMUP,
  // Variations and advanced steps (docs/EVIDENCE.md, "Exercise variations and advanced steps").
  ...PUSH_VARIANTS,
  ...CORE_VARIANTS,
  ...CRAWL,
  ...SQUAT_VARIANTS,
  ...LUNGE_VARIANTS,
  ...HIP_VARIANTS,
  ...SMALL_VARIANTS,
  // Dynamic jump-free moves for timed sessions (docs/EVIDENCE.md, "Y. Dynamic jump-free moves").
  ...Y_PULSE,
  ...Y_LATERAL,
  ...Y_SQUAT_HINGE,
  ...Y_ROTATE,
  ...Y_WALL,
]

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]))

export const exerciseById = (id: string) => BY_ID.get(id)
