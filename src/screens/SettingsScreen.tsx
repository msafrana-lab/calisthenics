import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import type { Account } from '../lib/useAccount'
import { connect, disconnect, PROVIDER_INFO, useIntegrations, type Provider } from '../lib/integrations'

const REDIRECT_MESSAGES: Record<string, string> = {
  connected: 'Connected. Your recent data is being imported.',
  declined: 'The connection was cancelled.',
  expired: 'The connection link expired. Please try again.',
  failed: 'The connection failed. Please try again; if it keeps failing, check the client ID and secret in Supabase.',
}

function ConnectedServices({ account, redirectResult }: { account: Account; redirectResult: { outcome: string; provider: string | null } | null }) {
  const { list, refresh } = useIntegrations(!!account.session)
  const [busy, setBusy] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)
  const banner = redirectResult && REDIRECT_MESSAGES[redirectResult.outcome]

  const run = async (p: Provider, action: () => Promise<void>) => {
    setBusy(p)
    setError(null)
    try {
      await action()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  if (!account.session) return null
  return (
    <div className="card space-y-3 p-4">
      <h2 className="font-semibold">Connected services</h2>
      <p className="text-sm text-[var(--muted)]">
        New rides and weigh-ins are fetched every 3 hours and when you open the app. A hard ride moves the legs session to another day.
      </p>
      {banner && (
        <p className="rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-sm">
          {redirectResult?.provider ? `${PROVIDER_INFO[redirectResult.provider as Provider]?.name ?? redirectResult.provider}: ` : ''}
          {banner}
        </p>
      )}
      {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => {
        const status = list?.find((s) => s.provider === p)
        return (
          <div key={p} className="flex items-start justify-between gap-3 border-t border-[var(--border)] pt-3">
            <div className="min-w-0 text-sm">
              <div className="font-semibold">{PROVIDER_INFO[p].name}</div>
              <div className="text-[var(--muted)]">{PROVIDER_INFO[p].brings}</div>
              {status && (
                <div className="text-xs text-[var(--muted)]">
                  {status.last_synced_at ? `Last import ${new Date(status.last_synced_at).toLocaleString('en-GB')}` : 'Waiting for first import'}
                </div>
              )}
              {status?.last_error && <div className="text-xs text-[var(--warn)]">Last import failed: {status.last_error}</div>}
            </div>
            {status ? (
              <button className="btn btn-secondary min-h-9 shrink-0 text-sm" disabled={busy === p} onClick={() => confirm(`Disconnect ${PROVIDER_INFO[p].name}? Data already imported stays.`) && run(p, () => disconnect(p))}>
                Disconnect
              </button>
            ) : (
              <button className="btn btn-primary min-h-9 shrink-0 text-sm" disabled={busy === p || list === null} onClick={() => run(p, () => connect(p))}>
                Connect
              </button>
            )}
          </div>
        )
      })}
      {error && <p className="text-sm text-[var(--warn)]">{error}</p>}
      {!!list?.length && (
        <button className="btn btn-secondary w-full" disabled={account.syncState.status === 'syncing'} onClick={() => account.syncNow({ forceImport: true }).then(refresh)}>
          {account.syncState.status === 'syncing' ? 'Importing…' : 'Import now'}
        </button>
      )}
    </div>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const run = async (mode: 'in' | 'up') => {
    setBusy(true)
    setMessage(null)
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMessage(error.message)
    else if (mode === 'up' && !data.session) setMessage('Account created. Confirm the link sent by email, then come back here and sign in.')
  }

  return (
    <form className="card space-y-3 p-4" onSubmit={(e) => (e.preventDefault(), run('in'))}>
      <h2 className="font-semibold">Account</h2>
      <p className="text-sm text-[var(--muted)]">
        Optional. Signing in backs up your training to your private database and is needed for the Strava and Withings link. Everything also works
        offline without an account.
      </p>
      <input className="field" type="email" autoComplete="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input
        className="field"
        type="password"
        autoComplete="current-password"
        placeholder="Password (8+ characters)"
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {message && <p className="text-sm">{message}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" type="submit" disabled={busy}>
          Sign in
        </button>
        <button className="btn btn-secondary flex-1" type="button" disabled={busy || !email || password.length < 8} onClick={() => run('up')}>
          Create account
        </button>
      </div>
    </form>
  )
}

export function SettingsScreen({ account, redirectResult = null }: { account: Account; redirectResult?: { outcome: string; provider: string | null } | null }) {
  const { session, syncState, syncNow } = account
  const lastSync = useLiveQuery(() => db.meta.get('lastSync'), [])
  const pending = useLiveQuery(async () => (await db.sessions.where('dirty').equals(1).count()) + (await db.sets.where('dirty').equals(1).count()), [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      {!session ? (
        <SignIn />
      ) : (
        <div className="card space-y-3 p-4">
          <h2 className="font-semibold">Account</h2>
          <p className="text-sm">
            Signed in as <b>{session.user.email}</b>
          </p>
          <p className="text-sm text-[var(--muted)]">
            Last backup: {lastSync ? new Date(lastSync.value).toLocaleString('en-GB') : 'never'} · {pending ?? 0} changes waiting
          </p>
          {syncState.message && (
            <p className={`text-sm ${syncState.status === 'error' ? 'text-[var(--warn)]' : 'text-[var(--muted)]'}`}>{syncState.message}</p>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" onClick={() => syncNow()} disabled={syncState.status === 'syncing'}>
              {syncState.status === 'syncing' ? 'Backing up…' : 'Back up now'}
            </button>
            <button className="btn btn-secondary" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
      )}

      <ConnectedServices account={account} redirectResult={redirectResult} />

      <div className="card space-y-2 p-4 text-sm">
        <h2 className="font-semibold">Install on iPhone</h2>
        <p className="text-[var(--muted)]">
          Open this page in Safari, tap the Share button, then “Add to Home Screen”. Open the app from the home screen icon from then on: it runs
          full-screen and works without a connection.
        </p>
      </div>

      <div className="card space-y-2 p-4 text-sm">
        <h2 className="font-semibold">About the programme</h2>
        <p className="text-[var(--muted)]">
          Exercise choices and rules follow the evidence summary in the project repository (docs/EVIDENCE.md). This is not medical advice: a
          physiotherapist assessment is recommended for the knee and shoulder/wrist issues.
        </p>
      </div>
    </div>
  )
}
