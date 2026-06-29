import type { JogoCalc as Jogo, PalpiteCalc as Palpite, ClassificacaoTime } from '../types/calc'
import { calcularClassificacaoGrupo } from './classificacao'
import { montarResolvedorBracket, type GrupoRef, type ResolverBracket } from './bracketUsuario'

/**
 * Converte um jogo encerrado com resultado em um "palpite real".
 * Presupõe j.resultado presente — chame apenas para jogos encerrados.
 */
export function jogoParaPalpiteReal(j: Jogo): Palpite {
  return {
    id: `real_${j.id}`,
    uid: 'real',
    jogoId: j.id,
    timeCasa: j.timeCasa,
    timeVisitante: j.timeVisitante,
    golsCasa: j.resultado!.golsCasa,
    golsVisitante: j.resultado!.golsVisitante,
    classificado: j.resultado!.classificado,
  }
}

/** Converte jogos OFICIAIS encerrados em "palpites reais" indexados por jogoId. */
export function jogosParaPalpitesReais(jogos: Jogo[]): Record<string, Palpite> {
  const map: Record<string, Palpite> = {}
  for (const j of jogos) {
    if (j.encerrado && j.resultado) {
      map[j.id] = jogoParaPalpiteReal(j)
    }
  }
  return map
}

/**
 * Classificação real (parcial) por grupo a partir dos resultados oficiais.
 * Inclui grupos com pelo menos 1 jogo encerrado. Chave = letra do grupo.
 * Usada nas TABELAS (mostra parciais). Para o BRACKET, use o resolvedor.
 *
 * Divergência intencional: esta função retorna classificação PARCIAL (≥1 jogo
 * encerrado) e alimenta as tabelas de grupos. Já o bracket via
 * montarResolvedorBracket (chamado em montarResolvedorBracketOficial) só
 * resolve os slots de um grupo quando TODOS os seus jogos estão encerrados —
 * garantindo que a posição no slot seja exata e definitiva, nunca parcial.
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
      .map(jogoParaPalpiteReal)
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
  const palpitesPorJogoId = jogosParaPalpitesReais(jogos)
  const resolver = montarResolvedorBracket({ jogos, grupos, palpitesPorJogoId })

  // Jogos de mata-mata têm timeCasa/Visitante vazios até serem materializados, então
  // uma cascata (W##/RU##) resolveria o vencedor como string vazia. Resolvemos cada
  // jogo na ordem de dependência (o alimentador sempre tem número menor) e enriquecemos
  // o "palpite real" com os times JÁ RESOLVIDOS — assim as cascatas posteriores
  // (oitavas ← fase32, quartas ← oitavas, …) encontram o time correto. Os palpites
  // vêm de jogosParaPalpitesReais (objetos novos), então a mutação é segura.
  const mataMata = jogos
    .filter(j => j.fase !== 'grupos')
    .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  for (const jogo of mataMata) {
    const palpite = palpitesPorJogoId[jogo.id]
    if (!palpite) continue // sem resultado → cascata permanece indefinida
    const { casaId, visitanteId } = resolver(jogo)
    if (casaId) palpite.timeCasa = casaId
    if (visitanteId) palpite.timeVisitante = visitanteId
  }

  return resolver
}
