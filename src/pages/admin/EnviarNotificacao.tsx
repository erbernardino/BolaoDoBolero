import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db } from '../../config/firebase'
import { getFunctions } from 'firebase/functions'
import type { Usuario } from '../../types'

const functions = getFunctions()

export function EnviarNotificacao() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [titulo, setTitulo] = useState('')
  const [corpo, setCorpo] = useState('')
  const [modo, setModo] = useState<'todos' | 'selecionados'>('todos')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [enviando, setEnviando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, 'usuarios'))
      const lista = snap.docs.map(d => ({ uid: d.id, ...d.data() } as Usuario))
      lista.sort((a, b) => (a.apelido || a.nome || '').localeCompare(b.apelido || b.nome || ''))
      setUsuarios(lista)
    }
    load()
  }, [])

  function toggleUsuario(uid: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(uid)) next.delete(uid)
      else next.add(uid)
      return next
    })
  }

  function toggleTodos() {
    if (selecionados.size === filtrados.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(filtrados.map(u => u.uid)))
    }
  }

  const filtrados = usuarios.filter(u => {
    if (!filtro) return true
    const termo = filtro.toLowerCase()
    return (u.apelido || '').toLowerCase().includes(termo) ||
      (u.nome || '').toLowerCase().includes(termo)
  })

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault()
    setMensagem(null)

    if (!titulo.trim() || !corpo.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Preencha o título e a mensagem.' })
      return
    }

    if (modo === 'selecionados' && selecionados.size === 0) {
      setMensagem({ tipo: 'erro', texto: 'Selecione pelo menos um usuário.' })
      return
    }

    setEnviando(true)
    try {
      const fn = httpsCallable(functions, 'enviarNotificacao')
      await fn({
        titulo: titulo.trim(),
        corpo: corpo.trim(),
        uids: modo === 'selecionados' ? Array.from(selecionados) : undefined,
      })
      setMensagem({
        tipo: 'sucesso',
        texto: modo === 'todos'
          ? 'Notificação enviada para todos!'
          : `Notificação enviada para ${selecionados.size} usuário(s)!`,
      })
      setTitulo('')
      setCorpo('')
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar. Tente novamente.' })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Enviar Notificação</h2>

      <form onSubmit={handleEnviar} className="space-y-5">
        {/* Título e corpo */}
        <div className="bg-white rounded-lg shadow p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Lembrete de palpites"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
            <textarea
              value={corpo}
              onChange={e => setCorpo(e.target.value)}
              placeholder="Ex: Faltam 3 dias para o prazo de palpites!"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* Destinatários */}
        <div className="bg-white rounded-lg shadow p-5">
          <label className="block text-sm font-medium text-gray-700 mb-3">Destinatários</label>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setModo('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                modo === 'todos' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Todos ({usuarios.length})
            </button>
            <button
              type="button"
              onClick={() => setModo('selecionados')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                modo === 'selecionados' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Selecionar {selecionados.size > 0 && `(${selecionados.size})`}
            </button>
          </div>

          {modo === 'selecionados' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={toggleTodos}
                  className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                >
                  {selecionados.size === filtrados.length ? 'Desmarcar todos' : 'Marcar todos'}
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
                {filtrados.map(u => (
                  <label
                    key={u.uid}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                      selecionados.has(u.uid) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selecionados.has(u.uid)}
                      onChange={() => toggleUsuario(u.uid)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {u.apelido || u.nome || 'Sem nome'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {u.email || u.telefone || ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {mensagem && (
          <p className={`text-sm ${mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-red-600'}`}>
            {mensagem.texto}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {enviando ? 'Enviando...' : modo === 'todos' ? 'Enviar para Todos' : `Enviar para ${selecionados.size} Selecionado(s)`}
        </button>
      </form>
    </div>
  )
}
