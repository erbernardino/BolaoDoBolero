import { useEffect, useState } from 'react'

const POLL_INTERVAL_MS = 2 * 60 * 1000

export function useAppVersion() {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function checkPolling() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { version?: string }
        if (cancelled) return
        if (data.version && data.version !== __APP_VERSION__) {
          setHasUpdate(true)
        }
      } catch {
        // rede offline: ignora
      }
    }

    checkPolling()
    const id = window.setInterval(checkPolling, POLL_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkPolling()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return { hasUpdate, reload: () => window.location.reload() }
}
