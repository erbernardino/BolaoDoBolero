import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  unlink,
  signOut,
  GoogleAuthProvider,
  linkWithPopup,
} from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'

export function Perfil() {
  const { firebaseUser, usuario, loading, refreshUsuario } = useAuth()
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [apelido, setApelido] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [providerMsg, setProviderMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [unlinking, setUnlinking] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)

  useEffect(() => {
    if (usuario) {
      setNome(usuario.nome || '')
      setApelido(usuario.apelido || '')
    }
  }, [usuario])

  const providers = useMemo(() => {
    if (!firebaseUser) return { email: false, phone: false, google: false }
    const ids = firebaseUser.providerData.map((p) => p.providerId)
    return {
      email: ids.includes('password'),
      phone: ids.includes('phone'),
      google: ids.includes('google.com'),
    }
  }, [firebaseUser])

  const totalProviders = useMemo(() => {
    return [providers.email, providers.phone, providers.google].filter(Boolean).length
  }, [providers])

  const emailFromProvider = useMemo(() => {
    return firebaseUser?.providerData.find((p) => p.providerId === 'password')?.email || ''
  }, [firebaseUser])

  const phoneFromProvider = useMemo(() => {
    return firebaseUser?.providerData.find((p) => p.providerId === 'phone')?.phoneNumber || ''
  }, [firebaseUser])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </>
    )
  }

  if (!firebaseUser || !usuario) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
          <p className="text-gray-500">Usuário não encontrado.</p>
        </div>
      </>
    )
  }

  async function handleSalvarDados(e: React.FormEvent) {
    e.preventDefault()
    setMensagem(null)

    const nomeTrimmed = nome.trim()
    const apelidoTrimmed = apelido.trim()

    if (nomeTrimmed.length < 2 || apelidoTrimmed.length < 2) {
      setMensagem({ tipo: 'erro', texto: 'Nome e apelido devem ter pelo menos 2 caracteres.' })
      return
    }

    setSalvando(true)
    try {
      await updateDoc(doc(db, 'usuarios', firebaseUser!.uid), {
        nome: nomeTrimmed,
        apelido: apelidoTrimmed,
      })
      await refreshUsuario()
      setMensagem({ tipo: 'sucesso', texto: 'Dados atualizados com sucesso!' })
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar dados. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  async function handleUnlink(providerId: string) {
    if (totalProviders <= 1) return
    setProviderMsg(null)
    setUnlinking(true)
    try {
      await unlink(firebaseUser!, providerId)

      const firestoreUpdate: Record<string, string> = {}
      if (providerId === 'password') {
        firestoreUpdate.email = ''
      } else if (providerId === 'phone') {
        firestoreUpdate.telefone = ''
      }

      if (Object.keys(firestoreUpdate).length > 0) {
        await updateDoc(doc(db, 'usuarios', firebaseUser!.uid), firestoreUpdate)
      }

      await refreshUsuario()
      setProviderMsg({ tipo: 'sucesso', texto: 'Método de login desvinculado com sucesso!' })
    } catch {
      setProviderMsg({ tipo: 'erro', texto: 'Erro ao desvincular. Tente novamente.' })
    } finally {
      setUnlinking(false)
    }
  }

  async function handleLinkGoogle() {
    setProviderMsg(null)
    setLinkingGoogle(true)
    try {
      const result = await linkWithPopup(firebaseUser!, new GoogleAuthProvider())
      const googleEmail = result.user.providerData.find(
        (p) => p.providerId === 'google.com'
      )?.email

      if (googleEmail && !usuario!.email) {
        await updateDoc(doc(db, 'usuarios', firebaseUser!.uid), {
          email: googleEmail,
        })
      }

      await refreshUsuario()
      setProviderMsg({ tipo: 'sucesso', texto: 'Google vinculado com sucesso!' })
    } catch {
      setProviderMsg({ tipo: 'erro', texto: 'Erro ao vincular Google. Tente novamente.' })
    } finally {
      setLinkingGoogle(false)
    }
  }

  const isOnlyProvider = totalProviders <= 1

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8 space-y-8 relative">
          {/* Botão fechar */}
          <button
            onClick={() => navigate(-1)}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>

          <h1 className="text-2xl font-bold text-gray-800 text-center">Meu Perfil</h1>

          {/* Seção 1: Dados Pessoais */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Dados Pessoais</h2>
            <form onSubmit={handleSalvarDados} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  id="nome"
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={2}
                />
              </div>
              <div>
                <label htmlFor="apelido" className="block text-sm font-medium text-gray-700 mb-1">
                  Apelido
                </label>
                <input
                  id="apelido"
                  type="text"
                  value={apelido}
                  onChange={(e) => setApelido(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={2}
                />
              </div>

              {mensagem && (
                <p
                  className={`text-sm ${
                    mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {mensagem.texto}
                </p>
              )}

              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </form>
          </section>

          <hr className="border-gray-200" />

          {/* Seção 2: Métodos de Login */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Métodos de Login</h2>

            {providerMsg && (
              <p
                className={`text-sm mb-4 ${
                  providerMsg.tipo === 'sucesso' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {providerMsg.texto}
              </p>
            )}

            <div className="space-y-4">
              {/* Email/Senha */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Email/Senha</p>
                  {providers.email && (
                    <p className="text-xs text-gray-500">{emailFromProvider}</p>
                  )}
                </div>
                {providers.email ? (
                  <div className="relative group">
                    <button
                      onClick={() => handleUnlink('password')}
                      disabled={isOnlyProvider || unlinking}
                      className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Desvincular
                    </button>
                    {isOnlyProvider && (
                      <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        Não é possível remover o único método de login
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => navigate('/perfil/verificar/email')}
                    className="text-sm bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Vincular Email
                  </button>
                )}
              </div>

              {/* Telefone (SMS) */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Telefone (SMS)</p>
                  {providers.phone && (
                    <p className="text-xs text-gray-500">{phoneFromProvider}</p>
                  )}
                </div>
                {providers.phone ? (
                  <div className="relative group">
                    <button
                      onClick={() => handleUnlink('phone')}
                      disabled={isOnlyProvider || unlinking}
                      className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Desvincular
                    </button>
                    {isOnlyProvider && (
                      <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        Não é possível remover o único método de login
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => navigate('/perfil/verificar/telefone')}
                    className="text-sm bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors"
                  >
                    Vincular Telefone
                  </button>
                )}
              </div>

              {/* Google */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-700">Google</p>
                  {providers.google && (
                    <p className="text-xs text-gray-500">Google conectado</p>
                  )}
                </div>
                {providers.google ? (
                  <div className="relative group">
                    <button
                      onClick={() => handleUnlink('google.com')}
                      disabled={isOnlyProvider || unlinking}
                      className="text-sm text-red-600 hover:text-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Desvincular
                    </button>
                    {isOnlyProvider && (
                      <span className="absolute bottom-full right-0 mb-1 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        Não é possível remover o único método de login
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleLinkGoogle}
                    disabled={linkingGoogle}
                    className="text-sm bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {linkingGoogle ? 'Vinculando...' : 'Vincular Google'}
                  </button>
                )}
              </div>
            </div>
          </section>

          <hr className="border-gray-200" />

          {/* Ações */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={() => signOut(auth)}
              className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
            >
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
