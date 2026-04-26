import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db, auth } from '../../config/firebase'
import type { Usuario, Role } from '../../types'
import { Avatar } from '../../components/Avatar'

const functions = getFunctions()

const iconCheck = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 111.42-1.42L8 12.585l7.29-7.295a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
)

const iconClock = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
  </svg>
)

const iconTrash = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2h12a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM5 8a1 1 0 011-1h8a1 1 0 011 1v9a2 2 0 01-2 2H7a2 2 0 01-2-2V8zm3 1a1 1 0 10-2 0v7a1 1 0 102 0V9zm3-1a1 1 0 011 1v7a1 1 0 11-2 0V9a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
)

const iconSpinner = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
  </svg>
)

export function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [excluindoUid, setExcluindoUid] = useState<string | null>(null)

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
      const fn = httpsCallable<{ titulo: string; corpo: string; uids: string[] }, { enviados: number }>(
        functions,
        'enviarNotificacao',
      )
      await fn({
        titulo: 'Conta liberada!',
        corpo: 'Sua conta foi liberada pelo administrador. Agora você pode registrar seus palpites.',
        uids: [uid],
      })
    }
  }

  async function excluirUsuario(u: Usuario) {
    if (u.uid === auth.currentUser?.uid) {
      alert('Você não pode excluir sua própria conta.')
      return
    }
    const identificacao = u.apelido || u.nome || u.email || u.uid
    const confirmacao = window.prompt(
      `Exclusão de usuário é irreversível (dados ficam salvos em "usuarios_excluidos" para consulta).\n\nPara confirmar, digite o apelido/nome: ${identificacao}`
    )
    if (confirmacao == null) return
    if (confirmacao.trim() !== identificacao) {
      alert('Confirmação não confere. Exclusão cancelada.')
      return
    }
    setExcluindoUid(u.uid)
    try {
      const fn = httpsCallable<{ uid: string }, { ok: boolean }>(functions, 'excluirUsuario')
      await fn({ uid: u.uid })
      setUsuarios(prev => prev.filter(x => x.uid !== u.uid))
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      alert(`Falha ao excluir usuário: ${msg}`)
    } finally {
      setExcluindoUid(null)
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
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.map(u => (
              <tr key={u.uid} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={u.fotoURL ?? null}
                      nome={u.nome || u.apelido}
                      uid={u.uid}
                      size="sm"
                      ring={false}
                    />
                    <span>{u.nome || '-'}</span>
                  </div>
                </td>
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
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      u.liberado === true
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {u.liberado === true ? 'Liberado' : 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleLiberado(u.uid, u.liberado ?? false)}
                      title={u.liberado === true ? 'Deixar pendente' : 'Liberar'}
                      aria-label={u.liberado === true ? 'Deixar pendente' : 'Liberar'}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        u.liberado === true
                          ? 'border-red-300 text-red-700 hover:bg-red-50'
                          : 'border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {u.liberado === true ? iconClock : iconCheck}
                    </button>
                    <button
                      onClick={() => excluirUsuario(u)}
                      disabled={excluindoUid === u.uid || u.uid === auth.currentUser?.uid}
                      title={u.uid === auth.currentUser?.uid ? 'Não é possível excluir sua própria conta' : 'Excluir usuário'}
                      aria-label="Excluir usuário"
                      className="p-1.5 rounded-lg border border-red-400 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {excluindoUid === u.uid ? iconSpinner : iconTrash}
                    </button>
                  </div>
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
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar
                    src={u.fotoURL ?? null}
                    nome={u.nome || u.apelido}
                    uid={u.uid}
                    size="md"
                    ring={false}
                  />
                  <p className="font-medium text-gray-800 truncate">{u.nome || u.apelido || 'Sem nome'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      u.liberado === true
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {u.liberado === true ? 'Liberado' : 'Pendente'}
                  </span>
                  <button
                    onClick={() => toggleLiberado(u.uid, u.liberado ?? false)}
                    title={u.liberado === true ? 'Deixar pendente' : 'Liberar'}
                    aria-label={u.liberado === true ? 'Deixar pendente' : 'Liberar'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      u.liberado === true
                        ? 'border-red-300 text-red-700 hover:bg-red-50'
                        : 'border-green-300 text-green-700 hover:bg-green-50'
                    }`}
                  >
                    {u.liberado === true ? iconClock : iconCheck}
                  </button>
                  <button
                    onClick={() => excluirUsuario(u)}
                    disabled={excluindoUid === u.uid || u.uid === auth.currentUser?.uid}
                    title={u.uid === auth.currentUser?.uid ? 'Não é possível excluir sua própria conta' : 'Excluir usuário'}
                    aria-label="Excluir usuário"
                    className="p-1.5 rounded-lg border border-red-400 text-red-700 bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {excluindoUid === u.uid ? iconSpinner : iconTrash}
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
