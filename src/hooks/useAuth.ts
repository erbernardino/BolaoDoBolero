import { useState, useEffect, createContext, useContext } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import type { Usuario } from '../types'

interface AuthState {
  firebaseUser: User | null
  usuario: Usuario | null
  loading: boolean
}

const AuthContext = createContext<AuthState>({
  firebaseUser: null,
  usuario: null,
  loading: true,
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
        }
      } else {
        setUsuario(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  return { firebaseUser, usuario, loading }
}
