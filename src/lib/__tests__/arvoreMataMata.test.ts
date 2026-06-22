import { describe, it, expect } from 'vitest'
import { montarColunasBracket } from '../arvoreMataMata'
import type { Fase } from '../../types/calc'

interface J { numero: number; fase: Fase; labelCasa?: string; labelVisitante?: string }

// Mini-bracket: 4 jogos de 2ª fase (1-4) → 2 semis (5,6) → final (7) + 3º (8).
// Lado esq: jogos 1,2 → semi 5. Lado dir: jogos 3,4 → semi 6.
const JOGOS: J[] = [
  { numero: 1, fase: 'fase32', labelCasa: '1A', labelVisitante: '2B' },
  { numero: 2, fase: 'fase32', labelCasa: '1C', labelVisitante: '2D' },
  { numero: 3, fase: 'fase32', labelCasa: '1E', labelVisitante: '2F' },
  { numero: 4, fase: 'fase32', labelCasa: '1G', labelVisitante: '2H' },
  { numero: 5, fase: 'semi', labelCasa: 'W1', labelVisitante: 'W2' },
  { numero: 6, fase: 'semi', labelCasa: 'W3', labelVisitante: 'W4' },
  { numero: 7, fase: 'final', labelCasa: 'W5', labelVisitante: 'W6' },
  { numero: 8, fase: 'terceiro', labelCasa: 'RU5', labelVisitante: 'RU6' },
]

describe('montarColunasBracket', () => {
  it('separa os lados e centraliza a final', () => {
    const c = montarColunasBracket(JOGOS)
    expect(c.final?.numero).toBe(7)
    expect(c.terceiro?.numero).toBe(8)
    // Esquerda: folha (2ª fase) primeiro → [[1,2],[5]]
    expect(c.esquerda.map(col => col.map(j => j.numero))).toEqual([[1, 2], [5]])
    // Direita espelhada: semi primeiro → [[6],[3,4]]
    expect(c.direita.map(col => col.map(j => j.numero))).toEqual([[6], [3, 4]])
  })

  it('sem final retorna lados vazios (fallback)', () => {
    const c = montarColunasBracket(JOGOS.filter(j => j.fase !== 'final'))
    expect(c.final).toBe(null)
    expect(c.esquerda).toEqual([])
    expect(c.direita).toEqual([])
  })
})
