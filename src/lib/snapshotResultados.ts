import type { JogoCalc as Jogo, ClassificacaoTime } from '../types/calc'
import type { GrupoRef } from './bracketUsuario'
import { calcularClassificacoesReais } from './resultadosOficiais'
import type { ClinchTime } from './clinchGrupo'
import { montarClinchCompleto } from './clinchMataMata'
import { montarResolvedorProvisorio, type SlotResolvido } from './resolverProvisorio'

/**
 * Fotografia (cache de dados derivados) da página de Resultados/Projeções,
 * pronta para serializar em Firestore. Não inclui Timestamp — o `atualizadoEm`
 * é adicionado na hora da gravação (pela Cloud Function).
 *
 * Esta lib é compartilhada: roda tanto no frontend quanto na Cloud Function que
 * recalcula o snapshot quando um resultado é gravado.
 */
export interface SnapshotResultados {
  /** Classificação parcial por letra de grupo. */
  classificacoes: Record<string, ClassificacaoTime[]>
  /** Status de clinch por letra de grupo → por timeId. */
  clinch: Record<string, Record<string, ClinchTime>>
  /** Resolução provisória do mata-mata por jogoId (só jogos fora da fase de grupos). */
  bracket: Record<string, { casa: SlotResolvido; visitante: SlotResolvido }>
  /** Marcador de staleness: nº de jogos encerrados com resultado no momento do cálculo. */
  baseadoEm: { jogosEncerrados: number }
}

/** Monta o snapshot derivado reusando as libs puras de cálculo (zero duplicação). */
export function montarSnapshotResultados(jogos: Jogo[], grupos: GrupoRef[]): SnapshotResultados {
  const classificacoes = calcularClassificacoesReais(jogos, grupos)

  // Clinch completo (top-2 + melhor terceiro, cross-group).
  const clinch: Record<string, Record<string, ClinchTime>> = montarClinchCompleto(jogos, grupos)

  const resolver = montarResolvedorProvisorio(jogos, grupos)
  const bracket: Record<string, { casa: SlotResolvido; visitante: SlotResolvido }> = {}
  for (const j of jogos) {
    if (j.fase !== 'grupos') bracket[j.id] = resolver(j)
  }

  const jogosEncerrados = jogos.filter(j => j.encerrado && j.resultado).length

  return { classificacoes, clinch, bracket, baseadoEm: { jogosEncerrados } }
}
