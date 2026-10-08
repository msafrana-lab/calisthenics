import { GROUND_Y, type Pose } from '../animation/skeleton'

/** Height of the body's centre line when the torso, a thigh or a shin rests on the mat. */
export const FLOOR = GROUND_Y - 4
/** Height of a hand or forearm end resting on the mat. */
export const HAND_FLOOR = GROUND_Y - 2
/** Height of an ankle when the foot stands flat on the mat. */
export const ANKLE_FLOOR = GROUND_Y - 6

/** Build a pose with identical near and far limbs. */
export function symmetric(p: Omit<Pose, 'armNear' | 'armFar' | 'legNear' | 'legFar' | 'footNear' | 'footFar'> & {
  arm: Pose['armNear']
  leg: Pose['legNear']
  foot?: number
}): Pose {
  const { arm, leg, foot, ...rest } = p
  return { ...rest, armNear: arm, armFar: arm, legNear: leg, legFar: leg, footNear: foot, footFar: foot }
}
