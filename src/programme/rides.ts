import { localDay, type Cycling, type DayLog } from './engine'

export type Ride = { recorded_at: string; duration_s: number | null; details?: { intensity?: 'easy' | 'hard' } | null }

/** Hardest imported ride per local day ('hard' beats 'easy'). */
export function rideIntensityByDay(rides: Ride[]): Map<string, Cycling> {
  const out = new Map<string, Cycling>()
  for (const r of rides) {
    const day = localDay(r.recorded_at)
    const intensity: Cycling = r.details?.intensity === 'hard' ? 'hard' : 'easy'
    if (out.get(day) !== 'hard') out.set(day, intensity)
  }
  return out
}

/**
 * Day logs with imported rides filled in. A day's own setting in the app wins;
 * imported rides only fill days the user has not set.
 */
export function withImportedRides(days: DayLog[], rides: Ride[]): DayLog[] {
  const byDay = rideIntensityByDay(rides)
  const merged = days.map((d) => (d.cycling === null && byDay.has(d.day) ? { ...d, cycling: byDay.get(d.day)! } : d))
  for (const [day, cycling] of byDay) if (!days.some((d) => d.day === day)) merged.push({ day, cycling, morning: null })
  return merged
}
