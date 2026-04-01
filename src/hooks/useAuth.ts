import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
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

async function carregarUsuario(uid: string, tentativas = 3): Promise<Usuario | null> {
  for (let i = 0; i < tentativas; i++) {
    try {
      const snap = await getDoc(doc(db, 'usuarios', uid))
      if (snap.exists()) {
        return { uid: snap.id, ...snap.data() } as Usuario
      }
      return null
    } catch {
      if (i < tentativas - 1) {
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }
  return null
}

export function useAuthProvider(): AuthState {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        const u = await carregarUsuario(user.uid)
        setUsuario(u)
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
      setFirebaseUser(auth.currentUser)
      const u = await carregarUsuario(currentUser.uid)
      if (u) setUsuario(u)
    }
  }, [])

  return { firebaseUser, usuario, loading, refreshUsuario }
}
