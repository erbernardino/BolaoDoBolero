// scripts/limpar-prod.ts
// Reseta o projeto bolao-do-bolero para o estado "pronto para a Copa", removendo
// palpites, palpites_especiais, ranking e usuarios (Auth + Firestore), exceto os
// 3 emails protegidos. Tambem limpa resultado e encerrado de todos os jogos.
//
// Preserva: /jogos (catalogo), /times, /grupos, /config, /chat, /convites,
//           /notificacoes_usuario (0 docs).
//
// Uso:
//   npx tsx scripts/limpar-prod.ts             # DRY-RUN: so mostra o que apagaria
//   npx tsx scripts/limpar-prod.ts --execute   # executa de verdade

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const PROJECT_ID = 'bolao-do-bolero'
const EMAILS_PROTEGIDOS = new Set([
  'cacavivi@uol.com.br',
  'cyrosoldani@gmail.com',
  'emerson.rocco@gmail.com',
])

const DRY_RUN = !process.argv.includes('--execute')

initializeApp({ projectId: PROJECT_ID })
const db = getFirestore()
const auth = getAuth()

async function apagarColecao(nome: string, executarDelete: () => Promise<number>): Promise<number> {
  const snap = await db.collection(nome).get()
  console.log(`/${nome}: ${snap.size} docs`)
  if (snap.empty) return 0
  if (DRY_RUN) return snap.size
  return executarDelete()
}

async function bulkDelete(collectionName: string): Promise<number> {
  const snap = await db.collection(collectionName).get()
  let deleted = 0
  let batch = db.batch()
  let count = 0
  for (const doc of snap.docs) {
    batch.delete(doc.ref)
    count++
    if (count >= 400) {
      await batch.commit()
      deleted += count
      batch = db.batch()
      count = 0
    }
  }
  if (count > 0) {
    await batch.commit()
    deleted += count
  }
  return deleted
}

async function limparResultadosJogos(): Promise<number> {
  const snap = await db.collection('jogos').get()
  const jogosComResultado = snap.docs.filter(d => {
    const data = d.data()
    return data.resultado != null || data.encerrado === true
  })
  console.log(`/jogos com resultado ou encerrado=true: ${jogosComResultado.length} / ${snap.size}`)
  if (DRY_RUN || jogosComResultado.length === 0) return jogosComResultado.length
  let batch = db.batch()
  let count = 0
  let touched = 0
  for (const doc of jogosComResultado) {
    batch.update(doc.ref, { resultado: FieldValue.delete(), encerrado: false })
    count++
    if (count >= 400) {
      await batch.commit()
      touched += count
      batch = db.batch()
      count = 0
    }
  }
  if (count > 0) {
    await batch.commit()
    touched += count
  }
  return touched
}

async function limparUsuarios(): Promise<{ firestore: number; auth: number; protegidos: string[] }> {
  const snap = await db.collection('usuarios').get()
  const paraApagar: { uid: string; email: string }[] = []
  const protegidos: string[] = []
  for (const doc of snap.docs) {
    const email = (doc.data().email as string | undefined) ?? ''
    if (EMAILS_PROTEGIDOS.has(email)) {
      protegidos.push(`${email} (uid=${doc.id})`)
    } else {
      paraApagar.push({ uid: doc.id, email })
    }
  }
  console.log(`/usuarios: ${paraApagar.length} para apagar, ${protegidos.length} protegidos`)
  for (const p of protegidos) console.log(`  PROTEGIDO: ${p}`)
  for (const u of paraApagar) console.log(`  APAGAR: ${u.email} (uid=${u.uid})`)

  if (DRY_RUN) {
    return { firestore: paraApagar.length, auth: paraApagar.length, protegidos }
  }

  // Firestore: deletar em batch
  let firestoreDeleted = 0
  let batch = db.batch()
  let count = 0
  for (const { uid } of paraApagar) {
    batch.delete(db.doc(`usuarios/${uid}`))
    count++
    if (count >= 400) {
      await batch.commit()
      firestoreDeleted += count
      batch = db.batch()
      count = 0
    }
  }
  if (count > 0) {
    await batch.commit()
    firestoreDeleted += count
  }

  // Auth: deletar em lotes de ate 1000 com auth.deleteUsers
  let authDeleted = 0
  const uids = paraApagar.map(u => u.uid)
  for (let i = 0; i < uids.length; i += 1000) {
    const lote = uids.slice(i, i + 1000)
    const result = await auth.deleteUsers(lote)
    authDeleted += result.successCount
    for (const err of result.errors) {
      const code = (err.error as { code?: string }).code
      if (code !== 'auth/user-not-found') {
        console.warn(`  ! Falhou deletar Auth uid=${lote[err.index]}: ${err.error.message}`)
      }
    }
  }
  return { firestore: firestoreDeleted, auth: authDeleted, protegidos }
}

async function main() {
  console.log(`Projeto: ${PROJECT_ID}`)
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (nada sera alterado)' : 'EXECUTAR DELETE'}`)
  console.log(`Emails protegidos: ${[...EMAILS_PROTEGIDOS].join(', ')}`)
  console.log('---')

  const palpites = await apagarColecao('palpites', () => bulkDelete('palpites'))
  const especiais = await apagarColecao('palpites_especiais', () => bulkDelete('palpites_especiais'))
  const ranking = await apagarColecao('ranking', () => bulkDelete('ranking'))
  const jogosLimpos = await limparResultadosJogos()
  const usuarios = await limparUsuarios()

  console.log('---')
  console.log(`Resumo ${DRY_RUN ? '(simulacao)' : '(executado)'}:`)
  console.log(`  palpites apagados:              ${palpites}`)
  console.log(`  palpites_especiais apagados:    ${especiais}`)
  console.log(`  ranking apagados:               ${ranking}`)
  console.log(`  jogos com resultado limpo:      ${jogosLimpos}`)
  console.log(`  usuarios apagados (Firestore):  ${usuarios.firestore}`)
  console.log(`  usuarios apagados (Auth):       ${usuarios.auth}`)
  console.log(`  usuarios protegidos:            ${usuarios.protegidos.length}`)
  if (DRY_RUN) {
    console.log('\nSe estiver tudo certo, rode de novo com --execute.')
  }
}

main().catch((err) => { console.error('Erro:', err); process.exit(1) })
