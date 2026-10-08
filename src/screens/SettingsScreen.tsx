import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Bike, BookOpen, CloudUpload, LogOut, Scale, Smartphone, type LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { db } from '../lib/db'
import type { Account } from '../lib/useAccount'
import { connect, disconnect, PROVIDER_INFO, useIntegrations, type Provider } from '../lib/integrations'
import { Callout, Card, ScreenHeader, SectionTitle } from '../ui'

const REDIRECT_MESSAGES: Record<string, string> = {
  connected: 'Connected. Your recent data is being imported.',
  declined: 'The connection was cancelled.',
  expired: 'The connection link expired. Please try again.',
  failed: 'The connection failed. Please try again; if it keeps failing, check the client ID and secret in Supabase.',
}

const PROVIDER_ICON: Record<Provider, LucideIcon> = { strava: Bike, withings: Scale }

function Row({ icon: Icon, title, detail, action }: { icon: LucideIcon; title: ReactNode; detail?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent-ink)]">
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-medium">{title}</div>
        {detail && <div className="text-[13px] text-[var(--muted)]">{detail}</div>}
      </div>
      {action}
    </div>
  )
}

const smallBtn = 'h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold disabled:opacity-40'

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
    <>
      <SectionTitle>Connected services</SectionTitle>
      {banner && (
        <Callout>
          {redirectResult?.provider ? `${PROVIDER_INFO[redirectResult.provider as Provider]?.name ?? redirectResult.provider}: ` : ''}
          {banner}
        </Callout>
      )}
      <Card className="divide-y divide-[var(--border)] overflow-hidden">
        {(Object.keys(PROVIDER_INFO) as Provider[]).map((p) => {
          const status = list?.find((s) => s.provider === p)
          return (
            <Row
              key={p}
              icon={PROVIDER_ICON[p]}
              title={PROVIDER_INFO[p].name}
              detail={
                status ? (
                  status.last_error ? (
                    <span className="text-[var(--warn)]">Last import failed: {status.last_error}</span>
                  ) : status.last_synced_at ? (
                    `Imported ${new Date(status.last_synced_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                  ) : (
                    'Waiting for first import'
                  )
                ) : (
                  PROVIDER_INFO[p].brings
                )
              }
              action={
                status ? (
                  <button
                    className={`${smallBtn} bg-[var(--surface-2)] text-[var(--muted)] ring-1 ring-[var(--border)]`}
                    disabled={busy === p}
                    onClick={() => confirm(`Disconnect ${PROVIDER_INFO[p].name}? Data already imported stays.`) && run(p, () => disconnect(p))}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button className={`${smallBtn} bg-[var(--accent)] text-[var(--accent-text)]`} disabled={busy === p || list === null} onClick={() => run(p, () => connect(p))}>
                    Connect
                  </button>
                )
              }
            />
          )
        })}
        {!!list?.length && (
          <div className="px-4 py-3">
            <button className="btn btn-secondary w-full" disabled={account.syncState.status === 'syncing'} onClick={() => account.syncNow({ forceImport: true }).then(refresh)}>
              {account.syncState.status === 'syncing' ? 'Importing…' : 'Import now'}
            </button>
          </div>
        )}
      </Card>
      {error && <p className="px-1 text-sm text-[var(--warn)]">{error}</p>}
      <p className="px-1 text-[13px] text-[var(--muted)]">Fetched every 3 hours and when you open the app. A hard ride or long hike moves the legs session.</p>
    </>
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
    const { data, error } = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) setMessage(error.message)
    else if (mode === 'up' && !data.session) setMessage('Account created. Confirm the link sent by email, then come back here and sign in.')
  }

  return (
    <Card className="p-5">
      <form className="space-y-3" onSubmit={(e) => (e.preventDefault(), run('in'))}>
        <h2 className="text-[17px] font-semibold">Sign in</h2>
        <p className="text-[13px] text-[var(--muted)]">
          Backs up your training and enables the Strava and Withings link. Everything also works offline without an account.
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
        <button className="btn btn-primary w-full" type="submit" disabled={busy}>
          Sign in
        </button>
        <button className="btn btn-ghost w-full" type="button" disabled={busy || !email || password.length < 8} onClick={() => run('up')}>
          Create an account
        </button>
      </form>
    </Card>
  )
}

export function SettingsScreen({ account, redirectResult = null }: { account: Account; redirectResult?: { outcome: string; provider: string | null } | null }) {
  const { session, syncState, syncNow } = account
  const lastSync = useLiveQuery(() => db.meta.get('lastSync'), [])
  const pending = useLiveQuery(async () => (await db.sessions.where('dirty').equals(1).count()) + (await db.sets.where('dirty').equals(1).count()), [])

  return (
    <div className="space-y-4">
      <ScreenHeader title="Settings" />

      {!session ? (
        <SignIn />
      ) : (
        <>
          <SectionTitle>Account</SectionTitle>
          <Card className="divide-y divide-[var(--border)] overflow-hidden">
            <Row
              icon={CloudUpload}
              title={session.user.email}
              detail={
                syncState.status === 'error' ? (
                  <span className="text-[var(--warn)]">{syncState.message}</span>
                ) : (
                  `Backed up ${lastSync ? new Date(lastSync.value).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'never'}${pending ? ` · ${pending} waiting` : ''}`
                )
              }
              action={
                <button className={`${smallBtn} bg-[var(--accent-soft)] text-[var(--accent-ink)]`} onClick={() => syncNow()} disabled={syncState.status === 'syncing'}>
                  {syncState.status === 'syncing' ? 'Syncing…' : 'Back up'}
                </button>
              }
            />
            <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium text-[var(--danger)]" onClick={() => supabase.auth.signOut()}>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--surface-2)]">
                <LogOut size={18} />
              </span>
              Sign out
            </button>
          </Card>
        </>
      )}

      <ConnectedServices account={account} redirectResult={redirectResult} />

      <SectionTitle>About</SectionTitle>
      <Card className="divide-y divide-[var(--border)] overflow-hidden">
        <Row icon={Smartphone} title="Install on iPhone" detail="Safari → Share → Add to Home Screen. It then runs full-screen and offline." />
        <Row icon={BookOpen} title="The programme" detail="Based on the evidence summary in the project (docs/EVIDENCE.md). Not medical advice: get the knee and shoulder/wrist assessed by a physiotherapist." />
      </Card>
    </div>
  )
}
