// scripts/setup-admin.ts
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

initializeApp({ projectId: 'bolao-do-bolero' })
const db = getFirestore()

async function main() {
  const email = process.argv[2]
  if (!email) {
    console.error('Uso: npx tsx scripts/setup-admin.ts <email>')
    process.exit(1)
  }

  // Find user by email
  const snapshot = await db.collection('usuarios').where('email', '==', email).get()

  if (snapshot.empty) {
    console.log(`Usuário com email ${email} não encontrado. Criando documento...`)
    // Create a placeholder - user will need to login first
    console.log('O usuário precisa fazer login primeiro para aparecer no Firestore.')
    console.log('Após o login, rode este script novamente.')

    // Alternative: search in all users and show them
    const allUsers = await db.collection('usuarios').get()
    if (allUsers.empty) {
      console.log('Nenhum usuário cadastrado ainda.')
    } else {
      console.log('\nUsuários existentes:')
      allUsers.forEach(doc => {
        const data = doc.data()
        console.log(`  - ${data.email} (${data.nome}) [${data.role}]`)
      })
    }
  } else {
    const userDoc = snapshot.docs[0]
    await userDoc.ref.update({ role: 'admin' })
    console.log(`✓ ${email} agora é admin!`)
  }

  // Create initial config
  const configRef = db.doc('config/geral')
  const configSnap = await configRef.get()
  if (!configSnap.exists) {
    await configRef.set({
      pontos: { placarExato: 5, colunaCerta: 3, totalGols: 1, palpiteEspecial: 10 },
      premiacao: { primeiro: 50, segundo: 25, terceiro: 10, antepenultimo: 5, doacao: 10, taxaInscricao: 200 },
      prazoLimitePalpites: Timestamp.fromDate(new Date('2026-06-11T00:00:00Z')),
      visibilidadePalpites: 'apos_jogo',
      regrasPremiacao: '',
    })
    console.log('✓ Config inicial criada (prazo: 11/06/2026)')
  } else {
    console.log('Config já existe, mantida.')
  }
}

main().catch(console.error)
