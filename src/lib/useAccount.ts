import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { sync } from './sync'
import { supabaseRemote } from './supabaseRemote'
import { requestImport } from './integrations'

export type SyncState = { status: 'idle' | 'syncing' | 'error'; message?: string }

/** Signed-in account (if any) and a sync trigger. The app works fully without an account. */
export function useAccount() {
  const [session, setSession] = useState<Session | null>(null)
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const syncNow = useCallback(async (opts?: { forceImport?: boolean }) => {
    if (!session || !navigator.onLine) return
    setSyncState({ status: 'syncing' })
    try {
      // New rides and weigh-ins first, so the download below includes them.
      await requestImport(opts?.forceImport).catch(() => undefined)
      const r = await sync(supabaseRemote)
      setSyncState({ status: 'idle', message: `Uploaded ${r.pushed}, downloaded ${r.pulled}` })
    } catch (e) {
      setSyncState({ status: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }, [session])

  // Sync when the app opens, comes back online or returns to the foreground.
  useEffect(() => {
    if (!session) return
    syncNow()
    const onVisible = () => document.visibilityState === 'visible' && syncNow()
    const onOnline = () => syncNow()
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [session, syncNow])

  return { session, syncState, syncNow }
}

export type Account = ReturnType<typeof useAccount>
