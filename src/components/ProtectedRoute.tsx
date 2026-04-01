import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useAuth()
  if (loading) return <div className="flex justify-center p-8">Carregando...</div>
  if (!firebaseUser) return <Navigate to="/login" replace />
  return <>{children}</>
}
