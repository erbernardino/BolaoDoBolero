import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { Login } from './pages/Login'
import { Cadastro } from './pages/Cadastro'
import { Home } from './pages/Home'
import { Regulamento } from './pages/Regulamento'

export default function App() {
  const authState = useAuthProvider()
  return (
    <AuthContext.Provider value={authState}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/convite/:conviteId" element={<Cadastro />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/palpites" element={<ProtectedRoute><div>Palpites</div></ProtectedRoute>} />
          <Route path="/ranking" element={<ProtectedRoute><div>Ranking</div></ProtectedRoute>} />
          <Route path="/regulamento" element={<ProtectedRoute><Regulamento /></ProtectedRoute>} />
          <Route path="/admin/*" element={<AdminRoute><div>Admin</div></AdminRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
