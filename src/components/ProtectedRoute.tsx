import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { CompletarPerfil } from './CompletarPerfil'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, usuario, loading } = useAuth()
  if (loading) return <div className="flex justify-center p-8">Carregando...</div>
  if (!firebaseUser) return <Navigate to="/login" replace />

  // Forçar preenchimento de nome e apelido
  const perfilIncompleto = !usuario || !usuario.nome?.trim() || !usuario.apelido?.trim() ||
    usuario.nome.trim().length < 2 || usuario.apelido.trim().length < 2
  if (perfilIncompleto) return <CompletarPerfil />

  return <>{children}</>
}
