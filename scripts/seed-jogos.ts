// scripts/seed-jogos.ts
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

initializeApp({ projectId: 'bolao-do-bolero' })
const db = getFirestore()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Fase = 'grupos' | 'oitavas' | 'quartas' | 'semi' | 'terceiro' | 'final'

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

/** Returns a Timestamp for a given date string (UTC noon) */
function ts(dateStr: string): Timestamp {
  return Timestamp.fromDate(new Date(`${dateStr}T16:00:00Z`))
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

// Placeholder dates spread across June 11-25, 2026
// 72 group games over 15 days → roughly 4-5 per day.
// We assign a date per game index (cycling through available dates).
const GROUP_DATES = [
  '2026-06-11', '2026-06-11', '2026-06-12', '2026-06-12',
  '2026-06-13', '2026-06-13', '2026-06-14', '2026-06-14',
  '2026-06-15', '2026-06-15', '2026-06-16', '2026-06-16',
  '2026-06-17', '2026-06-17', '2026-06-18', '2026-06-18',
  '2026-06-19', '2026-06-19', '2026-06-20', '2026-06-20',
  '2026-06-21', '2026-06-21', '2026-06-22', '2026-06-22',
  '2026-06-23', '2026-06-23', '2026-06-24', '2026-06-24',
  '2026-06-25', '2026-06-25', '2026-06-25', '2026-06-25',
  '2026-06-25', '2026-06-25', '2026-06-25', '2026-06-25',
]

async function seedGroupStage(
  grupoTimesMap: Record<string, string[]>,
): Promise<void> {
  console.log('\nCriando 72 jogos da fase de grupos...')

  let gameIndex = 0
  const groups = Object.keys(grupoTimesMap).sort()

  for (const grupo of groups) {
    const teams = grupoTimesMap[grupo]
    if (teams.length !== 4) {
      console.warn(`  Aviso: Grupo ${grupo} tem ${teams.length} times (esperado 4). Pulando.`)
      continue
    }
    const pairs = roundRobinPairs(teams)
    for (const [timeCasa, timeVisitante] of pairs) {
      const dateStr = GROUP_DATES[gameIndex % GROUP_DATES.length]
      const jogo: Jogo = {
        fase: 'grupos',
        grupo,
        timeCasa,
        timeVisitante,
        origemCasa: null,
        origemVisitante: null,
        dataHora: ts(dateStr),
        resultado: null,
        encerrado: false,
      }
      const docRef = await db.collection('jogos').add(jogo)
      console.log(`  [Grupo ${grupo}] ${timeCasa} vs ${timeVisitante} (${dateStr}) -> ${docRef.id}`)
      gameIndex++
    }
  }

  console.log(`  Total jogos de grupos criados: ${gameIndex}`)
}

// ---------------------------------------------------------------------------
// Knockout stage
// ---------------------------------------------------------------------------

/**
 * Oitavas (Round of 32) – 16 games.
 *
 * FIFA 2026 has 48 teams in 12 groups (A–L). After the group stage:
 *   - 12 group winners (1st)
 *   - 12 runners-up (2nd)
 *   - 8 best 3rd-place teams
 * = 32 teams advance.
 *
 * The bracket below is a representative/simplified structure used for seeding.
 * Each entry is [origemCasa, origemVisitante, jogoId].
 */
function buildOitavas(): { id: string; casa: Origem; visitante: Origem; date: string }[] {
  const g = (grupo: string, posicao: number): OrigemGrupo => ({ tipo: 'grupo', grupo, posicao })

  return [
    { id: 'oitavas_1',  casa: g('A', 1), visitante: g('C', 3), date: '2026-06-29' },
    { id: 'oitavas_2',  casa: g('A', 2), visitante: g('C', 2), date: '2026-06-29' },
    { id: 'oitavas_3',  casa: g('B', 1), visitante: g('D', 3), date: '2026-06-29' },
    { id: 'oitavas_4',  casa: g('B', 2), visitante: g('D', 2), date: '2026-06-29' },
    { id: 'oitavas_5',  casa: g('C', 1), visitante: g('E', 3), date: '2026-06-30' },
    { id: 'oitavas_6',  casa: g('E', 2), visitante: g('G', 2), date: '2026-06-30' },
    { id: 'oitavas_7',  casa: g('D', 1), visitante: g('F', 3), date: '2026-06-30' },
    { id: 'oitavas_8',  casa: g('F', 2), visitante: g('H', 2), date: '2026-06-30' },
    { id: 'oitavas_9',  casa: g('E', 1), visitante: g('G', 3), date: '2026-07-01' },
    { id: 'oitavas_10', casa: g('I', 2), visitante: g('K', 2), date: '2026-07-01' },
    { id: 'oitavas_11', casa: g('F', 1), visitante: g('H', 3), date: '2026-07-01' },
    { id: 'oitavas_12', casa: g('J', 2), visitante: g('L', 2), date: '2026-07-01' },
    { id: 'oitavas_13', casa: g('G', 1), visitante: g('I', 3), date: '2026-07-02' },
    { id: 'oitavas_14', casa: g('H', 1), visitante: g('J', 3), date: '2026-07-02' },
    { id: 'oitavas_15', casa: g('I', 1), visitante: g('K', 3), date: '2026-07-02' },
    { id: 'oitavas_16', casa: g('J', 1), visitante: g('L', 3), date: '2026-07-02' },
  ]
}

function jogo(jogoId: string, resultado: 'vencedor' | 'perdedor' = 'vencedor'): OrigemJogo {
  return { tipo: 'jogo', jogoId, resultado }
}

function buildQuartas(): { id: string; casa: Origem; visitante: Origem; date: string }[] {
  return [
    { id: 'quartas_1', casa: jogo('oitavas_1'),  visitante: jogo('oitavas_2'),  date: '2026-07-04' },
    { id: 'quartas_2', casa: jogo('oitavas_3'),  visitante: jogo('oitavas_4'),  date: '2026-07-04' },
    { id: 'quartas_3', casa: jogo('oitavas_5'),  visitante: jogo('oitavas_6'),  date: '2026-07-05' },
    { id: 'quartas_4', casa: jogo('oitavas_7'),  visitante: jogo('oitavas_8'),  date: '2026-07-05' },
    { id: 'quartas_5', casa: jogo('oitavas_9'),  visitante: jogo('oitavas_10'), date: '2026-07-06' },
    { id: 'quartas_6', casa: jogo('oitavas_11'), visitante: jogo('oitavas_12'), date: '2026-07-06' },
    { id: 'quartas_7', casa: jogo('oitavas_13'), visitante: jogo('oitavas_14'), date: '2026-07-07' },
    { id: 'quartas_8', casa: jogo('oitavas_15'), visitante: jogo('oitavas_16'), date: '2026-07-07' },
  ]
}

function buildSemi(): { id: string; casa: Origem; visitante: Origem; date: string }[] {
  return [
    { id: 'semi_1', casa: jogo('quartas_1'), visitante: jogo('quartas_2'), date: '2026-07-10' },
    { id: 'semi_2', casa: jogo('quartas_3'), visitante: jogo('quartas_4'), date: '2026-07-10' },
    { id: 'semi_3', casa: jogo('quartas_5'), visitante: jogo('quartas_6'), date: '2026-07-11' },
    { id: 'semi_4', casa: jogo('quartas_7'), visitante: jogo('quartas_8'), date: '2026-07-11' },
  ]
}

function buildTerceiroEFinal(): { id: string; fase: Fase; casa: Origem; visitante: Origem; date: string }[] {
  return [
    {
      id: 'terceiro_lugar',
      fase: 'terceiro',
      casa: jogo('semi_1', 'perdedor'),
      visitante: jogo('semi_2', 'perdedor'),
      date: '2026-07-14',
    },
    {
      id: 'final',
      fase: 'final',
      casa: jogo('semi_1', 'vencedor'),
      visitante: jogo('semi_2', 'vencedor'),
      date: '2026-07-19',
    },
  ]
}

async function seedKnockout(): Promise<void> {
  console.log('\nCriando 30 jogos do mata-mata...')

  type KnockoutEntry = { id: string; fase?: Fase; casa: Origem; visitante: Origem; date: string }

  const stages: { fase: Fase; entries: KnockoutEntry[] }[] = [
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
      }
      await db.collection('jogos').doc(entry.id).set(jogo)
      console.log(`  [${fase}] ${entry.id} (${entry.date}) -> saved`)
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
    }
    await db.collection('jogos').doc(entry.id).set(jogoDoc)
    console.log(`  [${faseEntry}] ${entry.id} (${entry.date}) -> saved`)
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
  console.log('  72 jogos de grupos + 30 jogos de mata-mata = 102 jogos no total.')
}

seed().catch((err) => {
  console.error('Erro durante o seed:', err)
  process.exit(1)
})
