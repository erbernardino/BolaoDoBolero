import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  EmailAuthProvider,
  PhoneAuthProvider,
  linkWithCredential,
  RecaptchaVerifier,
} from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { PhoneInput } from '../components/PhoneInput'

type PhoneStep = 'input' | 'confirm'

export function VerificarVinculo() {
  const { tipo } = useParams<{ tipo: string }>()
  const navigate = useNavigate()
  const { firebaseUser, refreshUsuario } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const verificationIdRef = useRef<string | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (tipo !== 'email' && tipo !== 'telefone') {
      navigate('/perfil')
    }
  }, [tipo, navigate])

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear()
    }
  }, [])

  const resetRecaptcha = () => {
    recaptchaRef.current?.clear()
    recaptchaRef.current = null
    if (recaptchaContainerRef.current) {
      recaptchaContainerRef.current.innerHTML = ''
    }
  }

  const ensureRecaptcha = () => {
    if (recaptchaRef.current) {
      resetRecaptcha()
    }
    if (recaptchaContainerRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
      })
    }
  }

  const handleLinkEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) return
    setError('')
    setLoading(true)
    try {
      const credential = EmailAuthProvider.credential(email, password)
      await linkWithCredential(firebaseUser, credential)
      await updateDoc(doc(db, 'usuarios', firebaseUser.uid), { email })
      await refreshUsuario()
      navigate('/perfil')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser) return
    setError('')
    setLoading(true)
    try {
      ensureRecaptcha()
      const provider = new PhoneAuthProvider(auth)
      const verificationId = await provider.verifyPhoneNumber(phone, recaptchaRef.current!)
      verificationIdRef.current = verificationId
      setPhoneStep('confirm')
    } catch (err: unknown) {
      console.error('verifyPhoneNumber error:', JSON.stringify(err, Object.getOwnPropertyNames(err as object)))
      setError(getErrorMessage(err))
      resetRecaptcha()
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firebaseUser || !verificationIdRef.current) return
    setError('')
    setLoading(true)
    try {
      const credential = PhoneAuthProvider.credential(verificationIdRef.current, smsCode)
      await linkWithCredential(firebaseUser, credential)
      await updateDoc(doc(db, 'usuarios', firebaseUser.uid), { telefone: phone })
      await refreshUsuario()
      navigate('/perfil')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (tipo !== 'email' && tipo !== 'telefone') {
    return null
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
          <h1 className="text-2xl font-bold text-blue-800 text-center mb-6">
            {tipo === 'email' ? 'Vincular E-mail' : 'Vincular Telefone'}
          </h1>

          {tipo === 'email' && (
            <form onSubmit={handleLinkEmail} className="space-y-4">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Vinculando...' : 'Vincular'}
              </button>
            </form>
          )}

          {tipo === 'telefone' && (
            <>
              {phoneStep === 'input' && (
                <form onSubmit={handleSendSms} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <PhoneInput
                      value={phone}
                      onChange={setPhone}
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Enviar SMS'}
                  </button>
                </form>
              )}

              {phoneStep === 'confirm' && (
                <form onSubmit={handleConfirmCode} className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Código enviado para <strong>{phone}</strong>. Verifique seu SMS.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Código de verificação
                    </label>
                    <input
                      type="text"
                      required
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Confirmando...' : 'Confirmar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneStep('input')
                      setError('')
                      setSmsCode('')
                    }}
                    className="w-full text-sm text-blue-600 hover:underline"
                  >
                    Usar outro número
                  </button>
                </form>
              )}
            </>
          )}

          {/* Recaptcha container (invisible) */}
          <div ref={recaptchaContainerRef} />

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/perfil')}
              className="text-blue-600 hover:underline"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    switch (code) {
      case 'auth/email-already-in-use':
        return 'Este e-mail já está vinculado a outra conta.'
      case 'auth/weak-password':
        return 'A senha deve ter pelo menos 6 caracteres.'
      case 'auth/invalid-phone-number':
        return 'Número de telefone inválido. Use o formato +5511999999999.'
      case 'auth/invalid-verification-code':
        return 'Código de verificação inválido.'
      case 'auth/credential-already-in-use':
        return 'Esta credencial já está vinculada a outra conta.'
      case 'auth/provider-already-linked':
        return 'Este método de login já está vinculado.'
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde.'
      default:
        return `Erro: ${code}`
    }
  }
  return 'Ocorreu um erro. Tente novamente.'
}
