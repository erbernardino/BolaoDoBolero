import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  RecaptchaVerifier,
} from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'

const googleProvider = new GoogleAuthProvider()

type Mode = 'email' | 'emailLink' | 'phone'
type PhoneStep = 'input' | 'confirm'
type EmailLinkStep = 'input' | 'sent' | 'confirm'

const EMAIL_LINK_STORAGE_KEY = 'boleroEmailForSignIn'

export function Login() {
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('email')
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input')
  const [emailLinkStep, setEmailLinkStep] = useState<EmailLinkStep>('input')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // email/password fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // email link fields
  const [emailLink, setEmailLink] = useState('')

  // phone fields
  const [phone, setPhone] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const recaptchaRef = useRef<RecaptchaVerifier | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)

  // Detectar se o usuário está retornando de um link de e-mail
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const savedEmail = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY)
      if (savedEmail) {
        completeEmailLinkSignIn(savedEmail)
      } else {
        // Email não encontrado no storage — pedir para o usuário digitar
        setMode('emailLink')
        setEmailLinkStep('confirm')
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      recaptchaRef.current?.clear()
    }
  }, [])

  async function completeEmailLinkSignIn(emailForSignIn: string) {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithEmailLink(auth, emailForSignIn, window.location.href)
      window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY)
      const userDoc = await getDoc(doc(db, 'usuarios', result.user.uid))
      if (!userDoc.exists()) {
        await signOut(auth)
        setError('Você não tem cadastro no bolão. Solicite um convite ao administrador.')
        return
      }
      navigate('/')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

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
      const result = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, 'usuarios', result.user.uid))
      if (!userDoc.exists()) {
        await signOut(auth)
        setError('Você não tem cadastro no bolão. Solicite um convite ao administrador.')
        return
      }
      navigate('/')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmailLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/login',
        handleCodeInApp: true,
      }
      await sendSignInLinkToEmail(auth, emailLink, actionCodeSettings)
      window.localStorage.setItem(EMAIL_LINK_STORAGE_KEY, emailLink)
      setEmailLinkStep('sent')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmEmailLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailLink) {
      setError('Digite seu e-mail para continuar.')
      return
    }
    await completeEmailLinkSignIn(emailLink)
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
      const result = await confirmationRef.current!.confirm(smsCode)
      const userDoc = await getDoc(doc(db, 'usuarios', result.user.uid))
      if (!userDoc.exists()) {
        await signOut(auth)
        setError('Você não tem cadastro no bolão. Solicite um convite ao administrador.')
        return
      }
      navigate('/')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const userDoc = await getDoc(doc(db, 'usuarios', result.user.uid))
      if (!userDoc.exists()) {
        await signOut(auth)
        setError('Você não tem cadastro no bolão. Solicite um convite ao administrador.')
        return
      }
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
    setEmailLinkStep('input')
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
          {(['email', 'emailLink', 'phone'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                mode === m
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-blue-700 hover:bg-blue-50'
              }`}
            >
              {m === 'email' ? 'E-mail + Senha' : m === 'emailLink' ? 'Link por E-mail' : 'Telefone'}
            </button>
          ))}
        </div>

        {/* Email + Password form */}
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

        {/* Email Link (passwordless) form */}
        {mode === 'emailLink' && emailLinkStep === 'input' && (
          <form onSubmit={handleSendEmailLink} className="space-y-4">
            <p className="text-sm text-gray-600">
              Enviaremos um link de acesso para seu e-mail. Sem necessidade de senha.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={emailLink}
                onChange={(e) => setEmailLink(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar link de acesso'}
            </button>
          </form>
        )}

        {mode === 'emailLink' && emailLinkStep === 'sent' && (
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 font-medium">Link enviado!</p>
              <p className="text-sm text-green-700 mt-1">
                Verifique a caixa de entrada de <strong>{emailLink}</strong> e clique no link para entrar.
              </p>
            </div>
            <p className="text-xs text-gray-500">
              Não recebeu? Verifique a pasta de spam ou{' '}
              <button
                type="button"
                onClick={() => setEmailLinkStep('input')}
                className="text-blue-600 hover:underline"
              >
                tente novamente
              </button>
            </p>
          </div>
        )}

        {mode === 'emailLink' && emailLinkStep === 'confirm' && (
          <form onSubmit={handleConfirmEmailLink} className="space-y-4">
            <p className="text-sm text-gray-600">
              Confirme seu e-mail para completar o login.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={emailLink}
                onChange={(e) => setEmailLink(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="seu@email.com"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Confirmar e entrar'}
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

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200" />
          <span className="px-3 text-xs text-gray-400">ou</span>
          <div className="flex-1 border-t border-gray-200" />
        </div>

        {/* Google Sign-in */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-2 px-4 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-sm font-medium text-gray-700">Entrar com Google</span>
        </button>

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
      case 'auth/invalid-action-code':
        return 'Link expirado ou inválido. Solicite um novo.'
      default:
        return 'Ocorreu um erro. Tente novamente.'
    }
  }
  return 'Ocorreu um erro. Tente novamente.'
}
