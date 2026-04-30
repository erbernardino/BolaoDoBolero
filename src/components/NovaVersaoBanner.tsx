import { useEffect, useState } from 'react'
import { useAppVersion } from '../hooks/useAppVersion'

const COUNTDOWN_SEC = 5

export function NovaVersaoBanner() {
  const { hasUpdate, reload } = useAppVersion()
  const [seconds, setSeconds] = useState(COUNTDOWN_SEC)

  useEffect(() => {
    if (!hasUpdate) return

    // Aba em background: recarrega silenciosamente
    if (document.visibilityState !== 'visible') {
      reload()
      return
    }

    // Aba visível: contagem regressiva e recarrega automaticamente
    setSeconds(COUNTDOWN_SEC)
    const id = window.setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(id)
          reload()
          return 0
        }
        return s - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [hasUpdate])

  if (!hasUpdate) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-4 text-sm">
      <span>Nova versão disponível. Atualizando em <strong>{seconds}s</strong>…</span>
      <button
        onClick={reload}
        className="bg-white text-blue-700 font-semibold rounded-full px-3 py-1 hover:bg-blue-50 transition-colors whitespace-nowrap"
      >
        Atualizar agora
      </button>
    </div>
  )
}
