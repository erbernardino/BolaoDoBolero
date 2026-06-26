import { describe, it, expect } from 'vitest'
import { calcularClassificadosMataMata } from '../clinchMataMata'
import type { JogoCalc, Resultado } from '../../types/calc'
import type { GrupoRef } from '../bracketUsuario'

let seq = 0
function jg(grupo: string, casa: string, vis: string, placar: [number, number] | null): JogoCalc {
  const resultado: Resultado | null = placar
    ? { golsCasa: placar[0], golsVisitante: placar[1], classificado: null } : null
  return {
    id: `g${grupo}-${seq++}`, numero: seq, fase: 'grupos', grupo,
    timeCasa: casa, timeVisitante: vis, origemCasa: null, origemVisitante: null,
    resultado, encerrado: placar !== null,
  }
}

describe('calcularClassificadosMataMata', () => {
  it('inclui quem garante top-2 do grupo', () => {
    // Grupo A completo: A1 9pts (1º), A2 6pts (2º) → ambos garantidos.
    const grupos: GrupoRef[] = [{ nome: 'Grupo A', times: ['A1', 'A2', 'A3', 'A4'] }]
    const jogos: JogoCalc[] = [
      jg('A', 'A1', 'A2', [1, 0]), jg('A', 'A1', 'A3', [1, 0]), jg('A', 'A1', 'A4', [1, 0]),
      jg('A', 'A2', 'A3', [1, 0]), jg('A', 'A2', 'A4', [1, 0]), jg('A', 'A3', 'A4', [1, 0]),
    ]
    const r = calcularClassificadosMataMata(jogos, grupos)
    expect(r.has('A1')).toBe(true)
    expect(r.has('A2')).toBe(true)
    expect(r.has('A4')).toBe(false) // último, eliminado
  })

  it('inclui terceiro garantido entre os 8 melhores (poucos grupos com 3º forte)', () => {
    // Grupo A incompleto: ARG 6pts (venceu A2,A3), falta jogar A4 → pode cair p/ 3º.
    // Grupos B e C: terceiros fracos. Só 3 grupos no total → ninguém perto de 8 → ARG via 3º.
    const grupos: GrupoRef[] = [
      { nome: 'Grupo A', times: ['ARG', 'A2', 'A3', 'A4'] },
      { nome: 'Grupo B', times: ['B1', 'B2', 'B3', 'B4'] },
      { nome: 'Grupo C', times: ['C1', 'C2', 'C3', 'C4'] },
    ]
    const jogos: JogoCalc[] = [
      // Grupo A: ARG venceu A2 e A3; resto em aberto (A4 ainda joga todos).
      jg('A', 'ARG', 'A2', [2, 0]), jg('A', 'ARG', 'A3', [2, 0]),
      jg('A', 'A2', 'A3', null), jg('A', 'A2', 'A4', null),
      jg('A', 'A3', 'A4', null), jg('A', 'ARG', 'A4', null),
      // Grupo B completo: 3º (B3) com 3 pts.
      jg('B', 'B1', 'B2', [1, 0]), jg('B', 'B1', 'B3', [1, 0]), jg('B', 'B1', 'B4', [1, 0]),
      jg('B', 'B2', 'B3', [1, 0]), jg('B', 'B2', 'B4', [1, 0]), jg('B', 'B3', 'B4', [1, 0]),
      // Grupo C completo: 3º (C3) com 3 pts.
      jg('C', 'C1', 'C2', [1, 0]), jg('C', 'C1', 'C3', [1, 0]), jg('C', 'C1', 'C4', [1, 0]),
      jg('C', 'C2', 'C3', [1, 0]), jg('C', 'C2', 'C4', [1, 0]), jg('C', 'C3', 'C4', [1, 0]),
    ]
    const r = calcularClassificadosMataMata(jogos, grupos)
    expect(r.has('ARG')).toBe(true) // garantida via melhor 3º
  })

  it('NÃO inclui time que pode terminar em 4º (não garante nem top-3)', () => {
    // Grupo A: todos com 1 jogo, A4 perdeu — mas com muitos jogos restantes A4 pode cair p/ 4º.
    const grupos: GrupoRef[] = [{ nome: 'Grupo A', times: ['A1', 'A2', 'A3', 'A4'] }]
    const jogos: JogoCalc[] = [
      jg('A', 'A1', 'A4', [1, 0]), // A4 perdeu 1
      jg('A', 'A1', 'A2', null), jg('A', 'A1', 'A3', null),
      jg('A', 'A2', 'A3', null), jg('A', 'A2', 'A4', null), jg('A', 'A3', 'A4', null),
    ]
    const r = calcularClassificadosMataMata(jogos, grupos)
    expect(r.has('A4')).toBe(false)
  })

  it('NÃO inclui terceiro quando 8+ outros grupos podem ter 3º igual ou melhor', () => {
    // 10 grupos completos. No grupo alvo (A), o 3º (A3) tem 3 pts.
    // 9 outros grupos com 3º de 3 pts → 9 > 7 → A3 não garantido entre os 8.
    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
    const grupos: GrupoRef[] = letras.map(L => ({ nome: `Grupo ${L}`, times: [`${L}1`, `${L}2`, `${L}3`, `${L}4`] }))
    const jogos: JogoCalc[] = []
    for (const L of letras) {
      // round-robin: 1º vence todos (9), 2º vence 2 (6), 3º vence 1 (3), 4º 0.
      jogos.push(
        jg(L, `${L}1`, `${L}2`, [1, 0]), jg(L, `${L}1`, `${L}3`, [1, 0]), jg(L, `${L}1`, `${L}4`, [1, 0]),
        jg(L, `${L}2`, `${L}3`, [1, 0]), jg(L, `${L}2`, `${L}4`, [1, 0]), jg(L, `${L}3`, `${L}4`, [1, 0]),
      )
    }
    const r = calcularClassificadosMataMata(jogos, grupos)
    // 1º e 2º de cada grupo entram (top-2); os 3os (3 pts) competem por 8 vagas entre 10 → nenhum garantido.
    expect(r.has('A3')).toBe(false)
    expect(r.has('A1')).toBe(true)
    expect(r.has('A2')).toBe(true)
  })

  it('classifica o 2º de grupo COMPLETO empatado em pontos com o 3º (desempate por saldo) — regressão CAN/AUS', () => {
    // 9 grupos completos idênticos. Em cada um: 1º=9pts; 2º e 3º empatam em 4 pts (o 2º só fica
    // à frente pelo SALDO geral); 4º=0. Com 9 grupos, nenhum 3º (4 pts) está garantido via melhor
    // terceiro — então o ✓ do 2º depende de reconhecer a posição REAL (top-2), não a contagem por pontos.
    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
    const grupos: GrupoRef[] = letras.map(L => ({ nome: `Grupo ${L}`, times: [`${L}1`, `${L}2`, `${L}3`, `${L}4`] }))
    const jogos: JogoCalc[] = letras.flatMap(L => {
      const t = [`${L}1`, `${L}2`, `${L}3`, `${L}4`]
      return [
        jg(L, t[0], t[1], [1, 0]), jg(L, t[0], t[2], [1, 0]), jg(L, t[0], t[3], [1, 0]), // 1º vence todos
        jg(L, t[1], t[2], [2, 2]), // 2º e 3º empatam no confronto direto
        jg(L, t[1], t[3], [5, 0]), // 2º goleia o 4º → saldo +4
        jg(L, t[2], t[3], [1, 0]), // 3º vence o 4º → saldo 0
      ]
    })
    const r = calcularClassificadosMataMata(jogos, grupos)
    expect(r.has('A2')).toBe(true) // 2º real (por saldo) — DEVE estar classificado (top-2)
    expect(r.has('A1')).toBe(true) // 1º
    expect(r.has('A3')).toBe(false) // 3º não garantido entre os 8 melhores
  })
})
