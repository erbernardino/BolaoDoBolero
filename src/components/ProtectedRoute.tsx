import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { CompletarPerfil } from './CompletarPerfil'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { firebaseUser, usuario, loading } = useAuth()
  const [perfilChecked, setPerfilChecked] = useState(false)
  const [perfilExiste, setPerfilExiste] = useState(false)

  useEffect(() => {
    if (!firebaseUser || loading) {
      setPerfilChecked(false)
      return
    }

    // Se o useAuth já carregou o usuario com dados, não precisa checar de novo
    if (usuario && usuario.nome?.trim() && usuario.apelido?.trim()) {
      setPerfilExiste(true)
      setPerfilChecked(true)
      return
    }

    // Buscar direto do Firestore para ter certeza
    getDoc(doc(db, 'usuarios', firebaseUser.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        const temNome = data.nome?.trim()?.length >= 2
        const temApelido = data.apelido?.trim()?.length >= 2
        setPerfilExiste(temNome && temApelido)
      } else {
        setPerfilExiste(false)
      }
      setPerfilChecked(true)
    }).catch(() => {
      setPerfilChecked(true)
      setPerfilExiste(false)
    })
  }, [firebaseUser, usuario, loading])

  if (loading) return <div className="flex justify-center p-8">Carregando...</div>
  if (!firebaseUser) return <Navigate to="/login" replace />
  if (!perfilChecked) return <div className="flex justify-center p-8">Carregando...</div>
  if (!perfilExiste) return <CompletarPerfil />

  return <>{children}</>
}
