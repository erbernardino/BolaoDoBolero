import { describe, it, expect } from 'vitest'
import { resolverTimeMataMataPorPalpites } from '../chaveamento'
import type { Origem, Palpite } from '../../types'
import { Timestamp } from 'firebase/firestore'

describe('resolverTimeMataMataPorPalpites', () => {
  it('deve resolver origem de grupo', () => {
    const origem: Origem = { tipo: 'grupo', grupo: 'A', posicao: 1 }
    const classificacoes = {
      A: [
        { timeId: 'BRA', pontos: 9, jogos: 3, vitorias: 3, empates: 0, derrotas: 0, golsMarcados: 6, golsSofridos: 0, saldoGols: 6 },
        { timeId: 'ALE', pontos: 6, jogos: 3, vitorias: 2, empates: 0, derrotas: 1, golsMarcados: 4, golsSofridos: 2, saldoGols: 2 },
      ],
    }
    const resultado = resolverTimeMataMataPorPalpites(origem, classificacoes, {}, [])
    expect(resultado).toBe('BRA')
  })

  it('deve resolver origem de jogo anterior', () => {
    const origem: Origem = { tipo: 'jogo', jogoId: 'j_oitavas_1', resultado: 'vencedor' }
    const ts = Timestamp.now()
    const palpitesMap: Record<string, Palpite> = {
      j_oitavas_1: { id: 'u1_j_oitavas_1', uid: 'u1', jogoId: 'j_oitavas_1', timeCasa: 'BRA', timeVisitante: 'ALE', golsCasa: 2, golsVisitante: 1, classificado: null, criadoEm: ts },
    }
    const resultado = resolverTimeMataMataPorPalpites(origem, {}, palpitesMap, [])
    expect(resultado).toBe('BRA')
  })

  it('deve resolver empate no mata-mata com classificado', () => {
    const origem: Origem = { tipo: 'jogo', jogoId: 'j1', resultado: 'vencedor' }
    const ts = Timestamp.now()
    const palpitesMap: Record<string, Palpite> = {
      j1: { id: 'u1_j1', uid: 'u1', jogoId: 'j1', timeCasa: 'BRA', timeVisitante: 'ALE', golsCasa: 1, golsVisitante: 1, classificado: 'ALE', criadoEm: ts },
    }
    const resultado = resolverTimeMataMataPorPalpites(origem, {}, palpitesMap, [])
    expect(resultado).toBe('ALE')
  })
})
