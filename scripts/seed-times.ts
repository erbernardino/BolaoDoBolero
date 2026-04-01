import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

initializeApp({
  projectId: 'bolao-do-bolero',
})

const db = getFirestore()

interface Time {
  nome: string
  sigla: string
  bandeira: string
  grupo: string
  confederacao: string
}

function bandeira(countryCode: string): string {
  return `https://flagcdn.com/w80/${countryCode.toLowerCase()}.png`
}

const times: Time[] = [
  // Grupo A
  { nome: 'Marrocos', sigla: 'MAR', bandeira: bandeira('ma'), grupo: 'A', confederacao: 'CAF' },
  { nome: 'Brasil', sigla: 'BRA', bandeira: bandeira('br'), grupo: 'A', confederacao: 'CONMEBOL' },
  { nome: 'Peru', sigla: 'PER', bandeira: bandeira('pe'), grupo: 'A', confederacao: 'CONMEBOL' },
  { nome: 'Nova Zelândia', sigla: 'NZL', bandeira: bandeira('nz'), grupo: 'A', confederacao: 'OFC' },

  // Grupo B
  { nome: 'Portugal', sigla: 'POR', bandeira: bandeira('pt'), grupo: 'B', confederacao: 'UEFA' },
  { nome: 'México', sigla: 'MEX', bandeira: bandeira('mx'), grupo: 'B', confederacao: 'CONCACAF' },
  { nome: 'Equador', sigla: 'ECU', bandeira: bandeira('ec'), grupo: 'B', confederacao: 'CONMEBOL' },
  { nome: 'Arábia Saudita', sigla: 'KSA', bandeira: bandeira('sa'), grupo: 'B', confederacao: 'AFC' },

  // Grupo C
  { nome: 'Argentina', sigla: 'ARG', bandeira: bandeira('ar'), grupo: 'C', confederacao: 'CONMEBOL' },
  { nome: 'Espanha', sigla: 'ESP', bandeira: bandeira('es'), grupo: 'C', confederacao: 'UEFA' },
  { nome: 'Chile', sigla: 'CHI', bandeira: bandeira('cl'), grupo: 'C', confederacao: 'CONMEBOL' },
  { nome: 'Uzbequistão', sigla: 'UZB', bandeira: bandeira('uz'), grupo: 'C', confederacao: 'AFC' },

  // Grupo D
  { nome: 'França', sigla: 'FRA', bandeira: bandeira('fr'), grupo: 'D', confederacao: 'UEFA' },
  { nome: 'Colômbia', sigla: 'COL', bandeira: bandeira('co'), grupo: 'D', confederacao: 'CONMEBOL' },
  { nome: 'Costa Rica', sigla: 'CRC', bandeira: bandeira('cr'), grupo: 'D', confederacao: 'CONCACAF' },
  { nome: 'Austrália', sigla: 'AUS', bandeira: bandeira('au'), grupo: 'D', confederacao: 'AFC' },

  // Grupo E
  { nome: 'Japão', sigla: 'JPN', bandeira: bandeira('jp'), grupo: 'E', confederacao: 'AFC' },
  { nome: 'Holanda', sigla: 'NED', bandeira: bandeira('nl'), grupo: 'E', confederacao: 'UEFA' },
  { nome: 'Senegal', sigla: 'SEN', bandeira: bandeira('sn'), grupo: 'E', confederacao: 'CAF' },
  { nome: 'Irã', sigla: 'IRN', bandeira: bandeira('ir'), grupo: 'E', confederacao: 'AFC' },

  // Grupo F
  { nome: 'Coreia do Sul', sigla: 'KOR', bandeira: bandeira('kr'), grupo: 'F', confederacao: 'AFC' },
  { nome: 'Alemanha', sigla: 'GER', bandeira: bandeira('de'), grupo: 'F', confederacao: 'UEFA' },
  { nome: 'Uruguai', sigla: 'URU', bandeira: bandeira('uy'), grupo: 'F', confederacao: 'CONMEBOL' },
  { nome: 'China', sigla: 'CHN', bandeira: bandeira('cn'), grupo: 'F', confederacao: 'AFC' },

  // Grupo G
  { nome: 'Inglaterra', sigla: 'ENG', bandeira: bandeira('gb-eng'), grupo: 'G', confederacao: 'UEFA' },
  { nome: 'Bélgica', sigla: 'BEL', bandeira: bandeira('be'), grupo: 'G', confederacao: 'UEFA' },
  { nome: 'RD Congo', sigla: 'COD', bandeira: bandeira('cd'), grupo: 'G', confederacao: 'CAF' },
  { nome: 'Honduras', sigla: 'HON', bandeira: bandeira('hn'), grupo: 'G', confederacao: 'CONCACAF' },

  // Grupo H
  { nome: 'Itália', sigla: 'ITA', bandeira: bandeira('it'), grupo: 'H', confederacao: 'UEFA' },
  { nome: 'Canadá', sigla: 'CAN', bandeira: bandeira('ca'), grupo: 'H', confederacao: 'CONCACAF' },
  { nome: 'Tunísia', sigla: 'TUN', bandeira: bandeira('tn'), grupo: 'H', confederacao: 'CAF' },
  { nome: 'Camarões', sigla: 'CMR', bandeira: bandeira('cm'), grupo: 'H', confederacao: 'CAF' },

  // Grupo I
  { nome: 'Croácia', sigla: 'CRO', bandeira: bandeira('hr'), grupo: 'I', confederacao: 'UEFA' },
  { nome: 'Sérvia', sigla: 'SRB', bandeira: bandeira('rs'), grupo: 'I', confederacao: 'UEFA' },
  { nome: 'Bolívia', sigla: 'BOL', bandeira: bandeira('bo'), grupo: 'I', confederacao: 'CONMEBOL' },
  { nome: 'Panamá', sigla: 'PAN', bandeira: bandeira('pa'), grupo: 'I', confederacao: 'CONCACAF' },

  // Grupo J
  { nome: 'Dinamarca', sigla: 'DEN', bandeira: bandeira('dk'), grupo: 'J', confederacao: 'UEFA' },
  { nome: 'Suíça', sigla: 'SUI', bandeira: bandeira('ch'), grupo: 'J', confederacao: 'UEFA' },
  { nome: 'África do Sul', sigla: 'RSA', bandeira: bandeira('za'), grupo: 'J', confederacao: 'CAF' },
  { nome: 'Nigéria', sigla: 'NGA', bandeira: bandeira('ng'), grupo: 'J', confederacao: 'CAF' },

  // Grupo K
  { nome: 'Estados Unidos', sigla: 'USA', bandeira: bandeira('us'), grupo: 'K', confederacao: 'CONCACAF' },
  { nome: 'Catar', sigla: 'QAT', bandeira: bandeira('qa'), grupo: 'K', confederacao: 'AFC' },
  { nome: 'Gana', sigla: 'GHA', bandeira: bandeira('gh'), grupo: 'K', confederacao: 'CAF' },
  { nome: 'Paraguai', sigla: 'PAR', bandeira: bandeira('py'), grupo: 'K', confederacao: 'CONMEBOL' },

  // Grupo L
  { nome: 'Egito', sigla: 'EGY', bandeira: bandeira('eg'), grupo: 'L', confederacao: 'CAF' },
  { nome: 'Ucrânia', sigla: 'UKR', bandeira: bandeira('ua'), grupo: 'L', confederacao: 'UEFA' },
  { nome: 'Turquia', sigla: 'TUR', bandeira: bandeira('tr'), grupo: 'L', confederacao: 'UEFA' },
  { nome: 'País de Gales', sigla: 'WAL', bandeira: bandeira('gb-wls'), grupo: 'L', confederacao: 'UEFA' },
]

