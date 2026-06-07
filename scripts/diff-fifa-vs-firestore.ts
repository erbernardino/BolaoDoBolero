#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

type FifaMatch = {
  numero: number
  data: string
  horario: string
  fase: string
  grupo: string | null
  casa: string
  visitante: string
  estadio: string
  cidade: string
  matchId: string
  url: string
}

type TimeFS = { id: string; nome: string; sigla: string; grupo: string }
type JogoFS = {
  id: string
  numero: number
  fase: string // 'grupos'|'fase32'|'oitavas'|'quartas'|'semi'|'terceiro'|'final'
  grupo: string | null
  timeCasaId: string
  timeVisitanteId: string
  dataHoraUtc: string
  labelCasa?: string
  labelVisitante?: string
}

const FASE_MAP: Record<string, string> = {
  grupos: 'Primeira fase',
  fase32: 'Segundas de final',
  oitavas: 'Oitavas de final',
  quartas: 'Quartas de final',
  semi: 'Semifinal',
  terceiro: 'Decisão do 3º lugar',
  final: 'Final',
}

// Aliases FIFA → nome canônico (Firestore usa o da direita)
const NOME_ALIAS: Record<string, string> = {
  'República da Coreia': 'Coreia do Sul',
  'Tchéquia': 'República Tcheca',
  'EUA': 'Estados Unidos',
  'RI do Irã': 'Irã',
}

// Fuso horário do estádio em junho/julho 2026 (offset UTC)
// Mexico (desde 2022 sem DST): UTC-6 ano todo
// US/Canada em DST: Pacific=-7, Central=-5, Eastern=-4
const CIDADE_TZ_OFFSET: Record<string, number> = {
  'Cidade do México': -6,
  'Guadalajara': -6,
  'Monterrey': -6,
  'Toronto': -4,
  'Boston': -4,
  'Nova Iorque': -4,
  'Filadélfia': -4,
  'Miami': -4,
  'Atlanta': -4,
  'Houston': -5,
  'Dallas': -5,
  'Kansas City': -5,
  'Seattle': -7,
  'Los Angeles': -7,
  'Área da baía de São Francisco': -7,
  'Vancouver': -7,
}

function loadFirestoreTimes(): Map<string, TimeFS> {
  const raw = JSON.parse(readFileSync('.firebase-dumps/times.json', 'utf8'))
  const map = new Map<string, TimeFS>()
  for (const doc of raw.documents) {
    const id = doc.name.split('/').pop()!
    const f = doc.fields
    map.set(id, {
      id,
      nome: f.nome?.stringValue ?? '',
      sigla: f.sigla?.stringValue ?? '',
      grupo: f.grupo?.stringValue ?? '',
    })
  }
  return map
}

function loadFirestoreJogos(): JogoFS[] {
  const raw = JSON.parse(readFileSync('.firebase-dumps/jogos.json', 'utf8'))
  const jogos: JogoFS[] = []
  for (const doc of raw.documents) {
    const id = doc.name.split('/').pop()!
    const f = doc.fields
    jogos.push({
      id,
      numero: parseInt(f.numero?.integerValue ?? '0', 10),
      fase: f.fase?.stringValue ?? '',
      grupo: f.grupo?.stringValue ?? null,
      timeCasaId: f.timeCasa?.stringValue ?? '',
      timeVisitanteId: f.timeVisitante?.stringValue ?? '',
      dataHoraUtc: f.dataHora?.timestampValue ?? '',
      labelCasa: f.labelCasa?.stringValue,
      labelVisitante: f.labelVisitante?.stringValue,
    })
  }
  jogos.sort((a, b) => a.numero - b.numero)
  return jogos
}

function utcToLocal(utcIso: string, offsetHours: number): { data: string; horario: string } {
  const d = new Date(utcIso)
  const localMs = d.getTime() + offsetHours * 3600_000
  const local = new Date(localMs)
  const y = local.getUTCFullYear()
  const mo = String(local.getUTCMonth() + 1).padStart(2, '0')
  const da = String(local.getUTCDate()).padStart(2, '0')
  const h = String(local.getUTCHours()).padStart(2, '0')
  const mi = String(local.getUTCMinutes()).padStart(2, '0')
  return { data: `${y}-${mo}-${da}`, horario: `${h}:${mi}` }
}

