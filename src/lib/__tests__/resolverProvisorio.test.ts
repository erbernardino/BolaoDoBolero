import { describe, it, expect } from 'vitest'
import { montarResolvedorProvisorio } from '../resolverProvisorio'
import type { Jogo, Resultado } from '../../types'
import type { GrupoRef } from '../bracketUsuario'

function jogoGrupo(id: string, grupo: string, casa: string, vis: string, placar: [number, number] | null): Jogo {
  const resultado: Resultado | null = placar
    ? { golsCasa: placar[0], golsVisitante: placar[1], classificado: null } : null
  return {
    id, numero: 0, fase: 'grupos', grupo, timeCasa: casa, timeVisitante: vis,
    origemCasa: null, origemVisitante: null, dataHora: {} as never,
    resultado, encerrado: placar !== null,
  }
}

function jogoMata(id: string, numero: number, labelCasa: string, labelVisitante: string): Jogo {
  return {
    id, numero, fase: 'fase32', grupo: null, timeCasa: '', timeVisitante: '',
    origemCasa: null, origemVisitante: null, dataHora: {} as never,
    resultado: null, encerrado: false, labelCasa, labelVisitante,
  }
}

const GRUPOS: GrupoRef[] = [
  { nome: 'Grupo A', times: ['BRA', 'ARG', 'ESP', 'GER'] },
]

describe('montarResolvedorProvisorio', () => {
  it('preenche 1A/2A provisoriamente pela classificação parcial atual', () => {
    // Grupo A parcial: BRA 2x0 ARG, ESP 1x0 GER. BRA 1º (saldo +2), ESP 2º (saldo +1).
    const jogos: Jogo[] = [
      jogoGrupo('a1', 'A', 'BRA', 'ARG', [2, 0]),
      jogoGrupo('a2', 'A', 'ESP', 'GER', [1, 0]),
      jogoGrupo('a3', 'A', 'BRA', 'ESP', null),
      jogoGrupo('a4', 'A', 'ARG', 'GER', null),
      jogoGrupo('a5', 'A', 'BRA', 'GER', null),
      jogoGrupo('a6', 'A', 'ARG', 'ESP', null),
      jogoMata('m1', 73, '1A', '2A'),
    ]
    const resolver = montarResolvedorProvisorio(jogos, GRUPOS)
    const r = resolver(jogos.find(j => j.id === 'm1')!)
    expect(r.casa.timeId).toBe('BRA')      // 1º atual
    expect(r.visitante.timeId).toBe('ESP') // 2º atual
    // Ninguém classificado ainda (1 jogo cada) → provisório, sem ✓.
    expect(r.casa.classificado).toBe(false)
    expect(r.casa.provisorio).toBe(true)
    expect(r.visitante.provisorio).toBe(true)
  })

  it('marca classificado (✓) quando o time tem clinch top-2, mas provisório enquanto a posição não trava', () => {
    // BRA e ESP vencem ARG e GER (cada 6 pts em 2 jogos). Falta BRA-ESP e ARG-GER.
    // BRA e ESP garantem top-2 (ARG/GER máx 3 < 6). Posição 1º/2º entre eles depende de BRA-ESP.
    const jogos: Jogo[] = [
      jogoGrupo('a1', 'A', 'BRA', 'ARG', [1, 0]),
      jogoGrupo('a2', 'A', 'BRA', 'GER', [1, 0]),
      jogoGrupo('a3', 'A', 'ESP', 'ARG', [1, 0]),
      jogoGrupo('a4', 'A', 'ESP', 'GER', [1, 0]),
      jogoGrupo('a5', 'A', 'BRA', 'ESP', null),
      jogoGrupo('a6', 'A', 'ARG', 'GER', null),
      jogoMata('m1', 73, '1A', '2A'),
    ]
    const resolver = montarResolvedorProvisorio(jogos, GRUPOS)
    const r = resolver(jogos.find(j => j.id === 'm1')!)
    // Ambos os slots devem trazer BRA e ESP (ordem por tiebreak), ambos classificados.
    expect([r.casa.timeId, r.visitante.timeId].sort()).toEqual(['BRA', 'ESP'])
    expect(r.casa.classificado).toBe(true)
    expect(r.visitante.classificado).toBe(true)
    // Posição 1º/2º ainda não travada → provisório.
    expect(r.casa.provisorio).toBe(true)
    expect(r.visitante.provisorio).toBe(true)
  })

  it('grupo completo: slot definido (não provisório) e classificado', () => {
    const jogos: Jogo[] = [
      jogoGrupo('a1', 'A', 'BRA', 'ARG', [3, 0]),
      jogoGrupo('a2', 'A', 'BRA', 'ESP', [3, 0]),
      jogoGrupo('a3', 'A', 'BRA', 'GER', [3, 0]),
      jogoGrupo('a4', 'A', 'ESP', 'ARG', [1, 0]),
      jogoGrupo('a5', 'A', 'ESP', 'GER', [1, 0]),
      jogoGrupo('a6', 'A', 'ARG', 'GER', [1, 0]),
      jogoMata('m1', 73, '1A', '2A'),
    ]
    const resolver = montarResolvedorProvisorio(jogos, GRUPOS)
    const r = resolver(jogos.find(j => j.id === 'm1')!)
    expect(r.casa.timeId).toBe('BRA')      // 1º
    expect(r.casa.provisorio).toBe(false)  // grupo completo → travado
    expect(r.casa.classificado).toBe(true)
    expect(r.visitante.timeId).toBe('ESP') // 2º
    expect(r.visitante.provisorio).toBe(false)
  })

  it('terceiros (3XYZ) permanecem como label (timeId null)', () => {
    const jogos: Jogo[] = [
      jogoGrupo('a1', 'A', 'BRA', 'ARG', [2, 0]),
      jogoMata('m1', 79, '1A', '3CEFHI'),
    ]
    const resolver = montarResolvedorProvisorio(jogos, GRUPOS)
    const r = resolver(jogos.find(j => j.id === 'm1')!)
    expect(r.visitante.timeId).toBe(null) // terceiro não resolve cedo
  })

  it('grupo sem jogos encerrados: slot de grupo permanece como label', () => {
    const jogos: Jogo[] = [
      jogoGrupo('a1', 'A', 'BRA', 'ARG', null),
      jogoMata('m1', 73, '1A', '2A'),
    ]
    const resolver = montarResolvedorProvisorio(jogos, GRUPOS)
    const r = resolver(jogos.find(j => j.id === 'm1')!)
    expect(r.casa.timeId).toBe(null)
    expect(r.visitante.timeId).toBe(null)
  })
})
