import { ABDUCTION } from './abduction'
import { BACK } from './back'
import { CORE } from './core'
import { HIPS } from './hips'
import { LEGS } from './legs'
import { MOBILITY } from './mobility'
import { PUSH } from './push'
import { WARMUP } from './warmup'
import type { Exercise } from './types'

export const EXERCISES: Exercise[] = [...PUSH, ...CORE, ...LEGS, ...HIPS, ...ABDUCTION, ...BACK, ...MOBILITY, ...WARMUP]

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]))

export const exerciseById = (id: string) => BY_ID.get(id)
