// Cloud Function callable que resolve os times do mata-mata a partir dos
// resultados REAIS dos jogos (nao palpites).
//
// Le todos os jogos, calcula:
// - classificacao final de cada grupo (criterios FIFA)
// - 8 melhores 3os colocados (criterios FIFA)
// Depois resolve cada label (1A, 2B, 3ABCDF, W73, RU101) para um timeId real
// e atualiza os jogos do mata-mata cujo timeCasa/timeVisitante ainda esta vazio.
//
// Idempotente: pode rodar varias vezes; so atualiza jogos com label resolvivel
// que ainda estao vazios.

import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { selecionarMelhoresTerceiros } from './_shared/lib/melhoresTerceiros'
import { montarTerceirosPorSlot } from './_shared/lib/chaveamento'

interface ResultadoJogo {
  golsCasa: number
  golsVisitante: number
  classificadoNosPenaltis?: string
}

interface JogoData {
  id: string
  numero: number
  fase: string
  grupo?: string | null
  timeCasa?: string
  timeVisitante?: string
  labelCasa?: string
  labelVisitante?: string
  encerrado?: boolean
  resultado?: ResultadoJogo | null
}

interface ClassificacaoTime {
  timeId: string
  pontos: number
  jogos: number
  vitorias: number
  empates: number
  derrotas: number
  golsMarcados: number
  golsSofridos: number
  saldoGols: number
  grupo: string
}

// ---- Classificacao do grupo (criterios FIFA: pontos, saldo, gols, mini-tabela) ----

// FIFA Article 13: pontos -> head-to-head (a/b/c) -> geral (d/e/f) -> ranking (skip).
// Ver detalhes em src/lib/classificacao.ts (este arquivo replica a logica).

function calcularClassificacaoGrupo(
  jogosGrupo: JogoData[],
  timesDoGrupo: string[],
  grupoLetra: string,
): ClassificacaoTime[] {
  const map = new Map<string, ClassificacaoTime>()
  for (const t of timesDoGrupo) {
    map.set(t, { timeId: t, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0,
      golsMarcados: 0, golsSofridos: 0, saldoGols: 0, grupo: grupoLetra })
  }

  for (const j of jogosGrupo) {
    if (!j.encerrado || !j.resultado || !j.timeCasa || !j.timeVisitante) continue
    const c = map.get(j.timeCasa); const v = map.get(j.timeVisitante)
    if (!c || !v) continue
    c.jogos++; v.jogos++
    c.golsMarcados += j.resultado.golsCasa; c.golsSofridos += j.resultado.golsVisitante
    v.golsMarcados += j.resultado.golsVisitante; v.golsSofridos += j.resultado.golsCasa
    if (j.resultado.golsCasa > j.resultado.golsVisitante) {
      c.pontos += 3; c.vitorias++; v.derrotas++
    } else if (j.resultado.golsCasa < j.resultado.golsVisitante) {
      v.pontos += 3; v.vitorias++; c.derrotas++
    } else { c.pontos++; v.pontos++; c.empates++; v.empates++ }
    c.saldoGols = c.golsMarcados - c.golsSofridos
    v.saldoGols = v.golsMarcados - v.golsSofridos
  }

  const lista = Array.from(map.values())
  lista.sort((a, b) => b.pontos - a.pontos)

  const resultado: ClassificacaoTime[] = []
  let i = 0
  while (i < lista.length) {
    let j = i + 1
    while (j < lista.length && lista[j].pontos === lista[i].pontos) j++
    const cluster = lista.slice(i, j)
    if (cluster.length === 1) resultado.push(cluster[0])
    else resultado.push(...resolverEmpate(cluster, jogosGrupo))
    i = j
  }
  return resultado
}

interface H2HStat { pontos: number; saldoGols: number; golsMarcados: number }

