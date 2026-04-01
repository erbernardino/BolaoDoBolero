import { useEffect } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { getToken, onMessage } from 'firebase/messaging'
import { db, messaging } from '../config/firebase'
import { useAuth } from './useAuth'

export function useNotifications() {
  const { firebaseUser } = useAuth()

  useEffect(() => {
    if (!firebaseUser) return
    async function setup() {
      try {
        const msg = await messaging()
        if (!msg) {
          console.warn('[FCM] Messaging não suportado neste navegador.')
          return
        }
        const permission = await Notification.requestPermission()
        console.log('[FCM] Permissão:', permission)
        if (permission !== 'granted') return

        const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
        console.log('[FCM] Token registrado:', token?.substring(0, 20) + '...')
        await setDoc(doc(db, 'usuarios', firebaseUser!.uid), { fcmToken: token }, { merge: true })

        onMessage(msg, (payload) => {
          console.log('[FCM] Mensagem recebida (foreground):', payload)
          const { title, body } = payload.notification || {}
          if (title) {
            new Notification(title, { body, icon: '/icon-192.png' })
          }
        })
        console.log('[FCM] Setup completo. Listener foreground ativo.')
      } catch (err) {
        console.error('[FCM] Erro no setup:', err)
      }
    }
    setup()
  }, [firebaseUser])
}
