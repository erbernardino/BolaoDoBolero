// scripts/criar-admin-testes.ts
// Cria usuario "ADM Testes" no bolao-do-bolero-teste (Auth + Firestore) com email/senha
// e registra o telefone como numero de teste (bypassa SMS real).
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json \
//   npx tsx scripts/criar-admin-testes.ts

import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { GoogleAuth } from 'google-auth-library'

const PROJECT_ID = 'bolao-do-bolero-teste'

const ADMIN = {
  nome: 'ADM Testes',
  apelido: 'ADM Testes',
  email: 'adm@bolao.com.br',
  senha: 'bolao123',
  telefone: '+5599999999999',
  codigoSmsTeste: '123456',
}

initializeApp({ projectId: PROJECT_ID, credential: applicationDefault() })
const auth = getAuth()
const db = getFirestore()

async function ensureAuthUser(): Promise<string> {
  try {
    const existing = await auth.getUserByEmail(ADMIN.email)
    console.log(`Auth: usuario ja existia (uid=${existing.uid}) — atualizando dados`)
    const updated = await auth.updateUser(existing.uid, {
      password: ADMIN.senha,
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
    password: ADMIN.senha,
    phoneNumber: ADMIN.telefone,
    displayName: ADMIN.nome,
  })
  console.log(`Auth: usuario criado (uid=${created.uid})`)
  return created.uid
}

async function ensureUsuarioDoc(uid: string): Promise<void> {
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

async function ensureTestPhoneNumber(): Promise<void> {
  // A API Identity Toolkit Admin aceita testPhoneNumbers via PATCH /admin/v2/projects/{id}/config,
  // mas o SDK firebase-admin nao expoe esse campo. Vamos chamar o REST direto.
  const googleAuth = new GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  const client = await googleAuth.getClient()
  const baseUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${PROJECT_ID}/config`

  const current = await client.request<{ signIn?: { phoneNumber?: { testPhoneNumbers?: Record<string, string> } } }>({
    url: baseUrl,
    method: 'GET',
  })
  const atuais = current.data.signIn?.phoneNumber?.testPhoneNumbers ?? {}
  const merged: Record<string, string> = { ...atuais, [ADMIN.telefone]: ADMIN.codigoSmsTeste }

  await client.request({
    url: `${baseUrl}?updateMask=signIn.phoneNumber.testPhoneNumbers`,
    method: 'PATCH',
    data: {
      signIn: { phoneNumber: { testPhoneNumbers: merged } },
    },
  })
  console.log(`Auth: numero de teste registrado (${ADMIN.telefone} -> codigo ${ADMIN.codigoSmsTeste})`)
}

async function main() {
  console.log(`Projeto: ${PROJECT_ID}`)
  await ensureTestPhoneNumber()
  const uid = await ensureAuthUser()
  await ensureUsuarioDoc(uid)
  console.log('Pronto.')
}

main().catch((err) => {
  console.error('Erro:', err)
  process.exit(1)
})
