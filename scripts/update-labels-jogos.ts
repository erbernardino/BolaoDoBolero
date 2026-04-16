import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const serviceAccount = require('../service-account.json')
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const labels: Record<string, { labelCasa: string; labelVisitante: string }> = {
  // Fase 32
  fase32_1:  { labelCasa: '2º Grupo A',  labelVisitante: '2º Grupo B' },
  fase32_2:  { labelCasa: '1º Grupo E',  labelVisitante: '3º dos Grupos A, B, C, D ou F' },
  fase32_3:  { labelCasa: '1º Grupo F',  labelVisitante: '2º Grupo C' },
  fase32_4:  { labelCasa: '1º Grupo C',  labelVisitante: '2º Grupo F' },
  fase32_5:  { labelCasa: '1º Grupo I',  labelVisitante: '3º dos Grupos C, D, F, G ou H' },
  fase32_6:  { labelCasa: '2º Grupo E',  labelVisitante: '2º Grupo I' },
  fase32_7:  { labelCasa: '1º Grupo A',  labelVisitante: '3º dos Grupos C, E, F, H ou I' },
  fase32_8:  { labelCasa: '1º Grupo L',  labelVisitante: '3º dos Grupos E, H, I, J ou K' },
  fase32_9:  { labelCasa: '1º Grupo D',  labelVisitante: '3º dos Grupos B, E, F, I ou J' },
  fase32_10: { labelCasa: '1º Grupo G',  labelVisitante: '3º dos Grupos A, E, H, I ou J' },
  fase32_11: { labelCasa: '2º Grupo K',  labelVisitante: '2º Grupo L' },
  fase32_12: { labelCasa: '1º Grupo H',  labelVisitante: '2º Grupo J' },
  fase32_13: { labelCasa: '1º Grupo B',  labelVisitante: '3º dos Grupos E, F, G, I ou J' },
  fase32_14: { labelCasa: '1º Grupo J',  labelVisitante: '2º Grupo H' },
  fase32_15: { labelCasa: '1º Grupo K',  labelVisitante: '3º dos Grupos D, E, I, J ou L' },
  fase32_16: { labelCasa: '2º Grupo D',  labelVisitante: '2º Grupo G' },
  // Oitavas
  oitavas_1: { labelCasa: 'Venc. Jogo 74', labelVisitante: 'Venc. Jogo 77' },
  oitavas_2: { labelCasa: 'Venc. Jogo 73', labelVisitante: 'Venc. Jogo 75' },
  oitavas_3: { labelCasa: 'Venc. Jogo 76', labelVisitante: 'Venc. Jogo 78' },
  oitavas_4: { labelCasa: 'Venc. Jogo 79', labelVisitante: 'Venc. Jogo 80' },
  oitavas_5: { labelCasa: 'Venc. Jogo 83', labelVisitante: 'Venc. Jogo 84' },
  oitavas_6: { labelCasa: 'Venc. Jogo 81', labelVisitante: 'Venc. Jogo 82' },
  oitavas_7: { labelCasa: 'Venc. Jogo 86', labelVisitante: 'Venc. Jogo 88' },
  oitavas_8: { labelCasa: 'Venc. Jogo 85', labelVisitante: 'Venc. Jogo 87' },
  // Quartas
  quartas_1: { labelCasa: 'Venc. Jogo 89', labelVisitante: 'Venc. Jogo 90' },
  quartas_2: { labelCasa: 'Venc. Jogo 93', labelVisitante: 'Venc. Jogo 94' },
  quartas_3: { labelCasa: 'Venc. Jogo 91', labelVisitante: 'Venc. Jogo 92' },
  quartas_4: { labelCasa: 'Venc. Jogo 95', labelVisitante: 'Venc. Jogo 96' },
  // Semis
  semi_1:    { labelCasa: 'Venc. Jogo 97', labelVisitante: 'Venc. Jogo 98' },
  semi_2:    { labelCasa: 'Venc. Jogo 99', labelVisitante: 'Venc. Jogo 100' },
  // Terceiro e Final
  terceiro_lugar: { labelCasa: 'Perd. Semi 1', labelVisitante: 'Perd. Semi 2' },
  final:          { labelCasa: 'Venc. Semi 1', labelVisitante: 'Venc. Semi 2' },
}

async function run() {
  const snap = await db.collection('jogos').get()
  const batch = db.batch()
  let updated = 0

  snap.forEach(docSnap => {
    const data = docSnap.data()
    const interno = data.id as string
    if (labels[interno]) {
      batch.update(docSnap.ref, labels[interno])
      updated++
    }
  })

  await batch.commit()
  console.log(`Atualizado ${updated} jogos com labelCasa/labelVisitante`)
}

run().catch(console.error)
