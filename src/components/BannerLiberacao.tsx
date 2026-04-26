import { useAuth } from '../hooks/useAuth'

export function BannerLiberacao() {
  const { usuario } = useAuth()

  if (!usuario || usuario.liberado === true || usuario.role === 'admin') return null

  return (
    <div className="sticky top-0 z-40 bg-amber-500 text-white px-4 py-3 text-center text-sm font-medium shadow-md">
      <strong>Aguardando liberação do administrador.</strong>{' '}
      Envie o comprovante de PIX para o celular <strong>(11) 97177-0713</strong> (chave PIX e WhatsApp).
    </div>
  )
}
