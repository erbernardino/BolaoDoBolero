import type { JogoCalc as Jogo } from '../types/calc'
import type { GrupoRef } from './bracketUsuario'
import { calcularClassificacoesReais, montarResolvedorBracketOficial } from './resultadosOficiais'
import { calcularClinchGrupo, type ClinchTime } from './clinchGrupo'

/**
 * Resultado da resolução de UM lado de um confronto de mata-mata, com o estado
 * de certeza para sinalização visual.
 */
export interface SlotResolvido {
  /** Time resolvido, ou null quando o slot ainda é um label (terceiro/cascata não resolvidos). */
  timeId: string | null
  /** Vaga garantida (clinch top-2 do grupo) → exibir selo ✓. */
  classificado: boolean
  /** Posição ainda não travada (líder provisório / 1º-2º indefinido) → exibir esmaecido. */
  provisorio: boolean
}

export type ResolverProvisorio = (jogo: Jogo) => { casa: SlotResolvido; visitante: SlotResolvido }

const VAZIO: SlotResolvido = { timeId: null, classificado: false, provisorio: false }

/**
 * Monta um resolvedor PROVISÓRIO do bracket de mata-mata a partir dos resultados
 * oficiais. Diferente de montarResolvedorBracketOficial (que só resolve slots de
 * grupo quando o grupo está completo), este preenche os slots diretos de grupo
 * (1X/2X) com a classificação ATUAL (parcial), sinalizando se o time já está
 * matematicamente classificado (✓) e se a posição ainda é provisória (esmaecido).
 *
 * Slots de melhores terceiros (3XYZ) e cascatas (W##/RU##) NÃO resolvem cedo —
 * permanecem como label (timeId null) até haver dado suficiente.
 */
export function montarResolvedorProvisorio(jogos: Jogo[], grupos: GrupoRef[]): ResolverProvisorio {
  const cls = calcularClassificacoesReais(jogos, grupos)
  const oficial = montarResolvedorBracketOficial(jogos, grupos)
  const jogosGrupos = jogos.filter(j => j.fase === 'grupos')

  const clinchPorGrupo: Record<string, Record<string, ClinchTime>> = {}
  for (const g of grupos) {
    const letra = g.nome.replace('Grupo ', '')
    clinchPorGrupo[letra] = calcularClinchGrupo(jogosGrupos.filter(j => j.grupo === letra), g.times)
  }

  function resolverLado(label: string | undefined, oficialId: string | null): SlotResolvido {
    const slotGrupo = label?.match(/^([12])([A-L])$/)

    // 1) Resolução oficial (grupo completo OU cascata com resultado) → posição definida.
    if (oficialId) {
      const classificado = slotGrupo
        ? (clinchPorGrupo[slotGrupo[2]]?.[oficialId]?.classificadoTop2 ?? true)
        : false
      return { timeId: oficialId, classificado, provisorio: false }
    }

    // 2) Slot direto de grupo (1X/2X) → provisório pela classificação parcial atual.
    if (slotGrupo) {
      const pos = Number(slotGrupo[1])
      const letra = slotGrupo[2]
      const ct = cls[letra]?.[pos - 1]
      if (ct) {
        const cl = clinchPorGrupo[letra]?.[ct.timeId]
        const classificado = cl?.classificadoTop2 ?? false
        const posicaoTravada = cl?.posicaoExataGarantida === pos
        return { timeId: ct.timeId, classificado, provisorio: !posicaoTravada }
      }
    }

    // 3) Terceiros (3XYZ) e cascatas (W##/RU##) não resolvidos → permanece label.
    return VAZIO
  }

  return (jogo: Jogo) => {
    const off = oficial(jogo)
    return {
      casa: resolverLado(jogo.labelCasa, off.casaId),
      visitante: resolverLado(jogo.labelVisitante, off.visitanteId),
    }
  }
}
