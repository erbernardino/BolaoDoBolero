import type { Usuario } from '../types'

interface Props {
  usuarios: Usuario[]
  filtro: string
  onSelect: (usuario: Usuario) => void
}

export function MentionDropdown({ usuarios, filtro, onSelect }: Props) {
  const filtered = usuarios.filter(u => {
    const termo = filtro.toLowerCase()
    return (u.apelido || '').toLowerCase().includes(termo) ||
      (u.nome || '').toLowerCase().includes(termo)
  }).slice(0, 8)

  if (filtered.length === 0) return null

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
      {filtered.map(u => (
        <button
          key={u.uid}
          type="button"
          onClick={() => onSelect(u)}
          className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 transition-colors"
        >
          <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
            {(u.apelido || u.nome || '?')[0].toUpperCase()}
          </span>
          <span className="font-medium text-gray-800 truncate">{u.apelido || u.nome}</span>
        </button>
      ))}
    </div>
  )
}