function normalizeNome(n: string): string {
  return NOME_ALIAS[n] ?? n
}

type Diff = {
  numero: number
  fifa: FifaMatch
  firestore: JogoFS | null
  casaFS: string
  visitanteFS: string
  localDate: string
  localTime: string
  tzOffset: number | null
  discrepancias: string[]
}

function main() {
  const fifa: FifaMatch[] = JSON.parse(readFileSync('docs/fifa-copa-2026-jogos.json', 'utf8'))
  const times = loadFirestoreTimes()
  const jogos = loadFirestoreJogos()

  const byNumero = new Map(jogos.map(j => [j.numero, j]))

  const diffs: Diff[] = []

  for (const f of fifa) {
    const j = byNumero.get(f.numero) ?? null
    const discrepancias: string[] = []

    let casaFS = ''
    let visitanteFS = ''
    let localDate = ''
    let localTime = ''
    const tzOffset = CIDADE_TZ_OFFSET[f.cidade] ?? null

    if (!j) {
      discrepancias.push(`Jogo ${f.numero} não existe no Firestore`)
    } else {
      const tCasa = times.get(j.timeCasaId)
      const tVis = times.get(j.timeVisitanteId)
      casaFS = tCasa?.nome ?? (j.labelCasa ? `[${j.labelCasa}]` : `[${j.timeCasaId}]`)
      visitanteFS = tVis?.nome ?? (j.labelVisitante ? `[${j.labelVisitante}]` : `[${j.timeVisitanteId}]`)

      // fase
      const faseFifa = FASE_MAP[j.fase]
      if (faseFifa !== f.fase) {
        discrepancias.push(`fase: FS="${j.fase}"(${faseFifa}) ≠ FIFA="${f.fase}"`)
      }
      // grupo
      if ((j.grupo || null) !== f.grupo) {
        discrepancias.push(`grupo: FS="${j.grupo}" ≠ FIFA="${f.grupo}"`)
      }
      // teams (só compara para fase de grupos, onde os IDs estão preenchidos com times reais)
      if (j.fase === 'grupos' && f.fase === 'Primeira fase') {
        const fifaCasa = normalizeNome(f.casa)
        const fifaVis = normalizeNome(f.visitante)
        if (fifaCasa !== casaFS) {
          discrepancias.push(`casa: FS="${casaFS}" ≠ FIFA="${f.casa}" (normalizado "${fifaCasa}")`)
        }
        if (fifaVis !== visitanteFS) {
          discrepancias.push(`visitante: FS="${visitanteFS}" ≠ FIFA="${f.visitante}" (normalizado "${fifaVis}")`)
        }
      }
      // date/time
      if (tzOffset !== null) {
        const local = utcToLocal(j.dataHoraUtc, tzOffset)
        localDate = local.data
        localTime = local.horario
        if (local.data !== f.data) {
          discrepancias.push(`data: FS(local)="${local.data}" ≠ FIFA="${f.data}"`)
        }
        if (local.horario !== f.horario) {
          discrepancias.push(`horario: FS(local)="${local.horario}" ≠ FIFA="${f.horario}"`)
        }
      } else {
        discrepancias.push(`cidade "${f.cidade}" sem mapeamento de fuso — não comparei data/hora`)
      }
    }

    diffs.push({
      numero: f.numero,
      fifa: f,
      firestore: j,
      casaFS,
      visitanteFS,
      localDate,
      localTime,
      tzOffset,
      discrepancias,
    })
  }

  // Também busca jogos no Firestore que não existem na FIFA
  const fifaNumeros = new Set(fifa.map(f => f.numero))
  const orfaos = jogos.filter(j => !fifaNumeros.has(j.numero))

  // Match por par de times (só fase de grupos)
  const pairAnalysis = analisePorPar(fifa, jogos, times)

  const md = buildMarkdown(diffs, orfaos, times, pairAnalysis)
  writeFileSync('docs/fifa-vs-firestore-diff.md', md)

  const ok = diffs.filter(d => d.discrepancias.length === 0).length
  const comDiff = diffs.length - ok
  console.log(`Jogos sem divergência (por numero): ${ok}/${diffs.length}`)
  console.log(`Jogos com divergência (por numero): ${comDiff}`)
  console.log(`Jogos Firestore órfãos (sem par na FIFA): ${orfaos.length}`)
  console.log(`Análise por par de times: ${pairAnalysis.length} diferenças`)
}

