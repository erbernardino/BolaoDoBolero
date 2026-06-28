import { describe, it, expect } from 'vitest'
import { TABELA_TERCEIROS_FIFA_2026, SLOTS_VENCEDORES_TERCEIROS } from '../terceirosFifa2026'

describe('TABELA_TERCEIROS_FIFA_2026 — integridade das 495 combinações oficiais', () => {
  const entradas = Object.entries(TABELA_TERCEIROS_FIFA_2026)

  it('tem exatamente 495 combinações', () => {
    expect(entradas).toHaveLength(495)
  })

  it('cada chave é uma combinação ordenada de 8 grupos distintos (A–L)', () => {
    for (const [chave] of entradas) {
      expect(chave).toMatch(/^[A-L]{8}$/)
      expect([...chave].sort().join('')).toBe(chave) // ordenada
      expect(new Set(chave).size).toBe(8) // distintos
    }
  })

  it('cada atribuição usa os 8 slots de vencedor e atribui os 8 terceiros da combinação (bijeção)', () => {
    const slots = [...SLOTS_VENCEDORES_TERCEIROS].sort().join('')
    for (const [chave, mapa] of entradas) {
      // chaves do mapa == os 8 grupos de vencedores
      expect(Object.keys(mapa).sort().join('')).toBe(slots)
      // valores == exatamente a combinação (cada terceiro alocado uma vez)
      expect(Object.values(mapa).sort().join('')).toBe(chave)
    }
  })

  it('âncora: combinação real da Copa 2026 (BDEFIJKL) bate com o Round of 32 oficial', () => {
    expect(TABELA_TERCEIROS_FIFA_2026['BDEFIJKL']).toEqual(
      { A: 'E', B: 'J', D: 'B', E: 'D', G: 'I', I: 'F', K: 'L', L: 'K' },
    )
  })
})
