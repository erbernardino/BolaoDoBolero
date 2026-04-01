import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'
import { auth } from '../config/firebase'

type Mode = 'email' | 'phone'
type PhoneStep = 'input' | 'confirm'

export function Login() {
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('email')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // email/password fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // phone fields
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear()
    }
  }, [])

  const ensureRecaptcha = () => {
    if (!recaptchaRef.current && recaptchaContainerRef.current) {
      recaptchaRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
      })
    }
  }

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSendSms = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      ensureRecaptcha()
      const confirmation = await signInWithPhoneNumber(auth, phone, recaptchaRef.current!)
      confirmationRef.current = confirmation
      setPhoneStep('confirm')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
      recaptchaRef.current?.clear()
      recaptchaRef.current = null
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await confirmationRef.current!.confirm(smsCode)
      navigate('/')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (newMode: Mode) => {
    setMode(newMode)
    setError('')
    setPhoneStep('input')
    setSmsCode('')
    recaptchaRef.current?.clear()
    recaptchaRef.current = null
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8">
        <h1 className="text-2xl font-bold text-blue-800 text-center mb-6">
          Bolão do Bolero
        </h1>

        {/* Mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-blue-200 mb-6">
          <button
            type="button"
            onClick={() => switchMode('email')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'email'
                ? 'bg-blue-700 text-white'
                : 'bg-white text-blue-700 hover:bg-blue-50'
            }`}
          >
            E-mail
          </button>
          <button
            type="button"
            onClick={() => switchMode('phone')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'phone'
                ? 'bg-blue-700 text-white'
                : 'bg-white text-blue-700 hover:bg-blue-50'
            }`}
          >
            Telefone (SMS)
          </button>
        </div>

        {/* Email form */}
        {mode === 'email' && (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
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
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        )}

        {/* Phone form */}
        {mode === 'phone' && (
          <>
            {phoneStep === 'input' && (
              <form onSubmit={handleSendSms} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefone (com DDI, ex: +5511999999999)
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+5511999999999"
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
                  onClick={() => setPhoneStep('input')}
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

        <p className="text-center text-sm text-gray-500 mt-6">
          Não tem conta?{' '}
          <Link to="/convite" className="text-blue-600 hover:underline">
            Acesse com um convite
          </Link>
        </p>
      </div>
    </div>
  )
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: string }).code
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'E-mail ou senha incorretos.'
      case 'auth/invalid-phone-number':
        return 'Número de telefone inválido. Use o formato internacional (+55...).'
      case 'auth/invalid-verification-code':
        return 'Código de verificação inválido.'
      case 'auth/too-many-requests':
        return 'Muitas tentativas. Tente novamente mais tarde.'
      default:
        return 'Ocorreu um erro. Tente novamente.'
    }
  }
  return 'Ocorreu um erro. Tente novamente.'
}