function calcularH2H(timeIds: string[], jogos: JogoData[]): Map<string, H2HStat> {
  const set = new Set(timeIds)
  const map = new Map<string, H2HStat>()
  for (const id of timeIds) map.set(id, { pontos: 0, saldoGols: 0, golsMarcados: 0 })
  for (const j of jogos) {
    if (!j.encerrado || !j.resultado || !j.timeCasa || !j.timeVisitante) continue
    if (!set.has(j.timeCasa) || !set.has(j.timeVisitante)) continue
    const c = map.get(j.timeCasa)!
    const v = map.get(j.timeVisitante)!
    c.golsMarcados += j.resultado.golsCasa
    c.saldoGols += j.resultado.golsCasa - j.resultado.golsVisitante
    v.golsMarcados += j.resultado.golsVisitante
    v.saldoGols += j.resultado.golsVisitante - j.resultado.golsCasa
    if (j.resultado.golsCasa > j.resultado.golsVisitante) c.pontos += 3
    else if (j.resultado.golsCasa < j.resultado.golsVisitante) v.pontos += 3
    else { c.pontos += 1; v.pontos += 1 }
  }
  return map
}

function mesmoH2H(a: H2HStat, b: H2HStat): boolean {
  return a.pontos === b.pontos && a.saldoGols === b.saldoGols && a.golsMarcados === b.golsMarcados
}

function resolverEmpate(empatados: ClassificacaoTime[], jogos: JogoData[]): ClassificacaoTime[] {
  if (empatados.length <= 1) return empatados
  const h2h = calcularH2H(empatados.map(t => t.timeId), jogos)
  const ord = [...empatados].sort((a, b) => {
    const sa = h2h.get(a.timeId)!
    const sb = h2h.get(b.timeId)!
    if (sb.pontos !== sa.pontos) return sb.pontos - sa.pontos
    if (sb.saldoGols !== sa.saldoGols) return sb.saldoGols - sa.saldoGols
    if (sb.golsMarcados !== sa.golsMarcados) return sb.golsMarcados - sa.golsMarcados
    return 0
  })

  const resultado: ClassificacaoTime[] = []
  let i = 0
  while (i < ord.length) {
    let j = i + 1
    const sa = h2h.get(ord[i].timeId)!
    while (j < ord.length && mesmoH2H(h2h.get(ord[j].timeId)!, sa)) j++
    const sub = ord.slice(i, j)
    if (sub.length === 1) resultado.push(sub[0])
    else if (sub.length === empatados.length) resultado.push(...aplicarCriteriosGerais(sub))
    else resultado.push(...resolverEmpate(sub, jogos))
    i = j
  }
  return resultado
}

function aplicarCriteriosGerais(empatados: ClassificacaoTime[]): ClassificacaoTime[] {
  return [...empatados].sort((a, b) => {
    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols
    if (b.golsMarcados !== a.golsMarcados) return b.golsMarcados - a.golsMarcados
    return a.timeId.localeCompare(b.timeId)
  })
}

// ---- Resolver labels para timeIds ----

interface ContextoResolver {
  classificacoesPorGrupo: Record<string, ClassificacaoTime[]>
  jogosByNumero: Map<number, JogoData>
}

function resolverGanhador(j: JogoData): string | null {
  if (!j.encerrado || !j.resultado || !j.timeCasa || !j.timeVisitante) return null
  if (j.resultado.golsCasa > j.resultado.golsVisitante) return j.timeCasa
  if (j.resultado.golsVisitante > j.resultado.golsCasa) return j.timeVisitante
  return j.resultado.classificadoNosPenaltis ?? null
}

function resolverPerdedor(j: JogoData): string | null {
  const w = resolverGanhador(j)
  if (!w || !j.timeCasa || !j.timeVisitante) return null
  return w === j.timeCasa ? j.timeVisitante : j.timeCasa
}

function resolverLabelSimples(label: string, ctx: ContextoResolver): string | null {
  const clean = label.trim().toUpperCase().replace(/\s+/g, '')

  // Posicao em grupo: 1A, 2B
  let m = clean.match(/^([12])([A-L])$/)
  if (m) {
    const pos = Number(m[1])
    const cl = ctx.classificacoesPorGrupo[m[2]]
    return cl && cl.length >= pos ? cl[pos - 1].timeId : null
  }

  // 3o de um grupo especifico (raro): 3A, 3B
  m = clean.match(/^3([A-L])$/)
  if (m) {
    const cl = ctx.classificacoesPorGrupo[m[1]]
    return cl && cl.length >= 3 ? cl[2].timeId : null
  }

  // Vencedor / perdedor de jogo
  m = clean.match(/^(W|L|RU)(\d+)$/)
  if (m) {
    const j = ctx.jogosByNumero.get(Number(m[2]))
    if (!j) return null
    return m[1] === 'W' ? resolverGanhador(j) : resolverPerdedor(j)
  }

  return null
}

