import { useState } from 'react'
import { ChartLine, House, LayoutGrid, Settings, type LucideIcon } from 'lucide-react'
import { useAccount } from './lib/useAccount'
import { takeRedirectResult } from './lib/integrations'
import { TodayScreen } from './screens/TodayScreen'
import { LibraryScreen } from './screens/LibraryScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { SettingsScreen } from './screens/SettingsScreen'

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'today', label: 'Today', icon: House },
  { id: 'library', label: 'Exercises', icon: LayoutGrid },
  { id: 'progress', label: 'Progress', icon: ChartLine },
  { id: 'settings', label: 'Settings', icon: Settings },
]

type Tab = 'today' | 'library' | 'progress' | 'settings'

// Result of a Strava/Withings connection, read once when the app opens after the redirect.
const redirectResult = takeRedirectResult()

export function App() {
  const [tab, setTab] = useState<Tab>(redirectResult ? 'settings' : 'today')
  const account = useAccount()

  return (
    <div className="flex h-full flex-col">
      <main className="flex-1 overflow-y-auto px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28">
        <div className="mx-auto max-w-xl">
          {tab === 'today' && <TodayScreen account={account} />}
          {tab === 'library' && <LibraryScreen />}
          {tab === 'progress' && <ProgressScreen />}
          {tab === 'settings' && <SettingsScreen account={account} redirectResult={redirectResult} />}
        </div>
      </main>
      <nav className="tabbar fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto grid max-w-xl grid-cols-4 px-2">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[11px] font-medium ${active ? 'text-[var(--accent)]' : 'text-[var(--muted)]'}`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={23} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
