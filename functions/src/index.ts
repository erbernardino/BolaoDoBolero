import * as admin from 'firebase-admin'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { processarResultadoJogo } from './pontuacao'

admin.initializeApp()

export const onJogoEncerrado = onDocumentUpdated('jogos/{jogoId}', async (event) => {
  const antes = event.data?.before.data()
  const depois = event.data?.after.data()
  if (!antes || !depois) return
  if (!antes.encerrado && depois.encerrado && depois.resultado) {
    await processarResultadoJogo(event.params.jogoId)
  }
})
