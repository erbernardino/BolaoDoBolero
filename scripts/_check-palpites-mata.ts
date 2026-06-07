import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

async function main() {
  initializeApp({ projectId: process.env.PROJECT_ID || 'bolao-do-bolero-teste', credential: applicationDefault() })
  const db = getFirestore()

  // Buscar todos palpites de mata-mata (jogoId não começa com grupos)
  const pSnap = await db.collection('palpites').get()
  const mataPalpites = pSnap.docs.filter(d => !d.data().jogoId?.match(/^[a-zA-Z0-9]{20}$/))
  console.log(`Total palpites: ${pSnap.size}`)
  console.log(`Palpites mata-mata (jogoId != hash): ${mataPalpites.length}`)
  mataPalpites.slice(0,5).forEach(d => console.log(' -', d.id, '→ jogoId:', d.data().jogoId, 'gols:', d.data().golsCasa, '-', d.data().golsVisitante))

  // Checar com um uid real
  const usuariosSnap = await db.collection('usuarios').limit(1).get()
  const uid = usuariosSnap.docs[0]?.id
  if (uid) {
    const userPalpites = pSnap.docs.filter(d => d.data().uid === uid)
    const userMata = userPalpites.filter(d => !d.data().jogoId?.match(/^[a-zA-Z0-9]{20}$/))
    console.log(`\nUsuário ${uid}: ${userPalpites.length} palpites total, ${userMata.length} mata-mata`)
  }
}
main().catch(console.error)
