// scripts/setup-admin-teste.ts
// Cria usuario admin no projeto bolao-do-bolero-teste (Auth + Firestore /usuarios/{uid})
// e garante que exista config/geral.
//
// Uso: npx tsx scripts/setup-admin-teste.ts
// Requer: gcloud auth application-default login

import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const PROJECT_ID = 'bolao-do-bolero-teste'

const ADMIN = {
  nome: 'Emerson Rocco Bernardino',
  apelido: 'Emerson',
  email: 'emerson.rocco@gmail.com',
  telefone: '+5511982666671',
}

initializeApp({ projectId: PROJECT_ID })
const auth = getAuth()
const db = getFirestore()

async function ensureAuthUser() {
  try {
    const existing = await auth.getUserByEmail(ADMIN.email)
    console.log(`Auth: usuario ja existe (uid=${existing.uid})`)
    const updated = await auth.updateUser(existing.uid, {
      phoneNumber: ADMIN.telefone,
      displayName: ADMIN.nome,
      emailVerified: true,
    })
    return updated.uid
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code
    if (code !== 'auth/user-not-found') throw err
  }
  const created = await auth.createUser({
    email: ADMIN.email,
    emailVerified: true,
    phoneNumber: ADMIN.telefone,
    displayName: ADMIN.nome,
  })
  console.log(`Auth: usuario criado (uid=${created.uid})`)
  return created.uid
}

async function ensureUsuarioDoc(uid: string) {
  const ref = db.doc(`usuarios/${uid}`)
  const snap = await ref.get()
  const base = {
    uid,
    nome: ADMIN.nome,
    apelido: ADMIN.apelido,
    email: ADMIN.email,
    telefone: ADMIN.telefone,
    role: 'admin' as const,
    liberado: true,
    conviteId: '',
  }
  if (snap.exists) {
    await ref.update(base)
    console.log('Firestore: usuarios/<uid> atualizado')
  } else {
    await ref.set({ ...base, criadoEm: Timestamp.now() })
    console.log('Firestore: usuarios/<uid> criado')
  }
}

async function ensureConfigGeral() {
  const ref = db.doc('config/geral')
  const snap = await ref.get()
  if (snap.exists) {
    console.log('Config: config/geral ja existe, mantida')
    return
  }
  await ref.set({
    pontos: { placarExato: 5, colunaCerta: 3, totalGols: 1, palpiteEspecial: 10 },
    premiacao: { primeiro: 50, segundo: 25, terceiro: 10, antepenultimo: 5, doacao: 10, taxaInscricao: 250 },
    prazoLimitePalpites: Timestamp.fromDate(new Date('2026-06-11T00:00:00Z')),
    visibilidadePalpites: 'apos_jogo',
    regrasPremiacao: '',
  })
  console.log('Config: config/geral criada (prazo 11/06/2026, taxa R$ 250)')
}

async function main() {
  console.log(`Projeto: ${PROJECT_ID}`)
  const uid = await ensureAuthUser()
  await ensureUsuarioDoc(uid)
  await ensureConfigGeral()
  console.log('Pronto.')
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
