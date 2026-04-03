import { describe, it, expect } from 'vitest'
import { calcularPontosPalpite } from '../pontuacao'

describe('calcularPontosPalpite', () => {
  const config = { placarExato: 5, colunaCerta: 3, totalGols: 1 }

  // Exemplo do regulamento: jogo real = Brasil 2x2 Suíça
  it('BRA 2x0 SUI → 0 pts (errou coluna e total de gols)', () => {
    const resultado = calcularPontosPalpite(
      { golsCasa: 2, golsVisitante: 0 },
      { golsCasa: 2, golsVisitante: 2 },
      config,
    )
    expect(resultado).toEqual({ pontos: 0, tipo: null })
  })

  it('BRA 3x1 SUI → 1 pt (errou coluna, acertou total de gols = 4)', () => {
    const resultado = calcularPontosPalpite(
      { golsCasa: 3, golsVisitante: 1 },
      { golsCasa: 2, golsVisitante: 2 },
      config,
    )
    expect(resultado).toEqual({ pontos: 1, tipo: 'totalGols' })
  })

  it('BRA 1x1 SUI → 3 pts (acertou coluna/empate, errou resultado)', () => {
    const resultado = calcularPontosPalpite(
      { golsCasa: 1, golsVisitante: 1 },
      { golsCasa: 2, golsVisitante: 2 },
      config,
    )
    expect(resultado).toEqual({ pontos: 3, tipo: 'colunaCerta' })
  })

  it('BRA 2x2 SUI → 5 pts (acertou coluna e resultado = placar exato)', () => {
    const resultado = calcularPontosPalpite(
      { golsCasa: 2, golsVisitante: 2 },
      { golsCasa: 2, golsVisitante: 2 },
      config,
    )
    expect(resultado).toEqual({ pontos: 5, tipo: 'placarExato' })
  })

  // Casos adicionais
  it('acertar vencedor mas errar placar → 3 pts (coluna certa)', () => {
    const resultado = calcularPontosPalpite(
      { golsCasa: 3, golsVisitante: 0 },
      { golsCasa: 1, golsVisitante: 0 },
      config,
    )
    expect(resultado).toEqual({ pontos: 3, tipo: 'colunaCerta' })
  })

  it('placar exato com vitória → 5 pts', () => {
    const resultado = calcularPontosPalpite(
      { golsCasa: 2, golsVisitante: 1 },
      { golsCasa: 2, golsVisitante: 1 },
      config,
    )
    expect(resultado).toEqual({ pontos: 5, tipo: 'placarExato' })
  })

  it('placar exato 0x0 → 5 pts', () => {
    const resultado = calcularPontosPalpite(
      { golsCasa: 0, golsVisitante: 0 },
      { golsCasa: 0, golsVisitante: 0 },
      config,
    )
    expect(resultado).toEqual({ pontos: 5, tipo: 'placarExato' })
  })

  it('errou coluna mas mesmo total de gols → 1 pt', () => {
    // Apostou 0x2 (visitante vence, total 2), real 1x1 (empate, total 2)
    const resultado = calcularPontosPalpite(
      { golsCasa: 0, golsVisitante: 2 },
      { golsCasa: 1, golsVisitante: 1 },
      config,
    )
    expect(resultado).toEqual({ pontos: 1, tipo: 'totalGols' })
  })

  it('errou tudo (coluna errada e total de gols diferente) → 0 pts', () => {
    const resultado = calcularPontosPalpite(
      { golsCasa: 0, golsVisitante: 2 },
      { golsCasa: 1, golsVisitante: 0 },
      config,
    )
    expect(resultado).toEqual({ pontos: 0, tipo: null })
  })

  it('coluna certa tem prioridade sobre total de gols', () => {
    // Apostou 3x1 (casa vence, total 4), real 2x0 (casa vence, total 2)
    // Coluna certa → 3 pts (não 0 pts por total errado)
    const resultado = calcularPontosPalpite(
      { golsCasa: 3, golsVisitante: 1 },
      { golsCasa: 2, golsVisitante: 0 },
      config,
    )
    expect(resultado).toEqual({ pontos: 3, tipo: 'colunaCerta' })
  })

  it('coluna certa com mesmo total de gols → ainda 3 pts (não soma)', () => {
    // Apostou 3x0 (casa vence, total 3), real 2x1 (casa vence, total 3)
    // Coluna certa → 3 pts (não 3+1, é não-cumulativo)
    const resultado = calcularPontosPalpite(
      { golsCasa: 3, golsVisitante: 0 },
      { golsCasa: 2, golsVisitante: 1 },
      config,
    )
    expect(resultado).toEqual({ pontos: 3, tipo: 'colunaCerta' })
  })
})
