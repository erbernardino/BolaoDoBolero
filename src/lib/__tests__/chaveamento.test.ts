import { describe, it, expect } from 'vitest'
import {
  montarTerceirosPorSlot,
  resolverTimeMataMataPorPalpites,
  resolverTimeMataMataPersonalizado,
  resolverTimePorLabelFifa,
} from '../chaveamento'
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

  it('deve resolver label FIFA de grupo, como 1A e 2B', () => {
    const classificacoes = {
      A: [
        { timeId: 'MEX', pontos: 7, jogos: 3, vitorias: 2, empates: 1, derrotas: 0, golsMarcados: 5, golsSofridos: 2, saldoGols: 3 },
        { timeId: 'KOR', pontos: 5, jogos: 3, vitorias: 1, empates: 2, derrotas: 0, golsMarcados: 4, golsSofridos: 2, saldoGols: 2 },
      ],
      B: [
        { timeId: 'CAN', pontos: 9, jogos: 3, vitorias: 3, empates: 0, derrotas: 0, golsMarcados: 6, golsSofridos: 1, saldoGols: 5 },
        { timeId: 'SUI', pontos: 4, jogos: 3, vitorias: 1, empates: 1, derrotas: 1, golsMarcados: 3, golsSofridos: 3, saldoGols: 0 },
      ],
    }

    expect(resolverTimePorLabelFifa('1A', classificacoes, {}, [])).toBe('MEX')
    expect(resolverTimePorLabelFifa('2B', classificacoes, {}, [])).toBe('SUI')
  })

  it('deve resolver W/RU por numero do jogo usando apenas o palpite do usuario', () => {
    const ts = Timestamp.now()
    const jogos = [{ id: 'fase32_2', numero: 74 }, { id: 'semi_1', numero: 101 }]
    const palpitesMap: Record<string, Palpite> = {
      fase32_2: { id: 'u1_fase32_2', uid: 'u1', jogoId: 'fase32_2', timeCasa: 'BRA', timeVisitante: 'ALE', golsCasa: 3, golsVisitante: 1, classificado: null, criadoEm: ts },
      semi_1: { id: 'u1_semi_1', uid: 'u1', jogoId: 'semi_1', timeCasa: 'BRA', timeVisitante: 'ARG', golsCasa: 1, golsVisitante: 1, classificado: 'ARG', criadoEm: ts },
    }

    expect(resolverTimePorLabelFifa('W74', {}, palpitesMap, jogos)).toBe('BRA')
    expect(resolverTimePorLabelFifa('RU101', {}, palpitesMap, jogos)).toBe('BRA')
  })

  it('deve alocar terceiros por slot FIFA sem reutilizar o mesmo time', () => {
    const classificacoes = {
      A: [
        { timeId: 'A1', pontos: 9, jogos: 3, vitorias: 3, empates: 0, derrotas: 0, golsMarcados: 6, golsSofridos: 1, saldoGols: 5 },
        { timeId: 'A2', pontos: 6, jogos: 3, vitorias: 2, empates: 0, derrotas: 1, golsMarcados: 5, golsSofridos: 3, saldoGols: 2 },
        { timeId: 'A3', pontos: 4, jogos: 3, vitorias: 1, empates: 1, derrotas: 1, golsMarcados: 4, golsSofridos: 3, saldoGols: 1 },
      ],
      B: [
        { timeId: 'B1', pontos: 9, jogos: 3, vitorias: 3, empates: 0, derrotas: 0, golsMarcados: 6, golsSofridos: 1, saldoGols: 5 },
        { timeId: 'B2', pontos: 6, jogos: 3, vitorias: 2, empates: 0, derrotas: 1, golsMarcados: 5, golsSofridos: 3, saldoGols: 2 },
        { timeId: 'B3', pontos: 5, jogos: 3, vitorias: 1, empates: 2, derrotas: 0, golsMarcados: 5, golsSofridos: 2, saldoGols: 3 },
      ],
      C: [
        { timeId: 'C1', pontos: 9, jogos: 3, vitorias: 3, empates: 0, derrotas: 0, golsMarcados: 6, golsSofridos: 1, saldoGols: 5 },
        { timeId: 'C2', pontos: 6, jogos: 3, vitorias: 2, empates: 0, derrotas: 1, golsMarcados: 5, golsSofridos: 3, saldoGols: 2 },
        { timeId: 'C3', pontos: 3, jogos: 3, vitorias: 1, empates: 0, derrotas: 2, golsMarcados: 3, golsSofridos: 4, saldoGols: -1 },
      ],
    }
    const melhores = [classificacoes.B[2], classificacoes.A[2], classificacoes.C[2]]
    const slots = montarTerceirosPorSlot(
      [
        { id: 'fase32_2', numero: 74, labelVisitante: '3ABC' },
        { id: 'fase32_5', numero: 77, labelVisitante: '3ABC' },
      ],
      classificacoes,
      melhores,
    )

    expect(slots['fase32_2:visitante']).toBe('B3')
    expect(slots['fase32_5:visitante']).toBe('A3')
  })

  it('deve realocar terceiros por backtracking para nao deixar slot posterior vazio', () => {
    const classificacoes = Object.fromEntries(
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map(grupo => [
        grupo,
        [
          { timeId: `${grupo}1`, pontos: 9, jogos: 3, vitorias: 3, empates: 0, derrotas: 0, golsMarcados: 6, golsSofridos: 1, saldoGols: 5 },
          { timeId: `${grupo}2`, pontos: 6, jogos: 3, vitorias: 2, empates: 0, derrotas: 1, golsMarcados: 5, golsSofridos: 3, saldoGols: 2 },
          { timeId: `${grupo}3`, pontos: 3, jogos: 3, vitorias: 1, empates: 0, derrotas: 2, golsMarcados: 3, golsSofridos: 4, saldoGols: -1 },
        ],
      ]),
    )
    const melhores = ['K', 'J', 'I', 'H', 'B', 'E', 'A', 'L'].map(grupo => classificacoes[grupo][2])
    const slots = montarTerceirosPorSlot(
      [
        { id: 'fase32_2', numero: 74, labelVisitante: '3ABCDF' },
        { id: 'fase32_5', numero: 77, labelVisitante: '3CDFGH' },
        { id: 'fase32_7', numero: 79, labelVisitante: '3CEFHI' },
        { id: 'fase32_8', numero: 80, labelVisitante: '3EHIJK' },
        { id: 'fase32_9', numero: 81, labelVisitante: '3BEFIJ' },
        { id: 'fase32_10', numero: 82, labelVisitante: '3AEHIJ' },
        { id: 'fase32_13', numero: 85, labelVisitante: '3EFGIJ' },
        { id: 'fase32_15', numero: 87, labelVisitante: '3DEIJL' },
      ],
      classificacoes,
      melhores,
    )

    expect(slots['fase32_13:visitante']).not.toBeNull()
    const preenchidos = Object.values(slots).filter(Boolean)
    expect(preenchidos).toHaveLength(8)
    expect(new Set(preenchidos).size).toBe(8)
  })

  it('deve resolver jogo com origem nula usando label FIFA', () => {
    const classificacoes = {
      A: [
        { timeId: 'A1', pontos: 9, jogos: 3, vitorias: 3, empates: 0, derrotas: 0, golsMarcados: 6, golsSofridos: 1, saldoGols: 5 },
      ],
    }

    const resultado = resolverTimeMataMataPersonalizado({
      origem: null,
      label: '1A',
      slotKey: 'fase32_7:casa',
      classificacoesPorGrupo: classificacoes,
      palpitesPorJogoId: {},
      melhoresTerceiros: [],
      terceirosPorSlot: {},
      jogos: [],
    })

    expect(resultado).toBe('A1')
  })
})
