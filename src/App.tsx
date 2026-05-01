import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { LiberadoRoute } from './components/LiberadoRoute'
import { OfflineBanner } from './components/OfflineBanner'
import { AmbienteTesteBanner } from './components/AmbienteTesteBanner'
import { NovaVersaoBanner } from './components/NovaVersaoBanner'
import { useAnalyticsTracking } from './hooks/useAnalytics'

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })))
const Cadastro = lazy(() => import('./pages/Cadastro').then(m => ({ default: m.Cadastro })))
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })))
const Regulamento = lazy(() => import('./pages/Regulamento').then(m => ({ default: m.Regulamento })))
const FormatoCopa = lazy(() => import('./pages/FormatoCopa').then(m => ({ default: m.FormatoCopa })))
const Palpites = lazy(() => import('./pages/Palpites').then(m => ({ default: m.Palpites })))
const Ranking = lazy(() => import('./pages/Ranking').then(m => ({ default: m.Ranking })))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const PalpitesGeral = lazy(() => import('./pages/PalpitesGeral').then(m => ({ default: m.PalpitesGeral })))
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })))
const Perfil = lazy(() => import('./pages/Perfil').then(m => ({ default: m.Perfil })))
const VerificarVinculo = lazy(() => import('./pages/VerificarVinculo').then(m => ({ default: m.VerificarVinculo })))
const SentryTest = lazy(() => import('./pages/SentryTest'))

function AppContent() {
  useAnalyticsTracking()
  return (
    <>
    <AmbienteTesteBanner />
    <OfflineBanner />
    <NovaVersaoBanner />
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/convite/:conviteId" element={<Cadastro />} />
        <Route path="/regulamento-publico" element={<Regulamento publico />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/palpites" element={<ProtectedRoute><Palpites /></ProtectedRoute>} />
        <Route path="/ranking" element={<LiberadoRoute><Ranking /></LiberadoRoute>} />
        <Route path="/regulamento" element={<ProtectedRoute><Regulamento /></ProtectedRoute>} />
        <Route path="/formato-copa" element={<ProtectedRoute><FormatoCopa /></ProtectedRoute>} />
        <Route path="/todos-palpites" element={<LiberadoRoute><PalpitesGeral /></LiberadoRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
        <Route path="/perfil/verificar/:tipo" element={<ProtectedRoute><VerificarVinculo /></ProtectedRoute>} />
        <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/sentry-test" element={<SentryTest />} />
      </Routes>
    </Suspense>
    <footer className="fixed bottom-2 right-3 text-[10px] text-gray-400/60 pointer-events-auto z-10">
      <span className="mr-2">v{__APP_VERSION__}</span>
      Desenvolvido por{' '}
      <a href="https://allogic.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-400/60 hover:text-blue-500 hover:underline transition-colors pointer-events-auto">
        Allogic
      </a>
    </footer>
    </>
  )
}

export default function App() {
  const authState = useAuthProvider()
  return (
    <AuthContext.Provider value={authState}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
