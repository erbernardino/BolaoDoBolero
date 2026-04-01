import { Timestamp } from 'firebase/firestore'

interface Props {
  id: string
  uid: string
  nome: string
  texto: string
  criadoEm: Timestamp
  isMine: boolean
  isAdmin: boolean
  onDelete?: (id: string) => void
}

function formatarTextoComMencoes(texto: string): React.ReactNode[] {
  const parts = texto.split(/(@\S+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return <span key={i} className="text-blue-600 font-semibold">{part}</span>
    }
    return <span key={i}>{part}</span>
  })
}

export function ChatMessage({ id, nome, texto, criadoEm, isMine, isAdmin, onDelete }: Props) {
  const hora = criadoEm.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const canDelete = isMine || isAdmin

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} group`}>
      <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${
        isMine
          ? 'bg-blue-600 text-white rounded-br-md'
          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md'
      }`}>
        {!isMine && (
          <p className="text-xs font-semibold text-blue-600 mb-0.5">{nome}</p>
        )}
        <p className={`text-sm break-words ${isMine ? 'text-white' : ''}`}>
          {isMine ? texto : formatarTextoComMencoes(texto)}
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
