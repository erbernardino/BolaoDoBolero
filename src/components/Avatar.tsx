// Cores estaveis derivadas de uma chave (uid ou nome) para o placeholder
const PALETA = [
  'bg-blue-600', 'bg-rose-600', 'bg-emerald-600', 'bg-amber-600',
  'bg-violet-600', 'bg-sky-600', 'bg-pink-600', 'bg-teal-600',
  'bg-orange-600', 'bg-indigo-600', 'bg-lime-600', 'bg-fuchsia-600',
]

function corParaChave(chave: string): string {
  let hash = 0
  for (let i = 0; i < chave.length; i++) hash = (hash * 31 + chave.charCodeAt(i)) | 0
  return PALETA[Math.abs(hash) % PALETA.length]
}

const TAMANHOS = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-base',
  xl: 'w-24 h-24 text-2xl',
} as const

export type AvatarSize = keyof typeof TAMANHOS

interface Props {
  src?: string | null
  nome?: string | null
  uid?: string | null
  size?: AvatarSize
  ring?: boolean
  className?: string
}

export function Avatar({ src, nome, uid, size = 'sm', ring = true, className }: Props) {
  const dim = TAMANHOS[size]
  const ringClass = ring ? 'ring-2 ring-white/40' : ''

  if (src) {
    return (
      <img
        src={src}
        alt={nome ?? 'Perfil'}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`${dim} ${ringClass} rounded-full object-cover bg-white ${className ?? ''}`}
      />
    )
  }

  const inicial = ((nome ?? '?').trim()[0] ?? '?').toUpperCase()
  const cor = corParaChave(uid ?? nome ?? '?')

  return (
    <div
      className={`${dim} ${ringClass} ${cor} rounded-full flex items-center justify-center font-bold text-white ${className ?? ''}`}
      aria-label={nome ?? 'Perfil'}
    >
      {inicial}
    </div>
  )
}
