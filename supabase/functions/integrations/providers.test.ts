import { describe, expect, it } from 'vitest'
import { authorizeUrl, classifyRide, parseTokenResponse, signState, stravaRide, tokenRequest, verifyState, withingsWeights } from './providers'

describe('OAuth', () => {
  it('builds authorisation URLs with the callback and state', () => {
    const s = new URL(authorizeUrl('strava', '123', 'https://x.supabase.co/functions/v1/integrations/callback', 'st'))
    expect(s.origin + s.pathname).toBe('https://www.strava.com/oauth/authorize')
    expect(s.searchParams.get('scope')).toBe('activity:read_all')
    expect(s.searchParams.get('state')).toBe('st')
    const w = new URL(authorizeUrl('withings', 'abc', 'https://cb', 'st'))
    expect(w.searchParams.get('scope')).toBe('user.metrics')
    expect(w.searchParams.get('redirect_uri')).toBe('https://cb')
  })

  it('builds token requests for codes and refreshes', () => {
    const a = tokenRequest('strava', { id: '1', secret: 's' }, 'https://cb', { code: 'c' })
    expect(a.body.get('grant_type')).toBe('authorization_code')
    const b = tokenRequest('withings', { id: '1', secret: 's' }, 'https://cb', { refreshToken: 'r' })
    expect(b.url).toBe('https://wbsapi.withings.net/v2/oauth2')
    expect(b.body.get('action')).toBe('requesttoken')
    expect(b.body.get('refresh_token')).toBe('r')
  })

  it('parses token responses and reports errors', () => {
    const now = new Date('2026-10-08T12:00:00Z')
    expect(parseTokenResponse('strava', { access_token: 'a', refresh_token: 'r', expires_at: 1791460800, athlete: { id: 42 } }, now)).toEqual({
      access_token: 'a',
      refresh_token: 'r',
      expires_at: new Date(1791460800 * 1000).toISOString(),
      external_user_id: '42',
    })
    expect(parseTokenResponse('withings', { status: 0, body: { access_token: 'a', refresh_token: 'r', expires_in: 10800, userid: 7 } }, now).expires_at).toBe(
      '2026-10-08T15:00:00.000Z',
    )
    expect(() => parseTokenResponse('strava', { message: 'Bad Request' }, now)).toThrow(/Bad Request/)
    expect(() => parseTokenResponse('withings', { status: 503, error: 'Invalid code' }, now)).toThrow(/503/)
  })

  it('accepts its own state and rejects tampered or expired ones', async () => {
    const now = Date.now()
    const state = await signState({ u: 'user-1', p: 'strava', t: now }, 'key')
    expect(await verifyState(state, 'key', now)).toEqual({ u: 'user-1', p: 'strava', t: now })
    expect(await verifyState(state, 'other-key', now)).toBeNull()
    expect(await verifyState(state.replace(/^./, 'x'), 'key', now)).toBeNull()
    expect(await verifyState(state, 'key', now + 16 * 60_000)).toBeNull()
    expect(await verifyState('garbage', 'key', now)).toBeNull()
  })
})

describe('rides', () => {
  const base = { id: 99, start_date: '2026-10-07T17:30:00Z', moving_time: 2700, trainer: true, sport_type: 'VirtualRide', kilojoules: 540, average_heartrate: 141 }

  it('converts a Strava ride and ignores other sports', () => {
    const s = stravaRide(base)!
    expect(s).toMatchObject({ kind: 'cycling', value: 45, unit: 'min', duration_s: 2700, energy_kcal: 540, external_id: '99', source: 'Strava' })
    expect(s.details).toMatchObject({ indoor: true, average_heartrate: 141, intensity: 'easy' })
    expect(stravaRide({ ...base, sport_type: 'Run' })).toBeNull()
  })

  it('classes rides over an hour, races and workouts as hard (R1)', () => {
    expect(classifyRide(3700, null)).toBe('hard')
    expect(classifyRide(1800, 12)).toBe('hard')
    expect(classifyRide(1800, 11)).toBe('hard')
    expect(classifyRide(3600, 10)).toBe('easy')
    expect(stravaRide({ ...base, sport_type: 'Ride', trainer: false, moving_time: 5400 })!.details).toMatchObject({ indoor: false, intensity: 'hard' })
  })
})

describe('weight', () => {
  it('reads weights from Withings measure groups', () => {
    const json = {
      status: 0,
      body: {
        measuregrps: [
          { grpid: 1, date: 1791446400, measures: [{ type: 1, value: 81450, unit: -3 }, { type: 6, value: 2210, unit: -2 }] },
          { grpid: 2, date: 1791532800, measures: [{ type: 6, value: 2200, unit: -2 }] }, // fat ratio only
        ],
      },
    }
    expect(withingsWeights(json)).toEqual([
      expect.objectContaining({ kind: 'weight', value: 81.45, unit: 'kg', external_id: '1', recorded_at: new Date(1791446400 * 1000).toISOString() }),
    ])
    expect(() => withingsWeights({ status: 401 })).toThrow(/401/)
  })
})
