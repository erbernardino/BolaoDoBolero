// scripts/backup-firestore.ts
// Dump local de TODO o Firestore de um projeto (colecoes de topo + subcolecoes),
// preservando tipos especiais (Timestamp, GeoPoint, DocumentReference).
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json \
//   npx tsx scripts/backup-firestore.ts <projectId>
//
// Saida: backups/<projectId>/<ISO-timestamp>.json

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp, GeoPoint, DocumentReference, type CollectionReference, type DocumentSnapshot } from 'firebase-admin/firestore'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

interface DumpedDoc {
  id: string
  data: Record<string, unknown>
  subcollections: Record<string, DumpedDoc[]>
}

function serializeValue(v: unknown): unknown {
  if (v === null || v === undefined) return v
  if (v instanceof Timestamp) return { __type: 'timestamp', seconds: v.seconds, nanoseconds: v.nanoseconds }
  if (v instanceof GeoPoint) return { __type: 'geopoint', latitude: v.latitude, longitude: v.longitude }
  if (v instanceof DocumentReference) return { __type: 'docref', path: v.path }
  if (Array.isArray(v)) return v.map(serializeValue)
  if (typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) out[k] = serializeValue(val)
    return out
  }
  return v
}

async function dumpCollection(ref: CollectionReference): Promise<DumpedDoc[]> {
  const snap = await ref.get()
  const docs: DumpedDoc[] = []
  for (const doc of snap.docs) {
    docs.push(await dumpDoc(doc))
  }
  return docs
}

async function dumpDoc(doc: DocumentSnapshot): Promise<DumpedDoc> {
  const data = serializeValue(doc.data() ?? {}) as Record<string, unknown>
  const subcollections: Record<string, DumpedDoc[]> = {}
  const subs = await doc.ref.listCollections()
  for (const sub of subs) {
    subcollections[sub.id] = await dumpCollection(sub)
  }
  return { id: doc.id, data, subcollections }
}

async function main() {
  const projectId = process.argv[2]
  if (!projectId) {
    console.error('Uso: npx tsx scripts/backup-firestore.ts <projectId>')
    process.exit(1)
  }

  initializeApp({ projectId })
  const db = getFirestore()

  console.log(`Projeto: ${projectId}`)
  console.log('Listando colecoes de topo...')
  const topCollections = await db.listCollections()
  console.log(`Encontradas ${topCollections.length} colecoes: ${topCollections.map(c => c.id).join(', ')}`)

  const backup: Record<string, DumpedDoc[]> = {}
  let totalDocs = 0
  for (const col of topCollections) {
    console.log(`  Lendo /${col.id}...`)
    const docs = await dumpCollection(col)
    backup[col.id] = docs
    totalDocs += docs.length
    const subDocs = docs.reduce((acc, d) => acc + Object.values(d.subcollections).reduce((a, s) => a + s.length, 0), 0)
    totalDocs += subDocs
    console.log(`    ${docs.length} docs${subDocs ? ` (+ ${subDocs} em subcolecoes)` : ''}`)
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outDir = path.resolve(process.cwd(), 'backups', projectId)
  mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `${timestamp}.json`)

  const payload = {
    projectId,
    exportedAt: new Date().toISOString(),
    totalDocs,
    collections: backup,
  }
  writeFileSync(outFile, JSON.stringify(payload, null, 2))
  console.log(`\nOK ${totalDocs} docs -> ${path.relative(process.cwd(), outFile)}`)
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
