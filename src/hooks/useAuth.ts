import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
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
  const unsubUsuarioRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user)

      // Limpar listener anterior do documento
      if (unsubUsuarioRef.current) {
        unsubUsuarioRef.current()
        unsubUsuarioRef.current = null
      }

      if (user) {
        // Escutar documento do usuario em tempo real
        unsubUsuarioRef.current = onSnapshot(
          doc(db, 'usuarios', user.uid),
          (snap) => {
            if (snap.exists()) {
              setUsuario({ uid: snap.id, ...snap.data() } as Usuario)
            } else {
              setUsuario(null)
            }
            setLoading(false)
          },
          () => {
            // Em caso de erro, tentar leitura direta
            setLoading(false)
          },
        )
      } else {
        setUsuario(null)
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      if (unsubUsuarioRef.current) {
        unsubUsuarioRef.current()
      }
    }
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
