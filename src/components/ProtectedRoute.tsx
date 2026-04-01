import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { CompletarPerfil } from './CompletarPerfil'

function perfilCompleto(nome?: string, apelido?: string): boolean {
  return (nome?.trim()?.length ?? 0) >= 2 && (apelido?.trim()?.length ?? 0) >= 2
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, usuario, loading } = useAuth()
  const [waited, setWaited] = useState(false)

  // Dar tempo extra para o usuario carregar quando auth está ok mas usuario ainda é null
  useEffect(() => {
    if (!loading && firebaseUser && !usuario && !waited) {
      const t = setTimeout(() => setWaited(true), 2000)
      return () => clearTimeout(t)
    }
    if (usuario) setWaited(true)
  }, [loading, firebaseUser, usuario, waited])

  if (loading) return <div className="flex justify-center p-8">Carregando...</div>
  if (!firebaseUser) return <Navigate to="/login" replace />

  // Ainda esperando o documento do usuario carregar
  if (!usuario && !waited) return <div className="flex justify-center p-8">Carregando...</div>

  // Usuario carregou — checar se perfil está completo
  if (usuario && perfilCompleto(usuario.nome, usuario.apelido)) return <>{children}</>

  // Perfil incompleto ou usuario não existe no Firestore
  return <CompletarPerfil />
}
