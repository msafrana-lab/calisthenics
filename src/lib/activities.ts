import { db, type HealthSample } from './db'

/** Imported rides and other aerobic activities (Strava), oldest first. */
export async function importedActivities(): Promise<HealthSample[]> {
  const [rides, other] = await Promise.all([
    db.health.where('[kind+recorded_at]').between(['cycling', ''], ['cycling', '\uffff']).toArray(),
    db.health.where('[kind+recorded_at]').between(['activity', ''], ['activity', '\uffff']).toArray(),
  ])
  // Recordings under 5 minutes are accidental (the server no longer imports them).
  return [...rides, ...other].filter((s) => (s.duration_s ?? 0) >= 300).sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
}

/** Rides and leg-loading sports: the ones that can move the legs session (R1). */
export const loadsLegs = (s: HealthSample) => s.kind === 'cycling' || s.details?.leg_load === true

const SPORT_NAMES: Record<string, string> = {
  Ride: 'ride',
  VirtualRide: 'indoor ride',
  EBikeRide: 'e-bike ride',
  GravelRide: 'gravel ride',
  MountainBikeRide: 'mountain bike ride',
  Run: 'run',
  TrailRun: 'trail run',
  Hike: 'hike',
  Walk: 'walk',
  InlineSkate: 'inline skate',
  Swim: 'swim',
  Surfing: 'surf',
  Workout: 'workout',
}

/** Readable sport name, e.g. "indoor ride", "hike". */
export function sportName(s: HealthSample): string {
  const sport = String(s.details?.sport_type ?? (s.kind === 'cycling' ? 'Ride' : 'Workout'))
  if (s.kind === 'cycling' && s.details?.indoor && sport === 'Ride') return 'indoor ride'
  return SPORT_NAMES[sport] ?? sport.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
}
