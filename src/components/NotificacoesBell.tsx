import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotificacoesInApp } from '../hooks/useNotificacoesInApp'

export function NotificacoesBell() {
  const { notificacoes, naoLidas, marcarTodasComoLidas } = useNotificacoesInApp()
  const navigate = useNavigate()
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleToggle() {
    if (!aberto && naoLidas > 0) {
      marcarTodasComoLidas()
    }
    setAberto(!aberto)
  }

  function tempoAtras(criadoEm: { toDate: () => Date }): string {
    const agora = Date.now()
    const diff = agora - criadoEm.toDate().getTime()
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'agora'
    if (min < 60) return `${min}min`
    const hrs = Math.floor(min / 60)
    if (hrs < 24) return `${hrs}h`
    const dias = Math.floor(hrs / 24)
    return `${dias}d`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleToggle}
        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors relative"
        aria-label="Notificações"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M5.25 9a6.75 6.75 0 0113.5 0v.75c0 2.123.8 4.057 2.118 5.52a.75.75 0 01-.297 1.206c-1.544.57-3.16.99-4.831 1.243a3.75 3.75 0 11-7.48 0 24.585 24.585 0 01-4.831-1.244.75.75 0 01-.298-1.205A8.217 8.217 0 005.25 9.75V9zm4.502 8.9a2.25 2.25 0 004.496 0 25.057 25.057 0 01-4.496 0z" clipRule="evenodd" />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800 text-sm">Notificações</h3>
            {notificacoes.length > 0 && (
              <span className="text-xs text-gray-400">{notificacoes.length}</span>
            )}
          </div>

          <div className="overflow-y-auto max-h-72">
            {notificacoes.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                Nenhuma notificação
              </div>
            ) : (
              notificacoes.map(n => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.link) {
                      setAberto(false)
                      navigate(n.link)
                    }
                  }}
                  className={`px-4 py-3 border-b border-gray-50 last:border-0 ${
                    !n.lida ? 'bg-blue-50/50' : ''
                  } ${n.link ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm ${!n.lida ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                        {n.titulo}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.corpo}</p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5">
                      {tempoAtras(n.criadoEm)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
