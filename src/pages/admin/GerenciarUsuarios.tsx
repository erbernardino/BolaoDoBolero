import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Usuario, Role } from '../../types'

export function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    carregarUsuarios()
  }, [])

  async function carregarUsuarios() {
    const snap = await getDocs(collection(db, 'usuarios'))
    const lista = snap.docs.map(d => ({ uid: d.id, ...d.data() } as Usuario))
    lista.sort((a, b) => (a.nome || a.apelido || '').localeCompare(b.nome || b.apelido || ''))
    setUsuarios(lista)
    setLoading(false)
  }

  async function alterarRole(uid: string, novaRole: Role) {
    await updateDoc(doc(db, 'usuarios', uid), { role: novaRole })
    setUsuarios(prev => prev.map(u => u.uid === uid ? { ...u, role: novaRole } : u))
  }

  async function toggleLiberado(uid: string, atual: boolean) {
    const novo = !atual
    await updateDoc(doc(db, 'usuarios', uid), { liberado: novo })
    setUsuarios(prev => prev.map(u => u.uid === uid ? { ...u, liberado: novo } : u))

    // Notificar o usuário quando liberado
    if (novo) {
      await addDoc(collection(db, 'notificacoes_usuario', uid, 'items'), {
        titulo: 'Conta liberada!',
        corpo: 'Sua conta foi liberada pelo administrador. Agora você pode registrar seus palpites.',
        lida: false,
        link: '/palpites',
        criadoEm: Timestamp.now(),
      })
    }
  }

  const filtrados = usuarios.filter(u => {
    const termo = filtro.toLowerCase()
    return (
      u.nome?.toLowerCase().includes(termo) ||
      u.apelido?.toLowerCase().includes(termo) ||
      u.email?.toLowerCase().includes(termo) ||
      u.telefone?.includes(termo)
    )
  })

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-gray-500">Carregando...</p></div>
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Usuarios ({usuarios.length})</h2>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome, apelido, email ou telefone..."
        value={filtro}
        onChange={e => setFiltro(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Desktop table */}
        <table className="w-full hidden md:table">
          <thead className="bg-gray-50 text-left text-sm text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Apelido</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.map(u => (
              <tr key={u.uid} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">{u.nome || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.apelido || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.email || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{u.telefone || '-'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={e => alterarRole(u.uid, e.target.value as Role)}
                    className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <option value="participante">Participante</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleLiberado(u.uid, u.liberado ?? false)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                      u.liberado !== false
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {u.liberado !== false ? 'Liberado' : 'Pendente'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtrados.map(u => (
            <div key={u.uid} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-800">{u.nome || u.apelido || 'Sem nome'}</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleLiberado(u.uid, u.liberado ?? false)}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
                      u.liberado !== false
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {u.liberado !== false ? 'Liberado' : 'Pendente'}
                  </button>
                  <select
                    value={u.role}
                    onChange={e => alterarRole(u.uid, e.target.value as Role)}
                    className={`text-xs font-medium rounded-full px-3 py-1 border-0 cursor-pointer ${
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    <option value="participante">Participante</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              {u.apelido && u.nome && (
                <p className="text-xs text-gray-500">@{u.apelido}</p>
              )}
              {u.email && <p className="text-xs text-gray-500">{u.email}</p>}
              {u.telefone && <p className="text-xs text-gray-500">{u.telefone}</p>}
            </div>
          ))}
        </div>

        {filtrados.length === 0 && (
          <p className="text-center text-gray-400 py-8">
            {filtro ? 'Nenhum usuario encontrado.' : 'Nenhum usuario cadastrado.'}
          </p>
        )}
      </div>
    </div>
  )
}
