// scripts/update-numero-jogos.ts
// Atribui o número oficial FIFA (Jogo 1 a Jogo 104) a cada jogo no Firestore.
// Fase de grupos: ordenados por data (1-72)
// Mata-mata: mapeamento fixo baseado no bracket oficial (73-104)

import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({ projectId: 'bolao-do-bolero' })
const db = getFirestore()

// Mapeamento fixo dos jogos de mata-mata (IDs do documento → número FIFA)
const KNOCKOUT_NUMBERS: Record<string, number> = {
  fase32_1: 73,
  fase32_2: 74,
  fase32_3: 75,
  fase32_4: 76,
  fase32_5: 77,
  fase32_6: 78,
  fase32_7: 79,
  fase32_8: 80,
  fase32_9: 81,
  fase32_10: 82,
  fase32_11: 83,
  fase32_12: 84,
  fase32_13: 85,
  fase32_14: 86,
  fase32_15: 87,
  fase32_16: 88,
  oitavas_1: 89,
  oitavas_2: 90,
  oitavas_3: 91,
  oitavas_4: 92,
  oitavas_5: 93,
  oitavas_6: 94,
  oitavas_7: 95,
  oitavas_8: 96,
  quartas_1: 97,
  quartas_2: 98,
  quartas_3: 99,
  quartas_4: 100,
  semi_1: 101,
  semi_2: 102,
  terceiro_lugar: 103,
  final: 104,
}

async function main() {
  const snapshot = await db.collection('jogos').get()
  console.log(`Total de jogos encontrados: ${snapshot.size}`)

  const grupoGames: { id: string; dataHora: FirebaseFirestore.Timestamp }[] = []
  const knockoutGames: { id: string; numero: number }[] = []

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.fase === 'grupos') {
      grupoGames.push({ id: doc.id, dataHora: data.dataHora })
    } else {
      const numero = KNOCKOUT_NUMBERS[doc.id]
      if (numero) {
        knockoutGames.push({ id: doc.id, numero })
      } else {
        console.warn(`  Jogo de mata-mata sem número mapeado: ${doc.id}`)
      }
    }
  }

  // Ordenar jogos de grupo por data
  grupoGames.sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())

  console.log(`\nJogos de grupos: ${grupoGames.length}`)
  console.log(`Jogos de mata-mata: ${knockoutGames.length}`)

  // Atualizar em batches
  const batch = db.batch()
  let count = 0

  // Fase de grupos: 1-72
  for (let i = 0; i < grupoGames.length; i++) {
    const numero = i + 1
    batch.update(db.doc(`jogos/${grupoGames[i].id}`), { numero })
    console.log(`  Jogo ${numero}: ${grupoGames[i].id}`)
    count++
  }

  // Mata-mata: 73-104
  for (const { id, numero } of knockoutGames) {
    batch.update(db.doc(`jogos/${id}`), { numero })
    console.log(`  Jogo ${numero}: ${id}`)
    count++
  }

  await batch.commit()
  console.log(`\n${count} jogos atualizados com sucesso!`)
}

main().catch(console.error)
