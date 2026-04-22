import { useAppVersion } from '../hooks/useAppVersion'

export function NovaVersaoBanner() {
  const { hasUpdate, reload } = useAppVersion()
  if (!hasUpdate) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white rounded-full shadow-lg px-4 py-2 flex items-center gap-3 text-sm">
      <span>Nova versão disponível.</span>
      <button
        onClick={reload}
        className="bg-white text-blue-700 font-semibold rounded-full px-3 py-1 hover:bg-blue-50 transition-colors"
      >
        Atualizar
      </button>
    </div>
  )
}
