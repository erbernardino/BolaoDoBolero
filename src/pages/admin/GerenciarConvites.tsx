import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { useAuth } from '../../hooks/useAuth'
import type { Convite, Usuario, TipoConvite } from '../../types'

type ConviteComUsuario = Convite & { usuarioInfo?: Usuario }

export function GerenciarConvites() {
  const { firebaseUser } = useAuth()
  const [convites, setConvites] = useState<ConviteComUsuario[]>([])
  const [loading, setLoading] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  async function carregarConvites() {
    const [convitesSnap, usuariosSnap] = await Promise.all([
      getDocs(collection(db, 'convites')),
      getDocs(collection(db, 'usuarios')),
    ])

    const usuariosMap = new Map<string, Usuario>()
    usuariosSnap.forEach((d) => {
      usuariosMap.set(d.id, { uid: d.id, ...d.data() } as Usuario)
    })

    const lista = convitesSnap.docs.map((d) => {
      const convite = { id: d.id, ...d.data() } as Convite
      const usuarioInfo = convite.usadoPor ? usuariosMap.get(convite.usadoPor) : undefined
      return { ...convite, usuarioInfo }
    })
    setConvites(lista)
  }

  useEffect(() => {
    carregarConvites()
  }, [])

  async function gerarConvite(tipo: TipoConvite) {
    if (!firebaseUser) return
    setLoading(true)
    await addDoc(collection(db, 'convites'), {
      criadoPor: firebaseUser.uid,
      tipo,
      usado: false,
      usadoPor: null,
      criadoEm: Timestamp.now(),
    })
    await carregarConvites()
    setLoading(false)
  }

  function urlConvite(id: string) {
    return `${window.location.origin}/convite/${id}`
  }

  async function copiar(id: string) {
    await navigator.clipboard.writeText(urlConvite(id))
    setCopiado(id)
    setTimeout(() => setCopiado(null), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciar Convites</h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => gerarConvite('unico')}
          disabled={loading}
          className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Gerando...' : 'Convite Unico'}
        </button>
        <button
          onClick={() => gerarConvite('multiplo')}
          disabled={loading}
          className="bg-green-700 text-white px-5 py-2 rounded hover:bg-green-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Gerando...' : 'Convite Multiplo'}
        </button>
      </div>

      {convites.length === 0 ? (
        <p className="text-gray-500">Nenhum convite gerado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {convites.map((convite) => (
            <li
              key={convite.id}
              className={`bg-white shadow rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                convite.usado && convite.tipo !== 'multiplo' ? 'opacity-50' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-500 truncate">{urlConvite(convite.id)}</p>
                {convite.usado && convite.usuarioInfo && convite.tipo !== 'multiplo' && (
                  <div className="mt-1 text-xs text-gray-600">
                    <span className="font-medium">{convite.usuarioInfo.nome}</span>
                    {convite.usuarioInfo.email && <span> &middot; {convite.usuarioInfo.email}</span>}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    convite.tipo === 'multiplo'
                      ? 'bg-green-100 text-green-700'
                      : convite.usado
                        ? 'bg-gray-200 text-gray-600'
                        : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {convite.tipo === 'multiplo' ? 'Multiplo' : convite.usado ? 'Usado' : 'Unico'}
                </span>

                <button
                  onClick={() => copiar(convite.id)}
                  className="text-sm text-blue-700 hover:text-blue-900 transition-colors"
                >
                  {copiado === convite.id ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
