import { describe, it, expect } from 'vitest'
import { compararTerceirosFifa, selecionarMelhoresTerceiros } from '../melhoresTerceiros'
import type { ClassificacaoTime } from '../../types'

function terceiro(timeId: string, pontos: number, saldoGols: number, golsMarcados: number): ClassificacaoTime {
  return { timeId, pontos, jogos: 3, vitorias: 0, empates: 0, derrotas: 0, golsMarcados, golsSofridos: golsMarcados - saldoGols, saldoGols }
}

describe('selecionarMelhoresTerceiros', () => {
  it('deve selecionar os 8 melhores de 12 terceiros', () => {
    const terceiros = [
      terceiro('T_A', 4, 2, 3),
      terceiro('T_B', 4, 1, 2),
      terceiro('T_C', 3, 0, 2),
      terceiro('T_D', 3, -1, 1),
      terceiro('T_E', 3, 1, 3),
      terceiro('T_F', 6, 3, 4),
      terceiro('T_G', 1, -2, 1),
      terceiro('T_H', 4, 2, 4),
      terceiro('T_I', 3, 0, 1),
      terceiro('T_J', 2, -1, 2),
      terceiro('T_K', 1, -3, 0),
      terceiro('T_L', 0, -5, 0),
    ]
    const resultado = selecionarMelhoresTerceiros(terceiros)
    expect(resultado).toHaveLength(8)
    expect(resultado[0].timeId).toBe('T_F')
    const ids = resultado.map(r => r.timeId)
    expect(ids).not.toContain('T_L')
    expect(ids).not.toContain('T_K')
    expect(ids).not.toContain('T_G')
    expect(ids).not.toContain('T_J')
  })

  it('deve manter ordem deterministica por grupo quando disciplina tambem empata', () => {
    const paraguai = { ...terceiro('PAR', 3, -3, 1), grupo: 'D' }
    const panama = { ...terceiro('PAN', 3, -3, 1), grupo: 'L' }

    expect(compararTerceirosFifa(paraguai, panama, { PAR: -1, PAN: -1 })).toBeLessThan(0)
    expect(selecionarMelhoresTerceiros([panama, paraguai], { PAR: -1, PAN: -1 }).map(t => t.timeId))
      .toEqual(['PAR', 'PAN'])
  })
})
