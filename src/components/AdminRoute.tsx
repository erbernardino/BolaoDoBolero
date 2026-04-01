import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth()
  if (loading) return <div className="flex justify-center p-8">Carregando...</div>
  if (!usuario || usuario.role !== 'admin') return <Navigate to="/" replace />
  return <>{children}</>
}
