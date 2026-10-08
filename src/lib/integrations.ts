import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { db } from './db'

export type Provider = 'strava' | 'withings'
export type IntegrationStatus = { provider: Provider; connected_at: string; last_synced_at: string | null; last_error: string | null }

export const PROVIDER_INFO: Record<Provider, { name: string; brings: string }> = {
  strava: { name: 'Strava', brings: 'Rides, indoor and outdoor, with duration and intensity' },
  withings: { name: 'Withings', brings: 'Weigh-ins from your scale' },
}

/** Asks the server to start a connection and opens the provider's consent page. */
export async function connect(provider: Provider) {
  const { data, error } = await supabase.functions.invoke<{ url?: string; error?: string }>('integrations/start', { body: { provider } })
  if (error || !data?.url) {
    const detail = data?.error ?? (await (error as { context?: Response })?.context?.json?.().catch(() => null))?.error
    throw new Error(detail ?? error?.message ?? 'Could not start the connection.')
  }
  window.location.href = data.url
}

export async function disconnect(provider: Provider) {
  const { error } = await supabase.from('integrations').delete().eq('provider', provider)
  if (error) throw new Error(error.message)
}

const LAST_PULL_KEY = 'integrationsRequested'
const MIN_INTERVAL_MS = 30 * 60_000

/**
 * Asks the server to fetch new rides and weigh-ins now (at most every 30 min,
 * unless forced). The scheduled job does the same every 3 hours.
 */
export async function requestImport(force = false) {
  const last = (await db.meta.get(LAST_PULL_KEY))?.value
  if (!force && last && Date.now() - Date.parse(last) < MIN_INTERVAL_MS) return
  await db.meta.put({ key: LAST_PULL_KEY, value: new Date().toISOString() })
  await supabase.functions.invoke('integrations/sync', { body: {} })
}

export function useIntegrations(signedIn: boolean) {
  const [list, setList] = useState<IntegrationStatus[] | null>(null)
  const refresh = useCallback(async () => {
    if (!signedIn) return setList(null)
    const { data } = await supabase.from('integrations').select('provider, connected_at, last_synced_at, last_error')
    setList((data as IntegrationStatus[] | null) ?? [])
  }, [signedIn])
  useEffect(() => {
    refresh()
  }, [refresh])
  return { list, refresh }
}

/** Reads and clears the ?integration=… result left by the provider redirect. */
export function takeRedirectResult(): { outcome: string; provider: string | null } | null {
  const params = new URLSearchParams(window.location.search)
  const outcome = params.get('integration')
  if (!outcome) return null
  const provider = params.get('provider')
  history.replaceState(null, '', window.location.pathname)
  return { outcome, provider }
}
