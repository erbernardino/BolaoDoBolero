// scripts/atualizar-versao-app.ts
//
// Atualiza o doc /config/app_version com o SHA atual do HEAD do git e o
// timestamp do deploy. Os clients escutam esse doc e mostram o banner
// "Nova versao disponivel" assim que ele muda.
//
// Uso:
//   GOOGLE_APPLICATION_CREDENTIALS=~/.config/gcloud/application_default_credentials.json \
//   npx tsx scripts/atualizar-versao-app.ts <bolao-do-bolero|bolao-do-bolero-teste>
//
// Idealmente roda como ultimo passo do deploy (depois de hosting + rules +
// functions, para que o doc so vire o gatilho da atualizacao quando o JS
// novo ja estiver disponivel).

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { execSync } from 'node:child_process'

function gitShortSha(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return `build-${Date.now()}`
  }
}

async function main() {
  const projectId = process.argv[2]
  if (!projectId) {
    console.error('Uso: npx tsx scripts/atualizar-versao-app.ts <projectId>')
    console.error('Ex: npx tsx scripts/atualizar-versao-app.ts bolao-do-bolero-teste')
    process.exit(1)
  }
  if (projectId !== 'bolao-do-bolero' && projectId !== 'bolao-do-bolero-teste') {
    console.error(`projectId inesperado: "${projectId}". Use bolao-do-bolero ou bolao-do-bolero-teste.`)
    process.exit(1)
  }

  initializeApp({ projectId })
  const db = getFirestore()

  const build = gitShortSha()
  const deployedAt = Timestamp.now()
  const atualizadoPor = process.env.USER || process.env.LOGNAME || 'desconhecido'

  await db.doc('config/app_version').set({
    build,
    deployedAt,
    atualizadoPor,
  })

  console.log(`OK: config/app_version atualizado em ${projectId}`)
  console.log(`     build=${build}`)
  console.log(`     deployedAt=${deployedAt.toDate().toISOString()}`)
  console.log(`     atualizadoPor=${atualizadoPor}`)
}

main().catch((err) => {
  console.error('Falha ao atualizar config/app_version:', err)
  process.exit(1)
})
