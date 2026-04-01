import { useEffect } from 'react'
import { doc, updateDoc } from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import { db, messaging } from '../config/firebase'
import { useAuth } from './useAuth'

export function useNotifications() {
  const { usuario } = useAuth()

  // Só roda quando usuario já está carregado do Firestore (documento completo no cache)
  useEffect(() => {
    if (!usuario) return
    async function setup() {
      try {
        const msg = await messaging()
        if (!msg) return
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
        // updateDoc: atualiza documento existente no cache, sem criar entrada parcial
        await updateDoc(doc(db, 'usuarios', usuario.uid), { fcmToken: token })
        onMessage(msg, (payload) => {
          const { title, body } = payload.notification || {}
          if (title) {
            new Notification(title, { body, icon: '/icon-192.png' })
          }
        })
      } catch {
        // silently fail
      }
    }
    setup()
  }, [usuario])
}
