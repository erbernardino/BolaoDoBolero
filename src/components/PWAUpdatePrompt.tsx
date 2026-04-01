import { useRegisterSW } from 'virtual:pwa-register/react'

export function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-blue-800 text-white rounded-xl shadow-2xl p-4 flex items-center justify-between gap-3 z-50">
      <span className="text-sm">Nova versão disponível!</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="bg-white text-blue-800 font-semibold text-sm px-4 py-1.5 rounded-lg hover:bg-blue-50 transition-colors shrink-0"
      >
        Atualizar
      </button>
    </div>
  )
}
