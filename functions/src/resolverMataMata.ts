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
  lista.sort(compararCriteriosGerais)
  return aplicarMiniTabelaEntreEmpatados(lista, jogosGrupo)
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

function aplicarMiniTabelaEntreEmpatados(
  lista: ClassificacaoTime[],
  jogosGrupo: JogoData[],
): ClassificacaoTime[] {
  const r = [...lista]
  let i = 0
  while (i < r.length) {
    let j = i + 1
    while (j < r.length && mesmosCriteriosGerais(r[i], r[j])) j++
    if (j - i > 1) {
      const empatados = r.slice(i, j).map(t => t.timeId)
      const ordemMini = ordenarPorMiniTabela(empatados, jogosGrupo)
      const porId = new Map(r.map(t => [t.timeId, t]))
      for (let k = 0; k < ordemMini.length; k++) {
        const original = porId.get(ordemMini[k])
        if (original) r[i + k] = original
      }
    }
    i = j
  }
  return r
}

function ordenarPorMiniTabela(times: string[], jogos: JogoData[]): string[] {
  const setT = new Set(times)
  const stat = new Map<string, ClassificacaoTime>()
  for (const t of times) stat.set(t, { timeId: t, pontos: 0, jogos: 0, vitorias: 0, empates: 0, derrotas: 0, golsMarcados: 0, golsSofridos: 0, saldoGols: 0, grupo: '' })

  for (const j of jogos) {
    if (!j.encerrado || !j.resultado || !j.timeCasa || !j.timeVisitante) continue
    if (!setT.has(j.timeCasa) || !setT.has(j.timeVisitante)) continue
    const c = stat.get(j.timeCasa)!; const v = stat.get(j.timeVisitante)!
    c.golsMarcados += j.resultado.golsCasa; c.golsSofridos += j.resultado.golsVisitante
    v.golsMarcados += j.resultado.golsVisitante; v.golsSofridos += j.resultado.golsCasa
    if (j.resultado.golsCasa > j.resultado.golsVisitante) { c.pontos += 3 }
    else if (j.resultado.golsCasa < j.resultado.golsVisitante) { v.pontos += 3 }
    else { c.pontos++; v.pontos++ }
    c.saldoGols = c.golsMarcados - c.golsSofridos
    v.saldoGols = v.golsMarcados - v.golsSofridos
  }

  return Array.from(stat.values()).sort(compararCriteriosGerais).map(t => t.timeId)
}

// ---- Comparador de 3os colocados (FIFA) ----
function compararTerceiros(a: ClassificacaoTime, b: ClassificacaoTime): number {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos
  if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols
  if (b.golsMarcados !== a.golsMarcados) return b.golsMarcados - a.golsMarcados
  if (a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo)
  return a.timeId.localeCompare(b.timeId)
}

// ---- Resolver labels para timeIds ----

interface ContextoResolver {
  classificacoesPorGrupo: Record<string, ClassificacaoTime[]>
  melhoresTerceiros: ClassificacaoTime[]
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

// Slots de "3o de um conjunto de grupos": atribuicao via bipartite matching greedy
// usando a ordem dos melhoresTerceiros.
interface SlotTerceiro { jogoId: string; lado: 'casa' | 'visitante'; gruposPermitidos: string[] }

function montarMapaTerceirosPorSlot(
  jogosFase32: JogoData[],
  ctx: ContextoResolver,
): Map<string, string> {
  const slots: SlotTerceiro[] = []
  const jogosOrdenados = [...jogosFase32].sort((a, b) => a.numero - b.numero)
  for (const j of jogosOrdenados) {
    for (const lado of ['casa', 'visitante'] as const) {
      const label = (lado === 'casa' ? j.labelCasa : j.labelVisitante)?.trim().toUpperCase().replace(/\s+/g, '')
      const m = label?.match(/^3([A-L]+)$/)
      if (!m || m[1].length < 2) continue
      slots.push({ jogoId: j.id, lado, gruposPermitidos: m[1].split('') })
    }
  }

  const melhoresIds = new Set(ctx.melhoresTerceiros.map(t => t.timeId))
  const ranking = new Map(ctx.melhoresTerceiros.map((t, i) => [t.timeId, i]))
  const terceirosPorGrupo = new Map<string, ClassificacaoTime>()
  for (const [grupo, cl] of Object.entries(ctx.classificacoesPorGrupo)) {
    const t = cl[2]
    if (t && melhoresIds.has(t.timeId)) terceirosPorGrupo.set(grupo, t)
  }

  const out = new Map<string, string>()
  const usados = new Set<string>()

  function tentar(idx: number): boolean {
    if (idx >= slots.length) return true
    const s = slots[idx]
    const candidatos = s.gruposPermitidos
      .map(g => terceirosPorGrupo.get(g))
      .filter((t): t is ClassificacaoTime => t != null && !usados.has(t.timeId))
      .sort((a, b) => (ranking.get(a.timeId) ?? 999) - (ranking.get(b.timeId) ?? 999))

    for (const c of candidatos) {
      out.set(`${s.jogoId}:${s.lado}`, c.timeId)
      usados.add(c.timeId)
      if (tentar(idx + 1)) return true
      usados.delete(c.timeId)
      out.delete(`${s.jogoId}:${s.lado}`)
    }
    return false
  }

  tentar(0)
  return out
}

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

  // 8 melhores 3os
  const terceiros = Object.values(classificacoesPorGrupo)
    .map(cl => cl[2])
    .filter((t): t is ClassificacaoTime => t != null)
    .sort(compararTerceiros)
  const melhoresTerceiros = terceiros.slice(0, 8)

  const jogosByNumero = new Map<number, JogoData>(jogos.map(j => [j.numero, j]))

  const ctx: ContextoResolver = { classificacoesPorGrupo, melhoresTerceiros, jogosByNumero }

  // Atribuicao dos slots de 3o-em-conjunto-de-grupos (so fase32)
  const fase32 = jogos.filter(j => j.fase === 'fase32')
  const terceirosPorSlot = montarMapaTerceirosPorSlot(fase32, ctx)

  // Resolver e atualizar
  const mataMata = jogos.filter(j => j.fase !== 'grupos')
  let atualizados = 0
  let pendentes = 0
  const batch = db.batch()

  for (const j of mataMata) {
    const update: Record<string, string> = {}

    if (!j.timeCasa && j.labelCasa) {
      const slotKey = `${j.id}:casa`
      const fromSlot = terceirosPorSlot.get(slotKey)
      const id = fromSlot ?? resolverLabelSimples(j.labelCasa, ctx)
      if (id) update.timeCasa = id
    }
    if (!j.timeVisitante && j.labelVisitante) {
      const slotKey = `${j.id}:visitante`
      const fromSlot = terceirosPorSlot.get(slotKey)
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
