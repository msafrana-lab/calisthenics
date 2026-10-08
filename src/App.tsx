import { useState } from 'react'
import { useAccount } from './lib/useAccount'
import { takeRedirectResult } from './lib/integrations'
import { TodayScreen } from './screens/TodayScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'

const TABS = [
  { id: 'today', label: 'Today', icon: 'M4 12h16M12 4v16' },
  { id: 'library', label: 'Exercises', icon: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'progress', label: 'Progress', icon: 'M4 19l5-6 4 3 7-9' },
  { id: 'settings', label: 'Settings', icon: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v3M12 19v3M2 12h3M19 12h3' },
] as const

type Tab = (typeof TABS)[number]['id']

// Result of a Strava/Withings connection, read once when the app opens after the redirect.
const redirectResult = takeRedirectResult()

export function App() {
  const [tab, setTab] = useState<Tab>(redirectResult ? 'settings' : 'today')
  const account = useAccount()

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-6">
        <div className="mx-auto max-w-xl">
          {tab === 'today' && <TodayScreen account={account} />}
          {tab === 'library' && <LibraryScreen />}
          {tab === 'progress' && <ProgressScreen />}
          {tab === 'settings' && <SettingsScreen account={account} redirectResult={redirectResult} />}
        </div>
      </main>
      <nav className="border-t border-[var(--border)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-1 py-2 text-xs font-medium ${tab === t.id ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={t.icon} />
              </svg>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
