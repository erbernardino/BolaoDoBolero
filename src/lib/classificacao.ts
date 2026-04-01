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
  resultado.sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols
    if (b.golsMarcados !== a.golsMarcados) return b.golsMarcados - a.golsMarcados
    const confronto = palpitesGrupo.find(
      p => (p.timeCasa === a.timeId && p.timeVisitante === b.timeId) ||
           (p.timeCasa === b.timeId && p.timeVisitante === a.timeId)
    )
    if (confronto) {
      const golsA = confronto.timeCasa === a.timeId ? confronto.golsCasa : confronto.golsVisitante
      const golsB = confronto.timeCasa === b.timeId ? confronto.golsCasa : confronto.golsVisitante
      if (golsA !== golsB) return golsB - golsA
    }
    return 0
  })
  return resultado
}
