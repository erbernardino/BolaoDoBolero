import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function main() {
  initializeApp({ projectId: process.env.PROJECT_ID!, credential: applicationDefault() })
  const db = getFirestore()

  const usuariosSnap = await db.collection('usuarios').get()
  const palpitesSnap = await db.collection('palpites').get()

  // Jogos mata-mata
  const jogosSnap = await db.collection('jogos').where('fase', '!=', 'grupos').get()
  const mataIds = new Set(jogosSnap.docs.map(d => d.id))
  console.log(`Jogos mata-mata: ${mataIds.size}`)

  // Palpites mata-mata por usuário
  const palpitesPorUid: Record<string, number> = {}
  for (const p of palpitesSnap.docs) {
    const data = p.data()
    if (mataIds.has(data.jogoId)) {
      palpitesPorUid[data.uid] = (palpitesPorUid[data.uid] || 0) + 1
    }
  }

  console.log('\nUsuários e palpites mata-mata:')
  for (const u of usuariosSnap.docs) {
    const d = u.data()
    const nome = d.apelido || d.nome || u.id
    const count = palpitesPorUid[u.id] || 0
    console.log(`  ${nome.padEnd(25)} ${count} / ${mataIds.size}  ${count === 0 ? '❌ nenhum' : count < mataIds.size ? '⚠️ incompleto' : '✅'}`)
  }
}
main().catch(console.error)
