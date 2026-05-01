import type { Ranking, Usuario } from '../types'

interface Props {
  ranking: (Ranking & { usuario: Usuario })[]
}

interface Destaque {
  posicao: number
  label: string
  cor: string
  bgCor: string
  bordaCor: string
}

const DESTAQUES: Destaque[] = [
  { posicao: 0, label: '1º', cor: 'text-yellow-700', bgCor: 'bg-yellow-50', bordaCor: 'border-yellow-400' },
  { posicao: 1, label: '2º', cor: 'text-gray-500', bgCor: 'bg-gray-50', bordaCor: 'border-gray-300' },
  { posicao: 2, label: '3º', cor: 'text-amber-700', bgCor: 'bg-amber-50', bordaCor: 'border-amber-400' },
]

export function RankingDestaques({ ranking }: Props) {
  if (ranking.length < 3) return null

  const antepenultimoIdx = ranking.length - 3
  // Só mostra antepenúltimo se não já estiver entre os 3 primeiros
  const mostrarAntepenultimo = antepenultimoIdx > 2

  const lgCols = mostrarAntepenultimo ? 'lg:grid-cols-4' : 'lg:grid-cols-3'

  return (
    <div className={`mb-8 grid grid-cols-2 sm:grid-cols-3 ${lgCols} gap-3`}>
      {DESTAQUES.map(({ posicao, label, cor, bgCor, bordaCor }) => {
        const r = ranking[posicao]
        return (
          <div key={r.uid} className={`${bgCor} border-2 ${bordaCor} rounded-lg p-3 text-center`}>
            <p className={`text-xs font-semibold uppercase ${cor}`}>{label} lugar</p>
            <p className="text-sm font-bold mt-1 truncate">{r.usuario.apelido || r.usuario.nome}</p>
            <p className="text-lg font-bold mt-1">{r.pontosTotal} pts</p>
          </div>
        )
      })}
      {mostrarAntepenultimo && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-center">
          <p className="text-xs font-semibold uppercase text-red-700">Antepenultimo</p>
          <p className="text-sm font-bold mt-1 truncate">
            {ranking[antepenultimoIdx].usuario.apelido || ranking[antepenultimoIdx].usuario.nome}
          </p>
          <p className="text-lg font-bold mt-1">{ranking[antepenultimoIdx].pontosTotal} pts</p>
        </div>
      )}
    </div>
  )
}
