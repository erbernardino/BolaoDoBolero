import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
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
    // Timeout de segurança — nunca travar em "Carregando..."
    const timeout = setTimeout(() => setLoading(false), 5000)

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user)
      if (user) {
        try {
          const snap = await getDoc(doc(db, 'usuarios', user.uid))
          if (snap.exists()) {
            const data = snap.data()
            // Sincronizar email/telefone do Auth com Firestore
            const authEmail = user.email || ''
            const authPhone = user.phoneNumber || ''
            if (data.email !== authEmail || data.telefone !== authPhone) {
              await setDoc(doc(db, 'usuarios', user.uid), {
                email: authEmail,
                telefone: authPhone,
              }, { merge: true }).catch(() => {})
              data.email = authEmail
              data.telefone = authPhone
            }
            setUsuario({ uid: snap.id, ...data } as Usuario)
          } else {
            setUsuario(null)
          }
        } catch {
          setUsuario(null)
        }
      } else {
        setUsuario(null)
      }
      clearTimeout(timeout)
      setLoading(false)
    })
    return () => {
      clearTimeout(timeout)
      unsubscribe()
    }
  }, [])

  const refreshUsuario = useCallback(async () => {
    const currentUser = auth.currentUser
    if (currentUser) {
      await currentUser.reload()
      setFirebaseUser(auth.currentUser)
      const snap = await getDoc(doc(db, 'usuarios', currentUser.uid))
      if (snap.exists()) {
        setUsuario({ uid: snap.id, ...snap.data() } as Usuario)
      }
    }
  }, [])

  return { firebaseUser, usuario, loading, refreshUsuario }
}
