import type { JogoCalc as Jogo } from '../types/calc'
import { calcularClassificacaoGrupo } from './classificacao'
import { jogoParaPalpiteReal } from './resultadosOficiais'

export interface ClinchTime {
  /** Garantiu top-2 (classificação) em TODOS os cenários possíveis. */
  classificadoTop2: boolean
  /** 1 ou 2 se a posição exata está garantida em todos os cenários; senão null. */
  posicaoExataGarantida: 1 | 2 | null
  /** Eliminado. No clinch por grupo = não alcança top-2; após montarClinchCompleto = fora do mata-mata. */
  eliminado: boolean
  /**
   * Garantido no mata-mata (top-2 OU melhor terceiro), em todos os cenários.
   * Preenchido por montarClinchCompleto (cross-group); ausente no clinch por grupo isolado.
   */
  classificadoMataMata?: boolean
  timeId: string
}

interface JogoRestante {
  casa: string
  visitante: string
}

/**
 * Determina o status de clinch (classificação garantida por pontos) de cada
 * time de um grupo, considerando os jogos já encerrados e enumerando todos os
 * resultados possíveis (V/E/D) dos jogos restantes.
 *
 * Critério CONSERVADOR baseado apenas em pontos (1º critério FIFA). Nunca
 * declara classificado quem não está (zero falsos positivos); pode atrasar o
 * badge em empates resolvidos por saldo (falso negativo intencional).
 *
 * "Grupo completo" significa que todos os jogos CADASTRADOS do grupo estão
 * encerrados (restantes.length === 0). Assume-se que o carregamento traz todos
 * os jogos do grupo de uma vez; jogos ainda não cadastrados não são considerados.
 */
export function calcularClinchGrupo(
  jogosDoGrupo: Jogo[],
  timesDoGrupo: string[],
): Record<string, ClinchTime> {
  const base: Record<string, ClinchTime> = {}
  for (const t of timesDoGrupo) {
    base[t] = { timeId: t, classificadoTop2: false, posicaoExataGarantida: null, eliminado: false }
  }

  const encerrados = jogosDoGrupo.filter(j => j.encerrado && j.resultado)
  const restantes: JogoRestante[] = jogosDoGrupo
    .filter(j => !(j.encerrado && j.resultado))
    .map(j => ({ casa: j.timeCasa, visitante: j.timeVisitante }))

  // Grupo sem nenhum jogo cadastrado: nada a decidir.
  if (jogosDoGrupo.length === 0) return base

  // Pontos fixos vindos dos jogos encerrados.
  const pontosBase: Record<string, number> = {}
  for (const t of timesDoGrupo) pontosBase[t] = 0
  for (const j of encerrados) {
    const gc = j.resultado!.golsCasa
    const gv = j.resultado!.golsVisitante
    if (gc > gv) pontosBase[j.timeCasa] += 3
    else if (gc < gv) pontosBase[j.timeVisitante] += 3
    else { pontosBase[j.timeCasa] += 1; pontosBase[j.timeVisitante] += 1 }
  }

  // Grupo completo: usar a classificação real (com desempates FIFA completos).
  if (restantes.length === 0) {
    const reaisComoPalpites = encerrados.map(jogoParaPalpiteReal)
    const ordenada = calcularClassificacaoGrupo(reaisComoPalpites, timesDoGrupo)
    ordenada.forEach((ct, idx) => {
      const alvo = base[ct.timeId]
      if (!alvo) return
      if (idx === 0) { alvo.posicaoExataGarantida = 1; alvo.classificadoTop2 = true }
      else if (idx === 1) { alvo.posicaoExataGarantida = 2; alvo.classificadoTop2 = true }
      else { alvo.eliminado = true }
    })
    return base
  }

  // Acumuladores por time ao longo de TODOS os cenários.
  const acc: Record<string, {
    sempreAheadEqualMax: number   // maior #{>= X, exceto X} visto
    sempreStrictAheadMaxQuandoEqual1: boolean // em todo cenário: strictAhead==1 && aheadEqual==1
    algumTop2: boolean            // existe cenário com strictAhead <= 1
  }> = {}
  for (const t of timesDoGrupo) {
    acc[t] = { sempreAheadEqualMax: 0, sempreStrictAheadMaxQuandoEqual1: true, algumTop2: false }
  }

  const k = restantes.length
  const totalCenarios = 3 ** k
  for (let c = 0; c < totalCenarios; c++) {
    const pontos = { ...pontosBase }
    let code = c
    for (let g = 0; g < k; g++) {
      const r = code % 3
      code = Math.floor(code / 3)
      const { casa, visitante } = restantes[g]
      if (r === 0) pontos[casa] += 3            // vitória casa
      else if (r === 1) { pontos[casa] += 1; pontos[visitante] += 1 } // empate
      else pontos[visitante] += 3               // vitória visitante
    }
    for (const x of timesDoGrupo) {
      let aheadEqual = 0
      let strictAhead = 0
      for (const y of timesDoGrupo) {
        if (y === x) continue
        if (pontos[y] > pontos[x]) { strictAhead++; aheadEqual++ }
        else if (pontos[y] === pontos[x]) aheadEqual++
      }
      const a = acc[x]
      if (aheadEqual > a.sempreAheadEqualMax) a.sempreAheadEqualMax = aheadEqual
      if (!(strictAhead === 1 && aheadEqual === 1)) a.sempreStrictAheadMaxQuandoEqual1 = false
      if (strictAhead <= 1) a.algumTop2 = true
    }
  }

  for (const t of timesDoGrupo) {
    const a = acc[t]
    const alvo = base[t]
    // classificadoTop2: em todo cenário #{>= X, exceto X} <= 1.
    alvo.classificadoTop2 = a.sempreAheadEqualMax <= 1
    // posição exata 1: em todo cenário ninguém >= X (sempreAheadEqualMax == 0).
    if (a.sempreAheadEqualMax === 0) alvo.posicaoExataGarantida = 1
    // posição exata 2: em todo cenário exatamente um estritamente à frente e nenhum empate.
    else if (alvo.classificadoTop2 && a.sempreStrictAheadMaxQuandoEqual1) alvo.posicaoExataGarantida = 2
    // eliminado: não alcança top-2 em nenhum cenário.
    alvo.eliminado = !a.algumTop2
  }

  return base
}
