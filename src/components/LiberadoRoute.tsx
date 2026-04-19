import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LiberadoRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, usuario, loading } = useAuth()
  if (loading) return <div className="flex justify-center p-8">Carregando...</div>
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (usuario?.liberado === false) return <Navigate to="/" replace />
  return <>{children}</>
}
