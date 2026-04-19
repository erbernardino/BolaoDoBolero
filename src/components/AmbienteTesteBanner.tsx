// Banner visivel apenas no host publico do projeto de teste
// (bolao-do-bolero-teste.web.app ou .firebaseapp.com). Fica sticky no topo.
export function AmbienteTesteBanner() {
  if (typeof window === 'undefined') return null
  const host = window.location.hostname
  if (!host.startsWith('bolao-do-bolero-teste.')) return null
  return (
    <div className="sticky top-0 z-50 bg-red-600 text-white text-center text-sm font-bold px-4 py-2 shadow-lg tracking-wide">
      AMBIENTE DE TESTES
    </div>
  )
}
