import { useState, useEffect, useCallback, useRef } from 'react'
import { collection, query, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc, getDocs, startAfter, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from './useAuth'

interface ChatMessage {
  id: string
  uid: string
  texto: string
  mencoes: string[]
  criadoEm: Timestamp
}

const PAGE_SIZE = 30

export function useChat() {
  const { firebaseUser, usuario } = useAuth()
  const [mensagens, setMensagens] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const oldestDocRef = useRef<any>(null)

  // Real-time listener for latest 30 messages
  useEffect(() => {
    const q = query(
      collection(db, 'chat'),
      orderBy('criadoEm', 'desc'),
      limit(PAGE_SIZE),
    )

    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = []
      snap.forEach(d => msgs.push({ id: d.id, ...d.data() } as ChatMessage))
      msgs.reverse() // oldest first
      setMensagens(msgs)
      if (msgs.length > 0) {
        // The oldest in current view (first after reverse)
        oldestDocRef.current = snap.docs[snap.docs.length - 1] // last in desc = oldest
      }
      setLoading(false)
    })

    return unsub
  }, [])

  // Load older messages
  const carregarMais = useCallback(async () => {
    if (!hasMore || loadingMore || !oldestDocRef.current) return
    setLoadingMore(true)

    const q = query(
      collection(db, 'chat'),
      orderBy('criadoEm', 'desc'),
      startAfter(oldestDocRef.current),
      limit(PAGE_SIZE),
    )

    const snap = await getDocs(q)
    if (snap.empty || snap.size < PAGE_SIZE) {
      setHasMore(false)
    }

    const older: ChatMessage[] = []
    snap.forEach(d => older.push({ id: d.id, ...d.data() } as ChatMessage))
    older.reverse()

    if (snap.docs.length > 0) {
      oldestDocRef.current = snap.docs[snap.docs.length - 1]
    }

    setMensagens(prev => [...older, ...prev])
    setLoadingMore(false)
  }, [hasMore, loadingMore])

  // Send message
  const enviarMensagem = useCallback(async (texto: string, mencoes: string[]): Promise<string | null> => {
    if (!firebaseUser || !usuario) return null
    const ref = await addDoc(collection(db, 'chat'), {
      uid: firebaseUser.uid,
      texto,
      mencoes,
      criadoEm: Timestamp.now(),
    })
    return ref.id
  }, [firebaseUser, usuario])

  // Delete message
  const apagarMensagem = useCallback(async (messageId: string) => {
    await deleteDoc(doc(db, 'chat', messageId))
  }, [])

  return {
    mensagens,
    loading,
    loadingMore,
    hasMore,
    enviarMensagem,
    apagarMensagem,
    carregarMais,
  }
}

export type { ChatMessage }
