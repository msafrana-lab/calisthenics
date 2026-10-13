import { useEffect } from 'react'

/**
 * Keeps the screen on while `active` (Screen Wake Lock API, supported by
 * recent iPhone Safari; verify on the device). The lock is released when the
 * app is hidden, so it is requested again when the app comes back.
 */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let cancelled = false
    const request = async () => {
      try {
        lock = await navigator.wakeLock.request('screen')
        if (cancelled) void lock.release()
      } catch {
        // Refused (low battery, not visible): the session still runs.
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && request()
    void request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void lock?.release()
    }
  }, [active])
}
