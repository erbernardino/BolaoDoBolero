import type { Palpite, ClassificacaoTime } from '../types'

// Implementa Article 13 do regulamento FIFA Copa 2026 para classificacao
// dentro do grupo:
//
// Entrada: times com pontos iguais (igual numero de pontos no fim da fase
// de grupos).
//
// Step 1 — head-to-head primeiro:
//   a) Pontos nos jogos entre os empatados
//   b) Saldo de gols nos jogos entre os empatados
//   c) Gols marcados nos jogos entre os empatados
// Se a)-c) deixar sub-grupos ainda empatados, re-aplicar a)-c) mas restritos
// aos jogos entre os times AINDA empatados.
//
// Step 2 — gerais:
//   d) Saldo de gols geral
//   e) Gols marcados geral
//   f) Conduta (cartoes — nao implementado aqui; o bolao nao registra cartoes)
//
// Step 3 — FIFA Ranking (nao aplicavel ao bolao). Final fallback determinis-
// tico por timeId para garantir ordem estavel entre tabela e mata-mata.

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

  const lista = Array.from(classificacao.values())
  // Ordenar por pontos (entrada do Article 13). Empates em pontos viram
  // clusters resolvidos em sequencia.
  lista.sort((a, b) => b.pontos - a.pontos)

  const resultado: ClassificacaoTime[] = []
  let i = 0
  while (i < lista.length) {
    let j = i + 1
    while (j < lista.length && lista[j].pontos === lista[i].pontos) j++
    const cluster = lista.slice(i, j)
    if (cluster.length === 1) {
      resultado.push(cluster[0])
    } else {
      resultado.push(...resolverEmpate(cluster, palpitesGrupo))
    }
    i = j
  }
  return resultado
}

interface H2HStat {
  pontos: number
  saldoGols: number
  golsMarcados: number
}

function calcularH2H(timeIds: string[], palpitesGrupo: Palpite[]): Map<string, H2HStat> {
  const set = new Set(timeIds)
  const map = new Map<string, H2HStat>()
  for (const id of timeIds) map.set(id, { pontos: 0, saldoGols: 0, golsMarcados: 0 })
  for (const p of palpitesGrupo) {
    if (!set.has(p.timeCasa) || !set.has(p.timeVisitante)) continue
    const c = map.get(p.timeCasa)!
    const v = map.get(p.timeVisitante)!
    c.golsMarcados += p.golsCasa
    c.saldoGols += p.golsCasa - p.golsVisitante
    v.golsMarcados += p.golsVisitante
    v.saldoGols += p.golsVisitante - p.golsCasa
    if (p.golsCasa > p.golsVisitante) c.pontos += 3
    else if (p.golsCasa < p.golsVisitante) v.pontos += 3
    else { c.pontos += 1; v.pontos += 1 }
  }
  return map
}

function mesmoH2H(a: H2HStat, b: H2HStat): boolean {
  return a.pontos === b.pontos && a.saldoGols === b.saldoGols && a.golsMarcados === b.golsMarcados
}

// Resolve um grupo de times empatados em pontos aplicando Step 1 da FIFA
// (head-to-head a/b/c) e, em sub-grupos ainda empatados, recursivamente
// re-aplicando h2h em escopo restrito. Se h2h nao separar nada, cai para
// Step 2 (geral d/e/f) e fallback deterministico.
function resolverEmpate(
  empatados: ClassificacaoTime[],
  palpitesGrupo: Palpite[],
): ClassificacaoTime[] {
  if (empatados.length <= 1) return empatados

  const h2h = calcularH2H(empatados.map(t => t.timeId), palpitesGrupo)

  const ordenadoH2H = [...empatados].sort((a, b) => {
    const sa = h2h.get(a.timeId)!
    const sb = h2h.get(b.timeId)!
    if (sb.pontos !== sa.pontos) return sb.pontos - sa.pontos
    if (sb.saldoGols !== sa.saldoGols) return sb.saldoGols - sa.saldoGols
    if (sb.golsMarcados !== sa.golsMarcados) return sb.golsMarcados - sa.golsMarcados
    return 0
  })

  const resultado: ClassificacaoTime[] = []
  let i = 0
  while (i < ordenadoH2H.length) {
    let j = i + 1
    const sa = h2h.get(ordenadoH2H[i].timeId)!
    while (j < ordenadoH2H.length && mesmoH2H(h2h.get(ordenadoH2H[j].timeId)!, sa)) j++
    const sub = ordenadoH2H.slice(i, j)
    if (sub.length === 1) {
      resultado.push(sub[0])
    } else if (sub.length === empatados.length) {
      // h2h nao separou nenhum -> nao recurse (loop infinito); aplica Step 2
      resultado.push(...aplicarCriteriosGerais(sub))
    } else {
      // sub-grupo restante -> re-aplicar Step 1 entre eles (apenas seus jogos)
      resultado.push(...resolverEmpate(sub, palpitesGrupo))
    }
    i = j
  }
  return resultado
}

// Step 2 (geral) + Step 3 fallback deterministico.
function aplicarCriteriosGerais(empatados: ClassificacaoTime[]): ClassificacaoTime[] {
  return [...empatados].sort((a, b) => {
    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols
    if (b.golsMarcados !== a.golsMarcados) return b.golsMarcados - a.golsMarcados
    // Conduta (Step 2 f) nao implementado.
    // FIFA Ranking (Step 3) nao aplicavel.
    // Fallback deterministico para tabela e chaveamento nao divergirem.
    return a.timeId.localeCompare(b.timeId)
  })
}
