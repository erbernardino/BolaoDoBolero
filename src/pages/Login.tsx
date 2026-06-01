import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  RecaptchaVerifier,
} from 'firebase/auth'
import type { ConfirmationResult } from 'firebase/auth'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { auth, db } from '../config/firebase'
import { PhoneInput } from '../components/PhoneInput'

async function registrarLoginNoServer(metodo: 'email_senha' | 'email_link' | 'telefone') {
  try {
    const fn = httpsCallable<{ metodo: string }, { ok: boolean }>(getFunctions(), 'registrarLogin')
    await fn({ metodo })
  } catch {
    // Login ja foi bem-sucedido; falha de auditoria nao deve bloquear o usuario.
  }
}

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
  const [resetSent, setResetSent] = useState(false)

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
      await registrarLoginNoServer('email_link')
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
      await registrarLoginNoServer('email_senha')
      navigate('/')
    } catch (err: unknown) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    setError('')
    setResetSent(false)
    if (!email) {
      setError('Informe seu e-mail acima para receber o link de redefinição.')
      return
    }
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'usuarios'), where('email', '==', email)))
      if (snap.empty) {
        setError('E-mail não cadastrado no bolão.')
        return
      }
      await sendPasswordResetEmail(auth, email)
      setResetSent(true)
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
      await registrarLoginNoServer('telefone')
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
              <div className="mt-1 text-right">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-xs text-blue-700 hover:text-blue-900 hover:underline disabled:opacity-50"
                >
                  Esqueci minha senha
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {resetSent && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                Enviamos um link de redefinição para <strong>{email}</strong>. Verifique sua caixa de entrada e o spam.
              </p>
            )}
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
                    Telefone
                  </label>
                  <PhoneInput value={phone} onChange={setPhone} required />
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
      case 'auth/invalid-action-code':
        return 'Link expirado ou inválido. Solicite um novo.'
      default:
        return 'Ocorreu um erro. Tente novamente.'
    }
  }
  return 'Ocorreu um erro. Tente novamente.'
}
