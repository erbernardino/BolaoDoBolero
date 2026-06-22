# Página de Resultados Oficiais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a página `/resultados` que mostra o andamento oficial do torneio (placares, classificação real dos grupos com clinch matemático antecipado, e chaveamento oficial do mata-mata) em dois modos de visualização: chaveamento e por fase.

**Architecture:** Uma página React (`Resultados.tsx`) carrega `jogos`/`times`/`grupos` do Firestore e deriva tudo em memória reutilizando a lib existente (`calcularClassificacaoGrupo`, `montarResolvedorBracket`). A única lógica nova é uma função pura de clinch matemático (`clinchGrupo.ts`). Componentes apresentacionais (`GrupoTabela`, `BracketView`, `PorFaseView`) renderizam os dois modos.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Firebase Firestore. Testes em Vitest.

## Global Constraints

- **Ambiente apenas teste:** validar com `npm run dev` e `npm run build` (default = projeto teste). NUNCA `npm run build:prod` nem `firebase deploy` neste trabalho.
- **NUNCA escrever no Firestore.** A página é somente leitura (`getDocs`/`getDoc`). Proibido qualquer `setDoc`/`updateDoc`. Proibido adicionar documentos à coleção `config` (quebra produção).
- **NUNCA `git stash`** (qualquer variante). Sem `--autostash`.
- **Reúso obrigatório:** classificação por `calcularClassificacaoGrupo` (`src/lib/classificacao.ts`); bracket por `montarResolvedorBracket` (`src/lib/bracketUsuario.ts`). Não reescrever lógica de chaveamento.
- **Clinch conservador:** zero falsos positivos. Critério baseado apenas em pontos (1º critério FIFA). Falsos negativos por desempate de saldo são intencionais.
- **Tipos canônicos:** `Jogo`, `Resultado` (tem `classificado: string | null`), `Palpite`, `ClassificacaoTime` em `src/types/index.ts`. `Fase = 'grupos' | 'fase32' | 'oitavas' | 'quartas' | 'semi' | 'terceiro' | 'final'`.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/clinchGrupo.ts` | criar | clinch matemático por grupo (lib pura) |
| `src/lib/__tests__/clinchGrupo.test.ts` | criar | testes do clinch |
| `src/lib/resultadosOficiais.ts` | criar | converte resultados oficiais → palpites reais; classificações reais; resolver de bracket oficial |
| `src/lib/__tests__/resultadosOficiais.test.ts` | criar | testes dos helpers oficiais |
| `src/components/resultados/GrupoTabela.tsx` | criar | tabela de classificação de 1 grupo com badges de clinch |
| `src/components/resultados/PorFaseView.tsx` | criar | modo "por fase" (abas + confrontos) |
| `src/components/resultados/BracketView.tsx` | criar | modo "chaveamento" (grupos + árvore mata-mata) |
| `src/pages/Resultados.tsx` | criar | página container: carrega dados, deriva tudo, alterna modos |
| `src/App.tsx` | modificar | rota `/resultados` em `ProtectedRoute` |
| `src/components/Navbar.tsx` | modificar | item de menu "Resultados" |

---

## Task 1: Lib de clinch matemático (`clinchGrupo.ts`)

**Files:**
- Create: `src/lib/clinchGrupo.ts`
- Test: `src/lib/__tests__/clinchGrupo.test.ts`

**Interfaces:**
- Consumes: `Jogo` de `src/types`; `calcularClassificacaoGrupo` de `./classificacao`.
- Produces:
  ```ts
  export interface ClinchTime {
    timeId: string
    classificadoTop2: boolean
    posicaoExataGarantida: 1 | 2 | null
    eliminado: boolean
  }
  export function calcularClinchGrupo(
    jogosDoGrupo: Jogo[],
    timesDoGrupo: string[],
  ): Record<string, ClinchTime>
  ```

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/__tests__/clinchGrupo.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcularClinchGrupo } from '../clinchGrupo'
import type { Jogo, Resultado } from '../../types'

// Factory de Jogo mínimo: clinch só usa timeCasa/timeVisitante/encerrado/resultado.
function jogo(
  timeCasa: string,
  timeVisitante: string,
  placar: [number, number] | null,
): Jogo {
  const resultado: Resultado | null = placar
    ? { golsCasa: placar[0], golsVisitante: placar[1], classificado: null }
    : null
  return {
    id: `${timeCasa}-${timeVisitante}`,
    numero: 0,
    fase: 'grupos',
    grupo: 'A',
    timeCasa,
    timeVisitante,
    origemCasa: null,
    origemVisitante: null,
    dataHora: { toDate: () => new Date(0) } as never,
    resultado,
    encerrado: placar !== null,
  }
}

const TIMES = ['T1', 'T2', 'T3', 'T4']
// Round-robin de 4 times = 6 jogos.
function todosJogos(placares: Record<string, [number, number] | null>): Jogo[] {
  const pares: [string, string][] = [
    ['T1', 'T2'], ['T3', 'T4'], ['T1', 'T3'],
    ['T2', 'T4'], ['T1', 'T4'], ['T2', 'T3'],
  ]
  return pares.map(([a, b]) => jogo(a, b, placares[`${a}-${b}`] ?? null))
}

describe('calcularClinchGrupo', () => {
  it('sem jogos cadastrados: todos indefinidos', () => {
    const r = calcularClinchGrupo([], TIMES)
    for (const t of TIMES) {
      expect(r[t].classificadoTop2).toBe(false)
      expect(r[t].posicaoExataGarantida).toBe(null)
      expect(r[t].eliminado).toBe(false)
    }
  })

  it('clinch antecipado de 1º: T1 vence 2 jogos e ninguém alcança seus pontos', () => {
    // T1 venceu T2 e T3 (6 pts). Restam: T3-T4, T2-T4, T1-T4, T2-T3.
    // Máximo de qualquer rival ao fim < 6? T4 pode chegar a 9 (vence 3). Então NÃO é clinch de 1º ainda.
    // Para garantir 1º cedo, fechamos mais jogos:
    const jogos = todosJogos({
      'T1-T2': [1, 0], 'T1-T3': [1, 0], 'T1-T4': [1, 0], // T1 = 9 pts, todos seus jogos feitos
      'T2-T4': null, 'T3-T4': null, 'T2-T3': null,
    })
    const r = calcularClinchGrupo(jogos, TIMES)
    // T1 com 9 pts; ninguém pode passar de 6 → 1º garantido.
    expect(r['T1'].posicaoExataGarantida).toBe(1)
    expect(r['T1'].classificadoTop2).toBe(true)
  })

  it('clinch de top-2 sem posição exata: dois líderes empatados em cenários, 1º/2º indefinido', () => {
    // T1 e T2 venceram T3 e T4; ainda falta T1-T2. Ambos garantem top-2, mas quem é 1º depende de T1-T2.
    const jogos = todosJogos({
      'T1-T3': [1, 0], 'T1-T4': [1, 0], 'T2-T3': [1, 0], 'T2-T4': [1, 0],
      'T3-T4': [0, 0],
      'T1-T2': null,
    })
    const r = calcularClinchGrupo(jogos, TIMES)
    expect(r['T1'].classificadoTop2).toBe(true)
    expect(r['T2'].classificadoTop2).toBe(true)
    expect(r['T1'].posicaoExataGarantida).toBe(null)
    expect(r['T2'].posicaoExataGarantida).toBe(null)
    // T3 e T4 não podem mais alcançar top-2 (máx 1 ponto cada) → eliminados.
    expect(r['T3'].eliminado).toBe(true)
    expect(r['T4'].eliminado).toBe(true)
  })

  it('grupo completo: consistente com calcularClassificacaoGrupo', () => {
    const jogos = todosJogos({
      'T1-T2': [2, 0], 'T1-T3': [2, 0], 'T1-T4': [2, 0], // T1 9 pts (1º)
      'T2-T3': [1, 0], 'T2-T4': [1, 0],                   // T2 6 pts (2º)
      'T3-T4': [1, 0],                                     // T3 3 pts (3º), T4 0 (4º)
    })
    const r = calcularClinchGrupo(jogos, TIMES)
    expect(r['T1'].posicaoExataGarantida).toBe(1)
    expect(r['T2'].posicaoExataGarantida).toBe(2)
    expect(r['T1'].classificadoTop2).toBe(true)
    expect(r['T2'].classificadoTop2).toBe(true)
    expect(r['T3'].eliminado).toBe(true)
    expect(r['T4'].eliminado).toBe(true)
  })

  it('falso-negativo conservador: empate em pontos não dá clinch de top-2 mesmo com saldo melhor', () => {
    // Após rodadas, T1, T2, T3 todos com 3 pts e jogos restantes que podem manter empate em pontos.
    // T1 tem saldo melhor, mas regra é por pontos: não garante top-2.
    const jogos = todosJogos({
      'T1-T2': [3, 0], 'T3-T4': [1, 0],
      'T1-T3': null, 'T2-T4': null, 'T1-T4': null, 'T2-T3': null,
    })
    const r = calcularClinchGrupo(jogos, TIMES)
    // T1 (3 pts, saldo +3) não pode ser declarado top-2 garantido: existe cenário com >1 time >= seus pontos.
    expect(r['T1'].classificadoTop2).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `npm test -- src/lib/__tests__/clinchGrupo.test.ts`
Expected: FAIL — `calcularClinchGrupo is not a function` / módulo não encontrado.

- [ ] **Step 3: Implementar a lib**

Criar `src/lib/clinchGrupo.ts`:

```ts
import type { Jogo } from '../types'
import { calcularClassificacaoGrupo } from './classificacao'

