import { useState, useRef } from 'react'
import { MentionDropdown } from './MentionDropdown'
import type { Usuario } from '../types'

interface Props {
  usuarios: Usuario[]
  onSend: (texto: string, mencoes: string[]) => void
  disabled?: boolean
}

export function ChatInput({ usuarios, onSend, disabled }: Props) {
  const [texto, setTexto] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionStart, setMentionStart] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setTexto(val)

    // Detect @ mention
    const cursorPos = e.target.selectionStart || val.length
    const textBefore = val.substring(0, cursorPos)
    const atIndex = textBefore.lastIndexOf('@')

    if (atIndex >= 0) {
      const charBefore = atIndex > 0 ? textBefore[atIndex - 1] : ' '
      if (charBefore === ' ' || charBefore === '\n' || atIndex === 0) {
        const filter = textBefore.substring(atIndex + 1)
        if (!filter.includes(' ')) {
          setShowMentions(true)
          setMentionFilter(filter)
          setMentionStart(atIndex)
          return
        }
      }
    }
    setShowMentions(false)
  }

  function handleSelectMention(usuario: Usuario) {
    const nome = usuario.apelido || usuario.nome || ''
    const before = texto.substring(0, mentionStart)
    const cursorPos = inputRef.current?.selectionStart || texto.length
    const after = texto.substring(cursorPos)
    const newText = `${before}@${nome} ${after}`
    setTexto(newText)
    setShowMentions(false)
    inputRef.current?.focus()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = texto.trim()
    if (!trimmed) return

    // Extract mentions from text
    const mentionRegex = /@(\S+)/g
    const mentionNames: string[] = []
    let match
    while ((match = mentionRegex.exec(trimmed)) !== null) {
      mentionNames.push(match[1])
    }

    // Resolve names to uids
    const uids = mentionNames
      .map(name => usuarios.find(u =>
        (u.apelido || '').toLowerCase() === name.toLowerCase() ||
        (u.nome || '').toLowerCase() === name.toLowerCase()
      ))
      .filter(Boolean)
      .map(u => u!.uid)

    // Remove duplicates
    const uniqueUids = [...new Set(uids)]

    onSend(trimmed, uniqueUids)
    setTexto('')
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowMentions(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      {showMentions && (
        <MentionDropdown
          usuarios={usuarios}
          filtro={mentionFilter}
          onSelect={handleSelectMention}
        />
      )}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={texto}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Digite uma mensagem... Use @ para mencionar"
          className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={disabled || !texto.trim()}
          className="bg-blue-700 hover:bg-blue-800 text-white rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50 transition-colors flex-shrink-0"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
          </svg>
        </button>
      </div>
    </form>
  )
}
