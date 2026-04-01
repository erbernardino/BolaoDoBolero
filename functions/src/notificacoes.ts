import * as admin from 'firebase-admin'

export async function enviarNotificacaoTodos(titulo: string, corpo: string) {
  const db = admin.firestore()
  const usuariosSnap = await db.collection('usuarios').get()
  const tokens: string[] = []
  for (const doc of usuariosSnap.docs) {
    const data = doc.data()
    if (data.fcmToken) tokens.push(data.fcmToken)
  }
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
