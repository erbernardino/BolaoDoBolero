import * as admin from 'firebase-admin'

/**
 * Busca UIDs e tokens FCM.
 * Se uids fornecido, retorna só esses. Senão, retorna todos.
 */
async function getDestinatarios(uids?: string[]): Promise<{ uid: string; token: string | null }[]> {
  const db = admin.firestore()
  const result: { uid: string; token: string | null }[] = []

  if (uids && uids.length > 0) {
    for (const uid of uids) {
      const snap = await db.doc(`usuarios/${uid}`).get()
      result.push({ uid, token: snap.data()?.fcmToken || null })
    }
  } else {
    const snap = await db.collection('usuarios').get()
    for (const doc of snap.docs) {
      result.push({ uid: doc.id, token: doc.data().fcmToken || null })
    }
  }

  return result
}

/**
 * Salva notificação no histórico de cada usuário.
 */
async function salvarHistorico(titulo: string, corpo: string, destinatarios: { uid: string }[]) {
  const db = admin.firestore()
  const batch = db.batch()
  const agora = admin.firestore.Timestamp.now()

  for (const { uid } of destinatarios) {
    const ref = db.collection('notificacoes_usuario').doc(uid).collection('items').doc()
    batch.set(ref, {
      titulo,
      corpo,
      lida: false,
      criadoEm: agora,
    })
  }

  await batch.commit()
}

/**
 * Envia push + salva no histórico para todos.
 */
export async function enviarNotificacaoTodos(titulo: string, corpo: string) {
  const destinatarios = await getDestinatarios()
  const tokens = destinatarios.map(d => d.token).filter(Boolean) as string[]

  if (tokens.length > 0) {
    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: titulo, body: corpo },
    })
    console.log(`[Notificação] Todos - Sucesso: ${result.successCount}, Falhas: ${result.failureCount}`)
  }

  await salvarHistorico(titulo, corpo, destinatarios)
}

/**
 * Envia push + salva no histórico para usuários específicos.
 */
export async function enviarNotificacaoParaUsuarios(titulo: string, corpo: string, uids: string[]) {
  const destinatarios = await getDestinatarios(uids)
  const tokens = destinatarios.map(d => d.token).filter(Boolean) as string[]

  if (tokens.length > 0) {
    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: { title: titulo, body: corpo },
    })
    console.log(`[Notificação] ${uids.length} uids - Sucesso: ${result.successCount}, Falhas: ${result.failureCount}`)
  }

  await salvarHistorico(titulo, corpo, destinatarios)
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
  await enviarNotificacaoTodos('Ranking atualizado!', 'Confira sua posição no ranking do Bolão do Bolero (Duda).')
}
