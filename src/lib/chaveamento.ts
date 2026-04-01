import type { Origem, Palpite, ClassificacaoTime } from '../types'

export function resolverTimeMataMataPorPalpites(
  origem: Origem,
  classificacoesPorGrupo: Record<string, ClassificacaoTime[]>,
  palpitesPorJogoId: Record<string, Palpite>,
  melhoresTerceiros: ClassificacaoTime[],
): string | null {
  if (origem.tipo === 'grupo') {
    const classificacao = classificacoesPorGrupo[origem.grupo]
    if (!classificacao || classificacao.length < origem.posicao) return null
    return classificacao[origem.posicao - 1].timeId
  }
  if (origem.tipo === 'jogo') {
    const palpite = palpitesPorJogoId[origem.jogoId]
    if (!palpite) return null
    if (palpite.golsCasa > palpite.golsVisitante) return palpite.timeCasa
    if (palpite.golsVisitante > palpite.golsCasa) return palpite.timeVisitante
    return palpite.classificado
  }
  return null
}