type PairDiff = {
  casa: string
  visitante: string
  fifaNumero: number
  firestoreNumero: number | null
  firestoreCasaNome: string
  firestoreVisitanteNome: string
  horarioFifa: string
  horarioFSLocal: string
  dataFifa: string
  dataFSLocal: string
  grupoFifa: string | null
  grupoFS: string | null
  cidade: string
  url: string
  nota: string
}

function analisePorPar(fifa: FifaMatch[], jogos: JogoFS[], times: Map<string, TimeFS>): PairDiff[] {
  const fifaGrupos = fifa.filter(f => f.fase === 'Primeira fase')
  const jogosGrupos = jogos.filter(j => j.fase === 'grupos')

  // Build lookup de jogos por par (casaId|visId) e invertido
  const jogosByPair = new Map<string, JogoFS>()
  for (const j of jogosGrupos) {
    jogosByPair.set(`${j.timeCasaId}|${j.timeVisitanteId}`, j)
  }

  const nomeToId = new Map<string, string>()
  for (const [id, t] of times) {
    nomeToId.set(t.nome, id)
  }

  const results: PairDiff[] = []
  for (const f of fifaGrupos) {
    const casaFIFA = normalizeNome(f.casa)
    const visFIFA = normalizeNome(f.visitante)
    const casaId = nomeToId.get(casaFIFA)
    const visId = nomeToId.get(visFIFA)

    if (!casaId || !visId) {
      results.push({
        casa: f.casa, visitante: f.visitante, fifaNumero: f.numero,
        firestoreNumero: null, firestoreCasaNome: '—', firestoreVisitanteNome: '—',
        horarioFifa: f.horario, horarioFSLocal: '—', dataFifa: f.data, dataFSLocal: '—',
        grupoFifa: f.grupo, grupoFS: null, cidade: f.cidade, url: f.url,
        nota: `❌ Times FIFA "${f.casa}"/"${f.visitante}" não encontrados no Firestore`,
      })
      continue
    }

    // Try direct pair
    let j = jogosByPair.get(`${casaId}|${visId}`)
    let invertido = false
    if (!j) {
      j = jogosByPair.get(`${visId}|${casaId}`)
      if (j) invertido = true
    }

    if (!j) {
      results.push({
        casa: f.casa, visitante: f.visitante, fifaNumero: f.numero,
        firestoreNumero: null, firestoreCasaNome: '—', firestoreVisitanteNome: '—',
        horarioFifa: f.horario, horarioFSLocal: '—', dataFifa: f.data, dataFSLocal: '—',
        grupoFifa: f.grupo, grupoFS: null, cidade: f.cidade, url: f.url,
        nota: '❌ Par de times não existe no Firestore',
      })
      continue
    }

    const tCasa = times.get(j.timeCasaId)
    const tVis = times.get(j.timeVisitanteId)
    const tzOffset = CIDADE_TZ_OFFSET[f.cidade] ?? -6
    const local = utcToLocal(j.dataHoraUtc, tzOffset)

    const issues: string[] = []
    if (j.numero !== f.numero) issues.push(`numero FS=${j.numero} ≠ FIFA=${f.numero}`)
    if (invertido) issues.push('casa/visitante invertidos')
    if (local.data !== f.data) issues.push(`data ${local.data} ≠ ${f.data}`)
    if (local.horario !== f.horario) issues.push(`hora ${local.horario} ≠ ${f.horario}`)
    if ((j.grupo || null) !== f.grupo) issues.push(`grupo FS=${j.grupo} ≠ FIFA=${f.grupo}`)

    results.push({
      casa: f.casa, visitante: f.visitante, fifaNumero: f.numero,
      firestoreNumero: j.numero,
      firestoreCasaNome: tCasa?.nome ?? '?',
      firestoreVisitanteNome: tVis?.nome ?? '?',
      horarioFifa: f.horario, horarioFSLocal: local.horario,
      dataFifa: f.data, dataFSLocal: local.data,
      grupoFifa: f.grupo, grupoFS: j.grupo,
      cidade: f.cidade, url: f.url,
      nota: issues.length === 0 ? '✅ OK' : issues.join('; '),
    })
  }
  return results
}

