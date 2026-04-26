import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { useChat } from '../hooks/useChat'
import { Navbar } from '../components/Navbar'
import { ChatMessage } from '../components/ChatMessage'
import { ChatInput } from '../components/ChatInput'
import type { Usuario } from '../types'

const functions = getFunctions()

export function Chat() {
  const { firebaseUser, usuario } = useAuth()
  const { mensagens, loading, loadingMore, hasMore, enviarMensagem, apagarMensagem, carregarMais } = useChat()
  const [searchParams, setSearchParams] = useSearchParams()
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const prevCountRef = useRef(0)

  // Load users for mentions
  useEffect(() => {
    getDocs(collection(db, 'usuarios')).then(snap => {
      setUsuarios(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Usuario)))
    })
  }, [])

  // Scroll to mentioned message from ?msg= param
  useEffect(() => {
    const msgId = searchParams.get('msg')
    if (msgId && !loading && mensagens.length > 0) {
      setHighlightId(msgId)
      // Remove param from URL
      setSearchParams({}, { replace: true })
      // Scroll to the message
      requestAnimationFrame(() => {
        const el = document.getElementById(`msg-${msgId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // Remove highlight after animation
          setTimeout(() => setHighlightId(null), 3000)
        }
      })
    }
  }, [searchParams, loading, mensagens])

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
    const msgId = await enviarMensagem(texto, mencoes)

    if (msgId && mencoes.some(uid => uid !== firebaseUser?.uid)) {
      try {
        const fn = httpsCallable<{ messageId: string }, { enviados: number }>(functions, 'notificarMencoesChat')
        await fn({ messageId: msgId })
      } catch {
        // A mensagem já foi enviada; falha de notificação não deve bloquear o chat.
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
                highlighted={m.id === highlightId}
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
