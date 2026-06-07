#!/usr/bin/env node
// scripts/corrigir-mata-mata-fifa.ts
//
// Atualiza os 32 jogos de mata-mata no Firestore (in-place, preservando IDs):
// - numero, dataHora, fase, grupo=null
// - labelCasa/labelVisitante com os códigos FIFA ("1A", "2B", "3EFGIJ", "W73", "L101")
// - timeCasa/timeVisitante limpos (resolvidos depois da fase de grupos)
// - origemCasa/origemVisitante setados para null (deprecated nesta abordagem)
//
// Também apaga palpites referenciando os jogos de mata-mata (placares prévios
// perdem sentido já que os times serão resolvidos só após a fase de grupos).
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json \
//   PROJECT_ID=bolao-do-bolero-teste \
//   npx tsx scripts/corrigir-mata-mata-fifa.ts [--dry-run]

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
  isMataMata: boolean
}

const FASE_FIFA_TO_FS: Record<string, string> = {
  'Segundas de final': 'fase32',
  'Oitavas de final': 'oitavas',
  'Quartas de final': 'quartas',
  'Semifinal': 'semi',
  'Decisão do 3º lugar': 'terceiro',
  'Final': 'final',
}

const CIDADE_TZ_OFFSET: Record<string, number> = {
  'Cidade do México': -6, 'Guadalajara': -6, 'Monterrey': -6,
  'Toronto': -4, 'Boston': -4, 'Nova Iorque': -4,
  'Filadélfia': -4, 'Miami': -4, 'Atlanta': -4,
  'Houston': -5, 'Dallas': -5, 'Kansas City': -5,
  'Seattle': -7, 'Los Angeles': -7, 'Área da baía de São Francisco': -7, 'Vancouver': -7,
}

function localToUtc(data: string, horario: string, offsetHours: number): Date {
  const [y, m, d] = data.split('-').map(Number)
  const [hh, mm] = horario.split(':').map(Number)
  const localAsUtcMs = Date.UTC(y, m - 1, d, hh, mm, 0)
  return new Date(localAsUtcMs - offsetHours * 3600_000)
}

async function main() {
  console.log(`\n=== Correção mata-mata — projeto: ${PROJECT_ID} ===`)
  if (DRY_RUN) console.log('** DRY-RUN — nenhuma escrita será feita **')
  console.log()

  initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() })
  const db = getFirestore()

  const fifa: FifaMatch[] = JSON.parse(readFileSync('docs/fifa-copa-2026-jogos.json', 'utf8'))
  const fifaMata = fifa.filter(f => f.isMataMata).sort((a, b) => a.numero - b.numero)
  console.log(`FIFA: ${fifaMata.length} jogos de mata-mata (${fifaMata[0]?.numero}-${fifaMata[fifaMata.length-1]?.numero})`)

  // Fetch all non-grupos jogos
  const jogosSnap = await db.collection('jogos').where('fase', '!=', 'grupos').get()
  const jogosMata = jogosSnap.docs.sort((a, b) => (a.data().numero || 0) - (b.data().numero || 0))
  console.log(`Firestore: ${jogosMata.length} jogos de mata-mata`)

  if (jogosMata.length !== fifaMata.length) {
    console.error(`⚠️ Contagem diverge: Firestore=${jogosMata.length}, FIFA=${fifaMata.length}`)
    console.log('Prosseguindo mesmo assim — atualizando o menor dos dois conjuntos em ordem.')
  }

  const n = Math.min(jogosMata.length, fifaMata.length)
  let atualizados = 0
  let palpitesDeletados = 0

  for (let i = 0; i < n; i++) {
    const jogoDoc = jogosMata[i]
    const f = fifaMata[i]
    const atual = jogoDoc.data()

    const offset = CIDADE_TZ_OFFSET[f.cidade] ?? -5
    const dataHora = localToUtc(f.data, f.horario, offset)
    const faseFS = FASE_FIFA_TO_FS[f.fase]
    if (!faseFS) {
      console.error(`❌ Fase FIFA "${f.fase}" sem mapeamento`)
      continue
    }

    console.log(
      `🔄 Jogo ${f.numero} (${f.casa}×${f.visitante}, ${f.data} ${f.horario} ${f.cidade}) — ${f.fase}`,
      `   FS antes: numero=${atual.numero}, fase=${atual.fase}`,
      `   → numero=${f.numero}, fase=${faseFS}, labels=${f.casa}/${f.visitante}`,
    )

    if (!DRY_RUN) {
      await jogoDoc.ref.update({
        numero: f.numero,
        fase: faseFS,
        grupo: null,
        dataHora: Timestamp.fromDate(dataHora),
        timeCasa: '',
        timeVisitante: '',
        labelCasa: f.casa,
        labelVisitante: f.visitante,
        origemCasa: null,
        origemVisitante: null,
      })

      // Remove palpites deste jogo (placar prévio sobre mata-mata agora inválido)
      const palpitesSnap = await db.collection('palpites').where('jogoId', '==', jogoDoc.id).get()
      for (const p of palpitesSnap.docs) {
        await p.ref.delete()
        palpitesDeletados++
      }
    }
    atualizados++
  }

  console.log('\n=== Resumo ===')
  console.log(`Jogos mata-mata atualizados: ${atualizados}`)
  console.log(`Palpites de mata-mata deletados: ${palpitesDeletados}`)
  console.log(DRY_RUN ? '\n(dry-run — nada foi escrito)' : '\n✅ Atualização concluída')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