export interface ClinchTime {
  /** Garantiu top-2 (classificação) em TODOS os cenários possíveis. */
  classificadoTop2: boolean
  /** 1 ou 2 se a posição exata está garantida em todos os cenários; senão null. */
  posicaoExataGarantida: 1 | 2 | null
  /** Não alcança top-2 em NENHUM cenário possível. */
  eliminado: boolean
  timeId: string
}

interface JogoRestante {
  casa: string
  visitante: string
}

/**
 * Determina o status de clinch (classificação garantida por pontos) de cada
 * time de um grupo, considerando os jogos já encerrados e enumerando todos os
 * resultados possíveis (V/E/D) dos jogos restantes.
 *
 * Critério CONSERVADOR baseado apenas em pontos (1º critério FIFA). Nunca
 * declara classificado quem não está (zero falsos positivos); pode atrasar o
 * badge em empates resolvidos por saldo (falso negativo intencional).
 */
export function calcularClinchGrupo(
  jogosDoGrupo: Jogo[],
  timesDoGrupo: string[],
): Record<string, ClinchTime> {
  const base: Record<string, ClinchTime> = {}
  for (const t of timesDoGrupo) {
    base[t] = { timeId: t, classificadoTop2: false, posicaoExataGarantida: null, eliminado: false }
  }

  const encerrados = jogosDoGrupo.filter(j => j.encerrado && j.resultado)
  const restantes: JogoRestante[] = jogosDoGrupo
    .filter(j => !(j.encerrado && j.resultado))
    .map(j => ({ casa: j.timeCasa, visitante: j.timeVisitante }))

  // Grupo sem nenhum jogo cadastrado: nada a decidir.
  if (jogosDoGrupo.length === 0) return base

  // Pontos fixos vindos dos jogos encerrados.
  const pontosBase: Record<string, number> = {}
  for (const t of timesDoGrupo) pontosBase[t] = 0
  for (const j of encerrados) {
    const gc = j.resultado!.golsCasa
    const gv = j.resultado!.golsVisitante
    if (gc > gv) pontosBase[j.timeCasa] += 3
    else if (gc < gv) pontosBase[j.timeVisitante] += 3
    else { pontosBase[j.timeCasa] += 1; pontosBase[j.timeVisitante] += 1 }
  }

  // Grupo completo: usar a classificação real (com desempates FIFA completos).
  if (restantes.length === 0) {
    const reaisComoPalpites = encerrados.map(j => ({
      id: `real_${j.id}`, uid: 'real', jogoId: j.id,
      timeCasa: j.timeCasa, timeVisitante: j.timeVisitante,
      golsCasa: j.resultado!.golsCasa, golsVisitante: j.resultado!.golsVisitante,
      classificado: j.resultado!.classificado, criadoEm: null as never,
    }))
    const ordenada = calcularClassificacaoGrupo(reaisComoPalpites, timesDoGrupo)
    ordenada.forEach((ct, idx) => {
      const alvo = base[ct.timeId]
      if (!alvo) return
      if (idx === 0) { alvo.posicaoExataGarantida = 1; alvo.classificadoTop2 = true }
      else if (idx === 1) { alvo.posicaoExataGarantida = 2; alvo.classificadoTop2 = true }
      else { alvo.eliminado = true }
    })
    return base
  }

  // Acumuladores por time ao longo de TODOS os cenários.
  const acc: Record<string, {
    sempreAheadEqualMax: number   // maior #{>= X, exceto X} visto
    sempreStrictAheadMaxQuandoEqual1: boolean // em todo cenário: strictAhead==1 && aheadEqual==1
    algumTop2: boolean            // existe cenário com strictAhead <= 1
  }> = {}
  for (const t of timesDoGrupo) {
    acc[t] = { sempreAheadEqualMax: 0, sempreStrictAheadMaxQuandoEqual1: true, algumTop2: false }
  }

  const k = restantes.length
  const totalCenarios = 3 ** k
  for (let c = 0; c < totalCenarios; c++) {
    const pontos = { ...pontosBase }
    let code = c
    for (let g = 0; g < k; g++) {
      const r = code % 3
      code = Math.floor(code / 3)
      const { casa, visitante } = restantes[g]
      if (r === 0) pontos[casa] += 3            // vitória casa
      else if (r === 1) { pontos[casa] += 1; pontos[visitante] += 1 } // empate
      else pontos[visitante] += 3               // vitória visitante
    }
    for (const x of timesDoGrupo) {
      let aheadEqual = 0
      let strictAhead = 0
      for (const y of timesDoGrupo) {
        if (y === x) continue
        if (pontos[y] > pontos[x]) { strictAhead++; aheadEqual++ }
        else if (pontos[y] === pontos[x]) aheadEqual++
      }
      const a = acc[x]
      if (aheadEqual > a.sempreAheadEqualMax) a.sempreAheadEqualMax = aheadEqual
      if (!(strictAhead === 1 && aheadEqual === 1)) a.sempreStrictAheadMaxQuandoEqual1 = false
      if (strictAhead <= 1) a.algumTop2 = true
    }
  }

  for (const t of timesDoGrupo) {
    const a = acc[t]
    const alvo = base[t]
    // classificadoTop2: em todo cenário #{>= X, exceto X} <= 1.
    alvo.classificadoTop2 = a.sempreAheadEqualMax <= 1
    // posição exata 1: em todo cenário ninguém >= X (sempreAheadEqualMax == 0).
    if (a.sempreAheadEqualMax === 0) alvo.posicaoExataGarantida = 1
    // posição exata 2: em todo cenário exatamente um estritamente à frente e nenhum empate.
    else if (alvo.classificadoTop2 && a.sempreStrictAheadMaxQuandoEqual1) alvo.posicaoExataGarantida = 2
    // eliminado: não alcança top-2 em nenhum cenário.
    alvo.eliminado = !a.algumTop2
  }

  return base
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `npm test -- src/lib/__tests__/clinchGrupo.test.ts`
Expected: PASS (5 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/clinchGrupo.ts src/lib/__tests__/clinchGrupo.test.ts
git commit -m "feat(lib): clinch matemático de classificação por grupo"
```

---

## Task 2: Helpers de resultados oficiais (`resultadosOficiais.ts`)

**Files:**
- Create: `src/lib/resultadosOficiais.ts`
- Test: `src/lib/__tests__/resultadosOficiais.test.ts`

**Interfaces:**
- Consumes: `Jogo`, `Palpite`, `ClassificacaoTime` de `src/types`; `calcularClassificacaoGrupo` de `./classificacao`; `montarResolvedorBracket`, `GrupoRef`, `ResolverBracket` de `./bracketUsuario`.
- Produces:
  ```ts
  export function jogosParaPalpitesReais(jogos: Jogo[]): Record<string, Palpite>
  export function calcularClassificacoesReais(
    jogos: Jogo[], grupos: GrupoRef[],
  ): Record<string, ClassificacaoTime[]>   // parciais (>=1 jogo encerrado), chave = letra do grupo
  export function montarResolvedorBracketOficial(
    jogos: Jogo[], grupos: GrupoRef[],
  ): ResolverBracket
  ```

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/__tests__/resultadosOficiais.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- src/lib/__tests__/resultadosOficiais.test.ts`
Expected: FAIL — módulo `../resultadosOficiais` não encontrado.

- [ ] **Step 3: Implementar os helpers**

Criar `src/lib/resultadosOficiais.ts`:

```ts
import type { Jogo, Palpite, ClassificacaoTime } from '../types'
import { calcularClassificacaoGrupo } from './classificacao'
import { montarResolvedorBracket, type GrupoRef, type ResolverBracket } from './bracketUsuario'

/** Converte jogos OFICIAIS encerrados em "palpites reais" indexados por jogoId. */
export function jogosParaPalpitesReais(jogos: Jogo[]): Record<string, Palpite> {
  const map: Record<string, Palpite> = {}
  for (const j of jogos) {
    if (j.encerrado && j.resultado) {
      map[j.id] = {
        id: `real_${j.id}`,
        uid: 'real',
        jogoId: j.id,
        timeCasa: j.timeCasa,
        timeVisitante: j.timeVisitante,
        golsCasa: j.resultado.golsCasa,
        golsVisitante: j.resultado.golsVisitante,
        classificado: j.resultado.classificado,
        criadoEm: null as never,
      }
    }
  }
  return map
}

/**
 * Classificação real (parcial) por grupo a partir dos resultados oficiais.
 * Inclui grupos com pelo menos 1 jogo encerrado. Chave = letra do grupo.
 * Usada nas TABELAS (mostra parciais). Para o BRACKET, use o resolvedor.
 */
export function calcularClassificacoesReais(
  jogos: Jogo[],
  grupos: GrupoRef[],
): Record<string, ClassificacaoTime[]> {
  const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
  const result: Record<string, ClassificacaoTime[]> = {}
  for (const grupo of grupos) {
    const letra = grupo.nome.replace('Grupo ', '')
    const jogosDoGrupo = jogosGrupos.filter(j => j.grupo === letra)
    const palpitesReais: Palpite[] = jogosDoGrupo
      .filter(j => j.encerrado && j.resultado)
      .map(j => ({
        id: `real_${j.id}`, uid: 'real', jogoId: j.id,
        timeCasa: j.timeCasa, timeVisitante: j.timeVisitante,
        golsCasa: j.resultado!.golsCasa, golsVisitante: j.resultado!.golsVisitante,
        classificado: j.resultado!.classificado, criadoEm: null as never,
      }))
    if (palpitesReais.length > 0) {
      result[letra] = calcularClassificacaoGrupo(palpitesReais, grupo.times)
    }
  }
  return result
}

/**
 * Resolvedor do bracket OFICIAL do mata-mata. Reutiliza montarResolvedorBracket
 * alimentado com os resultados oficiais convertidos em palpites. Os slots de
 * grupo (1A, 2B...) só resolvem quando o grupo está completo — garantindo que
 * o slot só é preenchido com posição exata conhecida (nunca com posição incerta).
 */
export function montarResolvedorBracketOficial(
  jogos: Jogo[],
  grupos: GrupoRef[],
): ResolverBracket {
  return montarResolvedorBracket({
    jogos,
    grupos,
    palpitesPorJogoId: jogosParaPalpitesReais(jogos),
  })
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- src/lib/__tests__/resultadosOficiais.test.ts`
Expected: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/resultadosOficiais.ts src/lib/__tests__/resultadosOficiais.test.ts
git commit -m "feat(lib): helpers de classificação e bracket oficiais"
```

---

## Task 3: Componente `GrupoTabela`

**Files:**
- Create: `src/components/resultados/GrupoTabela.tsx`

**Interfaces:**
- Consumes: `ClassificacaoTime` de `src/types`; `ClinchTime` de `src/lib/clinchGrupo`; `Time` de `src/types`.
- Produces:
  ```ts
  export interface GrupoTabelaProps {
    letra: string
    classificacao: ClassificacaoTime[]
    clinch: Record<string, ClinchTime>
    times: Map<string, Time>
  }
  export function GrupoTabela(props: GrupoTabelaProps): JSX.Element
  ```

- [ ] **Step 1: Implementar o componente**

Criar `src/components/resultados/GrupoTabela.tsx`:

```tsx
import type { ClassificacaoTime, Time } from '../../types'
import type { ClinchTime } from '../../lib/clinchGrupo'

export interface GrupoTabelaProps {
  letra: string
  classificacao: ClassificacaoTime[]
  clinch: Record<string, ClinchTime>
  times: Map<string, Time>
}

export function GrupoTabela({ letra, classificacao, clinch, times }: GrupoTabelaProps) {
  function nome(id: string) {
    return times.get(id)?.sigla ?? times.get(id)?.nome ?? id
  }
  function bandeira(id: string) {
    return times.get(id)?.bandeira
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="bg-blue-900 text-white px-3 py-1.5 text-sm font-semibold">
        Grupo {letra}
      </div>
      <table className="w-full text-xs">
        <thead className="text-gray-500">
          <tr className="border-b border-gray-100">
            <th className="text-left font-medium px-2 py-1">Time</th>
            <th className="font-medium px-1 py-1" title="Pontos">P</th>
            <th className="font-medium px-1 py-1" title="Jogos">J</th>
            <th className="font-medium px-1 py-1" title="Saldo">SG</th>
            <th className="px-1 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {classificacao.map((ct, idx) => {
            const c = clinch[ct.timeId]
            const classificado = c?.classificadoTop2
            const eliminado = c?.eliminado
            return (
              <tr
                key={ct.timeId}
                className={
                  'border-b border-gray-50 ' +
                  (classificado ? 'bg-green-50 ' : '') +
                  (eliminado ? 'text-gray-400 ' : '')
                }
              >
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 w-3">{idx + 1}</span>
                    {bandeira(ct.timeId) && (
                      <img src={bandeira(ct.timeId)} alt="" className="w-4 h-3 object-cover rounded-sm" />
                    )}
                    <span className="font-medium">{nome(ct.timeId)}</span>
                  </div>
                </td>
                <td className="text-center px-1 py-1 font-semibold">{ct.pontos}</td>
                <td className="text-center px-1 py-1">{ct.jogos}</td>
                <td className="text-center px-1 py-1">{ct.saldoGols > 0 ? `+${ct.saldoGols}` : ct.saldoGols}</td>
                <td className="text-center px-1 py-1">
                  {classificado && (
                    <span className="inline-block rounded bg-green-600 text-white text-[10px] px-1 py-0.5" title="Classificado">
                      ✓
                    </span>
                  )}
                  {!classificado && eliminado && (
                    <span className="text-[10px] text-gray-400" title="Eliminado">✕</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npx tsc -b --noEmit`
Expected: sem erros relacionados a `GrupoTabela`.

- [ ] **Step 3: Commit**

```bash
git add src/components/resultados/GrupoTabela.tsx
git commit -m "feat(resultados): componente GrupoTabela com badges de clinch"
```

---

## Task 4: Página `Resultados` + modo "Por fase" + rota + navbar

Esta task entrega o app navegável: `/resultados` carrega dados reais e exibe o modo "Por fase". O modo "Chaveamento" entra na Task 5.

**Files:**
- Create: `src/pages/Resultados.tsx`
- Create: `src/components/resultados/PorFaseView.tsx`
- Modify: `src/App.tsx` (rota)
- Modify: `src/components/Navbar.tsx` (menu)

**Interfaces:**
- Consumes: `Jogo`, `Time`, `ClassificacaoTime` de `src/types`; `ResolverBracket` de `src/lib/bracketUsuario`; `ClinchTime` de `src/lib/clinchGrupo`; `calcularClassificacoesReais`, `montarResolvedorBracketOficial` de `src/lib/resultadosOficiais`.
- Produces (de `PorFaseView`):
  ```ts
  export interface PorFaseViewProps {
    jogos: Jogo[]
    times: Map<string, Time>
    resolver: ResolverBracket
  }
  export function PorFaseView(props: PorFaseViewProps): JSX.Element
  ```
- Produces (de `Resultados`): `export function Resultados(): JSX.Element`

- [ ] **Step 1: Implementar `PorFaseView`**

Criar `src/components/resultados/PorFaseView.tsx`:

```tsx
import { useMemo, useState } from 'react'
import type { Jogo, Time, Fase } from '../../types'
import type { ResolverBracket } from '../../lib/bracketUsuario'

export interface PorFaseViewProps {
  jogos: Jogo[]
  times: Map<string, Time>
  resolver: ResolverBracket
}

const ABAS: { id: Fase; label: string }[] = [
  { id: 'grupos', label: 'Grupos' },
  { id: 'fase32', label: '2ª Fase' },
  { id: 'oitavas', label: 'Oitavas' },
  { id: 'quartas', label: 'Quartas' },
  { id: 'semi', label: 'Semis' },
  { id: 'terceiro', label: '3º Lugar' },
  { id: 'final', label: 'Final' },
]

export function PorFaseView({ jogos, times, resolver }: PorFaseViewProps) {
  const [fase, setFase] = useState<Fase>('grupos')

  const lista = useMemo(
    () => jogos.filter(j => j.fase === fase).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)),
    [jogos, fase],
  )

  function nome(id: string | null) {
    if (!id) return null
    return times.get(id)?.sigla ?? times.get(id)?.nome ?? id
  }
  function bandeira(id: string | null) {
    return id ? times.get(id)?.bandeira : undefined
  }

  function ladosDoJogo(j: Jogo): { casaId: string | null; visitanteId: string | null } {
    if (j.fase === 'grupos') return { casaId: j.timeCasa, visitanteId: j.timeVisitante }
    return resolver(j)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setFase(a.id)}
            className={
              'px-3 py-1 rounded text-sm ' +
              (fase === a.id ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700')
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(j => {
          const { casaId, visitanteId } = ladosDoJogo(j)
          const r = j.resultado
          return (
            <div key={j.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 flex-1">
                  {bandeira(casaId) && <img src={bandeira(casaId)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
                  <span className="font-medium">{nome(casaId) ?? j.labelCasa ?? '—'}</span>
                </div>
                <div className="px-2 font-bold tabular-nums">
                  {r ? `${r.golsCasa} × ${r.golsVisitante}` : 'vs'}
                </div>
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <span className="font-medium">{nome(visitanteId) ?? j.labelVisitante ?? '—'}</span>
                  {bandeira(visitanteId) && <img src={bandeira(visitanteId)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
                </div>
              </div>
              {r?.classificado && (
                <div className="text-[11px] text-gray-500 text-center mt-1">
                  Avançou nos pênaltis: {nome(r.classificado)}
                </div>
              )}
            </div>
          )
        })}
        {lista.length === 0 && (
          <p className="text-sm text-gray-500 col-span-full">Nenhum jogo nesta fase.</p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Implementar a página `Resultados`**

Criar `src/pages/Resultados.tsx`:

```tsx
import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { Navbar } from '../components/Navbar'
import type { Jogo, Time, ClassificacaoTime } from '../types'
import type { GrupoRef } from '../lib/bracketUsuario'
import { calcularClinchGrupo, type ClinchTime } from '../lib/clinchGrupo'
import { calcularClassificacoesReais, montarResolvedorBracketOficial } from '../lib/resultadosOficiais'
import { PorFaseView } from '../components/resultados/PorFaseView'

type Modo = 'chaveamento' | 'fase'

export function Resultados() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [grupos, setGrupos] = useState<GrupoRef[]>([])
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState<Modo>('chaveamento')

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, gruposSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'grupos')),
      ])
      setJogos(jogosSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Jogo))
      const tmap = new Map<string, Time>()
      timesSnap.docs.forEach(d => tmap.set(d.id, { id: d.id, ...d.data() } as Time))
      setTimes(tmap)
      setGrupos(gruposSnap.docs.map(d => {
        const data = d.data() as { nome?: string; times?: string[] }
        return { nome: data.nome ?? `Grupo ${d.id}`, times: data.times ?? [] }
      }))
      setLoading(false)
    }
    load()
  }, [])

  const classificacoes = useMemo<Record<string, ClassificacaoTime[]>>(
    () => calcularClassificacoesReais(jogos, grupos),
    [jogos, grupos],
  )

  const clinchPorGrupo = useMemo<Record<string, Record<string, ClinchTime>>>(() => {
    const out: Record<string, Record<string, ClinchTime>> = {}
    const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
    for (const g of grupos) {
      const letra = g.nome.replace('Grupo ', '')
      out[letra] = calcularClinchGrupo(jogosGrupos.filter(j => j.grupo === letra), g.times)
    }
    return out
  }, [jogos, grupos])

  const resolver = useMemo(
    () => montarResolvedorBracketOficial(jogos, grupos),
    [jogos, grupos],
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl font-bold text-gray-800">Resultados Oficiais</h1>
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setModo('chaveamento')}
              className={'px-3 py-1.5 text-sm ' + (modo === 'chaveamento' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600')}
            >
              Chaveamento
            </button>
            <button
              onClick={() => setModo('fase')}
              className={'px-3 py-1.5 text-sm ' + (modo === 'fase' ? 'bg-blue-700 text-white' : 'bg-white text-gray-600')}
            >
              Por fase
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando…</p>
        ) : modo === 'fase' ? (
          <PorFaseView jogos={jogos} times={times} resolver={resolver} />
        ) : (
          // BracketView entra na Task 5; placeholder temporário evita import quebrado.
          <p className="text-gray-500">Chaveamento em construção.</p>
        )}

        {/* classificacoes e clinchPorGrupo serão consumidos pelo BracketView na Task 5 */}
        <span className="hidden">{Object.keys(classificacoes).length}{Object.keys(clinchPorGrupo).length}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Adicionar a rota em `App.tsx`**

Em `src/App.tsx`, após a linha de import dos lazy pages (junto às outras, ex. após a linha do `ImprimirMeusPalpites`), adicionar:

```tsx
const Resultados = lazy(() => import('./pages/Resultados').then(m => ({ default: m.Resultados })))
```

E dentro de `<Routes>`, após a rota `/todos-palpites`, adicionar:

```tsx
        <Route path="/resultados" element={<ProtectedRoute><Resultados /></ProtectedRoute>} />
```

- [ ] **Step 4: Adicionar o item de menu na `Navbar`**

Em `src/components/Navbar.tsx`, no array `navLinks`, adicionar o item "Resultados" como sempre visível (acesso a qualquer logado), logo após `{ to: '/palpites', label: 'Palpites' }`:

```tsx
  const navLinks = [
    { to: '/palpites', label: 'Palpites' },
    { to: '/resultados', label: 'Resultados' },
    ...(liberado ? [
```

- [ ] **Step 5: Verificar typecheck e build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: build conclui sem erros.

- [ ] **Step 6: Validação manual (modo por fase)**

Run: `npm run dev` e abrir `http://localhost:5173/resultados` (logado).
Expected: alternância Chaveamento/Por fase funciona; em "Por fase" as abas filtram jogos e mostram placares oficiais; mata-mata mostra times resolvidos quando os grupos estão completos, senão labels.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Resultados.tsx src/components/resultados/PorFaseView.tsx src/App.tsx src/components/Navbar.tsx
git commit -m "feat(resultados): página /resultados com modo por fase, rota e menu"
```

---

## Task 5: Modo "Chaveamento" (`BracketView`)

**Files:**
- Create: `src/components/resultados/BracketView.tsx`
- Modify: `src/pages/Resultados.tsx` (substituir o placeholder pelo `BracketView`)

**Interfaces:**
- Consumes: `Jogo`, `Time`, `ClassificacaoTime` de `src/types`; `ResolverBracket` de `src/lib/bracketUsuario`; `ClinchTime` de `src/lib/clinchGrupo`; `GrupoTabela` de `./GrupoTabela`.
- Produces:
  ```ts
  export interface BracketViewProps {
    jogos: Jogo[]
    times: Map<string, Time>
    grupos: { nome: string; times: string[] }[]
    classificacoes: Record<string, ClassificacaoTime[]>
    clinchPorGrupo: Record<string, Record<string, ClinchTime>>
    resolver: ResolverBracket
  }
  export function BracketView(props: BracketViewProps): JSX.Element
  ```

- [ ] **Step 1: Implementar `BracketView`**

Criar `src/components/resultados/BracketView.tsx`:

```tsx
import { useMemo } from 'react'
import type { Jogo, Time, ClassificacaoTime, Fase } from '../../types'
import type { ResolverBracket } from '../../lib/bracketUsuario'
import type { ClinchTime } from '../../lib/clinchGrupo'
import { GrupoTabela } from './GrupoTabela'

export interface BracketViewProps {
  jogos: Jogo[]
  times: Map<string, Time>
  grupos: { nome: string; times: string[] }[]
  classificacoes: Record<string, ClassificacaoTime[]>
  clinchPorGrupo: Record<string, Record<string, ClinchTime>>
  resolver: ResolverBracket
}

const COLUNAS: { fase: Fase; label: string }[] = [
  { fase: 'fase32', label: '2ª Fase' },
  { fase: 'oitavas', label: 'Oitavas' },
  { fase: 'quartas', label: 'Quartas' },
  { fase: 'semi', label: 'Semis' },
  { fase: 'final', label: 'Final' },
]

export function BracketView({ jogos, times, grupos, classificacoes, clinchPorGrupo, resolver }: BracketViewProps) {
  function nome(id: string | null) {
    if (!id) return null
    return times.get(id)?.sigla ?? times.get(id)?.nome ?? id
  }
  function bandeira(id: string | null) {
    return id ? times.get(id)?.bandeira : undefined
  }

  const porFase = useMemo(() => {
    const map: Record<string, Jogo[]> = {}
    for (const col of COLUNAS) {
      map[col.fase] = jogos
        .filter(j => j.fase === col.fase)
        .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    }
    return map
  }, [jogos])

  // Times já classificados (clinch) por grupo, para exibir no cabeçalho dos grupos.
  function classificadosDoGrupo(letra: string): string[] {
    const clinch = clinchPorGrupo[letra] ?? {}
    return Object.values(clinch).filter(c => c.classificadoTop2).map(c => c.timeId)
  }

  function CardConfronto({ jogo }: { jogo: Jogo }) {
    const { casaId, visitanteId } = resolver(jogo)
    const r = jogo.resultado
    const linha = (id: string | null, label: string | undefined, gols: number | undefined) => (
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 min-w-0">
          {bandeira(id) && <img src={bandeira(id)} alt="" className="w-4 h-3 object-cover rounded-sm" />}
          <span className="truncate">{nome(id) ?? label ?? '—'}</span>
        </div>
        <span className="font-bold tabular-nums">{gols ?? ''}</span>
      </div>
    )
    return (
      <div className="rounded border border-gray-200 bg-white px-2 py-1.5 w-40 space-y-1">
        {linha(casaId, jogo.labelCasa, r?.golsCasa)}
        {linha(visitanteId, jogo.labelVisitante, r?.golsVisitante)}
        {r?.classificado && (
          <div className="text-[10px] text-gray-400 text-center">pen: {nome(r.classificado)}</div>
        )}
      </div>
    )
  }

  const jogoTerceiro = jogos.find(j => j.fase === 'terceiro')

  return (
    <div className="space-y-8">
      {/* GRUPOS */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Fase de grupos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {grupos.map(g => {
            const letra = g.nome.replace('Grupo ', '')
            const classificados = classificadosDoGrupo(letra)
            return (
              <div key={letra} className="space-y-1">
                <GrupoTabela
                  letra={letra}
                  classificacao={classificacoes[letra] ?? g.times.map(t => ({
                    timeId: t, pontos: 0, jogos: 0, vitorias: 0, empates: 0,
                    derrotas: 0, golsMarcados: 0, golsSofridos: 0, saldoGols: 0,
                  }))}
                  clinch={clinchPorGrupo[letra] ?? {}}
                  times={times}
                />
                {classificados.length > 0 && (
                  <div className="text-[11px] text-green-700">
                    ✓ Classificados: {classificados.map(id => nome(id)).join(', ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* MATA-MATA EM COLUNAS */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Mata-mata</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUNAS.map(col => (
            <div key={col.fase} className="flex flex-col gap-2 shrink-0">
              <div className="text-xs font-semibold text-gray-500">{col.label}</div>
              {porFase[col.fase].map(j => <CardConfronto key={j.id} jogo={j} />)}
              {porFase[col.fase].length === 0 && (
                <div className="text-[11px] text-gray-300 w-40">—</div>
              )}
            </div>
          ))}
        </div>
        {jogoTerceiro && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 mb-1">Disputa de 3º lugar</div>
            <CardConfronto jogo={jogoTerceiro} />
          </div>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Conectar o `BracketView` na página**

Em `src/pages/Resultados.tsx`:

1. Adicionar o import no topo (junto aos outros imports de componentes):

```tsx
import { BracketView } from '../components/resultados/BracketView'
```

2. Substituir o bloco placeholder e a linha `hidden` pelo render real. Trocar:

```tsx
        ) : (
          // BracketView entra na Task 5; placeholder temporário evita import quebrado.
          <p className="text-gray-500">Chaveamento em construção.</p>
        )}

        {/* classificacoes e clinchPorGrupo serão consumidos pelo BracketView na Task 5 */}
        <span className="hidden">{Object.keys(classificacoes).length}{Object.keys(clinchPorGrupo).length}</span>
```

por:

```tsx
        ) : (
          <BracketView
            jogos={jogos}
            times={times}
            grupos={grupos}
            classificacoes={classificacoes}
            clinchPorGrupo={clinchPorGrupo}
            resolver={resolver}
          />
        )}
```

- [ ] **Step 3: Verificar typecheck e build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Validação manual (modo chaveamento)**

Run: `npm run dev` e abrir `/resultados` no modo "Chaveamento".
Expected: tabelas dos 12 grupos com badges de clinch; lista "✓ Classificados" por grupo; colunas do mata-mata (2ª fase → Final) com cards de confronto, placares oficiais e disputa de 3º lugar. Rolagem horizontal no mobile.

- [ ] **Step 5: Commit**

```bash
git add src/components/resultados/BracketView.tsx src/pages/Resultados.tsx
git commit -m "feat(resultados): modo chaveamento com grupos e árvore do mata-mata"
```

---

## Task 6: Verificação final

**Files:** nenhum novo. Apenas verificação.

- [ ] **Step 1: Rodar a suíte completa de testes**

Run: `npm test`
Expected: todos os testes passam (incluindo os novos `clinchGrupo` e `resultadosOficiais`).

- [ ] **Step 2: Typecheck + build de teste**

Run: `npx tsc -b --noEmit && npm run build`
Expected: sem erros. (NÃO rodar `build:prod`.)

- [ ] **Step 3: Smoke manual nos dois modos**

Run: `npm run dev`. Validar com os dados atuais do Firestore de teste:
- `/resultados` exige login (redireciona para `/login` se deslogado).
- Item "Resultados" aparece no menu para usuário logado.
- Modo "Por fase": abas filtram; placares oficiais corretos.
- Modo "Chaveamento": grupos com clinch + mata-mata em colunas.
- Console sem erros.

- [ ] **Step 4: Confirmar contexto Firebase de teste**

Run: `firebase use`
Expected: projeto ativo é o de teste (`bolao-do-bolero-teste`). Nenhum deploy foi feito.

---

## Self-Review (cobertura da spec)

- **Clinch matemático antecipado** → Task 1 (lib + testes conservadores). ✓
- **Reúso de classificação/bracket** → Task 2 (`calcularClassificacoesReais`, `montarResolvedorBracketOficial`). ✓
- **`Resultado.classificado` (pênaltis)** → mapeado em `jogosParaPalpitesReais` (Task 2) e exibido em `PorFaseView`/`BracketView`. ✓
- **Acesso a qualquer logado** → Task 4 (`ProtectedRoute` + menu sempre visível). ✓
- **Dois modos (chaveamento + por fase)** → toggle na página (Task 4) + `PorFaseView` (Task 4) + `BracketView` (Task 5). ✓
- **Slot só com posição exata** → `montarResolvedorBracket` resolve grupo só quando completo (Task 2/5). ✓
- **Classificados no bracket** → lista "✓ Classificados" por grupo no `BracketView` (Task 5). ✓
- **Terceiros só com grupos completos** → herdado de `montarResolvedorBracket` (não alterado). ✓
- **Somente leitura / sem `config` / ambiente teste** → Global Constraints + Task 6. ✓
