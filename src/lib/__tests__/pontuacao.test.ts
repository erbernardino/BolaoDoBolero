import { describe, it, expect } from 'vitest'
import { calcularPontosPalpite } from '../pontuacao'

describe('calcularPontosPalpite', () => {
  const config = { placarExato: 10, placarUmTime: 5, vencedor: 3 }

  it('deve dar pontos de placar exato', () => {
    const resultado = calcularPontosPalpite({ golsCasa: 2, golsVisitante: 1 }, { golsCasa: 2, golsVisitante: 1 }, config)
    expect(resultado).toEqual({ pontos: 10, tipo: 'placarExato' })
  })

  it('deve dar pontos de placar de um time (acertou gols da casa)', () => {
    const resultado = calcularPontosPalpite({ golsCasa: 2, golsVisitante: 0 }, { golsCasa: 2, golsVisitante: 1 }, config)
    expect(resultado).toEqual({ pontos: 5, tipo: 'placarUmTime' })
  })

  it('deve dar pontos de placar de um time (acertou gols do visitante)', () => {
    const resultado = calcularPontosPalpite({ golsCasa: 3, golsVisitante: 1 }, { golsCasa: 2, golsVisitante: 1 }, config)
    expect(resultado).toEqual({ pontos: 5, tipo: 'placarUmTime' })
  })

  it('deve dar pontos de vencedor acertado', () => {
    const resultado = calcularPontosPalpite({ golsCasa: 3, golsVisitante: 0 }, { golsCasa: 1, golsVisitante: 0 }, config)
    expect(resultado).toEqual({ pontos: 3, tipo: 'vencedor' })
  })

  it('deve dar pontos de empate acertado', () => {
    const resultado = calcularPontosPalpite({ golsCasa: 2, golsVisitante: 2 }, { golsCasa: 1, golsVisitante: 1 }, config)
    expect(resultado).toEqual({ pontos: 3, tipo: 'vencedor' })
  })

  it('deve dar 0 pontos quando errou tudo', () => {
    const resultado = calcularPontosPalpite({ golsCasa: 0, golsVisitante: 2 }, { golsCasa: 1, golsVisitante: 0 }, config)
    expect(resultado).toEqual({ pontos: 0, tipo: null })
  })

  it('placar exato de empate', () => {
    const resultado = calcularPontosPalpite({ golsCasa: 1, golsVisitante: 1 }, { golsCasa: 1, golsVisitante: 1 }, config)
    expect(resultado).toEqual({ pontos: 10, tipo: 'placarExato' })
  })

  it('acertou gols de um time mas errou o vencedor — ainda recebe 5', () => {
    const resultado = calcularPontosPalpite({ golsCasa: 1, golsVisitante: 2 }, { golsCasa: 1, golsVisitante: 0 }, config)
    expect(resultado).toEqual({ pontos: 5, tipo: 'placarUmTime' })
  })
})
