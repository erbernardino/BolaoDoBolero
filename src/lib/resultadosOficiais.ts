import type { Jogo, Palpite, ClassificacaoTime } from '../types'
import { calcularClassificacaoGrupo } from './classificacao'
import { montarResolvedorBracket, type GrupoRef, type ResolverBracket } from './bracketUsuario'

/** Converte jogos OFICIAIS encerrados em "palpites reais" indexados por jogoId. */
export function jogosParaPalpitesReais(jogos: Jogo[]): Record<string, Palpite> {
  const map: Record<string, Palpite> = {}
  for (const j of jogos) {
    if (j.encerrado && j.resultado) {
      map[j.id] = {
        id: `real_${j.id}`,
        uid: 'real',
        jogoId: j.id,
        timeCasa: j.timeCasa,
        timeVisitante: j.timeVisitante,
        golsCasa: j.resultado.golsCasa,
        golsVisitante: j.resultado.golsVisitante,
        classificado: j.resultado.classificado,
        criadoEm: null as never,
      }
    }
  }
  return map
}

/**
 * Classificação real (parcial) por grupo a partir dos resultados oficiais.
 * Inclui grupos com pelo menos 1 jogo encerrado. Chave = letra do grupo.
 * Usada nas TABELAS (mostra parciais). Para o BRACKET, use o resolvedor.
 */
export function calcularClassificacoesReais(
  jogos: Jogo[],
  grupos: GrupoRef[],
): Record<string, ClassificacaoTime[]> {
  const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
  const result: Record<string, ClassificacaoTime[]> = {}
  for (const grupo of grupos) {
    const letra = grupo.nome.replace('Grupo ', '')
    const jogosDoGrupo = jogosGrupos.filter(j => j.grupo === letra)
    const palpitesReais: Palpite[] = jogosDoGrupo
      .filter(j => j.encerrado && j.resultado)
      .map(j => ({
        id: `real_${j.id}`, uid: 'real', jogoId: j.id,
        timeCasa: j.timeCasa, timeVisitante: j.timeVisitante,
        golsCasa: j.resultado!.golsCasa, golsVisitante: j.resultado!.golsVisitante,
        classificado: j.resultado!.classificado, criadoEm: null as never,
      }))
    if (palpitesReais.length > 0) {
      result[letra] = calcularClassificacaoGrupo(palpitesReais, grupo.times)
    }
  }
  return result
}

/**
 * Resolvedor do bracket OFICIAL do mata-mata. Reutiliza montarResolvedorBracket
 * alimentado com os resultados oficiais convertidos em palpites. Os slots de
 * grupo (1A, 2B...) só resolvem quando o grupo está completo — garantindo que
 * o slot só é preenchido com posição exata conhecida (nunca com posição incerta).
 */
export function montarResolvedorBracketOficial(
  jogos: Jogo[],
  grupos: GrupoRef[],
): ResolverBracket {
  return montarResolvedorBracket({
    jogos,
    grupos,
    palpitesPorJogoId: jogosParaPalpitesReais(jogos),
  })
}
