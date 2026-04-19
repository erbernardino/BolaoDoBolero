// scripts/copiar-catalogo-prod-para-teste.ts
// Copia as colecoes de catalogo (times, grupos, jogos, config) de bolao-do-bolero
// para bolao-do-bolero-teste. Sobrescreve docs com o mesmo id.
//
// Uso:
//   npx tsx scripts/copiar-catalogo-prod-para-teste.ts             # DRY-RUN
//   npx tsx scripts/copiar-catalogo-prod-para-teste.ts --execute
//
// Requer ADC: gcloud auth application-default login.

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

const PROD = 'bolao-do-bolero'
const TESTE = 'bolao-do-bolero-teste'
const COLECOES = ['times', 'grupos', 'jogos', 'config']
const DRY_RUN = !process.argv.includes('--execute')

const prodApp = initializeApp({ projectId: PROD }, 'prod')
const testeApp = initializeApp({ projectId: TESTE }, 'teste')
const prodDb = getFirestore(prodApp)
const testeDb = getFirestore(testeApp)

async function copiarColecao(nome: string, src: Firestore, dst: Firestore): Promise<number> {
  const snap = await src.collection(nome).get()
  console.log(`/${nome}: ${snap.size} docs a copiar`)
  if (DRY_RUN || snap.empty) return snap.size

  let batch = dst.batch()
  let count = 0
  let total = 0
  for (const doc of snap.docs) {
    batch.set(dst.collection(nome).doc(doc.id), doc.data(), { merge: false })
    count++
    if (count >= 400) {
      await batch.commit()
      total += count
      batch = dst.batch()
      count = 0
    }
  }
  if (count > 0) {
    await batch.commit()
    total += count
  }
  return total
}

async function main() {
  console.log(`Origem: ${PROD}`)
  console.log(`Destino: ${TESTE}`)
  console.log(`Colecoes: ${COLECOES.join(', ')}`)
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (nada sera escrito no teste)' : 'EXECUTAR COPIA'}`)
  console.log('---')

  const resumo: Record<string, number> = {}
  for (const nome of COLECOES) {
    resumo[nome] = await copiarColecao(nome, prodDb, testeDb)
  }

  console.log('---')
  console.log(`Resumo ${DRY_RUN ? '(simulacao)' : '(executado)'}:`)
  for (const [nome, qtd] of Object.entries(resumo)) {
    console.log(`  /${nome}: ${qtd} docs`)
  }
  if (DRY_RUN) {
    console.log('\nSe estiver tudo certo, rode de novo com --execute.')
  }
}

main().catch((err) => { console.error('Erro:', err); process.exit(1) })
