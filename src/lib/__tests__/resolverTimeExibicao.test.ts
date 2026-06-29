import { describe, it, expect } from 'vitest'
import { resolverTimeExibicao, resolverTimeIdExibicao } from '../resolverTimeExibicao'
import type { Time } from '../../types'
import type { SnapshotResultados } from '../snapshotResultados'

const RSA = { id: 'rsa', nome: 'África do Sul', sigla: 'RSA' } as Time
const CAN = { id: 'can', nome: 'Canadá', sigla: 'CAN' } as Time
const times = new Map<string, Time>([['rsa', RSA], ['can', CAN]])

const slot = (timeId: string | null) => ({ timeId, classificado: false, provisorio: false })
const snapshot = {
  classificacoes: {}, clinch: {}, baseadoEm: { jogosEncerrados: 72 },
  bracket: { fase32_1: { casa: slot('rsa'), visitante: slot('can') } },
} as unknown as SnapshotResultados

describe('resolverTimeIdExibicao', () => {
  it('jogo de grupo: usa o timeId direto do jogo', () => {
    const jogo = { id: 'g1', timeCasa: 'rsa', timeVisitante: 'can' }
    expect(resolverTimeIdExibicao(jogo, 'casa', snapshot)).toBe('rsa')
    expect(resolverTimeIdExibicao(jogo, 'visitante', snapshot)).toBe('can')
  })

  it('mata-mata com timeCasa vazio: resolve pelo bracket do snapshot', () => {
    const jogo = { id: 'fase32_1', timeCasa: '', timeVisitante: '' }
    expect(resolverTimeIdExibicao(jogo, 'casa', snapshot)).toBe('rsa')
    expect(resolverTimeIdExibicao(jogo, 'visitante', snapshot)).toBe('can')
  })

  it('sem snapshot e sem timeId: retorna null', () => {
    expect(resolverTimeIdExibicao({ id: 'fase32_1', timeCasa: '' }, 'casa', null)).toBeNull()
  })

  it('slot do snapshot não resolvido (timeId null): retorna null', () => {
    const snap = { ...snapshot, bracket: { fase32_9: { casa: slot(null), visitante: slot(null) } } } as SnapshotResultados
    expect(resolverTimeIdExibicao({ id: 'fase32_9', timeCasa: '' }, 'casa', snap)).toBeNull()
  })

  it('timeId direto tem precedência sobre o snapshot', () => {
    const jogo = { id: 'fase32_1', timeCasa: 'can', timeVisitante: 'rsa' }
    expect(resolverTimeIdExibicao(jogo, 'casa', snapshot)).toBe('can')
  })
})

describe('resolverTimeExibicao (devolve o objeto Time)', () => {
  it('resolve para o Time pelo snapshot quando timeCasa vazio', () => {
    const jogo = { id: 'fase32_1', timeCasa: '', timeVisitante: '' }
    expect(resolverTimeExibicao(jogo, 'casa', times, snapshot)?.sigla).toBe('RSA')
    expect(resolverTimeExibicao(jogo, 'visitante', times, snapshot)?.sigla).toBe('CAN')
  })

  it('retorna null quando o timeId não está no mapa de times', () => {
    const jogo = { id: 'g1', timeCasa: 'desconhecido', timeVisitante: '' }
    expect(resolverTimeExibicao(jogo, 'casa', times, snapshot)).toBeNull()
  })
})
