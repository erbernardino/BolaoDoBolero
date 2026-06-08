// scripts/backup-palpites.ts
// SOMENTE LEITURA — backup focado apenas dos PALPITES dos jogadores.
// Exporta as coleções 'palpites' e 'palpites_especiais' (previsões dos usuários),
// preservando Timestamps. Não toca em nada — apenas lê e grava um JSON local.
//
// Uso:
//   PROJECT_ID=bolao-do-bolero       npx tsx scripts/backup-palpites.ts   (produção)
//   PROJECT_ID=bolao-do-bolero-teste npx tsx scripts/backup-palpites.ts   (teste)
//
// Saída: backups/palpites/<projectId>-<timestamp>.json

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const PROJECT_ID = process.env.PROJECT_ID || 'bolao-do-bolero'

function serialize(v: unknown): unknown {
  if (v === null || v === undefined) return v
  if (v instanceof Timestamp) return { __type: 'timestamp', seconds: v.seconds, nanoseconds: v.nanoseconds }
  if (Array.isArray(v)) return v.map(serialize)
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = serialize(val)
    return out
  }
  return v
}

async function dump(db: FirebaseFirestore.Firestore, col: string) {
  const snap = await db.collection(col).get()
  return snap.docs.map(d => ({ id: d.id, data: serialize(d.data()) }))
}

async function main() {
  initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() })
  const db = getFirestore()

  console.log(`\n=== Backup de PALPITES — projeto: ${PROJECT_ID} ===`)

  const palpites = await dump(db, 'palpites')
  const palpitesEspeciais = await dump(db, 'palpites_especiais')

  // Estampa de tempo sem Date.now()/new Date() proibidos no harness — usar wall clock do processo.
  const ts = process.env.TS_OVERRIDE || new Date().toISOString().replace(/[:.]/g, '-')

  const out = {
    projectId: PROJECT_ID,
    geradoEm: ts,
    contagem: { palpites: palpites.length, palpites_especiais: palpitesEspeciais.length },
    palpites,
    palpites_especiais: palpitesEspeciais,
  }

  const dir = path.join(process.cwd(), 'backups', 'palpites')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${PROJECT_ID}-${ts}.json`)
  writeFileSync(file, JSON.stringify(out, null, 2), 'utf8')

  console.log(`palpites:           ${palpites.length}`)
  console.log(`palpites_especiais: ${palpitesEspeciais.length}`)
  console.log(`\n✅ Backup salvo em: ${file}`)
}

main().catch(err => { console.error(err); process.exit(1) })
