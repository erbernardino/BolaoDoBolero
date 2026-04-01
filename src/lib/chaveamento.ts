import type { Origem, Palpite, ClassificacaoTime } from '../types'

export function resolverTimeMataMataPorPalpites(
  origem: Origem,
  classificacoesPorGrupo: Record<string, ClassificacaoTime[]>,
  palpitesPorJogoId: Record<string, Palpite>,
  _melhoresTerceiros: ClassificacaoTime[],
): string | null {
  if (origem.tipo === 'grupo') {
    const classificacao = classificacoesPorGrupo[origem.grupo]
    if (!classificacao || classificacao.length < origem.posicao) return null
    return classificacao[origem.posicao - 1].timeId
  }
  if (origem.tipo === 'jogo') {
    const palpite = palpitesPorJogoId[origem.jogoId]
    if (!palpite) return null

    let vencedor: string | null
    let perdedor: string | null

    if (palpite.golsCasa > palpite.golsVisitante) {
      vencedor = palpite.timeCasa
      perdedor = palpite.timeVisitante
    } else if (palpite.golsVisitante > palpite.golsCasa) {
      vencedor = palpite.timeVisitante
      perdedor = palpite.timeCasa
    } else {
      // Empate — classificado é o vencedor nos pênaltis
      vencedor = palpite.classificado
      perdedor = palpite.classificado === palpite.timeCasa
        ? palpite.timeVisitante
        : palpite.timeCasa
    }

    return origem.resultado === 'perdedor' ? perdedor : vencedor
  }
  return null
}
