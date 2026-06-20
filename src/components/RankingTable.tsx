import type { Ranking, Usuario, Jogo, Time, Palpite } from '../types'
import { calcularPontosPalpite } from '../lib/pontuacao'
import { Avatar } from './Avatar'

// Config unitária: só usamos o `tipo` de acerto, que independe dos valores de pontos.
const PONTOS_UNIT = { placarExato: 1, colunaCerta: 1, totalGols: 1 }

export interface JogoAoVivoRanking {
  jogo: Jogo
  timeCasa: Time | null
  timeVisitante: Time | null
}

interface Props {
  ranking: (Ranking & { usuario: Usuario })[]
  /** Jogos ao vivo cujas colunas de palpite devem aparecer entre "#" e "Participante". */
  jogosAoVivo?: JogoAoVivoRanking[]
  /** Palpites por participante, indexados por `${uid}_${jogoId}`. */
  palpitesLive?: Map<string, Palpite>
}

function CelulaPalpite({
  palpite,
  jogo,
}: {
  palpite: Palpite | undefined
  jogo: Jogo
}) {
  if (!palpite) {
    return <span className="text-gray-300">—</span>
  }

  // Cor pelo tipo de pontuação REAL (calcularPontosPalpite), aplicada ao placar
  // atual ao vivo: exato → verde, coluna/vencedor → amarelo, total de gols → azul,
  // não pontuou → vermelho.
  let corClasse = 'text-gray-700'
  if (jogo.resultado) {
    const { tipo } = calcularPontosPalpite(
      { golsCasa: palpite.golsCasa, golsVisitante: palpite.golsVisitante },
      { golsCasa: jogo.resultado.golsCasa, golsVisitante: jogo.resultado.golsVisitante },
      PONTOS_UNIT,
    )
    if (tipo === 'placarExato') corClasse = 'text-green-700 bg-green-50 font-bold'
    else if (tipo === 'colunaCerta') corClasse = 'text-yellow-700 bg-yellow-50'
    else if (tipo === 'totalGols') corClasse = 'text-blue-700 bg-blue-50'
    else corClasse = 'text-red-400'
  }

  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-xs font-mono ${corClasse}`}>
      {palpite.golsCasa}x{palpite.golsVisitante}
    </span>
  )
}

export function RankingTable({ ranking, jogosAoVivo = [], palpitesLive }: Props) {

  return (
    <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow">
        <thead className="bg-blue-800 text-white text-sm">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            {jogosAoVivo.map(({ jogo, timeCasa, timeVisitante }) => (
              <th key={jogo.id} className="px-2 py-2 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-1">
                  {timeCasa?.bandeira && (
                    <img
                      src={timeCasa.bandeira}
                      alt={timeCasa.nome ?? ''}
                      title={timeCasa.nome ?? ''}
                      className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                    />
                  )}
                  {/* Placar atual ao vivo — torna o destaque verde interpretável. */}
                  <span className="text-xs font-black tabular-nums">
                    {jogo.resultado ? `${jogo.resultado.golsCasa}-${jogo.resultado.golsVisitante}` : '–'}
                  </span>
                  {timeVisitante?.bandeira && (
                    <img
                      src={timeVisitante.bandeira}
                      alt={timeVisitante.nome ?? ''}
                      title={timeVisitante.nome ?? ''}
                      className="w-5 h-3.5 object-cover rounded-sm shrink-0"
                    />
                  )}
                </div>
              </th>
            ))}
            {/* Participante fica sticky à esquerda: ao rolar para inspecionar os
                palpites de vários jogos, o nome da linha continua visível. */}
            <th className="px-3 py-2 text-left sticky left-0 bg-blue-800 z-10">Participante</th>
            <th className="px-3 py-2 text-center">Pontos</th>
            <th className="px-3 py-2 text-center">Exatos</th>
            <th className="px-3 py-2 text-center">Coluna</th>
            <th className="px-3 py-2 text-center">Gols</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => {
            const bg = i % 2 === 0 ? 'bg-gray-50' : 'bg-white'
            const nome = r.usuario.apelido || r.usuario.nome
            const nomeExibido = nome.length > 15 ? `${nome.slice(0, 15)}…` : nome
            return (
              <tr key={r.uid} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                <td className="px-3 py-2 font-bold">{i + 1}</td>
                {jogosAoVivo.map(({ jogo }) => (
                  <td key={jogo.id} className="px-2 py-2 text-center">
                    <CelulaPalpite
                      palpite={palpitesLive?.get(`${r.uid}_${jogo.id}`)}
                      jogo={jogo}
                    />
                  </td>
                ))}
                <td className={`px-3 py-2 sticky left-0 z-10 ${bg}`}>
                  <div className="flex items-center gap-2">
                    <Avatar
                      src={r.usuario.fotoURL ?? null}
                      nome={r.usuario.apelido || r.usuario.nome}
                      uid={r.usuario.uid}
                      size="sm"
                      ring={false}
                    />
                    {/* title mostra o nome completo no hover (desktop) e long-press (mobile). */}
                    <span title={nome}>{nomeExibido}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-center font-bold">{r.pontosTotal}</td>
                <td className="px-3 py-2 text-center">{r.placaresExatos}</td>
                <td className="px-3 py-2 text-center">{r.colunasCertas}</td>
                <td className="px-3 py-2 text-center">{r.totalGolsAcertados}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
