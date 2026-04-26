import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'

const POLL_INTERVAL_MS = 2 * 60 * 1000

// Estrategia em duas camadas:
// 1) Listener Firestore em /config/app_version: invalidacao instantanea quando
//    o doc e atualizado depois de um deploy.
// 2) Polling em /version.json a cada 2 min como rede de seguranca, caso o
//    listener falhe, esteja offline ou o doc nao tenha sido atualizado.
// Em ambos os casos comparamos contra __APP_VERSION__ injetado no bundle pelo
// vite.config (git short SHA).
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

    // 1) Listener Firestore (instantaneo)
    const unsub = onSnapshot(
      doc(db, 'config', 'app_version'),
      (snap) => {
        if (cancelled) return
        if (!snap.exists()) return
        const build = snap.data()?.build as string | undefined
        if (build && build !== __APP_VERSION__) {
          setHasUpdate(true)
        }
      },
      () => {
        // Erro no listener (offline, rules, etc): polling cobre.
      },
    )

    // 2) Polling (rede de seguranca)
    checkPolling()
    const id = window.setInterval(checkPolling, POLL_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkPolling()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      unsub()
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return { hasUpdate, reload: () => window.location.reload() }
}
