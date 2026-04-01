import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, writeBatch, limit } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from './useAuth'
import type { Notificacao } from '../types'

export function useNotificacoesInApp() {
  const { firebaseUser } = useAuth()
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidas, setNaoLidas] = useState(0)

  useEffect(() => {
    if (!firebaseUser) {
      setNotificacoes([])
      setNaoLidas(0)
      return
    }

    const q = query(
      collection(db, 'notificacoes_usuario', firebaseUser.uid, 'items'),
      orderBy('criadoEm', 'desc'),
      limit(50),
    )

    const unsub = onSnapshot(q, (snap) => {
      const lista: Notificacao[] = []
      snap.forEach(d => lista.push({ id: d.id, ...d.data() } as Notificacao))
      setNotificacoes(lista)
      setNaoLidas(lista.filter(n => !n.lida).length)
    })

    return unsub
  }, [firebaseUser])

  async function marcarTodasComoLidas() {
    if (!firebaseUser || naoLidas === 0) return
    const batch = writeBatch(db)
    for (const n of notificacoes.filter(n => !n.lida)) {
      batch.update(doc(db, 'notificacoes_usuario', firebaseUser.uid, 'items', n.id), { lida: true })
    }
    await batch.commit()
  }

  return { notificacoes, naoLidas, marcarTodasComoLidas }
}
