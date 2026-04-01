import { describe, it, expect } from 'vitest'
import { calcularClassificacaoGrupo } from '../classificacao'
import type { Palpite } from '../../types'
import { Timestamp } from 'firebase/firestore'

const ts = Timestamp.now()

function palpite(jogoId: string, casa: string, visitante: string, golsCasa: number, golsVisitante: number): Palpite {
  return { id: `u1_${jogoId}`, uid: 'u1', jogoId, timeCasa: casa, timeVisitante: visitante, golsCasa, golsVisitante, classificado: null, criadoEm: ts }
}

describe('calcularClassificacaoGrupo', () => {
  const times = ['BRA', 'ALE', 'JAP', 'CAN']

  it('deve classificar corretamente com resultados distintos', () => {
    const palpites: Palpite[] = [
      palpite('j1', 'BRA', 'ALE', 2, 0),
      palpite('j2', 'JAP', 'CAN', 1, 0),
      palpite('j3', 'BRA', 'JAP', 1, 1),
      palpite('j4', 'ALE', 'CAN', 3, 0),
      palpite('j5', 'BRA', 'CAN', 2, 0),
      palpite('j6', 'ALE', 'JAP', 1, 2),
    ]
    const resultado = calcularClassificacaoGrupo(palpites, times)
    expect(resultado[0].timeId).toBe('BRA')
    expect(resultado[0].pontos).toBe(7)
    expect(resultado[1].timeId).toBe('JAP')
    expect(resultado[1].pontos).toBe(7)
    expect(resultado[2].timeId).toBe('ALE')
    expect(resultado[3].timeId).toBe('CAN')
  })

  it('deve desempatar por saldo de gols', () => {
    const palpites: Palpite[] = [
      palpite('j1', 'BRA', 'ALE', 3, 0),
      palpite('j2', 'JAP', 'CAN', 1, 0),
      palpite('j3', 'BRA', 'JAP', 0, 1),
      palpite('j4', 'ALE', 'CAN', 0, 1),
      palpite('j5', 'BRA', 'CAN', 0, 1),
      palpite('j6', 'ALE', 'JAP', 0, 1),
    ]
    const resultado = calcularClassificacaoGrupo(palpites, times)
    expect(resultado[0].timeId).toBe('JAP')
    expect(resultado[1].timeId).toBe('CAN')
  })
})