// A atribuição dos 3º colocados aos slots (3XYZ) usa a tabela oficial FIFA das 495
// combinações, via montarTerceirosPorSlot (lib compartilhada) — fonte única com a página.

// ---- Callable principal ----

export const resolverMataMata = onCall(async (request) => {
  const callerUid = request.auth?.uid
  if (!callerUid) throw new HttpsError('unauthenticated', 'Não autenticado.')

  const db = admin.firestore()
  const callerSnap = await db.doc(`usuarios/${callerUid}`).get()
  if (callerSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores.')
  }

  const jogosSnap = await db.collection('jogos').get()
  const jogos: JogoData[] = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as JogoData))

  // Verificar se fase de grupos esta toda encerrada
  const grupos = jogos.filter(j => j.fase === 'grupos')
  const gruposEncerrados = grupos.filter(j => j.encerrado && j.resultado)
  if (gruposEncerrados.length < grupos.length) {
    return {
      ok: false,
      motivo: 'fase_grupos_incompleta',
      gruposEncerrados: gruposEncerrados.length,
      gruposTotal: grupos.length,
    }
  }

  // Calcular classificacoes por grupo
  const porGrupo: Record<string, JogoData[]> = {}
  for (const j of grupos) {
    const g = j.grupo ?? '?'
    if (!porGrupo[g]) porGrupo[g] = []
    porGrupo[g].push(j)
  }

  const classificacoesPorGrupo: Record<string, ClassificacaoTime[]> = {}
  for (const [g, lista] of Object.entries(porGrupo)) {
    const times = Array.from(new Set(lista.flatMap(j => [j.timeCasa, j.timeVisitante]).filter((x): x is string => !!x)))
    classificacoesPorGrupo[g] = calcularClassificacaoGrupo(lista, times, g)
  }

  // 8 melhores 3os — mesma seleção (desempate FIFA) usada pela página/snapshot.
  const terceiros = Object.values(classificacoesPorGrupo)
    .map(cl => cl[2])
    .filter((t): t is ClassificacaoTime => t != null)
  const melhoresTerceiros = selecionarMelhoresTerceiros(terceiros)

  const jogosByNumero = new Map<number, JogoData>(jogos.map(j => [j.numero, j]))

  const ctx: ContextoResolver = { classificacoesPorGrupo, jogosByNumero }

  // Atribuição dos slots de 3º (tabela oficial FIFA das 495 combinações) — fonte única.
  const fase32 = jogos.filter(j => j.fase === 'fase32')
  const terceirosPorSlot = montarTerceirosPorSlot(fase32, classificacoesPorGrupo, melhoresTerceiros)

  // Resolver e atualizar
  const mataMata = jogos.filter(j => j.fase !== 'grupos')
  let atualizados = 0
  let pendentes = 0
  const batch = db.batch()

  for (const j of mataMata) {
    const update: Record<string, string> = {}

    if (!j.timeCasa && j.labelCasa) {
      const slotKey = `${j.id}:casa`
      const fromSlot = terceirosPorSlot[slotKey]
      const id = fromSlot ?? resolverLabelSimples(j.labelCasa, ctx)
      if (id) update.timeCasa = id
    }
    if (!j.timeVisitante && j.labelVisitante) {
      const slotKey = `${j.id}:visitante`
      const fromSlot = terceirosPorSlot[slotKey]
      const id = fromSlot ?? resolverLabelSimples(j.labelVisitante, ctx)
      if (id) update.timeVisitante = id
    }

    if (Object.keys(update).length > 0) {
      batch.update(db.doc(`jogos/${j.id}`), update)
      atualizados++
    } else if ((!j.timeCasa && j.labelCasa) || (!j.timeVisitante && j.labelVisitante)) {
      pendentes++
    }
  }

  if (atualizados > 0) await batch.commit()

  return {
    ok: true,
    atualizados,
    pendentes,
    melhoresTerceirosIds: melhoresTerceiros.map(t => t.timeId),
  }
})
