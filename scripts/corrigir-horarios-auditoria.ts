#!/usr/bin/env node
// scripts/corrigir-horarios-auditoria.ts
//
// Corrige os horários de todos os jogos no Firestore com base na auditoria
// docs/auditoria-horarios-copa2026.md. Os horários são expressos em BRT (UTC-3)
// e convertidos para UTC antes de gravar.
//
// Jogos com status ⚠️ (incertos) foram resolvidos e incluídos aqui.
// Jogos de mata-mata ainda incertos (Fox≠Sky sem confirmação) são ignorados.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json \
//   PROJECT_ID=bolao-do-bolero-teste \
//   npx tsx scripts/corrigir-horarios-auditoria.ts [--dry-run]

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROJECT_ID = process.env.PROJECT_ID || 'bolao-do-bolero-teste'
const DRY_RUN = process.argv.includes('--dry-run')

// Horários corretos em BRT (UTC-3). Formato: [numero, 'YYYY-MM-DD', 'HH:MM']
// Apenas jogos que precisam de correção (❌) ou que foram resolvidos (⚠️→confirmado).
// Jogos ✅ não estão listados (já corretos no Firestore).
// Jogos de mata-mata ainda incertos (⚠️ Fox≠Sky) também não estão listados.
const CORRECOES: Array<[number, string, string]> = [
  // FASE DE GRUPOS
  [1,  '2026-06-11', '16:00'],
  [2,  '2026-06-11', '23:00'],
  [3,  '2026-06-12', '16:00'],
  [5,  '2026-06-13', '22:00'],
  [7,  '2026-06-13', '19:00'],
  [9,  '2026-06-14', '20:00'],
  [10, '2026-06-14', '14:00'],
  [11, '2026-06-14', '17:00'],
  [12, '2026-06-14', '23:00'],
  [13, '2026-06-15', '19:00'],
  [14, '2026-06-15', '13:00'],
  [17, '2026-06-16', '16:00'],
  [18, '2026-06-16', '19:00'],
  [19, '2026-06-16', '22:00'],
  [21, '2026-06-17', '20:00'],
  [22, '2026-06-17', '17:00'],
  [23, '2026-06-17', '14:00'],
  [24, '2026-06-17', '23:00'],
  [25, '2026-06-18', '13:00'],
  [28, '2026-06-18', '22:00'],
  [29, '2026-06-19', '21:30'], // Brasil × Haiti — confirmado DAZN
  [30, '2026-06-19', '19:00'],
  [31, '2026-06-20', '01:00'],
  [33, '2026-06-20', '17:00'],
  [34, '2026-06-20', '21:00'],
  [35, '2026-06-20', '14:00'],
  [36, '2026-06-21', '01:00'],
  [37, '2026-06-21', '19:00'],
  [38, '2026-06-21', '13:00'],
  [41, '2026-06-22', '21:00'],
  [42, '2026-06-22', '18:00'],
  [43, '2026-06-22', '14:00'],
  [45, '2026-06-23', '17:00'],
  [46, '2026-06-23', '20:00'],
  [47, '2026-06-23', '14:00'],
  [48, '2026-06-23', '23:00'],
  [49, '2026-06-24', '19:00'],
  [50, '2026-06-24', '19:00'],
  [53, '2026-06-24', '22:00'],
  [54, '2026-06-24', '22:00'],
  [55, '2026-06-25', '17:00'],
  [56, '2026-06-25', '17:00'],
  [57, '2026-06-25', '20:00'],
  [58, '2026-06-25', '20:00'],
  [61, '2026-06-26', '16:00'],
  [62, '2026-06-26', '16:00'],
  [65, '2026-06-26', '21:00'],
  [66, '2026-06-26', '21:00'],
  [67, '2026-06-27', '18:00'],
  [68, '2026-06-27', '18:00'],
  [69, '2026-06-27', '23:00'],
  [70, '2026-06-27', '23:00'],
  [71, '2026-06-27', '20:30'],
  [72, '2026-06-27', '20:30'],

  // MATA-MATA — apenas confirmados (Fox=Sky ou pelo menos 2 fontes concordam)
  [86,  '2026-07-03', '19:00'],
  [91,  '2026-07-05', '17:00'],
  [93,  '2026-07-06', '16:00'],
  [95,  '2026-07-07', '13:00'],
  [97,  '2026-07-09', '17:00'],
  [99,  '2026-07-11', '18:00'],
  [101, '2026-07-14', '16:00'],
  [102, '2026-07-15', '16:00'],
  [103, '2026-07-18', '18:00'],
  [104, '2026-07-19', '16:00'],
]

function brtToUtc(dataBrt: string, horaBrt: string): Date {
  const [y, m, d] = dataBrt.split('-').map(Number)
  const [hh, mm] = horaBrt.split(':').map(Number)
  // BRT = UTC-3, então UTC = BRT + 3h
  return new Date(Date.UTC(y, m - 1, d, hh + 3, mm, 0))
}

async function main() {
  console.log(`\n=== Correção de horários (auditoria) — projeto: ${PROJECT_ID} ===`)
  if (DRY_RUN) console.log('** DRY-RUN — nenhuma escrita será feita **\n')
  else console.log()

  initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() })
  const db = getFirestore()

  const jogosSnap = await db.collection('jogos').get()
  const numToDoc = new Map<number, { id: string; dataHoraAtual: Date }>()
  for (const doc of jogosSnap.docs) {
    const data = doc.data()
    if (typeof data.numero === 'number') {
      const ts = data.dataHora?.toDate?.() ?? null
      numToDoc.set(data.numero, { id: doc.id, dataHoraAtual: ts })
    }
  }
  console.log(`Firestore: ${jogosSnap.size} jogos carregados\n`)

  let atualizados = 0
  let naoEncontrados = 0

  for (const correcao of CORRECOES) {
    const [numero, dataBrt, horaBrt] = correcao
    const rec = numToDoc.get(numero)
    if (!rec) {
      console.log(`⚠️  Jogo ${numero}: não encontrado no Firestore`)
      naoEncontrados++
      continue
    }

    const novaDataHora = brtToUtc(dataBrt, horaBrt)
    const atualMs = rec.dataHoraAtual?.getTime() ?? 0
    const novaMs = novaDataHora.getTime()

    const atualBrt = rec.dataHoraAtual
      ? new Date(atualMs - 3 * 3600_000).toISOString().slice(11, 16)
      : '??:??'

    if (atualMs === novaMs) {
      console.log(`✅ Jogo ${String(numero).padStart(3)} (${dataBrt}): ${horaBrt} BRT — já correto`)
      continue
    }

    console.log(`🔄 Jogo ${String(numero).padStart(3)} (${dataBrt}): ${atualBrt} → ${horaBrt} BRT  [doc: ${rec.id}]`)

    if (!DRY_RUN) {
      await db.collection('jogos').doc(rec.id).update({
        dataHora: Timestamp.fromDate(novaDataHora),
      })
    }
    atualizados++
  }

  console.log('\n=== Resumo ===')
  console.log(`Jogos atualizados:     ${atualizados}`)
  console.log(`Jogos não encontrados: ${naoEncontrados}`)
  if (DRY_RUN) console.log('\n(dry-run — nada foi escrito)')
  else console.log('\n✅ Atualização concluída')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
