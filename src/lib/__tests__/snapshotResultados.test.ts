import { describe, it, expect } from 'vitest'
import { montarSnapshotResultados } from '../snapshotResultados'
import type { JogoCalc, Resultado } from '../../types/calc'
import type { GrupoRef } from '../bracketUsuario'

function jogoGrupo(id: string, grupo: string, casa: string, vis: string, placar: [number, number] | null): JogoCalc {
  const resultado: Resultado | null = placar
    ? { golsCasa: placar[0], golsVisitante: placar[1], classificado: null } : null
  return {
    id, numero: 0, fase: 'grupos', grupo, timeCasa: casa, timeVisitante: vis,
    origemCasa: null, origemVisitante: null, resultado, encerrado: placar !== null,
  }
}

function jogoMata(id: string, numero: number, labelCasa: string, labelVisitante: string): JogoCalc {
  return {
    id, numero, fase: 'fase32', grupo: null, timeCasa: '', timeVisitante: '',
    origemCasa: null, origemVisitante: null, resultado: null, encerrado: false,
    labelCasa, labelVisitante,
  }
}

const GRUPOS: GrupoRef[] = [{ nome: 'Grupo A', times: ['BRA', 'ARG', 'ESP', 'GER'] }]

describe('montarSnapshotResultados', () => {
  it('monta classificações, clinch e bracket por grupo/jogo, com baseadoEm correto', () => {
    const jogos: JogoCalc[] = [
      jogoGrupo('a1', 'A', 'BRA', 'ARG', [2, 0]),
      jogoGrupo('a2', 'A', 'ESP', 'GER', [1, 0]),
      jogoGrupo('a3', 'A', 'BRA', 'ESP', null),
      jogoGrupo('a4', 'A', 'ARG', 'GER', null),
      jogoGrupo('a5', 'A', 'BRA', 'GER', null),
      jogoGrupo('a6', 'A', 'ARG', 'ESP', null),
      jogoMata('m1', 73, '1A', '2A'),
    ]
    const snap = montarSnapshotResultados(jogos, GRUPOS)

    expect(snap.classificacoes['A']).toBeDefined()
    expect(snap.classificacoes['A'].length).toBe(4)
    expect(snap.classificacoes['A'][0].timeId).toBe('BRA') // 1º atual

    expect(snap.clinch['A']).toBeDefined()
    expect(snap.clinch['A']['BRA']).toBeDefined()
    expect(typeof snap.clinch['A']['BRA'].classificadoTop2).toBe('boolean')

    expect(Object.keys(snap.bracket)).toEqual(['m1'])
    expect(snap.bracket['m1'].casa.timeId).toBe('BRA')      // 1A provisório = líder atual
    expect(snap.bracket['m1'].visitante.timeId).toBe('ESP') // 2A provisório

    expect(snap.baseadoEm.jogosEncerrados).toBe(2)
  })

  it('não inclui jogos de grupos no bracket', () => {
    const jogos: JogoCalc[] = [jogoGrupo('a1', 'A', 'BRA', 'ARG', [1, 0])]
    const snap = montarSnapshotResultados(jogos, GRUPOS)
    expect(snap.bracket).toEqual({})
  })
})
