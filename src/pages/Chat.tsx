import { useState, useEffect, useRef } from 'react'
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { Navbar } from '../components/Navbar'
import { ChatMessage } from '../components/ChatMessage'
import { ChatInput } from '../components/ChatInput'
import type { Usuario } from '../types'

export function Chat() {
  const { firebaseUser, usuario } = useAuth()
  const { mensagens, loading, loadingMore, hasMore, enviarMensagem, apagarMensagem, carregarMais } = useChat()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const prevCountRef = useRef(0)

  // Load users for mentions
  useEffect(() => {
    getDocs(collection(db, 'usuarios')).then(snap => {
      setUsuarios(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Usuario)))
    })
  }, [])

  // Auto-scroll on new messages if at bottom
  useEffect(() => {
    if (mensagens.length > prevCountRef.current && isAtBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevCountRef.current = mensagens.length
  }, [mensagens.length, isAtBottom])

  // Detect scroll position
  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    setIsAtBottom(atBottom)

    // Load more when scrolling to top
    if (el.scrollTop < 100 && hasMore && !loadingMore) {
      const prevHeight = el.scrollHeight
      carregarMais().then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - prevHeight
        })
      })
    }
  }

  async function handleSend(texto: string, mencoes: string[]) {
    await enviarMensagem(texto, mencoes)

    // Save in-app notification for mentioned users
    for (const uid of mencoes) {
      if (uid === firebaseUser?.uid) continue // don't notify yourself
      try {
        await addDoc(
          collection(db, 'notificacoes_usuario', uid, 'items'),
          {
            titulo: 'Menção no chat',
            corpo: `@${usuario?.apelido || usuario?.nome} mencionou você: "${texto.substring(0, 60)}${texto.length > 60 ? '...' : ''}"`,
            lida: false,
            criadoEm: Timestamp.now(),
          }
        )
      } catch {
        // Silently fail - notification is not critical
      }
    }
  }

  async function handleDelete(messageId: string) {
    if (!confirm('Apagar esta mensagem?')) return
    await apagarMensagem(messageId)
  }

  const isAdmin = usuario?.role === 'admin'

  function getNome(uid: string): string {
    const u = usuarios.find(u => u.uid === uid)
    return u?.apelido || u?.nome || 'Anônimo'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        {/* Messages area */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        >
          {loadingMore && (
            <p className="text-center text-gray-400 text-xs py-2">Carregando...</p>
          )}
          {!hasMore && mensagens.length > 0 && (
            <p className="text-center text-gray-300 text-xs py-2">Início da conversa</p>
          )}
          {loading ? (
            <p className="text-center text-gray-400 py-8">Carregando mensagens...</p>
          ) : mensagens.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Nenhuma mensagem ainda. Comece a conversa!</p>
          ) : (
            mensagens.map(m => (
              <ChatMessage
                key={m.id}
                id={m.id}
                uid={m.uid}
                nome={getNome(m.uid)}
                texto={m.texto}
                criadoEm={m.criadoEm}
                isMine={m.uid === firebaseUser?.uid}
                isAdmin={isAdmin}
                onDelete={handleDelete}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <ChatInput
            usuarios={usuarios.filter(u => u.uid !== firebaseUser?.uid)}
            onSend={handleSend}
            disabled={!firebaseUser}
          />
        </div>
      </div>
    </div>
  )
}
