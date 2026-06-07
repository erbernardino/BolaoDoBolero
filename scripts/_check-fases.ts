import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function main() {
  initializeApp({ projectId: process.env.PROJECT_ID || 'bolao-do-bolero-teste', credential: applicationDefault() })
  const db = getFirestore()
  const snap = await db.collection('jogos').get()
  const fases: Record<string, number> = {}
  snap.docs.forEach(d => {
    const f = d.data().fase || 'undefined'
    fases[f] = (fases[f] || 0) + 1
  })
  console.log('Jogos por fase:', JSON.stringify(fases, null, 2))

  const mataJogos = snap.docs.filter(d => d.data().fase !== 'grupos').slice(0, 3)
  console.log('\nExemplo jogo mata-mata:', mataJogos[0]?.data())

  const jogoId = mataJogos[0]?.id
  if (jogoId) {
    const pSnap = await db.collection('palpites').where('jogoId', '==', jogoId).get()
    console.log(`\nPalpites para jogo ${jogoId}: ${pSnap.size}`)
  }
}
main().catch(console.error)
