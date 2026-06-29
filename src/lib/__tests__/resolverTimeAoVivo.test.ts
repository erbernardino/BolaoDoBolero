import { describe, it, expect } from 'vitest'
import { resolverTimeAoVivo } from '../resolverTimeAoVivo'
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

describe('resolverTimeAoVivo', () => {
  it('jogo de grupo: usa o timeId direto do jogo', () => {
    const jogo = { id: 'g1', timeCasa: 'rsa', timeVisitante: 'can' }
    expect(resolverTimeAoVivo(jogo, 'casa', times, snapshot)?.sigla).toBe('RSA')
    expect(resolverTimeAoVivo(jogo, 'visitante', times, snapshot)?.sigla).toBe('CAN')
  })

  it('mata-mata com timeCasa vazio: resolve pelo bracket do snapshot', () => {
    const jogo = { id: 'fase32_1', timeCasa: '', timeVisitante: '' }
    expect(resolverTimeAoVivo(jogo, 'casa', times, snapshot)?.sigla).toBe('RSA')
    expect(resolverTimeAoVivo(jogo, 'visitante', times, snapshot)?.sigla).toBe('CAN')
  })

  it('sem snapshot e sem timeId: retorna null (mostra "?")', () => {
    const jogo = { id: 'fase32_1', timeCasa: '', timeVisitante: '' }
    expect(resolverTimeAoVivo(jogo, 'casa', times, null)).toBeNull()
  })

  it('slot do snapshot não resolvido (timeId null): retorna null', () => {
    const snap = { ...snapshot, bracket: { fase32_9: { casa: slot(null), visitante: slot(null) } } } as SnapshotResultados
    const jogo = { id: 'fase32_9', timeCasa: '', timeVisitante: '' }
    expect(resolverTimeAoVivo(jogo, 'casa', times, snap)).toBeNull()
  })

  it('timeId direto tem precedência sobre o snapshot', () => {
    const jogo = { id: 'fase32_1', timeCasa: 'can', timeVisitante: 'rsa' }
    expect(resolverTimeAoVivo(jogo, 'casa', times, snapshot)?.sigla).toBe('CAN')
  })
})
