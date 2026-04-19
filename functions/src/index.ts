import * as admin from 'firebase-admin'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { processarResultadoJogo } from './pontuacao'
import { notificarResultadoRegistrado, notificarRankingAtualizado, enviarNotificacaoTodos, enviarNotificacaoParaUsuarios } from './notificacoes'
export { backupFirestoreDiario } from './backup'

admin.initializeApp()

export const onJogoEncerrado = onDocumentUpdated('jogos/{jogoId}', async (event) => {
  const antes = event.data?.before.data()
  const depois = event.data?.after.data()
  if (!antes || !depois) return
  if (!antes.encerrado && depois.encerrado && depois.resultado) {
    await processarResultadoJogo(event.params.jogoId)
    await notificarResultadoRegistrado(event.params.jogoId)
    await notificarRankingAtualizado()
  }
})

/**
 * Cloud Function callable para admin enviar notificações.
 * Aceita: { titulo, corpo, uids? }
 * - uids vazio ou ausente = envia para todos
 * - uids com lista = envia para os específicos
 */
export const enviarNotificacao = onCall(async (request) => {
  // Verificar se é admin
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Não autenticado.')

  const db = admin.firestore()
  const userSnap = await db.doc(`usuarios/${uid}`).get()
  if (userSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem enviar notificações.')
  }

  const { titulo, corpo, uids } = request.data as {
    titulo?: string
    corpo?: string
    uids?: string[]
  }

  if (!titulo || !corpo) {
    throw new HttpsError('invalid-argument', 'Título e corpo são obrigatórios.')
  }

  if (uids && uids.length > 0) {
    await enviarNotificacaoParaUsuarios(titulo, corpo, uids)
    return { enviados: uids.length, tipo: 'selecionados' }
  } else {
    await enviarNotificacaoTodos(titulo, corpo)
    return { tipo: 'todos' }
  }
})
