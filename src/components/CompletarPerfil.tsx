import { useState } from 'react'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'

export function CompletarPerfil() {
  const { firebaseUser, refreshUsuario } = useAuth()
  const [nome, setNome] = useState(firebaseUser?.displayName || '')
  const [apelido, setApelido] = useState(firebaseUser?.displayName?.split(' ')[0] || '')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const nomeTrimmed = nome.trim()
    const apelidoTrimmed = apelido.trim()

    if (nomeTrimmed.length < 2) {
      setErro('Nome deve ter pelo menos 2 caracteres.')
      return
    }
    if (apelidoTrimmed.length < 2) {
      setErro('Apelido deve ter pelo menos 2 caracteres.')
      return
    }

    if (!firebaseUser) return
    setSalvando(true)

    try {
      await setDoc(doc(db, 'usuarios', firebaseUser.uid), {
        nome: nomeTrimmed,
        apelido: apelidoTrimmed,
        email: firebaseUser.email || '',
        telefone: firebaseUser.phoneNumber || '',
        role: 'participante',
        conviteId: '',
        criadoEm: serverTimestamp(),
      }, { merge: true })
      await refreshUsuario()
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-blue-800 text-center mb-2">Complete seu perfil</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Precisamos do seu nome e apelido para continuar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Seu nome completo"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apelido</label>
            <input
              type="text"
              value={apelido}
              onChange={e => setApelido(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Como quer ser chamado no bolão"
              required
              minLength={2}
            />
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}
