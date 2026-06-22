import type { JogoCalc as Jogo } from '../types/calc'
import type { GrupoRef } from './bracketUsuario'
import { calcularClinchGrupo, type ClinchTime } from './clinchGrupo'

/**
 * Clinch de classificação para o MATA-MATA (cross-group), considerando que a Copa
 * 2026 classifica 32 times: os 12 primeiros, os 12 segundos e os 8 MELHORES
 * TERCEIROS colocados. Um time pode estar garantido no mata-mata mesmo sem
 * garantir top-2 do grupo, se garantir terminar entre os 8 melhores terceiros.
 *
 * Critério CONSERVADOR (zero falsos positivos), baseado em pontos:
 * um time X está garantido se:
 *   (a) garante top-2 do grupo (pior posição possível ≤ 2), OU
 *   (b) garante top-3 do grupo (pior posição ≤ 3) E, no pior caso (3º com seus
 *       pontos mínimos = pontos já conquistados), no máximo 7 OUTROS grupos podem
 *       produzir um 3º colocado com pontos ≥ aos de X — logo X é, no pior caso,
 *       pelo menos o 8º melhor terceiro.
 *
 * Saldo de gols é tratado conservadoramente (ignorado na comparação de terceiros),
 * o que pode atrasar o selo (falso negativo) mas nunca declarar errado.
 */

interface AnaliseGrupo {
  /** Pontos já conquistados (jogos encerrados) — mínimo garantido de cada time. */
  pontosAtuais: Record<string, number>
  /** Pior posição possível (1-4) de cada time em qualquer cenário (conservador c/ empates). */
  piorPosicao: Record<string, number>
  /** Melhor posição possível (1-4) de cada time (otimista, estritamente à frente). */
  melhorPosicao: Record<string, number>
  /** Máximo de pontos que o time na 3ª posição pode atingir em qualquer cenário. */
  maxPontos3o: number
}

function analisarGrupo(jogosDoGrupo: Jogo[], times: string[]): AnaliseGrupo {
  const encerrados = jogosDoGrupo.filter(j => j.encerrado && j.resultado)
  const restantes = jogosDoGrupo.filter(j => !(j.encerrado && j.resultado))

  const pontosAtuais: Record<string, number> = {}
  for (const t of times) pontosAtuais[t] = 0
  for (const j of encerrados) {
    const gc = j.resultado!.golsCasa
    const gv = j.resultado!.golsVisitante
    if (gc > gv) pontosAtuais[j.timeCasa] += 3
    else if (gc < gv) pontosAtuais[j.timeVisitante] += 3
    else { pontosAtuais[j.timeCasa] += 1; pontosAtuais[j.timeVisitante] += 1 }
  }

  const piorPosicao: Record<string, number> = {}
  const melhorPosicao: Record<string, number> = {}
  for (const t of times) { piorPosicao[t] = 1; melhorPosicao[t] = times.length }
  let maxPontos3o = 0

  const k = restantes.length
  const total = 3 ** k
  for (let c = 0; c < total; c++) {
    const pts = { ...pontosAtuais }
    let code = c
    for (let g = 0; g < k; g++) {
      const r = code % 3
      code = Math.floor(code / 3)
      const j = restantes[g]
      if (r === 0) pts[j.timeCasa] += 3
      else if (r === 1) { pts[j.timeCasa] += 1; pts[j.timeVisitante] += 1 }
      else pts[j.timeVisitante] += 3
    }
    for (const x of times) {
      let aheadOrEqual = 0
      let strictlyAhead = 0
      for (const y of times) {
        if (y === x) continue
        if (pts[y] >= pts[x]) aheadOrEqual++
        if (pts[y] > pts[x]) strictlyAhead++
      }
      const posConserv = aheadOrEqual + 1
      if (posConserv > piorPosicao[x]) piorPosicao[x] = posConserv
      const posOtim = strictlyAhead + 1
      if (posOtim < melhorPosicao[x]) melhorPosicao[x] = posOtim
    }
    const ordenado = times.map(t => pts[t]).sort((a, b) => b - a)
    if (ordenado[2] > maxPontos3o) maxPontos3o = ordenado[2]
  }

  return { pontosAtuais, piorPosicao, melhorPosicao, maxPontos3o }
}

/**
 * Retorna o conjunto de timeIds garantidos no mata-mata (top-2 OU melhor terceiro),
 * em todos os cenários possíveis. Conservador: nunca inclui quem não está garantido.
 */
export function calcularClassificadosMataMata(jogos: Jogo[], grupos: GrupoRef[]): Set<string> {
  const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
  const analises: Record<string, AnaliseGrupo> = {}
  for (const g of grupos) {
    const letra = g.nome.replace('Grupo ', '')
    analises[letra] = analisarGrupo(jogosGrupos.filter(j => j.grupo === letra), g.times)
  }

  const classificados = new Set<string>()
  for (const g of grupos) {
    const letra = g.nome.replace('Grupo ', '')
    const a = analises[letra]
    for (const t of g.times) {
      if (a.piorPosicao[t] <= 2) { classificados.add(t); continue }
      if (a.piorPosicao[t] <= 3) {
        const px = a.pontosAtuais[t]
        let count = 0
        for (const g2 of grupos) {
          const l2 = g2.nome.replace('Grupo ', '')
          if (l2 === letra) continue
          if (analises[l2].maxPontos3o >= px) count++
        }
        if (count <= 7) classificados.add(t)
      }
    }
  }
  return classificados
}

/**
 * Monta o clinch COMPLETO por grupo, enriquecido com a classificação cross-group:
 * - `classificadoMataMata`: garantido no mata-mata (top-2 OU melhor terceiro);
 * - `eliminado`: sobrescrito para "fora do mata-mata" — só quando o time só pode
 *   terminar em último (4º) no melhor caso, nunca marcando um 3º ainda vivo.
 *
 * É a fonte única usada pelo snapshot (Cloud Function) e pela página (fallback).
 */
export function montarClinchCompleto(
  jogos: Jogo[],
  grupos: GrupoRef[],
): Record<string, Record<string, ClinchTime>> {
  const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
  const classificados = calcularClassificadosMataMata(jogos, grupos)

  const out: Record<string, Record<string, ClinchTime>> = {}
  for (const g of grupos) {
    const letra = g.nome.replace('Grupo ', '')
    const doGrupo = jogosGrupos.filter(j => j.grupo === letra)
    const clinch = calcularClinchGrupo(doGrupo, g.times)
    const analise = analisarGrupo(doGrupo, g.times)
    for (const t of g.times) {
      const ct = clinch[t]
      if (!ct) continue
      ct.classificadoMataMata = classificados.has(t)
      // Eliminado do mata-mata: só quando o time não pode sair do último lugar.
      ct.eliminado = !classificados.has(t) && analise.melhorPosicao[t] >= 4
    }
    out[letra] = clinch
  }
  return out
}
