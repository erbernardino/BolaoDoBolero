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
        if (!msg) return
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return
        const token = await getToken(msg, { vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY })
        await setDoc(doc(db, 'usuarios', firebaseUser!.uid), { fcmToken: token }, { merge: true })
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
  }, [firebaseUser])
}
