import * as admin from 'firebase-admin'

/**
 * Busca tokens FCM de usuários específicos (por uid).
 * Se uids estiver vazio, retorna tokens de todos os usuários.
 */
async function getTokens(uids?: string[]): Promise<string[]> {
  const db = admin.firestore()
  const tokens: string[] = []

  if (uids && uids.length > 0) {
    // Buscar tokens dos usuários específicos
    for (const uid of uids) {
      const snap = await db.doc(`usuarios/${uid}`).get()
      const token = snap.data()?.fcmToken
      if (token) tokens.push(token)
    }
  } else {
    // Buscar tokens de todos
    const snap = await db.collection('usuarios').get()
    for (const doc of snap.docs) {
      const token = doc.data().fcmToken
      if (token) tokens.push(token)
    }
  }

  return tokens
}

/**
 * Envia notificação para todos os usuários.
 */
export async function enviarNotificacaoTodos(titulo: string, corpo: string) {
  const tokens = await getTokens()
  if (tokens.length === 0) return
  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: titulo, body: corpo },
  })
}

/**
 * Envia notificação para usuários específicos (por uid).
 */
export async function enviarNotificacaoParaUsuarios(titulo: string, corpo: string, uids: string[]) {
  const tokens = await getTokens(uids)
  if (tokens.length === 0) return
  await admin.messaging().sendEachForMulticast({
    tokens,
    notification: { title: titulo, body: corpo },
  })
}

export async function notificarResultadoRegistrado(jogoId: string) {
  const db = admin.firestore()
  const jogoSnap = await db.doc(`jogos/${jogoId}`).get()
  const jogo = jogoSnap.data()
  if (!jogo || !jogo.resultado) return
  const timesSnap = await Promise.all([
    db.doc(`times/${jogo.timeCasa}`).get(),
    db.doc(`times/${jogo.timeVisitante}`).get(),
  ])
  const nomeCasa = timesSnap[0].data()?.sigla || jogo.timeCasa
  const nomeVisitante = timesSnap[1].data()?.sigla || jogo.timeVisitante
  await enviarNotificacaoTodos(
    'Resultado registrado!',
    `${nomeCasa} ${jogo.resultado.golsCasa} x ${jogo.resultado.golsVisitante} ${nomeVisitante}`,
  )
}

export async function notificarRankingAtualizado() {
  await enviarNotificacaoTodos('Ranking atualizado!', 'Confira sua posição no ranking do Bolão do Bolero.')
}
