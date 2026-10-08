// Strava and Withings: OAuth and data conversion. Plain TypeScript with no
// runtime-specific APIs, so it runs in the Supabase Edge runtime (Deno) and is
// unit-tested with Vitest (Node).

export type Provider = 'strava' | 'withings'
export const PROVIDERS: Provider[] = ['strava', 'withings']

export type Tokens = { access_token: string; refresh_token: string; expires_at: string; external_user_id: string | null }

export type Sample = {
  kind: 'weight' | 'cycling'
  recorded_at: string
  value: number
  unit: string
  duration_s: number | null
  energy_kcal: number | null
  source: string
  external_id: string
  details: Record<string, unknown> | null
}

// ---------------------------------------------------------------- OAuth

export function authorizeUrl(provider: Provider, clientId: string, redirectUri: string, state: string): string {
  if (provider === 'strava') {
    const q = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'activity:read_all',
      state,
    })
    return `https://www.strava.com/oauth/authorize?${q}`
  }
  const q = new URLSearchParams({ response_type: 'code', client_id: clientId, scope: 'user.metrics', redirect_uri: redirectUri, state })
  return `https://account.withings.com/oauth2_user/authorize2?${q}`
}

export type TokenGrant = { code: string } | { refreshToken: string }

export function tokenRequest(
  provider: Provider,
  client: { id: string; secret: string },
  redirectUri: string,
  grant: TokenGrant,
): { url: string; body: URLSearchParams } {
  const isCode = 'code' in grant
  if (provider === 'strava') {
    const body = new URLSearchParams({ client_id: client.id, client_secret: client.secret })
    if (isCode) {
      body.set('code', grant.code)
      body.set('grant_type', 'authorization_code')
    } else {
      body.set('refresh_token', grant.refreshToken)
      body.set('grant_type', 'refresh_token')
    }
    return { url: 'https://www.strava.com/oauth/token', body }
  }
  const body = new URLSearchParams({ action: 'requesttoken', client_id: client.id, client_secret: client.secret })
  if (isCode) {
    body.set('grant_type', 'authorization_code')
    body.set('code', grant.code)
    body.set('redirect_uri', redirectUri)
  } else {
    body.set('grant_type', 'refresh_token')
    body.set('refresh_token', grant.refreshToken)
  }
  return { url: 'https://wbsapi.withings.net/v2/oauth2', body }
}

type Json = Record<string, unknown>

export function parseTokenResponse(provider: Provider, json: Json, now: Date): Tokens {
  if (provider === 'strava') {
    if (typeof json.access_token !== 'string' || typeof json.refresh_token !== 'string') {
      throw new Error(`Strava token error: ${String(json.message ?? 'unexpected response')}`)
    }
    const athlete = json.athlete as Json | undefined
    return {
      access_token: json.access_token,
      refresh_token: json.refresh_token,
      expires_at: new Date(Number(json.expires_at) * 1000).toISOString(),
      external_user_id: athlete?.id != null ? String(athlete.id) : null,
    }
  }
  const body = json.body as Json | undefined
  if (json.status !== 0 || !body || typeof body.access_token !== 'string') {
    throw new Error(`Withings token error: status ${String(json.status)} ${String(json.error ?? '')}`.trim())
  }
  return {
    access_token: body.access_token,
    refresh_token: String(body.refresh_token),
    expires_at: new Date(now.getTime() + Number(body.expires_in) * 1000).toISOString(),
    external_user_id: body.userid != null ? String(body.userid) : null,
  }
}

// ---------------------------------------------------------------- rides

const RIDE_TYPES = new Set(['Ride', 'VirtualRide', 'EBikeRide', 'GravelRide', 'MountainBikeRide', 'EMountainBikeRide'])

/** Strava workout_type for rides: 11 = race, 12 = workout (intervals, structured training). */
const HARD_WORKOUT_TYPES = new Set([11, 12])

