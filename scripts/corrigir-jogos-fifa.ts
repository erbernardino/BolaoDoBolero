#!/usr/bin/env node
// scripts/corrigir-jogos-fifa.ts
//
// Atualiza os jogos da FASE DE GRUPOS no Firestore (in-place, preservando IDs),
// alinhando numero, dataHora, grupo, timeCasa e timeVisitante com a grade oficial
// da FIFA (docs/fifa-copa-2026-jogos.json). Também atualiza palpites quando
// casa/visitante forem invertidos para manter coerência do placar.
//
// Jogos de mata-mata NÃO são modificados nesta execução (requer análise separada
// do bracket 48-team).
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json \
//   PROJECT_ID=bolao-do-bolero-teste \
//   npx tsx scripts/corrigir-jogos-fifa.ts [--dry-run]

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

const PROJECT_ID = process.env.PROJECT_ID || 'bolao-do-bolero-teste'
const DRY_RUN = process.argv.includes('--dry-run')

type FifaMatch = {
  numero: number
  data: string
  horario: string
  fase: string
  grupo: string | null
  casa: string
  visitante: string
  estadio: string
  cidade: string
  matchId: string
  url: string
}

const NOME_ALIAS: Record<string, string> = {
  'República da Coreia': 'Coreia do Sul',
  'Tchéquia': 'República Tcheca',
  'EUA': 'Estados Unidos',
  'RI do Irã': 'Irã',
  'RD do Congo': 'RD Congo',
}

// Fuso horário do estádio em junho/julho 2026 (offset UTC)
const CIDADE_TZ_OFFSET: Record<string, number> = {
  'Cidade do México': -6,
  'Guadalajara': -6,
  'Monterrey': -6,
  'Toronto': -4,
  'Boston': -4,
  'Nova Iorque': -4,
  'Filadélfia': -4,
  'Miami': -4,
  'Atlanta': -4,
  'Houston': -5,
  'Dallas': -5,
  'Kansas City': -5,
  'Seattle': -7,
  'Los Angeles': -7,
  'Área da baía de São Francisco': -7,
  'Vancouver': -7,
}

function localToUtc(data: string, horario: string, offsetHours: number): Date {
  // data = YYYY-MM-DD local, horario = HH:MM local
  // UTC = local - offset (offset negativo → UTC = local + |offset|)
  const [y, m, d] = data.split('-').map(Number)
  const [hh, mm] = horario.split(':').map(Number)
  // constrói como se fosse UTC, depois desloca
  const localAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0)
  const utcMs = localAsUtcMs - offsetHours * 3600_000
  return new Date(utcMs)
}

function normalizeNome(n: string): string {
  return NOME_ALIAS[n] ?? n
}

async function main() {
  console.log(`\n=== Correção de jogos (fase de grupos) — projeto: ${PROJECT_ID} ===`)
  if (DRY_RUN) console.log('** DRY-RUN — nenhuma escrita será feita **')
  console.log()

  initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() })
  const db = getFirestore()

  const fifa: FifaMatch[] = JSON.parse(readFileSync('docs/fifa-copa-2026-jogos.json', 'utf8'))
  const fifaGrupos = fifa.filter(f => f.fase === 'Primeira fase')
  console.log(`FIFA: ${fifaGrupos.length} jogos de fase de grupos`)

  // Carrega times (id → nome)
  const timesSnap = await db.collection('times').get()
  const nomeToId = new Map<string, string>()
  for (const doc of timesSnap.docs) {
    const data = doc.data()
    nomeToId.set(data.nome, doc.id)
  }
  console.log(`Firestore: ${timesSnap.size} times carregados`)

  // Carrega jogos de grupo
  const jogosSnap = await db.collection('jogos').where('fase', '==', 'grupos').get()
  console.log(`Firestore: ${jogosSnap.size} jogos de fase de grupos`)

  // Build lookup: pair (set de 2 IDs) → docRef + doc data
  type JogoRec = {
    id: string
    data: FirebaseFirestore.DocumentData
    par: string // "idA|idB" ordenado
  }
  const byPair = new Map<string, JogoRec>()
  for (const doc of jogosSnap.docs) {
    const data = doc.data()
    const ids = [data.timeCasa, data.timeVisitante].sort()
    const par = ids.join('|')
    byPair.set(par, { id: doc.id, data, par })
  }

  let atualizados = 0
  let semMudanca = 0
  let naoEncontrados = 0
  let palpitesAjustados = 0

  for (const f of fifaGrupos) {
    const casaNome = normalizeNome(f.casa)
    const visNome = normalizeNome(f.visitante)
    const casaId = nomeToId.get(casaNome)
    const visId = nomeToId.get(visNome)

    if (!casaId || !visId) {
      console.log(`❌ Jogo ${f.numero}: times "${f.casa}"/"${f.visitante}" não encontrados`)
      naoEncontrados++
      continue
    }

    const par = [casaId, visId].sort().join('|')
    const rec = byPair.get(par)
    if (!rec) {
      console.log(`❌ Jogo ${f.numero} (${f.casa}×${f.visitante}): par não existe no Firestore`)
      naoEncontrados++
      continue
    }

    const offset = CIDADE_TZ_OFFSET[f.cidade] ?? -6
    const dataHora = localToUtc(f.data, f.horario, offset)

    const atual = rec.data
    const precisaAtualizar =
      atual.numero !== f.numero ||
      atual.timeCasa !== casaId ||
      atual.timeVisitante !== visId ||
      atual.grupo !== f.grupo ||
      !atual.dataHora ||
      (atual.dataHora.toDate?.() ?? new Date(atual.dataHora._seconds * 1000)).getTime() !== dataHora.getTime()

    if (!precisaAtualizar) {
      semMudanca++
      continue
    }

    const casaFlipou = atual.timeCasa !== casaId
    console.log(
      `🔄 Jogo ${f.numero} (${f.casa}×${f.visitante}, ${f.data} ${f.horario} ${f.cidade}):`,
      `  FS antes: numero=${atual.numero}, casa=${atual.timeCasa === casaId ? 'ok' : 'flip'}, grupo=${atual.grupo}`,
      `  → numero=${f.numero}, grupo=${f.grupo}, dataHora=${dataHora.toISOString()}`,
    )

    if (!DRY_RUN) {
      await db.collection('jogos').doc(rec.id).update({
        numero: f.numero,
        grupo: f.grupo,
        timeCasa: casaId,
        timeVisitante: visId,
        dataHora: Timestamp.fromDate(dataHora),
      })

      // Se invertemos casa/visitante, ajustar palpites
      if (casaFlipou) {
        const palpitesSnap = await db.collection('palpites').where('jogoId', '==', rec.id).get()
        for (const pDoc of palpitesSnap.docs) {
          const p = pDoc.data()
          await pDoc.ref.update({
            timeCasa: casaId,
            timeVisitante: visId,
            golsCasa: p.golsVisitante,
            golsVisitante: p.golsCasa,
          })
          palpitesAjustados++
        }
      }
    }
    atualizados++
  }

  console.log('\n=== Resumo ===')
  console.log(`Jogos atualizados:      ${atualizados}`)
  console.log(`Jogos já corretos:      ${semMudanca}`)
  console.log(`Jogos não encontrados:  ${naoEncontrados}`)
  console.log(`Palpites ajustados (swap casa↔visitante): ${palpitesAjustados}`)
  console.log(DRY_RUN ? '\n(dry-run — nada foi escrito)' : '\n✅ Atualização concluída')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
