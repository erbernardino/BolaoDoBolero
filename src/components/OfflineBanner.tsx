import { useOffline } from '../hooks/useOffline'

export function OfflineBanner() {
  const offline = useOffline()

  if (!offline) return null

  return (
    <div className="bg-yellow-500 text-yellow-900 text-center text-sm font-medium py-2 px-4">
      Sem conexão com a internet. Alguns dados podem estar desatualizados.
    </div>
  )
}
