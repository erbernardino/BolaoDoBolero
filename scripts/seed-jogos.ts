// scripts/seed-jogos.ts
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

initializeApp({ projectId: 'bolao-do-bolero' })
const db = getFirestore()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Fase = 'grupos' | 'fase32' | 'oitavas' | 'quartas' | 'semi' | 'terceiro' | 'final'

interface OrigemGrupo {
  tipo: 'grupo'
  grupo: string
  posicao: number
}

interface OrigemJogo {
  tipo: 'jogo'
  jogoId: string
  resultado: 'vencedor' | 'perdedor'
}

type Origem = OrigemGrupo | OrigemJogo

interface Jogo {
  fase: Fase
  grupo: string | null
  timeCasa: string
  timeVisitante: string
  origemCasa: Origem | null
  origemVisitante: Origem | null
  dataHora: Timestamp
  resultado: null
  encerrado: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(isoStr: string): Timestamp {
  return Timestamp.fromDate(new Date(isoStr))
}

async function deleteCollection(collectionName: string): Promise<void> {
  console.log(`Deletando coleção "${collectionName}"...`)
  const snapshot = await db.collection(collectionName).get()
  if (snapshot.empty) {
    console.log(`  Coleção "${collectionName}" já estava vazia.`)
    return
  }
  // Delete in batches of 500
  const chunks: FirebaseFirestore.DocumentSnapshot[][] = []
  for (let i = 0; i < snapshot.docs.length; i += 500) {
    chunks.push(snapshot.docs.slice(i, i + 500))
  }
  for (const chunk of chunks) {
    const batch = db.batch()
    chunk.forEach((doc) => batch.delete(doc.ref))
    await batch.commit()
  }
  console.log(`  Coleção "${collectionName}" limpa (${snapshot.size} docs deletados).`)
}

// ---------------------------------------------------------------------------
// Group stage – generate round-robin for each group
// ---------------------------------------------------------------------------

/**
 * For 4 teams [T1, T2, T3, T4] the round-robin pairs are:
 *   Round 1: T1 vs T2,  T3 vs T4
 *   Round 2: T1 vs T3,  T2 vs T4
 *   Round 3: T1 vs T4,  T2 vs T3
 */
function roundRobinPairs(teams: string[]): [string, string][] {
  const [t1, t2, t3, t4] = teams
  return [
    [t1, t2],
    [t3, t4],
    [t1, t3],
    [t2, t4],
    [t1, t4],
    [t2, t3],
  ]
}

/**
 * Official FIFA 2026 schedule – UTC timestamps for each of the 6 matches
 * per group, in round-robin order (indices 0-5 match roundRobinPairs output).
 */
const GROUP_SCHEDULE: Record<string, string[]> = {
  // Group A: México, África do Sul, Coreia do Sul, República Tcheca
  A: [
    '2026-06-11T19:00:00Z', // México vs África do Sul
    '2026-06-12T02:00:00Z', // Coreia do Sul vs República Tcheca
    '2026-06-19T01:00:00Z', // México vs Coreia do Sul
    '2026-06-18T16:00:00Z', // África do Sul vs República Tcheca
    '2026-06-25T01:00:00Z', // México vs República Tcheca
    '2026-06-25T01:00:00Z', // África do Sul vs Coreia do Sul
  ],
  // Group B: Canadá, Bósnia e Herzegovina, Catar, Suíça
  B: [
    '2026-06-12T19:00:00Z', // Canadá vs Bósnia e Herzegovina
    '2026-06-13T19:00:00Z', // Catar vs Suíça
    '2026-06-18T22:00:00Z', // Canadá vs Catar
    '2026-06-18T19:00:00Z', // Bósnia e Herzegovina vs Suíça
    '2026-06-24T19:00:00Z', // Canadá vs Suíça
    '2026-06-24T19:00:00Z', // Bósnia e Herzegovina vs Catar
  ],
  // Group C: Brasil, Marrocos, Haiti, Escócia
  C: [
    '2026-06-13T22:00:00Z', // Brasil vs Marrocos
    '2026-06-14T01:00:00Z', // Haiti vs Escócia
    '2026-06-20T00:30:00Z', // Brasil vs Haiti
    '2026-06-19T22:00:00Z', // Marrocos vs Escócia
    '2026-06-24T22:00:00Z', // Brasil vs Escócia
    '2026-06-24T22:00:00Z', // Marrocos vs Haiti
  ],
  // Group D: Estados Unidos, Paraguai, Austrália, Turquia
  D: [
    '2026-06-13T01:00:00Z', // Estados Unidos vs Paraguai
    '2026-06-14T04:00:00Z', // Austrália vs Turquia
    '2026-06-19T19:00:00Z', // Estados Unidos vs Austrália
    '2026-06-20T03:00:00Z', // Paraguai vs Turquia
    '2026-06-26T02:00:00Z', // Estados Unidos vs Turquia
    '2026-06-26T02:00:00Z', // Paraguai vs Austrália
  ],
  // Group E: Alemanha, Curaçau, Costa do Marfim, Equador
  E: [
    '2026-06-14T17:00:00Z', // Alemanha vs Curaçau
    '2026-06-14T23:00:00Z', // Costa do Marfim vs Equador
    '2026-06-20T20:00:00Z', // Alemanha vs Costa do Marfim
    '2026-06-21T00:00:00Z', // Curaçau vs Equador
    '2026-06-25T20:00:00Z', // Alemanha vs Equador
    '2026-06-25T20:00:00Z', // Curaçau vs Costa do Marfim
  ],
  // Group F: Holanda, Japão, Suécia, Tunísia
  F: [
    '2026-06-14T20:00:00Z', // Holanda vs Japão
    '2026-06-15T02:00:00Z', // Suécia vs Tunísia
    '2026-06-20T17:00:00Z', // Holanda vs Suécia
    '2026-06-21T04:00:00Z', // Japão vs Tunísia
    '2026-06-25T23:00:00Z', // Holanda vs Tunísia
    '2026-06-25T23:00:00Z', // Japão vs Suécia
  ],
  // Group G: Bélgica, Egito, Irã, Nova Zelândia
  G: [
    '2026-06-15T19:00:00Z', // Bélgica vs Egito
    '2026-06-16T01:00:00Z', // Irã vs Nova Zelândia
    '2026-06-21T19:00:00Z', // Bélgica vs Irã
    '2026-06-22T01:00:00Z', // Egito vs Nova Zelândia
    '2026-06-27T03:00:00Z', // Bélgica vs Nova Zelândia
    '2026-06-27T03:00:00Z', // Egito vs Irã
  ],
  // Group H: Espanha, Cabo Verde, Arábia Saudita, Uruguai
  H: [
    '2026-06-15T16:00:00Z', // Espanha vs Cabo Verde
    '2026-06-15T22:00:00Z', // Arábia Saudita vs Uruguai
    '2026-06-21T16:00:00Z', // Espanha vs Arábia Saudita
    '2026-06-21T22:00:00Z', // Cabo Verde vs Uruguai
    '2026-06-27T00:00:00Z', // Espanha vs Uruguai
    '2026-06-27T00:00:00Z', // Cabo Verde vs Arábia Saudita
  ],
  // Group I: França, Senegal, Iraque, Noruega
  I: [
    '2026-06-16T19:00:00Z', // França vs Senegal
    '2026-06-16T22:00:00Z', // Iraque vs Noruega
    '2026-06-22T21:00:00Z', // França vs Iraque
    '2026-06-23T00:00:00Z', // Senegal vs Noruega
    '2026-06-26T19:00:00Z', // França vs Noruega
    '2026-06-26T19:00:00Z', // Senegal vs Iraque
  ],
  // Group J: Argentina, Argélia, Áustria, Jordânia
  J: [
    '2026-06-17T01:00:00Z', // Argentina vs Argélia
    '2026-06-17T04:00:00Z', // Áustria vs Jordânia
    '2026-06-22T17:00:00Z', // Argentina vs Áustria
    '2026-06-23T03:00:00Z', // Argélia vs Jordânia
    '2026-06-28T02:00:00Z', // Argentina vs Jordânia
    '2026-06-28T02:00:00Z', // Argélia vs Áustria
  ],
  // Group K: Portugal, RD Congo, Uzbequistão, Colômbia
  K: [
    '2026-06-17T17:00:00Z', // Portugal vs RD Congo
    '2026-06-18T02:00:00Z', // Uzbequistão vs Colômbia
    '2026-06-23T17:00:00Z', // Portugal vs Uzbequistão
    '2026-06-24T02:00:00Z', // RD Congo vs Colômbia
    '2026-06-27T23:30:00Z', // Portugal vs Colômbia
    '2026-06-27T23:30:00Z', // RD Congo vs Uzbequistão
  ],
  // Group L: Inglaterra, Croácia, Gana, Panamá
  L: [
    '2026-06-17T20:00:00Z', // Inglaterra vs Croácia
    '2026-06-17T23:00:00Z', // Gana vs Panamá
    '2026-06-23T20:00:00Z', // Inglaterra vs Gana
    '2026-06-23T23:00:00Z', // Croácia vs Panamá
    '2026-06-27T21:00:00Z', // Inglaterra vs Panamá
    '2026-06-27T21:00:00Z', // Croácia vs Gana
  ],
}

async function seedGroupStage(
  grupoTimesMap: Record<string, string[]>,
): Promise<void> {
  console.log('\nCriando 72 jogos da fase de grupos...')

  let totalGames = 0
  const groups = Object.keys(grupoTimesMap).sort()

  for (const grupo of groups) {
    const teams = grupoTimesMap[grupo]
    if (teams.length !== 4) {
      console.warn(`  Aviso: Grupo ${grupo} tem ${teams.length} times (esperado 4). Pulando.`)
      continue
    }
    const pairs = roundRobinPairs(teams)
    const schedule = GROUP_SCHEDULE[grupo]
    if (!schedule || schedule.length !== 6) {
      console.warn(`  Aviso: Grupo ${grupo} sem calendário definido. Pulando.`)
      continue
    }
    for (let i = 0; i < pairs.length; i++) {
      const [timeCasa, timeVisitante] = pairs[i]
      const jogo: Jogo = {
        fase: 'grupos',
        grupo,
        timeCasa,
        timeVisitante,
        origemCasa: null,
        origemVisitante: null,
        dataHora: ts(schedule[i]),
        resultado: null,
        encerrado: false,
      }
      const docRef = await db.collection('jogos').add(jogo)
      const dateLabel = schedule[i].slice(0, 10)
      console.log(`  [Grupo ${grupo}] ${timeCasa} vs ${timeVisitante} (${dateLabel}) -> ${docRef.id}`)
      totalGames++
    }
  }

  console.log(`  Total jogos de grupos criados: ${totalGames}`)
}

// ---------------------------------------------------------------------------
// Knockout stage – FIFA 2026 official bracket
// ---------------------------------------------------------------------------

/**
 * Fase de 32 (Round of 32) – 16 games.
 *
 * FIFA 2026: 12 group winners + 12 runners-up + 8 best 3rd-place = 32 teams.
 *
 * The 3rd-place bracket positions depend on which 8 of 12 qualify.
 * Default assignment assumes groups A-H's 3rds qualify (one possible scenario).
 * Bracket structure follows the official FIFA 2026 draw.
 */
function buildFase32(): { id: string; casa: Origem; visitante: Origem; date: string; labelCasa: string; labelVisitante: string }[] {
  const g = (grupo: string, posicao: number): OrigemGrupo => ({ tipo: 'grupo', grupo, posicao })

  return [
    { id: 'fase32_1',  casa: g('A', 2), visitante: g('B', 2), date: '2026-06-28T19:00:00Z', labelCasa: '2º Grupo A',  labelVisitante: '2º Grupo B' },
    { id: 'fase32_2',  casa: g('E', 1), visitante: g('A', 3), date: '2026-06-29T17:00:00Z', labelCasa: '1º Grupo E',  labelVisitante: '3º dos Grupos A, B, C, D ou F' },
    { id: 'fase32_3',  casa: g('F', 1), visitante: g('C', 2), date: '2026-06-29T20:00:00Z', labelCasa: '1º Grupo F',  labelVisitante: '2º Grupo C' },
    { id: 'fase32_4',  casa: g('C', 1), visitante: g('F', 2), date: '2026-06-29T23:00:00Z', labelCasa: '1º Grupo C',  labelVisitante: '2º Grupo F' },
    { id: 'fase32_5',  casa: g('I', 1), visitante: g('C', 3), date: '2026-06-30T17:00:00Z', labelCasa: '1º Grupo I',  labelVisitante: '3º dos Grupos C, D, F, G ou H' },
    { id: 'fase32_6',  casa: g('E', 2), visitante: g('I', 2), date: '2026-06-30T20:00:00Z', labelCasa: '2º Grupo E',  labelVisitante: '2º Grupo I' },
    { id: 'fase32_7',  casa: g('A', 1), visitante: g('F', 3), date: '2026-06-30T23:00:00Z', labelCasa: '1º Grupo A',  labelVisitante: '3º dos Grupos C, E, F, H ou I' },
    { id: 'fase32_8',  casa: g('L', 1), visitante: g('E', 3), date: '2026-07-01T17:00:00Z', labelCasa: '1º Grupo L',  labelVisitante: '3º dos Grupos E, H, I, J ou K' },
    { id: 'fase32_9',  casa: g('D', 1), visitante: g('B', 3), date: '2026-07-01T20:00:00Z', labelCasa: '1º Grupo D',  labelVisitante: '3º dos Grupos B, E, F, I ou J' },
    { id: 'fase32_10', casa: g('G', 1), visitante: g('H', 3), date: '2026-07-01T23:00:00Z', labelCasa: '1º Grupo G',  labelVisitante: '3º dos Grupos A, E, H, I ou J' },
    { id: 'fase32_11', casa: g('K', 2), visitante: g('L', 2), date: '2026-07-02T17:00:00Z', labelCasa: '2º Grupo K',  labelVisitante: '2º Grupo L' },
    { id: 'fase32_12', casa: g('H', 1), visitante: g('J', 2), date: '2026-07-02T20:00:00Z', labelCasa: '1º Grupo H',  labelVisitante: '2º Grupo J' },
    { id: 'fase32_13', casa: g('B', 1), visitante: g('G', 3), date: '2026-07-02T23:00:00Z', labelCasa: '1º Grupo B',  labelVisitante: '3º dos Grupos E, F, G, I ou J' },
    { id: 'fase32_14', casa: g('J', 1), visitante: g('H', 2), date: '2026-07-03T17:00:00Z', labelCasa: '1º Grupo J',  labelVisitante: '2º Grupo H' },
    { id: 'fase32_15', casa: g('K', 1), visitante: g('D', 3), date: '2026-07-03T20:00:00Z', labelCasa: '1º Grupo K',  labelVisitante: '3º dos Grupos D, E, I, J ou L' },
    { id: 'fase32_16', casa: g('D', 2), visitante: g('G', 2), date: '2026-07-03T23:00:00Z', labelCasa: '2º Grupo D',  labelVisitante: '2º Grupo G' },
  ]
}

function jogo(jogoId: string, resultado: 'vencedor' | 'perdedor' = 'vencedor'): OrigemJogo {
  return { tipo: 'jogo', jogoId, resultado }
}

/** Oitavas de final (Round of 16) – 8 games */
function buildOitavas(): { id: string; casa: Origem; visitante: Origem; date: string; labelCasa: string; labelVisitante: string }[] {
  return [
    { id: 'oitavas_1', casa: jogo('fase32_2'),  visitante: jogo('fase32_5'),  date: '2026-07-04T17:00:00Z', labelCasa: 'Venc. Jogo 74', labelVisitante: 'Venc. Jogo 77' },
    { id: 'oitavas_2', casa: jogo('fase32_1'),  visitante: jogo('fase32_3'),  date: '2026-07-04T21:00:00Z', labelCasa: 'Venc. Jogo 73', labelVisitante: 'Venc. Jogo 75' },
    { id: 'oitavas_3', casa: jogo('fase32_4'),  visitante: jogo('fase32_6'),  date: '2026-07-05T17:00:00Z', labelCasa: 'Venc. Jogo 76', labelVisitante: 'Venc. Jogo 78' },
    { id: 'oitavas_4', casa: jogo('fase32_7'),  visitante: jogo('fase32_8'),  date: '2026-07-05T21:00:00Z', labelCasa: 'Venc. Jogo 79', labelVisitante: 'Venc. Jogo 80' },
    { id: 'oitavas_5', casa: jogo('fase32_11'), visitante: jogo('fase32_12'), date: '2026-07-06T17:00:00Z', labelCasa: 'Venc. Jogo 83', labelVisitante: 'Venc. Jogo 84' },
    { id: 'oitavas_6', casa: jogo('fase32_9'),  visitante: jogo('fase32_10'), date: '2026-07-06T21:00:00Z', labelCasa: 'Venc. Jogo 81', labelVisitante: 'Venc. Jogo 82' },
    { id: 'oitavas_7', casa: jogo('fase32_14'), visitante: jogo('fase32_16'), date: '2026-07-07T17:00:00Z', labelCasa: 'Venc. Jogo 86', labelVisitante: 'Venc. Jogo 88' },
    { id: 'oitavas_8', casa: jogo('fase32_13'), visitante: jogo('fase32_15'), date: '2026-07-07T21:00:00Z', labelCasa: 'Venc. Jogo 85', labelVisitante: 'Venc. Jogo 87' },
  ]
}

/** Quartas de final – 4 games */
function buildQuartas(): { id: string; casa: Origem; visitante: Origem; date: string; labelCasa: string; labelVisitante: string }[] {
  return [
    { id: 'quartas_1', casa: jogo('oitavas_1'), visitante: jogo('oitavas_2'), date: '2026-07-09T21:00:00Z', labelCasa: 'Venc. Jogo 89', labelVisitante: 'Venc. Jogo 90' },
    { id: 'quartas_2', casa: jogo('oitavas_5'), visitante: jogo('oitavas_6'), date: '2026-07-10T21:00:00Z', labelCasa: 'Venc. Jogo 93', labelVisitante: 'Venc. Jogo 94' },
    { id: 'quartas_3', casa: jogo('oitavas_3'), visitante: jogo('oitavas_4'), date: '2026-07-11T17:00:00Z', labelCasa: 'Venc. Jogo 91', labelVisitante: 'Venc. Jogo 92' },
    { id: 'quartas_4', casa: jogo('oitavas_7'), visitante: jogo('oitavas_8'), date: '2026-07-11T21:00:00Z', labelCasa: 'Venc. Jogo 95', labelVisitante: 'Venc. Jogo 96' },
  ]
}

/** Semifinais – 2 games */
function buildSemi(): { id: string; casa: Origem; visitante: Origem; date: string; labelCasa: string; labelVisitante: string }[] {
  return [
    { id: 'semi_1', casa: jogo('quartas_1'), visitante: jogo('quartas_2'), date: '2026-07-14T21:00:00Z', labelCasa: 'Venc. Jogo 97', labelVisitante: 'Venc. Jogo 98' },
    { id: 'semi_2', casa: jogo('quartas_3'), visitante: jogo('quartas_4'), date: '2026-07-15T21:00:00Z', labelCasa: 'Venc. Jogo 99', labelVisitante: 'Venc. Jogo 100' },
  ]
}

function buildTerceiroEFinal(): { id: string; fase: Fase; casa: Origem; visitante: Origem; date: string; labelCasa: string; labelVisitante: string }[] {
  return [
    {
      id: 'terceiro_lugar',
      fase: 'terceiro',
      casa: jogo('semi_1', 'perdedor'),
      visitante: jogo('semi_2', 'perdedor'),
      date: '2026-07-18T21:00:00Z',
      labelCasa: 'Perd. Semi 1',
      labelVisitante: 'Perd. Semi 2',
    },
    {
      id: 'final',
      fase: 'final',
      casa: jogo('semi_1', 'vencedor'),
      visitante: jogo('semi_2', 'vencedor'),
      date: '2026-07-19T21:00:00Z',
      labelCasa: 'Venc. Semi 1',
      labelVisitante: 'Venc. Semi 2',
    },
  ]
}

async function seedKnockout(): Promise<void> {
  console.log('\nCriando 32 jogos do mata-mata...')

  type KnockoutEntry = { id: string; fase?: Fase; casa: Origem; visitante: Origem; date: string }

  const stages: { fase: Fase; entries: KnockoutEntry[] }[] = [
    { fase: 'fase32',  entries: buildFase32() },
    { fase: 'oitavas', entries: buildOitavas() },
    { fase: 'quartas', entries: buildQuartas() },
    { fase: 'semi',    entries: buildSemi() },
  ]

  let total = 0

  for (const { fase, entries } of stages) {
    for (const entry of entries) {
      const jogo: Jogo = {
        fase,
        grupo: null,
        timeCasa: '',
        timeVisitante: '',
        origemCasa: entry.casa,
        origemVisitante: entry.visitante,
        dataHora: ts(entry.date),
        resultado: null,
        encerrado: false,
        labelCasa: entry.labelCasa,
        labelVisitante: entry.labelVisitante,
      }
      await db.collection('jogos').doc(entry.id).set(jogo)
      console.log(`  [${fase}] ${entry.id} (${entry.date.slice(0, 10)}) -> saved`)
      total++
    }
  }

  // Terceiro lugar + Final (mixed)
  for (const entry of buildTerceiroEFinal()) {
    const faseEntry = entry.fase!
    const jogoDoc: Jogo = {
      fase: faseEntry,
      grupo: null,
      timeCasa: '',
      timeVisitante: '',
      origemCasa: entry.casa,
      origemVisitante: entry.visitante,
      dataHora: ts(entry.date),
      resultado: null,
      encerrado: false,
      labelCasa: entry.labelCasa,
      labelVisitante: entry.labelVisitante,
    }
    await db.collection('jogos').doc(entry.id).set(jogoDoc)
    console.log(`  [${faseEntry}] ${entry.id} (${entry.date.slice(0, 10)}) -> saved`)
    total++
  }

  console.log(`  Total jogos mata-mata criados: ${total}`)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed(): Promise<void> {
  console.log('Iniciando seed dos jogos da Copa do Mundo 2026...\n')

  // 1. Load teams grouped by grupo
  console.log('Lendo times da coleção "times"...')
  const timesSnapshot = await db.collection('times').get()
  if (timesSnapshot.empty) {
    console.error('Erro: nenhum time encontrado. Rode seed-times.ts primeiro.')
    process.exit(1)
  }

  const grupoTimesMap: Record<string, string[]> = {}
  timesSnapshot.docs.forEach((doc) => {
    const data = doc.data()
    const grupo: string = data.grupo
    if (!grupoTimesMap[grupo]) grupoTimesMap[grupo] = []
    grupoTimesMap[grupo].push(doc.id)
  })

  const totalGrupos = Object.keys(grupoTimesMap).length
  const totalTimes = timesSnapshot.size
  console.log(`  ${totalTimes} times carregados em ${totalGrupos} grupos.`)

  // 2. Clear existing jogos
  await deleteCollection('jogos')

  // 3. Seed group stage
  await seedGroupStage(grupoTimesMap)

  // 4. Seed knockout stage
  await seedKnockout()

  console.log('\nSeed concluído com sucesso!')
  console.log('  72 jogos de grupos + 32 jogos de mata-mata = 104 jogos no total.')
}

seed().catch((err) => {
  console.error('Erro durante o seed:', err)
  process.exit(1)
})
