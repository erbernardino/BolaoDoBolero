#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'

type Match = {
  numero: number
  data: string
  dataLabel: string
  horario: string
  fase: string
  grupo: string | null
  casa: string
  visitante: string
  estadio: string
  cidade: string
  matchId: string
  url: string
  // Para knockout: os "casa/visitante" são códigos FIFA tipo "1A", "3EFGIJ", "W73"
  // O flag abaixo distingue fase de grupos (times reais) de mata-mata (labels)
  isMataMata: boolean
}

const MESES: Record<string, number> = {
  janeiro: 1, fevereiro: 2, março: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
}

function main() {
  const snapshotPath = '.playwright-mcp/fifa-fixtures-by-group.md'
  const raw = readFileSync(snapshotPath, 'utf8')
  const lines = raw.split('\n')

  const sectionHeaderRe = /^\s*-\s+generic\s+\[ref=e\d+\]:\s+(Grupo [A-L]|Segundas de final|Oitavas de final|Quartas de final|Semifinal|Decisão do 3º lugar|Final)\s*$/
  const matchLinkRe = /^\s*-\s+link\s+"(.+?)"\s+\[ref=e\d+\]/
  const urlRe = /\/pt\/match-centre\/match\/17\/(\d+)\/(\d+)\/(\d+)/
  const labelRe = /^(.+?)\s+(\d{1,2}:\d{2})\s+(.+?)\s+Jogo\s+(\d+)\s+·\s+(\d{1,2})\s+(\w+)\s+(\d{4})\s+·\s+(.+?)\s+\((.+)\)$/

  const matches: Match[] = []
  let section: string | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const sect = line.match(sectionHeaderRe)
    if (sect) {
      section = sect[1]
      continue
    }

    const link = line.match(matchLinkRe)
    if (!link) continue
    const label = link[1]
    const urlLine = lines[i + 1] || ''
    const urlMatch = urlLine.match(urlRe)
    if (!urlMatch) continue
    const matchId = urlMatch[3]

    const m = label.match(labelRe)
    if (!m) {
      // Podem haver partidas mata-mata com labels diferentes, log e skip
      if (section && section !== 'Grupo A') {
        // do nothing — try alternative parse below
      }
      continue
    }
    const [, casa, horario, visitante, numeroStr, day, mes, year, estadio, cidade] = m
    const mIdx = MESES[mes.toLowerCase()]
    if (!mIdx) continue

    const iso = `${year}-${String(mIdx).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const numero = parseInt(numeroStr, 10)

    let fase: string
    let grupo: string | null = null
    if (section && section.startsWith('Grupo ')) {
      fase = 'Primeira fase'
      grupo = section.replace('Grupo ', '')
    } else {
      fase = section || ''
    }

    const isMataMata = fase !== 'Primeira fase'

    matches.push({
      numero,
      data: iso,
      dataLabel: `${day} ${mes} ${year}`,
      horario,
      fase,
      grupo,
      casa: casa.trim(),
      visitante: visitante.trim(),
      estadio: estadio.trim(),
      cidade: cidade.trim(),
      matchId,
      url: `https://www.fifa.com/pt/match-centre/match/17/${urlMatch[1]}/${urlMatch[2]}/${matchId}`,
      isMataMata,
    })
  }

  matches.sort((a, b) => a.numero - b.numero)

  const md = buildMarkdown(matches)
  writeFileSync('docs/fifa-copa-2026-jogos.md', md)
  writeFileSync('docs/fifa-copa-2026-jogos.json', JSON.stringify(matches, null, 2))
  console.log(`Gerados ${matches.length} jogos com numeracao oficial FIFA.`)
}

function buildMarkdown(matches: Match[]): string {
  const lines: string[] = []
  lines.push('# Copa do Mundo FIFA 2026 — Grade oficial de jogos')
  lines.push('')
  lines.push('Fonte: https://www.fifa.com/pt/tournaments/mens/worldcup/canadamexicousa2026/scores-fixtures?sortBy=groups')
  lines.push(`Extraído em: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('> **Numeração oficial FIFA:** extraída da página com `sortBy=groups`, que expõe o canonical match number em cada card.')
  lines.push('> **Fuso horário:** horários em fuso local do estádio (validado cruzando com a página de detalhe do Jogo 1).')
  lines.push('')
  lines.push(`Total de partidas: ${matches.length}`)
  lines.push('')

  const fases = ['Primeira fase', 'Segundas de final', 'Oitavas de final', 'Quartas de final', 'Semifinal', 'Decisão do 3º lugar', 'Final']
  for (const fase of fases) {
    const grupo = matches.filter(m => m.fase === fase)
    if (grupo.length === 0) continue
    lines.push(`## ${fase} (${grupo.length} jogos)`)
    lines.push('')
    lines.push('| Jogo FIFA | Data | Hora (local) | Grupo | Casa | × | Visitante | Estádio | Cidade | FIFA |')
    lines.push('|---|---|---|---|---|---|---|---|---|---|')
    for (const m of grupo) {
      lines.push(`| ${m.numero} | ${m.data} | ${m.horario} | ${m.grupo || '—'} | ${m.casa} | × | ${m.visitante} | ${m.estadio} | ${m.cidade} | [link](${m.url}) |`)
    }
    lines.push('')
  }
  return lines.join('\n')
}

main()