function buildMarkdown(diffs: Diff[], orfaos: JogoFS[], times: Map<string, TimeFS>, pairDiffs: PairDiff[]): string {
  const lines: string[] = []
  lines.push('# Diff: Firestore (bolão) vs FIFA oficial')
  lines.push('')
  lines.push(`Extraído em: ${new Date().toISOString()}`)
  lines.push('')
  lines.push(`Total FIFA: ${diffs.length}`)
  const ok = diffs.filter(d => d.discrepancias.length === 0).length
  lines.push(`Sem divergência: ${ok}`)
  lines.push(`Com divergência: ${diffs.length - ok}`)
  lines.push(`Órfãos no Firestore: ${orfaos.length}`)
  lines.push('')

  // Sumário por análise de par (mais útil pra entender o quadro real)
  const pairOk = pairDiffs.filter(p => p.nota === '✅ OK').length
  const pairSoNumero = pairDiffs.filter(p => p.nota !== '✅ OK' && !p.nota.includes('grupo') && !p.nota.includes('data') && !p.nota.includes('hora') && !p.nota.includes('invertidos') && p.nota.includes('numero')).length
  lines.push('## Sumário — análise por par de times (só Primeira fase, 72 jogos)')
  lines.push('')
  lines.push('| Situação | Qtde |')
  lines.push('|---|---|')
  lines.push(`| ✅ Tudo correto (times, grupo, data, hora, número) | ${pairOk} |`)
  lines.push(`| 🔄 Times e grupo corretos, só o **número oficial FIFA** diverge | ${pairSoNumero} |`)
  const outros = 72 - pairOk - pairSoNumero
  lines.push(`| ⚠️ Outras divergências (data/hora/inversão casa-visitante/time faltando) | ${outros} |`)
  lines.push('')

  lines.push('## Tabela — Primeira fase por par de times')
  lines.push('')
  lines.push('| FIFA# | Casa | × | Visitante | Grupo | Data | Hora | Firestore# | Nota |')
  lines.push('|---|---|---|---|---|---|---|---|---|')
  for (const p of pairDiffs) {
    lines.push(`| ${p.fifaNumero} | ${p.casa} | × | ${p.visitante} | ${p.grupoFifa ?? '—'} | ${p.dataFifa} | ${p.horarioFifa} | ${p.firestoreNumero ?? '—'} | ${p.nota} |`)
  }
  lines.push('')

  // Só diferenças (comparação por numero — mantém pra referência)
  const comDiff = diffs.filter(d => d.discrepancias.length > 0)
  lines.push('## Jogos com divergência (alinhados por número FIFA × número Firestore)')
  lines.push('')
  for (const d of comDiff) {
    lines.push(`### Jogo ${d.numero} — ${d.fifa.casa} × ${d.fifa.visitante}`)
    lines.push('')
    lines.push(`- **FIFA**: ${d.fifa.data} ${d.fifa.horario} (${d.fifa.fase}${d.fifa.grupo ? ` — Grupo ${d.fifa.grupo}` : ''}) · ${d.fifa.estadio} (${d.fifa.cidade})`)
    if (d.firestore) {
      lines.push(`- **Firestore**: ${d.localDate || '—'} ${d.localTime || '—'} local (= ${d.firestore.dataHoraUtc} UTC, offset ${d.tzOffset}h) · ${d.casaFS} × ${d.visitanteFS} · fase=${d.firestore.fase} grupo=${d.firestore.grupo || '—'}`)
    } else {
      lines.push('- **Firestore**: _jogo não encontrado_')
    }
    lines.push('')
    lines.push('**Divergências:**')
    for (const disc of d.discrepancias) lines.push(`- ${disc}`)
    lines.push('')
    lines.push(`[FIFA match page](${d.fifa.url})`)
    lines.push('')
  }

  if (orfaos.length > 0) {
    lines.push('## Jogos no Firestore sem par na FIFA')
    lines.push('')
    for (const j of orfaos) {
      const tC = times.get(j.timeCasaId)
      const tV = times.get(j.timeVisitanteId)
      lines.push(`- Jogo ${j.numero}: ${tC?.nome || j.labelCasa || j.timeCasaId} × ${tV?.nome || j.labelVisitante || j.timeVisitanteId} — ${j.dataHoraUtc} UTC — fase=${j.fase}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

main()
