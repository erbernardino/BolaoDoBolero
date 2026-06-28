#!/usr/bin/env node
/**
 * Gera src/lib/data/terceirosFifa2026.ts a partir do wikitext oficial da tabela
 * de alocação dos 8 melhores terceiros (Template:2026 FIFA World Cup third-place
 * table — 495 combinações publicadas pela FIFA).
 *
 * Entrada: caminho do wikitext (baixado de ?action=raw). Uso:
 *   npx tsx scripts/gerar-tabela-terceiros-fifa.ts docs/fifa-2026-third-place-table.wiki > src/lib/data/terceirosFifa2026.ts
 *
 * Fonte commitada em docs/fifa-2026-third-place-table.wiki (baixada de ?action=raw).
 */
import { readFileSync } from 'node:fs'

const SLOTS = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'] // ordem das 8 colunas de vencedores

const raw = readFileSync(process.argv[2], 'utf8')
// Divide em blocos por número de combinação: `! scope="row" | N`
const blocos = raw.split(/!\s*scope="row"\s*\|\s*(\d+)/).slice(1)
const tabela: Record<string, Record<string, string>> = {}
let count = 0
for (let i = 0; i < blocos.length; i += 2) {
  const num = blocos[i]
  const corpo = blocos[i + 1]
  const grupos = [...corpo.matchAll(/'''([A-L])'''/g)].map(m => m[1])
  const atribs = [...corpo.matchAll(/\b3([A-L])\b/g)].map(m => m[1])
  if (grupos.length !== 8 || atribs.length !== 8) {
    throw new Error(`Combinação ${num}: ${grupos.length} grupos, ${atribs.length} atribuições (esperado 8/8)`)
  }
  const chave = [...grupos].sort().join('')
  const set = new Set(grupos)
  const mapa: Record<string, string> = {}
  atribs.forEach((g, idx) => {
    if (!set.has(g)) throw new Error(`Comb ${num}: atribui 3${g} fora da combinação ${chave}`)
    mapa[SLOTS[idx]] = g
  })
  if (new Set(atribs).size !== 8) throw new Error(`Comb ${num}: atribuições repetidas`)
  if (tabela[chave]) throw new Error(`Combinação duplicada: ${chave}`)
  tabela[chave] = mapa
  count++
}
if (count !== 495) throw new Error(`Esperado 495 combinações, achei ${count}`)

// validação âncora: combinação real da Copa
const anc = tabela['BDEFIJKL']
const esp = { A:'E', B:'J', D:'B', E:'D', G:'I', I:'F', K:'L', L:'K' }
for (const k of SLOTS) if (anc?.[k] !== (esp as any)[k]) throw new Error(`Âncora BDEFIJKL falhou no slot 1${k}: ${anc?.[k]} != ${(esp as any)[k]}`)

const linhas = Object.keys(tabela).sort().map(k => {
  const m = tabela[k]
  const inner = SLOTS.map(s => `${s}:'${m[s]}'`).join(', ')
  return `  '${k}': { ${inner} },`
})

process.stdout.write(`// GERADO por scripts/gerar-tabela-terceiros-fifa.ts — NÃO editar à mão.
// Fonte: Template:2026 FIFA World Cup third-place table (FIFA, 495 combinações oficiais).
// Chave = combinação ordenada dos 8 grupos cujo 3º colocado se classifica.
// Valor = { <grupo do 1º colocado>: <grupo do 3º colocado adversário> }.
// Colunas de vencedores na ordem oficial: 1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L.

export type AtribuicaoTerceiros = Record<string, string>

export const TABELA_TERCEIROS_FIFA_2026: Record<string, AtribuicaoTerceiros> = {
${linhas.join('\n')}
}

/** Grupos cujos vencedores enfrentam um melhor terceiro (ordem oficial das colunas). */
export const SLOTS_VENCEDORES_TERCEIROS = ['A', 'B', 'D', 'E', 'G', 'I', 'K', 'L'] as const
`)
console.error(`OK: ${count} combinações, âncora BDEFIJKL validada.`)
