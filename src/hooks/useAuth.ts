import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import type { Usuario } from '../types'

interface AuthState {
  firebaseUser: User | null
  usuario: Usuario | null
  loading: boolean
  refreshUsuario: () => Promise<void>
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  usuario: null,
  loading: true,
  refreshUsuario: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export { AuthContext }

export function useAuthProvider(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        const snap = await getDoc(doc(db, 'usuarios', user.uid))
        if (snap.exists()) {
          setUsuario({ uid: snap.id, ...snap.data() } as Usuario)
        } else {
          // Criar documento automaticamente para login social/telefone
          const newUser = {
            nome: user.displayName || '',
            apelido: user.displayName?.split(' ')[0] || user.phoneNumber || '',
            email: user.email || '',
            telefone: user.phoneNumber || '',
            role: 'participante' as const,
            conviteId: '',
            criadoEm: serverTimestamp(),
          }
          await setDoc(doc(db, 'usuarios', user.uid), newUser)
          setUsuario({ uid: user.uid, ...newUser, criadoEm: null as any } as Usuario)
        }
      } else {
        setUsuario(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const refreshUsuario = useCallback(async () => {
    const currentUser = auth.currentUser
    if (currentUser) {
      await currentUser.reload()
      const snap = await getDoc(doc(db, 'usuarios', currentUser.uid))
      if (snap.exists()) {
        setUsuario({ uid: snap.id, ...snap.data() } as Usuario)
      }
    }
  }, [])

  return { firebaseUser, usuario, loading, refreshUsuario }
}
