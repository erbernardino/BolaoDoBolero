import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import { useNotifications } from './hooks/useNotifications'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { Login } from './pages/Login'
import { Cadastro } from './pages/Cadastro'
import { Home } from './pages/Home'
import { Regulamento } from './pages/Regulamento'
import { Palpites } from './pages/Palpites'
import { Ranking } from './pages/Ranking'
import { AdminDashboard } from './pages/admin/AdminDashboard'

function AppContent() {
  useNotifications()
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/convite/:conviteId" element={<Cadastro />} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/palpites" element={<ProtectedRoute><Palpites /></ProtectedRoute>} />
      <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
      <Route path="/regulamento" element={<ProtectedRoute><Regulamento /></ProtectedRoute>} />
      <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
    </Routes>
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