/**
 * Programme rule R1: a ride counts as hard if it is longer than 60 minutes or
 * is tagged in Strava as a race or workout. Untagged interval sessions under an
 * hour read as easy; the day's setting in the app can override this.
 */
export function classifyRide(movingSeconds: number, workoutType: number | null | undefined): 'easy' | 'hard' {
  return movingSeconds > 3600 || (workoutType != null && HARD_WORKOUT_TYPES.has(workoutType)) ? 'hard' : 'easy'
}

/** A Strava activity summary as a cycling sample, or null for other sports. */
export function stravaRide(a: Json): Sample | null {
  const sport = String(a.sport_type ?? a.type ?? '')
  if (!RIDE_TYPES.has(sport)) return null
  const moving = Number(a.moving_time ?? 0)
  const workoutType = a.workout_type == null ? null : Number(a.workout_type)
  const num = (v: unknown) => (typeof v === 'number' ? v : null)
  return {
    kind: 'cycling',
    recorded_at: new Date(String(a.start_date)).toISOString(),
    value: Math.round(moving / 60),
    unit: 'min',
    duration_s: moving,
    // For cycling, kilojoules of work are commonly used as an estimate of kcal burnt (verify).
    energy_kcal: num(a.kilojoules),
    source: 'Strava',
    external_id: String(a.id),
    details: {
      name: a.name ?? null,
      sport_type: sport,
      indoor: a.trainer === true || sport === 'VirtualRide',
      distance_m: num(a.distance),
      average_heartrate: num(a.average_heartrate),
      max_heartrate: num(a.max_heartrate),
      average_watts: num(a.average_watts),
      weighted_average_watts: num(a.weighted_average_watts),
      suffer_score: num(a.suffer_score),
      workout_type: workoutType,
      intensity: classifyRide(moving, workoutType),
    },
  }
}

// ---------------------------------------------------------------- weight

/** Weigh-ins from a Withings `getmeas` response (measure type 1 = weight in kg). */
export function withingsWeights(json: Json): Sample[] {
  if (json.status !== 0) throw new Error(`Withings measure error: status ${String(json.status)} ${String(json.error ?? '')}`.trim())
  const body = (json.body ?? {}) as Json
  const groups = (body.measuregrps ?? []) as Json[]
  const out: Sample[] = []
  for (const g of groups) {
    const m = ((g.measures ?? []) as Json[]).find((x) => Number(x.type) === 1)
    if (!m) continue
    const kg = Number(m.value) * 10 ** Number(m.unit)
    out.push({
      kind: 'weight',
      recorded_at: new Date(Number(g.date) * 1000).toISOString(),
      value: Math.round(kg * 100) / 100,
      unit: 'kg',
      duration_s: null,
      energy_kcal: null,
      source: 'Withings',
      external_id: String(g.grpid),
      details: null,
    })
  }
  return out
}

// ---------------------------------------------------------------- OAuth state

export type StatePayload = { u: string; p: Provider; t: number }

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function hmac(key: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)))
}

/** Signed, timestamped OAuth state that ties the callback to the signed-in user. */
export async function signState(payload: StatePayload, key: string): Promise<string> {
  const data = b64url(new TextEncoder().encode(JSON.stringify(payload)))
  return `${data}.${b64url(await hmac(key, data))}`
}

export async function verifyState(state: string, key: string, now: number, maxAgeMs = 15 * 60_000): Promise<StatePayload | null> {
  const [data, sig] = state.split('.')
  if (!data || !sig) return null
  const expected = b64url(await hmac(key, data))
  if (expected.length !== sig.length) return null
  let diff = 0
  for (let i = 0; i < sig.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i)
  if (diff !== 0) return null
  try {
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(data))) as StatePayload
    if (!PROVIDERS.includes(payload.p) || typeof payload.u !== 'string') return null
    if (now - payload.t > maxAgeMs || payload.t > now + 60_000) return null
    return payload
  } catch {
    return null
  }
}