async function deleteCollection(collectionName: string): Promise<void> {
  console.log(`Deletando coleção "${collectionName}"...`)
  const snapshot = await db.collection(collectionName).get()
  const batch = db.batch()
  snapshot.docs.forEach((doc) => batch.delete(doc.ref))
  await batch.commit()
  console.log(`Coleção "${collectionName}" limpa (${snapshot.size} documentos deletados).`)
}

async function seed(): Promise<void> {
  console.log('Iniciando seed dos times e grupos da Copa do Mundo 2026...\n')

  // Limpa as coleções existentes
  await deleteCollection('times')
  await deleteCollection('grupos')

  // Mapa: grupo -> lista de IDs dos times
  const grupoTimesMap: Record<string, string[]> = {}

  // Cria os times
  console.log('\nCriando 48 times...')
  for (const time of times) {
    const docRef = await db.collection('times').add(time)
    console.log(`  [${time.grupo}] ${time.nome} (${time.sigla}) -> ${docRef.id}`)

    if (!grupoTimesMap[time.grupo]) {
      grupoTimesMap[time.grupo] = []
    }
    grupoTimesMap[time.grupo].push(docRef.id)
  }

  // Cria os grupos
  console.log('\nCriando 12 grupos...')
  for (const [letra, timeIds] of Object.entries(grupoTimesMap).sort()) {
    const grupo = {
      nome: `Grupo ${letra}`,
      times: timeIds,
    }
    const docRef = await db.collection('grupos').add(grupo)
    console.log(`  Grupo ${letra} -> ${docRef.id} (${timeIds.length} times)`)
  }

  console.log('\nSeed concluído com sucesso!')
  console.log(`  48 times criados`)
  console.log(`  12 grupos criados`)
}

seed().catch((err) => {
  console.error('Erro durante o seed:', err)
  process.exit(1)
})
