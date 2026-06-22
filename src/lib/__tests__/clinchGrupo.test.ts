import { describe, it, expect } from 'vitest'
import { calcularClinchGrupo } from '../clinchGrupo'
import type { Jogo, Resultado } from '../../types'

// Factory de Jogo mínimo: clinch só usa timeCasa/timeVisitante/encerrado/resultado.
function jogo(
  timeCasa: string,
  timeVisitante: string,
  placar: [number, number] | null,
): Jogo {
  const resultado: Resultado | null = placar
    ? { golsCasa: placar[0], golsVisitante: placar[1], classificado: null }
    : null
  return {
    id: `${timeCasa}-${timeVisitante}`,
    numero: 0,
    fase: 'grupos',
    grupo: 'A',
    timeCasa,
    timeVisitante,
    origemCasa: null,
    origemVisitante: null,
    dataHora: { toDate: () => new Date(0) } as never,
    resultado,
    encerrado: placar !== null,
  }
}

const TIMES = ['T1', 'T2', 'T3', 'T4']
// Round-robin de 4 times = 6 jogos.
function todosJogos(placares: Record<string, [number, number] | null>): Jogo[] {
  const pares: [string, string][] = [
    ['T1', 'T2'], ['T3', 'T4'], ['T1', 'T3'],
    ['T2', 'T4'], ['T1', 'T4'], ['T2', 'T3'],
  ]
  return pares.map(([a, b]) => jogo(a, b, placares[`${a}-${b}`] ?? null))
}

describe('calcularClinchGrupo', () => {
  it('sem jogos cadastrados: todos indefinidos', () => {
    const r = calcularClinchGrupo([], TIMES)
    for (const t of TIMES) {
      expect(r[t].classificadoTop2).toBe(false)
      expect(r[t].posicaoExataGarantida).toBe(null)
      expect(r[t].eliminado).toBe(false)
    }
  })

  it('clinch antecipado de 1º: T1 vence 2 jogos e ninguém alcança seus pontos', () => {
    // T1 venceu T2 e T3 (6 pts). Restam: T3-T4, T2-T4, T1-T4, T2-T3.
    // Máximo de qualquer rival ao fim < 6? T4 pode chegar a 9 (vence 3). Então NÃO é clinch de 1º ainda.
    // Para garantir 1º cedo, fechamos mais jogos:
    const jogos = todosJogos({
      'T1-T2': [1, 0], 'T1-T3': [1, 0], 'T1-T4': [1, 0], // T1 = 9 pts, todos seus jogos feitos
      'T2-T4': null, 'T3-T4': null, 'T2-T3': null,
    })
    const r = calcularClinchGrupo(jogos, TIMES)
    // T1 com 9 pts; ninguém pode passar de 6 → 1º garantido.
    expect(r['T1'].posicaoExataGarantida).toBe(1)
    expect(r['T1'].classificadoTop2).toBe(true)
  })

  it('clinch de top-2 sem posição exata: dois líderes empatados em cenários, 1º/2º indefinido', () => {
    // T1 e T2 venceram T3 e T4; ainda falta T1-T2. Ambos garantem top-2, mas quem é 1º depende de T1-T2.
    const jogos = todosJogos({
      'T1-T3': [1, 0], 'T1-T4': [1, 0], 'T2-T3': [1, 0], 'T2-T4': [1, 0],
      'T3-T4': [0, 0],
      'T1-T2': null,
    })
    const r = calcularClinchGrupo(jogos, TIMES)
    expect(r['T1'].classificadoTop2).toBe(true)
    expect(r['T2'].classificadoTop2).toBe(true)
    expect(r['T1'].posicaoExataGarantida).toBe(null)
    expect(r['T2'].posicaoExataGarantida).toBe(null)
    // T3 e T4 não podem mais alcançar top-2 (máx 1 ponto cada) → eliminados.
    expect(r['T3'].eliminado).toBe(true)
    expect(r['T4'].eliminado).toBe(true)
  })

  it('grupo completo: consistente com calcularClassificacaoGrupo', () => {
    const jogos = todosJogos({
      'T1-T2': [2, 0], 'T1-T3': [2, 0], 'T1-T4': [2, 0], // T1 9 pts (1º)
      'T2-T3': [1, 0], 'T2-T4': [1, 0],                   // T2 6 pts (2º)
      'T3-T4': [1, 0],                                     // T3 3 pts (3º), T4 0 (4º)
    })
    const r = calcularClinchGrupo(jogos, TIMES)
    expect(r['T1'].posicaoExataGarantida).toBe(1)
    expect(r['T2'].posicaoExataGarantida).toBe(2)
    expect(r['T1'].classificadoTop2).toBe(true)
    expect(r['T2'].classificadoTop2).toBe(true)
    expect(r['T3'].eliminado).toBe(true)
    expect(r['T4'].eliminado).toBe(true)
  })

  it('falso-negativo conservador: empate em pontos não dá clinch de top-2 mesmo com saldo melhor', () => {
    // Após rodadas, T1, T2, T3 todos com 3 pts e jogos restantes que podem manter empate em pontos.
    // T1 tem saldo melhor, mas regra é por pontos: não garante top-2.
    const jogos = todosJogos({
      'T1-T2': [3, 0], 'T3-T4': [1, 0],
      'T1-T3': null, 'T2-T4': null, 'T1-T4': null, 'T2-T3': null,
    })
    const r = calcularClinchGrupo(jogos, TIMES)
    // T1 (3 pts, saldo +3) não pode ser declarado top-2 garantido: existe cenário com >1 time >= seus pontos.
    expect(r['T1'].classificadoTop2).toBe(false)
  })
})
