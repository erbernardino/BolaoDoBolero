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

  it('estado PROVISÓRIO: 3º não garantido enquanto 8+ outros grupos podem ter 3º igual ou melhor', () => {
    // 9 grupos completos + 1 grupo (Z) ainda em aberto → fase NÃO completa: vale a
    // contagem conservadora por pontos. No grupo alvo (A), o 3º (A3) tem 3 pts e há
    // 8 outros grupos completos com 3º de 3 pts (8 > 7) → A3 não garantido.
    const completos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
    const grupos: GrupoRef[] = [...completos, 'Z'].map(L => ({ nome: `Grupo ${L}`, times: [`${L}1`, `${L}2`, `${L}3`, `${L}4`] }))
    const jogos: JogoCalc[] = []
    for (const L of completos) {
      jogos.push(
        jg(L, `${L}1`, `${L}2`, [1, 0]), jg(L, `${L}1`, `${L}3`, [1, 0]), jg(L, `${L}1`, `${L}4`, [1, 0]),
        jg(L, `${L}2`, `${L}3`, [1, 0]), jg(L, `${L}2`, `${L}4`, [1, 0]), jg(L, `${L}3`, `${L}4`, [1, 0]),
      )
    }
    // Grupo Z em aberto (nenhum jogo encerrado) → mantém o estado provisório.
    jogos.push(jg('Z', 'Z1', 'Z2', null), jg('Z', 'Z3', 'Z4', null))
    const r = calcularClassificadosMataMata(jogos, grupos)
    expect(r.has('A3')).toBe(false) // conservador: ainda não garantido
    expect(r.has('A1')).toBe(true)
    expect(r.has('A2')).toBe(true)
  })

  it('fase COMPLETA: seleciona os 8 melhores terceiros por SALDO (não falso-negativo) — caso SEN', () => {
    // 9 grupos completos. Todos os 3os têm 3 pts; o SALDO os separa: A3..H3 fazem 3×0
    // no 3º vs 4º (saldo +1); I3 faz só 1×0 (saldo -1) → I3 é o pior e fica de fora.
    const letras = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']
    const grupos: GrupoRef[] = letras.map(L => ({ nome: `Grupo ${L}`, times: [`${L}1`, `${L}2`, `${L}3`, `${L}4`] }))
    const jogos: JogoCalc[] = letras.flatMap(L => {
      const margem3vs4: [number, number] = L === 'I' ? [1, 0] : [3, 0]
      return [
        jg(L, `${L}1`, `${L}2`, [1, 0]), jg(L, `${L}1`, `${L}3`, [1, 0]), jg(L, `${L}1`, `${L}4`, [1, 0]),
        jg(L, `${L}2`, `${L}3`, [1, 0]), jg(L, `${L}2`, `${L}4`, [1, 0]), jg(L, `${L}3`, `${L}4`, margem3vs4),
      ]
    })
    const r = calcularClassificadosMataMata(jogos, grupos)
    const tercClass = letras.filter(L => r.has(`${L}3`))
    expect(tercClass).toHaveLength(8) // exatamente 8 melhores terceiros
    expect(r.has('A3')).toBe(true) // 3 pts, saldo +1 → classificado (era falso-negativo antes)
    expect(r.has('I3')).toBe(false) // 3 pts, pior saldo → 9º, fora
    // top-2 de todos entram.
    expect(letras.every(L => r.has(`${L}1`) && r.has(`${L}2`))).toBe(true)
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
    // Fase completa: 9 terceiros a 4 pts → 8 classificam; A3 (1º na ordem de desempate) entra.
    expect(r.has('A3')).toBe(true)
    expect(letras.filter(L => r.has(`${L}3`))).toHaveLength(8)
  })
})
