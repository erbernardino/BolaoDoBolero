import { Timestamp } from 'firebase/firestore'

interface Props {
  id: string
  uid: string
  nome: string
  texto: string
  criadoEm: Timestamp
  isMine: boolean
  isAdmin: boolean
  highlighted?: boolean
  onDelete?: (id: string) => void
}

function formatarTextoComMencoes(texto: string, isMine: boolean): React.ReactNode[] {
  const parts = texto.split(/(@\S+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className={`font-semibold ${isMine ? 'text-blue-200 underline' : 'text-blue-600'}`}>
          {part}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function ChatMessage({ id, nome, texto, criadoEm, isMine, isAdmin, highlighted, onDelete }: Props) {
  const hora = criadoEm.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const canDelete = isMine || isAdmin

  return (
    <div id={`msg-${id}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'} group transition-all duration-500 ${highlighted ? 'scale-[1.02]' : ''}`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 transition-all duration-500 ${
        highlighted
          ? 'ring-2 ring-yellow-400 bg-yellow-50 text-gray-800 rounded-br-md'
          : isMine
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
      }`}>
        {!isMine && (
          <p className="text-xs font-semibold text-blue-600 mb-0.5">{nome}</p>
        )}
        <p className={`text-sm break-words ${isMine ? 'text-white' : ''}`}>
          {formatarTextoComMencoes(texto, isMine)}
        </p>
        <div className={`flex items-center gap-2 mt-1 ${isMine ? 'justify-end' : 'justify-between'}`}>
          <span className={`text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>{hora}</span>
          {canDelete && onDelete && (
            <button
              onClick={() => onDelete(id)}
              className={`text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${
                isMine ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-red-500'
              }`}
            >
              apagar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
