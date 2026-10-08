// Supabase Edge Function: connects Strava and Withings and imports rides and
// weigh-ins into health_samples.
//
//   POST /integrations/start     {provider}  (signed-in user)  → {url} to open
//   GET  /integrations/callback  ?code&state (provider redirect) → back to the app
//   POST /integrations/sync      (signed-in user, or the scheduled job with x-cron-secret)
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, WITHINGS_CLIENT_ID, WITHINGS_CLIENT_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2.117.3'
import {
  authorizeUrl,
  parseTokenResponse,
  PROVIDERS,
  signState,
  stravaRide,
  tokenRequest,
  verifyState,
  withingsWeights,
  type Provider,
  type Sample,
  type TokenGrant,
} from './providers.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = 'https://msafrana-lab.github.io/calisthenics/'
const CALLBACK_URL = `${SUPABASE_URL}/functions/v1/integrations/callback`
const DAY = 864e5

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
const redirect = (to: string) => new Response(null, { status: 302, headers: { Location: to } })

function client(p: Provider): { id: string; secret: string } | null {
  const id = Deno.env.get(`${p.toUpperCase()}_CLIENT_ID`)
  const secret = Deno.env.get(`${p.toUpperCase()}_CLIENT_SECRET`)
  return id && secret ? { id, secret } : null
}

async function userId(req: Request): Promise<string | null> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await admin.auth.getUser(token)
  return data.user?.id ?? null
}

async function requestTokens(p: Provider, grant: TokenGrant) {
  const c = client(p)
  if (!c) throw new Error(`${p} is not configured`)
  const { url, body } = tokenRequest(p, c, CALLBACK_URL, grant)
  const res = await fetch(url, { method: 'POST', body })
  return parseTokenResponse(p, await res.json(), new Date())
}

type Integration = { user_id: string; provider: Provider; access_token: string; refresh_token: string; expires_at: string; last_synced_at: string | null }

async function freshToken(row: Integration): Promise<string> {
  if (Date.parse(row.expires_at) - Date.now() > 120_000) return row.access_token
  const t = await requestTokens(row.provider, { refreshToken: row.refresh_token })
  await admin.from('integrations').update({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at }).eq('user_id', row.user_id).eq('provider', row.provider)
  return t.access_token
}

async function fetchStrava(token: string, since: number): Promise<Sample[]> {
  const out: Sample[] = []
  for (let page = 1; page <= 5; page++) {
    const q = new URLSearchParams({ after: String(Math.floor(since / 1000)), per_page: '100', page: String(page) })
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${q}`, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`Strava activities: HTTP ${res.status}`)
    const list = (await res.json()) as Record<string, unknown>[]
    for (const a of list) {
      const s = stravaRide(a)
      if (s) out.push(s)
    }
    if (list.length < 100) break
  }
  return out
}

async function fetchWithings(token: string, since: number): Promise<Sample[]> {
  const out: Sample[] = []
  let offset: string | null = null
  for (let i = 0; i < 5; i++) {
    const body = new URLSearchParams({ action: 'getmeas', meastype: '1', category: '1', lastupdate: String(Math.floor(since / 1000)) })
    if (offset) body.set('offset', offset)
    const res = await fetch('https://wbsapi.withings.net/measure', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body })
    const data = (await res.json()) as Record<string, unknown>
    out.push(...withingsWeights(data))
    const b = (data.body ?? {}) as Record<string, unknown>
    if (!b.more) break
    offset = String(b.offset)
  }
  return out
}

/** Imports new data for one connection; records the outcome on the connection row. */
async function syncOne(row: Integration): Promise<number> {
  // Re-read a two-day overlap so edited or late-uploaded entries are picked up.
  const since = row.last_synced_at ? Date.parse(row.last_synced_at) - 2 * DAY : Date.now() - (row.provider === 'strava' ? 90 : 365) * DAY
  try {
    const token = await freshToken(row)
    const samples = row.provider === 'strava' ? await fetchStrava(token, since) : await fetchWithings(token, since)
    if (samples.length) {
      const rows = samples.map((s) => ({ ...s, user_id: row.user_id, updated_at: new Date().toISOString() }))
      const { error } = await admin.from('health_samples').upsert(rows, { onConflict: 'user_id,kind,recorded_at' })
      if (error) throw new Error(error.message)
    }
    await admin.from('integrations').update({ last_synced_at: new Date().toISOString(), last_error: null }).eq('user_id', row.user_id).eq('provider', row.provider)
    return samples.length
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await admin.from('integrations').update({ last_error: message }).eq('user_id', row.user_id).eq('provider', row.provider)
    throw e
  }
}

async function syncAll(filter: { user?: string }) {
  let q = admin.from('integrations').select('user_id, provider, access_token, refresh_token, expires_at, last_synced_at')
  if (filter.user) q = q.eq('user_id', filter.user)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  const results: { provider: string; imported?: number; error?: string }[] = []
  for (const row of (data ?? []) as Integration[]) {
    try {
      results.push({ provider: row.provider, imported: await syncOne(row) })
    } catch (e) {
      results.push({ provider: row.provider, error: e instanceof Error ? e.message : String(e) })
    }
  }
  return results
}

async function isCron(req: Request): Promise<boolean> {
  const given = req.headers.get('x-cron-secret')
  if (!given) return false
  const { data } = await admin.from('app_config').select('value').eq('key', 'cron_secret').single()
  return !!data && data.value === given
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const url = new URL(req.url)
  const route = url.pathname.split('/').pop()

  try {
    if (route === 'start' && req.method === 'POST') {
      const user = await userId(req)
      if (!user) return json({ error: 'Sign in first.' }, 401)
      const { provider } = (await req.json()) as { provider: Provider }
      if (!PROVIDERS.includes(provider)) return json({ error: 'Unknown provider.' }, 400)
      const c = client(provider)
      if (!c) return json({ error: `${provider} is not set up yet: its client ID and secret are missing from the Edge Function secrets.` }, 409)
      const state = await signState({ u: user, p: provider, t: Date.now() }, SERVICE_KEY)
      return json({ url: authorizeUrl(provider, c.id, CALLBACK_URL, state) })
    }

    if (route === 'callback' && req.method === 'GET') {
      const state = await verifyState(url.searchParams.get('state') ?? '', SERVICE_KEY, Date.now())
      const code = url.searchParams.get('code')
      if (!state) return redirect(`${APP_URL}?integration=expired`)
      if (!code || url.searchParams.get('error')) return redirect(`${APP_URL}?integration=declined&provider=${state.p}`)
      const t = await requestTokens(state.p, { code })
      const { error } = await admin
        .from('integrations')
        .upsert({ user_id: state.u, provider: state.p, ...t, connected_at: new Date().toISOString(), last_synced_at: null, last_error: null })
      if (error) throw new Error(error.message)
      await syncAll({ user: state.u }).catch(() => undefined) // first import; errors are recorded on the row
      return redirect(`${APP_URL}?integration=connected&provider=${state.p}`)
    }

    if (route === 'sync' && req.method === 'POST') {
      if (await isCron(req)) return json({ results: await syncAll({}) })
      const user = await userId(req)
      if (!user) return json({ error: 'Sign in first.' }, 401)
      return json({ results: await syncAll({ user }) })
    }

    return json({ error: 'Not found.' }, 404)
  } catch (e) {
    console.error(e)
    if (route === 'callback') return redirect(`${APP_URL}?integration=failed`)
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
