import type { Palpite, ClassificacaoTime } from '../types'

export function calcularClassificacaoGrupo(
  palpitesGrupo: Palpite[],
  timesDoGrupo: string[],
): ClassificacaoTime[] {
  const classificacao: Map<string, ClassificacaoTime> = new Map()

  for (const timeId of timesDoGrupo) {
    classificacao.set(timeId, {
      timeId, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
      golsMarcados: 0, golsSofridos: 0, saldoGols: 0,
    })
  }

  for (const p of palpitesGrupo) {
    const casa = classificacao.get(p.timeCasa)
    const visitante = classificacao.get(p.timeVisitante)
    if (!casa || !visitante) continue

    casa.jogos++
    visitante.jogos++
    casa.golsMarcados += p.golsCasa
    casa.golsSofridos += p.golsVisitante
    visitante.golsMarcados += p.golsVisitante
    visitante.golsSofridos += p.golsCasa

    if (p.golsCasa > p.golsVisitante) {
      casa.pontos += 3; casa.vitorias++; visitante.derrotas++
    } else if (p.golsCasa < p.golsVisitante) {
      visitante.pontos += 3; visitante.vitorias++; casa.derrotas++
    } else {
      casa.pontos += 1; visitante.pontos += 1; casa.empates++; visitante.empates++
    }
    casa.saldoGols = casa.golsMarcados - casa.golsSofridos
    visitante.saldoGols = visitante.golsMarcados - visitante.golsSofridos
  }

  const resultado = Array.from(classificacao.values())
  resultado.sort(compararCriteriosGerais)

  return aplicarMiniTabelaEntreEmpatados(resultado, palpitesGrupo)
}

function compararCriteriosGerais(a: ClassificacaoTime, b: ClassificacaoTime): number {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos
  if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols
  if (b.golsMarcados !== a.golsMarcados) return b.golsMarcados - a.golsMarcados
  return 0
}

function mesmosCriteriosGerais(a: ClassificacaoTime, b: ClassificacaoTime): boolean {
  return a.pontos === b.pontos && a.saldoGols === b.saldoGols && a.golsMarcados === b.golsMarcados
}

// Criterios 4-6 da FIFA: quando 2+ times permanecem empatados apos pontos/saldo/gols geral,
// reavaliar so com os jogos entre eles (mini-tabela). Se ainda empatar, mantem a ordem anterior.
function aplicarMiniTabelaEntreEmpatados(
  classificacao: ClassificacaoTime[],
  palpitesGrupo: Palpite[],
): ClassificacaoTime[] {
  const resultado = [...classificacao]
  let i = 0
  while (i < resultado.length) {
    let j = i + 1
    while (j < resultado.length && mesmosCriteriosGerais(resultado[i], resultado[j])) j++
    if (j - i > 1) {
      const empatados = resultado.slice(i, j).map(t => t.timeId)
      const ordemMini = ordenarPorMiniTabela(empatados, palpitesGrupo)
      const porId = new Map(classificacao.map(t => [t.timeId, t]))
      for (let k = 0; k < ordemMini.length; k++) {
        const original = porId.get(ordemMini[k])
        if (original) resultado[i + k] = original
      }
    }
    i = j
  }
  return resultado
}

function ordenarPorMiniTabela(timeIds: string[], palpitesGrupo: Palpite[]): string[] {
  const empatados = new Set(timeIds)
  const mini: Map<string, ClassificacaoTime> = new Map()
  for (const id of timeIds) {
    mini.set(id, {
      timeId: id, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
      golsMarcados: 0, golsSofridos: 0, saldoGols: 0,
    })
  }
  for (const p of palpitesGrupo) {
    if (!empatados.has(p.timeCasa) || !empatados.has(p.timeVisitante)) continue
    const casa = mini.get(p.timeCasa)!
    const visitante = mini.get(p.timeVisitante)!
    casa.jogos++; visitante.jogos++
    casa.golsMarcados += p.golsCasa; casa.golsSofridos += p.golsVisitante
    visitante.golsMarcados += p.golsVisitante; visitante.golsSofridos += p.golsCasa
    if (p.golsCasa > p.golsVisitante) { casa.pontos += 3 }
    else if (p.golsCasa < p.golsVisitante) { visitante.pontos += 3 }
    else { casa.pontos += 1; visitante.pontos += 1 }
    casa.saldoGols = casa.golsMarcados - casa.golsSofridos
    visitante.saldoGols = visitante.golsMarcados - visitante.golsSofridos
  }
  const tabela = Array.from(mini.values())
  tabela.sort(compararCriteriosGerais)
  return tabela.map(t => t.timeId)
}
