import { describe, it, expect } from 'vitest'
import {
  jogosParaPalpitesReais,
  calcularClassificacoesReais,
  montarResolvedorBracketOficial,
} from '../resultadosOficiais'
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

describe('jogosParaPalpitesReais', () => {
  it('converte só jogos encerrados e mapeia classificado', () => {
    const jogos = [
      jogoGrupo('j1', 'A', 'BRA', 'SRB', [2, 0]),
      jogoGrupo('j2', 'A', 'SUI', 'CMR', null),
    ]
    const map = jogosParaPalpitesReais(jogos)
    expect(Object.keys(map)).toEqual(['j1'])
    expect(map['j1'].golsCasa).toBe(2)
    expect(map['j1'].timeCasa).toBe('BRA')
    expect(map['j1'].classificado).toBe(null)
  })
})

describe('calcularClassificacoesReais', () => {
  it('classificação parcial com 1 jogo encerrado', () => {
    const grupos: GrupoRef[] = [{ nome: 'Grupo A', times: ['BRA', 'SRB', 'SUI', 'CMR'] }]
    const jogos = [jogoGrupo('j1', 'A', 'BRA', 'SRB', [2, 0])]
    const cls = calcularClassificacoesReais(jogos, grupos)
    expect(cls['A']).toBeDefined()
    expect(cls['A'][0].timeId).toBe('BRA')
    expect(cls['A'][0].pontos).toBe(3)
  })

  it('grupo sem jogos encerrados não entra no mapa', () => {
    const grupos: GrupoRef[] = [{ nome: 'Grupo A', times: ['BRA', 'SRB', 'SUI', 'CMR'] }]
    const cls = calcularClassificacoesReais([jogoGrupo('j1', 'A', 'BRA', 'SRB', null)], grupos)
    expect(cls['A']).toBeUndefined()
  })
})

describe('montarResolvedorBracketOficial', () => {
  it('resolve slot 1A quando o grupo A está completo', () => {
    const grupos: GrupoRef[] = [{ nome: 'Grupo A', times: ['BRA', 'SRB', 'SUI', 'CMR'] }]
    // BRA vence todos → 1º do A.
    const jogos: Jogo[] = [
      jogoGrupo('a1', 'A', 'BRA', 'SRB', [3, 0]),
      jogoGrupo('a2', 'A', 'BRA', 'SUI', [3, 0]),
      jogoGrupo('a3', 'A', 'BRA', 'CMR', [3, 0]),
      jogoGrupo('a4', 'A', 'SRB', 'SUI', [1, 0]),
      jogoGrupo('a5', 'A', 'SRB', 'CMR', [1, 0]),
      jogoGrupo('a6', 'A', 'SUI', 'CMR', [1, 0]),
    ]
    // Jogo de mata-mata cujo lado casa é "1º do grupo A".
    const jogoMata: Jogo = {
      id: 'm1', numero: 73, fase: 'fase32', grupo: null,
      timeCasa: '', timeVisitante: '',
      origemCasa: { tipo: 'grupo', grupo: 'A', posicao: 1 },
      origemVisitante: null, dataHora: {} as never, resultado: null, encerrado: false,
    }
    const resolver = montarResolvedorBracketOficial([...jogos, jogoMata], grupos)
    expect(resolver(jogoMata).casaId).toBe('BRA')
  })

  it('resolve cascata W## para o VENCEDOR RESOLVIDO mesmo com alimentador não materializado (timeCasa vazio)', () => {
    const grupos: GrupoRef[] = [{ nome: 'Grupo A', times: ['BRA', 'SRB', 'SUI', 'CMR'] }]
    // Grupo A completo: BRA 1º (9), SRB 2º (6), SUI 3º (3), CMR 4º (0).
    const jogos: Jogo[] = [
      jogoGrupo('a1', 'A', 'BRA', 'SRB', [3, 0]),
      jogoGrupo('a2', 'A', 'BRA', 'SUI', [3, 0]),
      jogoGrupo('a3', 'A', 'BRA', 'CMR', [3, 0]),
      jogoGrupo('a4', 'A', 'SRB', 'SUI', [1, 0]),
      jogoGrupo('a5', 'A', 'SRB', 'CMR', [1, 0]),
      jogoGrupo('a6', 'A', 'SUI', 'CMR', [1, 0]),
    ]
    // fase32 #73: 1A vs 2A, TIMES NÃO MATERIALIZADOS (timeCasa/Visitante = ''),
    // encerrado 0x2 → vence o visitante (2A = SRB).
    const fase32: Jogo = {
      id: 'f73', numero: 73, fase: 'fase32', grupo: null,
      timeCasa: '', timeVisitante: '', labelCasa: '1A', labelVisitante: '2A',
      origemCasa: null, origemVisitante: null, dataHora: {} as never,
      resultado: { golsCasa: 0, golsVisitante: 2, classificado: null }, encerrado: true,
    }
    // oitavas #89: casa = W73 (vencedor do 73), visitante = W74 (jogo inexistente/não jogado).
    const oitavas: Jogo = {
      id: 'o89', numero: 89, fase: 'oitavas', grupo: null,
      timeCasa: '', timeVisitante: '', labelCasa: 'W73', labelVisitante: 'W74',
      origemCasa: null, origemVisitante: null, dataHora: {} as never,
      resultado: null, encerrado: false,
    }
    const resolver = montarResolvedorBracketOficial([...jogos, fase32, oitavas], grupos)
    // o alimentador resolve seus próprios times pelos labels de grupo:
    expect(resolver(fase32)).toEqual({ casaId: 'BRA', visitanteId: 'SRB' })
    // a cascata resolve para o VENCEDOR RESOLVIDO (SRB), não para o '' cru:
    expect(resolver(oitavas).casaId).toBe('SRB')
    // o lado cujo alimentador ainda não foi jogado permanece indefinido:
    expect(resolver(oitavas).visitanteId).toBeNull()
  })
})
