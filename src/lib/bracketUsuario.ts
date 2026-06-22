import type { ClassificacaoTime, JogoCalc as Jogo, PalpiteCalc as Palpite } from '../types/calc'
import { calcularClassificacaoGrupo } from './classificacao'
import { selecionarMelhoresTerceiros } from './melhoresTerceiros'
import { montarTerceirosPorSlot, resolverTimeMataMataPersonalizado } from './chaveamento'

export interface GrupoRef {
  nome: string
  times: string[]
}

export type ResolverBracket = (jogo: Jogo) => { casaId: string | null; visitanteId: string | null }

/**
 * Monta um resolvedor do bracket de mata-mata AO VIVO para UM usuário, a partir
 * dos palpites dele — exatamente a mesma lógica de resolverTimesDoJogo em
 * PalpitesMataMata.tsx. Usado nas telas de impressão para que os times do
 * mata-mata reflitam o bracket atual do usuário (e não os IDs congelados no
 * documento de palpite). NÃO escreve nada — é cálculo puro em memória.
 */
export function montarResolvedorBracket(params: {
  jogos: Jogo[]
  grupos: GrupoRef[]
  palpitesPorJogoId: Record<string, Palpite>
  pontosDisciplinares?: Record<string, number>
}): ResolverBracket {
  const { jogos, grupos, palpitesPorJogoId, pontosDisciplinares = {} } = params
  const get = (jogoId: string): Palpite | undefined => palpitesPorJogoId[jogoId]

  const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
  const jogosFase32 = jogos.filter(j => j.fase === 'fase32')

  // Classificação por grupo — só quando TODOS os jogos do grupo foram palpitados.
  const classPorGrupo: Record<string, ClassificacaoTime[]> = {}
  for (const grupo of grupos) {
    const letra = grupo.nome.replace('Grupo ', '')
    const jogosDoGrupo = jogosGrupos.filter(j => j.grupo === letra)
    const palpitesGrupo = jogosDoGrupo
      .map(j => get(j.id))
      .filter((p): p is Palpite => p !== undefined)
    if (palpitesGrupo.length === jogosDoGrupo.length && jogosDoGrupo.length > 0) {
      classPorGrupo[letra] = calcularClassificacaoGrupo(palpitesGrupo, grupo.times)
    }
  }

  // Melhores terceiros só quando todos os grupos estão completos.
  const todosGruposCompletos = grupos.every(g => classPorGrupo[g.nome.replace('Grupo ', '')] !== undefined)
  const terceiros = todosGruposCompletos
    ? Object.entries(classPorGrupo)
      .map(([grupo, cl]) => cl[2] ? { ...cl[2], grupo } : null)
      .filter((item): item is ClassificacaoTime & { grupo: string } => item !== null)
    : []
  const melhoresTerceiros = selecionarMelhoresTerceiros(terceiros, pontosDisciplinares)
  const terceirosPorSlot = montarTerceirosPorSlot(jogosFase32, classPorGrupo, melhoresTerceiros)

  return (jogo: Jogo) => ({
    casaId: resolverTimeMataMataPersonalizado({
      origem: jogo.origemCasa ?? null,
      label: jogo.labelCasa,
      slotKey: `${jogo.id}:casa`,
      classificacoesPorGrupo: classPorGrupo,
      palpitesPorJogoId,
      melhoresTerceiros,
      terceirosPorSlot,
      jogos,
      fallbackTimeId: jogo.timeCasa || undefined,
    }),
    visitanteId: resolverTimeMataMataPersonalizado({
      origem: jogo.origemVisitante ?? null,
      label: jogo.labelVisitante,
      slotKey: `${jogo.id}:visitante`,
      classificacoesPorGrupo: classPorGrupo,
      palpitesPorJogoId,
      melhoresTerceiros,
      terceirosPorSlot,
      jogos,
      fallbackTimeId: jogo.timeVisitante || undefined,
    }),
  })
}
