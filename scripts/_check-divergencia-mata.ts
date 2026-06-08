// SOMENTE LEITURA — diagnóstico. Não escreve nada.
// Verifica, para TODOS os usuários e TODOS os jogos de mata-mata, os casos em que
// o time gravado no palpite (palpite.timeCasa/timeVisitante) diverge do time
// resolvido pelo bracket ao vivo (mesma condição do alerta amarelo da tela).
//
// Uso:
//   PROJECT_ID=bolao-do-bolero-teste npx tsx scripts/_check-divergencia-mata.ts
//   PROJECT_ID=bolao-do-bolero       npx tsx scripts/_check-divergencia-mata.ts

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { calcularClassificacaoGrupo } from '../src/lib/classificacao'
import { selecionarMelhoresTerceiros } from '../src/lib/melhoresTerceiros'
import {
  montarTerceirosPorSlot,
  resolverTimeMataMataPersonalizado,
} from '../src/lib/chaveamento'
import type { ClassificacaoTime, Palpite } from '../src/types'

const PROJECT_ID = process.env.PROJECT_ID || 'bolao-do-bolero-teste'

async function main() {
  initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() })
  const db = getFirestore()

  const [jogosSnap, timesSnap, gruposSnap, palpitesSnap, usuariosSnap, desempatesSnap] = await Promise.all([
    db.collection('jogos').get(),
    db.collection('times').get(),
    db.collection('grupos').get(),
    db.collection('palpites').get(),
    db.collection('usuarios').get(),
    db.collection('desempates_terceiros').get(),
  ])

  const todos = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
  const nomeTime = new Map<string, string>()
  timesSnap.docs.forEach(d => nomeTime.set(d.id, (d.data() as any).nome ?? (d.data() as any).sigla ?? d.id))
  const grupos = gruposSnap.docs.map(d => ({ id: d.id, ...d.data() } as any))
  const nomeUsuario = new Map<string, string>()
  usuariosSnap.docs.forEach(d => {
    const u = d.data() as any
    nomeUsuario.set(d.id, u.apelido || u.nome || d.id)
  })
  const disciplinaresPorUid = new Map<string, Record<string, number>>()
  desempatesSnap.docs.forEach(d => disciplinaresPorUid.set(d.id, (d.data() as any).pontosDisciplinares ?? {}))

  const jogosGrupos = todos.filter(j => j.fase === 'grupos')
  const jogosFase32 = todos.filter(j => j.fase === 'fase32')
  const jogosMata = todos.filter(j => j.fase !== 'grupos').sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))

  // Palpites agrupados por uid
  const porUid = new Map<string, Map<string, Palpite>>()
  palpitesSnap.docs.forEach(d => {
    const p = { id: d.id, ...d.data() } as Palpite
    if (!porUid.has(p.uid)) porUid.set(p.uid, new Map())
    porUid.get(p.uid)!.set(p.jogoId, p)
  })

  const fn = (id: string | null | undefined) => (id ? (nomeTime.get(id) ?? id) : '—')

  console.log(`\n=== Divergência palpite vs bracket — projeto: ${PROJECT_ID} ===`)
  console.log(`Usuários: ${usuariosSnap.size} | Jogos mata-mata: ${jogosMata.length} | Palpites totais: ${palpitesSnap.size}\n`)

  let totalDivergencias = 0
  const porJogoNumero = new Map<number, number>()
  const usuariosAfetados = new Set<string>()

  for (const [uid, palpitesMap] of porUid) {
    // ---- replica o load() do PalpitesMataMata para este usuário ----
    const palpitesPorJogoId: Record<string, Palpite> = {}
    palpitesMap.forEach((p, jogoId) => { palpitesPorJogoId[jogoId] = p })

    const classPorGrupo: Record<string, ClassificacaoTime[]> = {}
    for (const grupo of grupos) {
      const letra = grupo.nome.replace('Grupo ', '')
      const jogosDoGrupo = jogosGrupos.filter(j => j.grupo === letra)
      const palpitesGrupo = jogosDoGrupo
        .map(j => palpitesMap.get(j.id))
        .filter((p): p is Palpite => p !== undefined)
      if (palpitesGrupo.length === jogosDoGrupo.length && jogosDoGrupo.length > 0) {
        classPorGrupo[letra] = calcularClassificacaoGrupo(palpitesGrupo, grupo.times)
      }
    }

    const todosGruposCompletos = grupos.every(g => {
      const letra = g.nome.replace('Grupo ', '')
      return classPorGrupo[letra] !== undefined
    })
    const terceiros = todosGruposCompletos
      ? Object.entries(classPorGrupo)
        .map(([grupo, cl]) => cl[2] ? { ...cl[2], grupo } : null)
        .filter((item): item is ClassificacaoTime & { grupo: string } => item !== null)
      : []
    const melhoresTerceiros = selecionarMelhoresTerceiros(terceiros, disciplinaresPorUid.get(uid) ?? {})

    const terceirosPorSlot = montarTerceirosPorSlot(jogosFase32, classPorGrupo, melhoresTerceiros)

    // ---- compara cada jogo de mata-mata ----
    const divergenciasUsuario: string[] = []
    for (const jogo of jogosMata) {
      const palpite = palpitesMap.get(jogo.id)
      if (!palpite) continue // sem palpite → sem alerta

      const casaId = resolverTimeMataMataPersonalizado({
        origem: jogo.origemCasa ?? null,
        label: jogo.labelCasa,
        slotKey: `${jogo.id}:casa`,
        classificacoesPorGrupo: classPorGrupo,
        palpitesPorJogoId,
        melhoresTerceiros,
        terceirosPorSlot,
        jogos: todos,
        fallbackTimeId: jogo.timeCasa || undefined,
      })
      const visitanteId = resolverTimeMataMataPersonalizado({
        origem: jogo.origemVisitante ?? null,
        label: jogo.labelVisitante,
        slotKey: `${jogo.id}:visitante`,
        classificacoesPorGrupo: classPorGrupo,
        palpitesPorJogoId,
        melhoresTerceiros,
        terceirosPorSlot,
        jogos: todos,
        fallbackTimeId: jogo.timeVisitante || undefined,
      })

      const casaMudou = !!casaId && palpite.timeCasa !== casaId
      const visitanteMudou = !!visitanteId && palpite.timeVisitante !== visitanteId

      if (casaMudou || visitanteMudou) {
        totalDivergencias++
        usuariosAfetados.add(uid)
        porJogoNumero.set(jogo.numero, (porJogoNumero.get(jogo.numero) ?? 0) + 1)
        const partes: string[] = []
        if (casaMudou) partes.push(`casa: gravado "${fn(palpite.timeCasa)}" → bracket "${fn(casaId)}"`)
        if (visitanteMudou) partes.push(`visit: gravado "${fn(palpite.timeVisitante)}" → bracket "${fn(visitanteId)}"`)
        divergenciasUsuario.push(
          `   Jogo ${jogo.numero} [${jogo.fase}] ${palpite.golsCasa}x${palpite.golsVisitante} — ${partes.join(' | ')}`
        )
      }
    }

    if (divergenciasUsuario.length) {
      console.log(`👤 ${nomeUsuario.get(uid) ?? uid} (${divergenciasUsuario.length} divergência(s)):`)
      divergenciasUsuario.forEach(l => console.log(l))
      console.log()
    }
  }

  console.log('=== Resumo ===')
  console.log(`Total de divergências: ${totalDivergencias}`)
  console.log(`Usuários afetados: ${usuariosAfetados.size}`)
  if (porJogoNumero.size) {
    console.log('Por jogo (numero → qtd usuários):')
    ;[...porJogoNumero.entries()].sort((a, b) => a[0] - b[0]).forEach(([n, q]) => console.log(`   Jogo ${n}: ${q}`))
  }
}

main().catch(err => { console.error(err); process.exit(1) })
