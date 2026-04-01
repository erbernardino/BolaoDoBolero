import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone)
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSPrompt, setShowIOSPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Verificar se já foi dispensado recentemente
    const dismissedAt = localStorage.getItem('pwa-install-dismissed')
    if (dismissedAt && Date.now() - Number(dismissedAt) < 7 * 24 * 60 * 60 * 1000) {
      setDismissed(true)
      return
    }

    if (isStandalone()) return

    // Android/Chrome: capturar evento beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: mostrar instruções manuais
    if (isIOS()) {
      setShowIOSPrompt(true)
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setDeferredPrompt(null)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    setDeferredPrompt(null)
    setShowIOSPrompt(false)
    localStorage.setItem('pwa-install-dismissed', String(Date.now()))
  }

  if (dismissed || isStandalone()) return null

  // Android/Chrome prompt
  if (deferredPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-800 text-white rounded-xl shadow-2xl p-4 z-50">
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="Bolero" className="w-12 h-12 rounded-lg shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Instalar Bolero</p>
            <p className="text-xs text-blue-200 mt-0.5">Acesse o app direto da tela inicial</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 bg-white text-blue-800 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-blue-200 hover:text-white transition-colors"
          >
            Agora n&atilde;o
          </button>
        </div>
      </div>
    )
  }

  // iOS prompt
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-800 text-white rounded-xl shadow-2xl p-4 z-50">
        <div className="flex items-start gap-3">
          <img src="/icon-192.png" alt="Bolero" className="w-12 h-12 rounded-lg shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Instalar Bolero</p>
            <p className="text-xs text-blue-200 mt-1 leading-relaxed">
              Toque em{' '}
              <svg className="inline w-4 h-4 align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12l7-7 7 7" />
                <rect x="4" y="18" width="16" height="2" rx="1" />
              </svg>
              {' '}(Compartilhar) e depois em <strong>&quot;Adicionar &agrave; Tela de In&iacute;cio&quot;</strong>
            </p>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-blue-200 hover:text-white transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    )
  }

  return null
}
