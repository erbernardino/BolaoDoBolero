import { useAuth } from '../hooks/useAuth'

export function BannerLiberacao() {
  const { usuario } = useAuth()

  if (!usuario || usuario.liberado !== false || usuario.role === 'admin') return null

  return (
    <div className="bg-amber-500 text-white px-4 py-3 text-center text-sm font-medium shadow-md">
      <strong>Aguardando liberação do administrador.</strong>{' '}
      Sua conta será liberada após a confirmação do pagamento (até 48 horas).
    </div>
  )
}
