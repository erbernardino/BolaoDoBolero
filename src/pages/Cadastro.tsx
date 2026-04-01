import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import type { Convite } from '../types'

export function Cadastro() {
  const { conviteId } = useParams<{ conviteId: string }>()
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [apelido, setApelido] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!conviteId) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Convite inválido</h1>
          <p className="text-gray-600">
            Este link de cadastro é inválido. Solicite um novo convite ao administrador.
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate invite
      const conviteSnap = await getDoc(doc(db, 'convites', conviteId))
      if (!conviteSnap.exists()) {
        setError('Convite não encontrado. Solicite um novo convite ao administrador.')
        setLoading(false)
        return
      }

      const convite = { id: conviteSnap.id, ...conviteSnap.data() } as Convite
      if (convite.usado) {
        setError('Este convite já foi utilizado.')
        setLoading(false)
        return
      }

      // Create Firebase Auth user
      const credential = await createUserWithEmailAndPassword(auth, email, senha)
      const uid = credential.user.uid

      // Create Firestore user document
      await setDoc(doc(db, 'usuarios', uid), {
        nome,
        apelido,
        email,
        telefone,
        role: 'participante',
        conviteId,
        criadoEm: serverTimestamp(),
      })

      // Mark invite as used
      await updateDoc(doc(db, 'convites', conviteId), {
        usado: true,
        usadoPor: uid,
      })

      navigate('/')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-blue-800 text-center mb-2">
          Bolão do Bolero
        </h1>
        <p className="text-center text-gray-500 text-sm mb-6">Crie sua conta</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
            <input
              type="text"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Apelido</label>
            <input
              type="text"
              required
              value={apelido}
              onChange={(e) => setApelido(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Joãozinho"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              type="tel"
              required
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="+5511999999999"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Já tem conta?{' '}
          <a href="/login" className="text-blue-600 hover:underline">
            Entrar
          </a>
        </p>
      </div>
    </div>
  )
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está cadastrado.'
      case 'auth/invalid-email':
        return 'E-mail inválido.'
      case 'auth/weak-password':
        return 'Senha muito fraca. Use pelo menos 6 caracteres.'
      default:
        return 'Ocorreu um erro ao criar a conta. Tente novamente.'
    }
  }
  return 'Ocorreu um erro ao criar a conta. Tente novamente.'
}
