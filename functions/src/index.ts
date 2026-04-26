import * as admin from 'firebase-admin'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { recalcularTodoRanking } from './pontuacao'
export { backupFirestoreDiario } from './backup'
export { auditPalpites, auditPalpitesEspeciais, auditUsuarios, registrarLogin } from './audit'
export { resolverMataMata } from './resolverMataMata'

admin.initializeApp()

export const onJogoEncerrado = onDocumentUpdated('jogos/{jogoId}', async (event) => {
  const antes = event.data?.before.data()
  const depois = event.data?.after.data()
  if (!antes || !depois) return

  const resultadoMudou = JSON.stringify(antes.resultado ?? null) !== JSON.stringify(depois.resultado ?? null)
  const encerradoMudou = antes.encerrado !== depois.encerrado
  if (resultadoMudou || encerradoMudou) {
    await recalcularTodoRanking()
  }
})

export const recalcularRanking = onCall(async (request) => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Não autenticado.')

  const db = admin.firestore()
  const userSnap = await db.doc(`usuarios/${uid}`).get()
  if (userSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem recalcular o ranking.')
  }

  const recalculados = await recalcularTodoRanking()
  return { recalculados }
})

/**
 * Cloud Function callable pública que verifica se um telefone (E.164)
 * já está cadastrado em `usuarios`. Usada tanto no cadastro (para bloquear
 * duplicatas) quanto no login por SMS (para não criar conta Auth órfã
 * antes de saber se o usuário existe no bolão).
 * Aceita: { telefone }
 */
export const telefoneJaCadastrado = onCall(async (request) => {
  const { telefone } = request.data as { telefone?: string }
  if (!telefone || typeof telefone !== 'string') {
    throw new HttpsError('invalid-argument', 'telefone é obrigatório.')
  }
  const snap = await admin.firestore()
    .collection('usuarios')
    .where('telefone', '==', telefone)
    .limit(1)
    .get()
  return { existe: !snap.empty }
})

/**
 * Cloud Function callable para admin excluir um usuário.
 * Faz backup completo em `usuarios_excluidos/{uid}` antes de remover.
 * Aceita: { uid }
 */
export const excluirUsuario = onCall(async (request) => {
  const callerUid = request.auth?.uid
  if (!callerUid) throw new HttpsError('unauthenticated', 'Não autenticado.')

  const db = admin.firestore()
  const callerSnap = await db.doc(`usuarios/${callerUid}`).get()
  if (callerSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Apenas administradores podem excluir usuários.')
  }

  const { uid } = request.data as { uid?: string }
  if (!uid) throw new HttpsError('invalid-argument', 'uid é obrigatório.')
  if (uid === callerUid) throw new HttpsError('failed-precondition', 'Você não pode excluir sua própria conta.')

  const userRef = db.doc(`usuarios/${uid}`)
  const userSnap = await userRef.get()
  if (!userSnap.exists) throw new HttpsError('not-found', 'Usuário não encontrado.')

  const palpitesSnap = await db.collection('palpites').where('uid', '==', uid).get()
  const palpitesEspeciaisRef = db.doc(`palpites_especiais/${uid}`)
  const palpitesEspeciaisSnap = await palpitesEspeciaisRef.get()
  const rankingRef = db.doc(`ranking/${uid}`)
  const rankingSnap = await rankingRef.get()

  const backup = {
    uid,
    usuario: userSnap.data() ?? null,
    palpites: palpitesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    palpites_especiais: palpitesEspeciaisSnap.exists ? palpitesEspeciaisSnap.data() : null,
    ranking: rankingSnap.exists ? rankingSnap.data() : null,
    excluidoEm: admin.firestore.Timestamp.now(),
    excluidoPor: callerUid,
  }

  await db.doc(`usuarios_excluidos/${uid}`).set(backup)

  const batch = db.batch()
  palpitesSnap.docs.forEach(d => batch.delete(d.ref))
  if (palpitesEspeciaisSnap.exists) batch.delete(palpitesEspeciaisRef)
  if (rankingSnap.exists) batch.delete(rankingRef)
  batch.delete(userRef)
  await batch.commit()

  try {
    await admin.auth().deleteUser(uid)
  } catch (err: unknown) {
    const code = (err as { code?: string }).code
    if (code !== 'auth/user-not-found') throw err
  }

  return {
    ok: true,
    palpitesRemovidos: palpitesSnap.size,
    tinhaPalpitesEspeciais: palpitesEspeciaisSnap.exists,
    tinhaRanking: rankingSnap.exists,
  }
})
