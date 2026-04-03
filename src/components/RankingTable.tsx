import type { Ranking, Usuario } from '../types'

interface Props {
  ranking: (Ranking & { usuario: Usuario })[]
}

export function RankingTable({ ranking }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow">
        <thead className="bg-blue-800 text-white text-sm">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Participante</th>
            <th className="px-3 py-2 text-center">Pontos</th>
            <th className="px-3 py-2 text-center">Exatos</th>
            <th className="px-3 py-2 text-center">Coluna</th>
            <th className="px-3 py-2 text-center">Gols</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => (
            <tr key={r.uid} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
              <td className="px-3 py-2 font-bold">{i + 1}</td>
              <td className="px-3 py-2">{r.usuario.apelido || r.usuario.nome}</td>
              <td className="px-3 py-2 text-center font-bold">{r.pontosTotal}</td>
              <td className="px-3 py-2 text-center">{r.placaresExatos}</td>
              <td className="px-3 py-2 text-center">{r.colunasCertas}</td>
              <td className="px-3 py-2 text-center">{r.totalGolsAcertados}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
