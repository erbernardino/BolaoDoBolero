# Persistência do snapshot de Resultados/Projeções — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir os dados derivados da página de Resultados/Projeções (classificação, clinch, bracket provisório) em `_system/resultados` no Firestore, recalculados no fluxo de gravação do admin, e fazer a página consumi-los em tempo real com fallback de cálculo client-side.

**Architecture:** Uma lib pura nova (`snapshotResultados.ts`) serializa o output das libs já testadas (`calcularClassificacoesReais` + `calcularClinchGrupo` + `montarResolvedorProvisorio`) num objeto. O admin (`InserirResultados.tsx`) grava esse snapshot em `_system/resultados` após cada recarga de dados. A página (`Resultados.tsx`) escuta o doc via `onSnapshot` e usa os derivados prontos quando frescos, recalculando client-side só quando o snapshot está ausente/stale.

**Tech Stack:** React 18 + TypeScript + Vite + Tailwind + Firebase Firestore (client SDK v12). Testes em Vitest.

## Global Constraints

- **Ambiente apenas teste:** validar com `npm run dev` / `npm run build` (default = projeto teste). NUNCA `npm run build:prod` nem `firebase deploy`.
- **Coleção do snapshot:** `_system/resultados` (doc único). NUNCA a coleção `config` (diretiva de segurança — só pode ter `geral` e `resultado_especial`).
- **Sem Cloud Functions / triggers de servidor** nesta feature. Recálculo só no fluxo do admin.
- **Zero duplicação de lógica:** reusar `src/lib` (`calcularClassificacoesReais`, `calcularClinchGrupo`, `montarResolvedorProvisorio`). Não reimplementar clinch/classificação/bracket.
- **NUNCA `git stash`** (qualquer variante).
- **Snapshot é cache de dados derivados, não fonte de verdade:** a página deve recalcular client-side quando o doc estiver ausente ou stale (`baseadoEm.jogosEncerrados` divergente).
- **Regras Firestore já cobrem `_system/{docId}`** (`read: if true; write: if isAdmin()`) — não alterar `firestore.rules`.
- **Tipos canônicos** em `src/types/index.ts`: `Jogo`, `ClassificacaoTime`, `Time`. `ClinchTime` em `src/lib/clinchGrupo.ts`. `SlotResolvido`/`ResolverProvisorio` em `src/lib/resolverProvisorio.ts`. `GrupoRef` em `src/lib/bracketUsuario.ts`.

---

## Estrutura de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `src/lib/snapshotResultados.ts` | criar | monta o objeto serializável do snapshot a partir dos jogos/grupos |
| `src/lib/__tests__/snapshotResultados.test.ts` | criar | testes do snapshot |
| `src/pages/admin/InserirResultados.tsx` | modificar | grava o snapshot em `_system/resultados` ao recarregar dados |
| `src/pages/Resultados.tsx` | modificar | escuta o snapshot (real-time) + fallback de cálculo client-side |

---

## Task 1: Lib `snapshotResultados.ts`

**Files:**
- Create: `src/lib/snapshotResultados.ts`
- Test: `src/lib/__tests__/snapshotResultados.test.ts`

**Interfaces:**
- Consumes: `Jogo`, `ClassificacaoTime` de `src/types`; `GrupoRef` de `./bracketUsuario`; `calcularClassificacoesReais` de `./resultadosOficiais`; `calcularClinchGrupo`, `ClinchTime` de `./clinchGrupo`; `montarResolvedorProvisorio`, `SlotResolvido` de `./resolverProvisorio`.
- Produces:
  ```ts
  export interface SnapshotResultados {
    classificacoes: Record<string, ClassificacaoTime[]>
    clinch: Record<string, Record<string, ClinchTime>>
    bracket: Record<string, { casa: SlotResolvido; visitante: SlotResolvido }>
    baseadoEm: { jogosEncerrados: number }
  }
  export function montarSnapshotResultados(jogos: Jogo[], grupos: GrupoRef[]): SnapshotResultados
  ```

- [ ] **Step 1: Escrever o teste que falha**

Criar `src/lib/__tests__/snapshotResultados.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { montarSnapshotResultados } from '../snapshotResultados'
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

const GRUPOS: GrupoRef[] = [{ nome: 'Grupo A', times: ['BRA', 'ARG', 'ESP', 'GER'] }]

describe('montarSnapshotResultados', () => {
  it('monta classificações, clinch e bracket por grupo/jogo, com baseadoEm correto', () => {
    const jogos: Jogo[] = [
      jogoGrupo('a1', 'A', 'BRA', 'ARG', [2, 0]),
      jogoGrupo('a2', 'A', 'ESP', 'GER', [1, 0]),
      jogoGrupo('a3', 'A', 'BRA', 'ESP', null),
      jogoGrupo('a4', 'A', 'ARG', 'GER', null),
      jogoGrupo('a5', 'A', 'BRA', 'GER', null),
      jogoGrupo('a6', 'A', 'ARG', 'ESP', null),
      jogoMata('m1', 73, '1A', '2A'),
    ]
    const snap = montarSnapshotResultados(jogos, GRUPOS)

    // classificações: chave por letra de grupo, com 4 times.
    expect(snap.classificacoes['A']).toBeDefined()
    expect(snap.classificacoes['A'].length).toBe(4)
    expect(snap.classificacoes['A'][0].timeId).toBe('BRA') // 1º atual

    // clinch: chave por letra → por timeId.
    expect(snap.clinch['A']).toBeDefined()
    expect(snap.clinch['A']['BRA']).toBeDefined()
    expect(typeof snap.clinch['A']['BRA'].classificadoTop2).toBe('boolean')

    // bracket: só jogos de mata-mata, indexado por jogoId.
    expect(Object.keys(snap.bracket)).toEqual(['m1'])
    expect(snap.bracket['m1'].casa.timeId).toBe('BRA')      // 1A provisório = líder atual
    expect(snap.bracket['m1'].visitante.timeId).toBe('ESP') // 2A provisório

    // baseadoEm: contagem de jogos encerrados com resultado.
    expect(snap.baseadoEm.jogosEncerrados).toBe(2)
  })

  it('não inclui jogos de grupos no bracket', () => {
    const jogos: Jogo[] = [jogoGrupo('a1', 'A', 'BRA', 'ARG', [1, 0])]
    const snap = montarSnapshotResultados(jogos, GRUPOS)
    expect(snap.bracket).toEqual({})
  })
})
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `npm test -- src/lib/__tests__/snapshotResultados.test.ts`
Expected: FAIL — módulo `../snapshotResultados` não encontrado.

- [ ] **Step 3: Implementar a lib**

Criar `src/lib/snapshotResultados.ts`:

```ts
import type { Jogo, ClassificacaoTime } from '../types'
import type { GrupoRef } from './bracketUsuario'
import { calcularClassificacoesReais } from './resultadosOficiais'
import { calcularClinchGrupo, type ClinchTime } from './clinchGrupo'
import { montarResolvedorProvisorio, type SlotResolvido } from './resolverProvisorio'

/**
 * Fotografia (cache de dados derivados) da página de Resultados/Projeções,
 * pronta para serializar em Firestore. Não inclui Timestamp — o `atualizadoEm`
 * é adicionado na hora da gravação.
 */
export interface SnapshotResultados {
  /** Classificação parcial por letra de grupo. */
  classificacoes: Record<string, ClassificacaoTime[]>
  /** Status de clinch por letra de grupo → por timeId. */
  clinch: Record<string, Record<string, ClinchTime>>
  /** Resolução provisória do mata-mata por jogoId (só jogos fora da fase de grupos). */
  bracket: Record<string, { casa: SlotResolvido; visitante: SlotResolvido }>
  /** Marcador de staleness: nº de jogos encerrados com resultado no momento do cálculo. */
  baseadoEm: { jogosEncerrados: number }
}

/** Monta o snapshot derivado reusando as libs puras de cálculo (zero duplicação). */
export function montarSnapshotResultados(jogos: Jogo[], grupos: GrupoRef[]): SnapshotResultados {
  const classificacoes = calcularClassificacoesReais(jogos, grupos)

  const clinch: Record<string, Record<string, ClinchTime>> = {}
  const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
  for (const g of grupos) {
    const letra = g.nome.replace('Grupo ', '')
    clinch[letra] = calcularClinchGrupo(jogosGrupos.filter(j => j.grupo === letra), g.times)
  }

  const resolver = montarResolvedorProvisorio(jogos, grupos)
  const bracket: Record<string, { casa: SlotResolvido; visitante: SlotResolvido }> = {}
  for (const j of jogos) {
    if (j.fase !== 'grupos') bracket[j.id] = resolver(j)
  }

  const jogosEncerrados = jogos.filter(j => j.encerrado && j.resultado).length

  return { classificacoes, clinch, bracket, baseadoEm: { jogosEncerrados } }
}
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `npm test -- src/lib/__tests__/snapshotResultados.test.ts`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/snapshotResultados.ts src/lib/__tests__/snapshotResultados.test.ts
git commit -m "feat(lib): snapshot serializável de resultados/projeções"
```

---

## Task 2: Gravar o snapshot no fluxo do admin

**Files:**
- Modify: `src/pages/admin/InserirResultados.tsx`

**Interfaces:**
- Consumes: `montarSnapshotResultados` de `src/lib/snapshotResultados`; `setDoc`, `serverTimestamp`, `doc` de `firebase/firestore`.
- Produces: efeito colateral — documento `_system/resultados` com `{ ...SnapshotResultados, atualizadoEm }` gravado a cada `carregarDados()`.

- [ ] **Step 1: Adicionar imports**

Em `src/pages/admin/InserirResultados.tsx`, a linha de import do firestore (linha 2) é:

```ts
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore'
```

Trocar por:

```ts
import { collection, getDocs, doc, updateDoc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
```

E adicionar, logo após o import de `calcularClassificacaoGrupo` (linha 4):

```ts
import { montarSnapshotResultados } from '../../lib/snapshotResultados'
```

- [ ] **Step 2: Extrair a lista de grupos local e persistir o snapshot em `carregarDados`**

Em `carregarDados()`, o trecho atual (linhas ~64-79) é:

```ts
    const listaJogos = jogosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Jogo))
    listaJogos.sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
    setJogos(listaJogos)
    setTimes(timesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Time)))
    setGrupos(gruposSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Grupo)))

    const forms: Record<string, ResultadoForm> = {}
    for (const jogo of listaJogos) {
      forms[jogo.id] = {
        golsCasa: jogo.resultado ? String(jogo.resultado.golsCasa) : '',
        golsVisitante: jogo.resultado ? String(jogo.resultado.golsVisitante) : '',
        classificado: jogo.resultado?.classificado ?? '',
      }
    }
    setResultados(forms)
```

Trocar por (extrai `listaGrupos` e persiste o snapshot ao final, best-effort):

```ts
    const listaJogos = jogosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Jogo))
    listaJogos.sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
    const listaGrupos = gruposSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Grupo))
    setJogos(listaJogos)
    setTimes(timesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Time)))
    setGrupos(listaGrupos)

    const forms: Record<string, ResultadoForm> = {}
    for (const jogo of listaJogos) {
      forms[jogo.id] = {
        golsCasa: jogo.resultado ? String(jogo.resultado.golsCasa) : '',
        golsVisitante: jogo.resultado ? String(jogo.resultado.golsVisitante) : '',
        classificado: jogo.resultado?.classificado ?? '',
      }
    }
    setResultados(forms)

    // Persiste o snapshot derivado (cache lido pela página /resultados em tempo real).
    // Best-effort: se falhar, não bloqueia a gravação do resultado (a página tem fallback).
    try {
      await setDoc(doc(db, '_system', 'resultados'), {
        ...montarSnapshotResultados(listaJogos, listaGrupos),
        atualizadoEm: serverTimestamp(),
      })
    } catch (e) {
      console.error('Falha ao persistir snapshot de resultados', e)
    }
```

- [ ] **Step 3: Verificar typecheck e build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: build conclui sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/InserirResultados.tsx
git commit -m "feat(admin): grava snapshot de resultados em _system/resultados ao recarregar"
```

---

## Task 3: Página consome o snapshot em tempo real (com fallback)

**Files:**
- Modify: `src/pages/Resultados.tsx`

**Interfaces:**
- Consumes: `montarSnapshotResultados`'s tipo `SnapshotResultados` de `src/lib/snapshotResultados`; `onSnapshot`, `collection`, `doc`, `getDocs` de `firebase/firestore`; `montarResolvedorProvisorio`, `SlotResolvido`, `ResolverProvisorio` de `src/lib/resolverProvisorio`; libs de cálculo já importadas.
- Produces: comportamento — página renderiza a partir do snapshot quando fresco; recalcula client-side quando ausente/stale; atualiza ao vivo.

- [ ] **Step 1: Reescrever a página**

Substituir todo o conteúdo de `src/pages/Resultados.tsx` por:

```tsx
import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { Navbar } from '../components/Navbar'
import type { Jogo, Time, ClassificacaoTime } from '../types'
import type { GrupoRef } from '../lib/bracketUsuario'
import { calcularClinchGrupo, type ClinchTime } from '../lib/clinchGrupo'
import { calcularClassificacoesReais } from '../lib/resultadosOficiais'
import { montarResolvedorProvisorio, type ResolverProvisorio } from '../lib/resolverProvisorio'
import type { SnapshotResultados } from '../lib/snapshotResultados'
import { PorFaseView } from '../components/resultados/PorFaseView'
import { BracketView } from '../components/resultados/BracketView'

type Modo = 'chaveamento' | 'fase'

const SLOT_VAZIO = { timeId: null, classificado: false, provisorio: false }
const SLOTS_VAZIOS = { casa: SLOT_VAZIO, visitante: SLOT_VAZIO }

export function Resultados() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [grupos, setGrupos] = useState<GrupoRef[]>([])
  const [snapshot, setSnapshot] = useState<SnapshotResultados | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(false)
  const [modo, setModo] = useState<Modo>('chaveamento')

  // times e grupos não mudam durante a Copa: leitura pontual.
  useEffect(() => {
    async function loadEstaticos() {
      try {
        const [timesSnap, gruposSnap] = await Promise.all([
          getDocs(collection(db, 'times')),
          getDocs(collection(db, 'grupos')),
        ])
        const tmap = new Map<string, Time>()
        timesSnap.docs.forEach(d => tmap.set(d.id, { id: d.id, ...d.data() } as Time))
        setTimes(tmap)
        setGrupos(gruposSnap.docs.map(d => {
          const data = d.data() as { nome?: string; times?: string[] }
          return { nome: data.nome ?? `Grupo ${d.id}`, times: data.times ?? [] }
        }))
      } catch (e) {
        console.error('Falha ao carregar times/grupos', e)
        setErro(true)
      }
    }
    loadEstaticos()
  }, [])

  // jogos e snapshot: tempo real.
  useEffect(() => {
    const unsubJogos = onSnapshot(
      collection(db, 'jogos'),
      snap => {
        setJogos(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Jogo))
        setLoading(false)
      },
      e => { console.error('Falha ao escutar jogos', e); setErro(true); setLoading(false) },
    )
    const unsubSnap = onSnapshot(
      doc(db, '_system', 'resultados'),
      snap => setSnapshot(snap.exists() ? (snap.data() as SnapshotResultados) : null),
      e => { console.error('Falha ao escutar snapshot', e); setSnapshot(null) },
    )
    return () => { unsubJogos(); unsubSnap() }
  }, [])

  // Snapshot é usável quando existe e bate com a contagem atual de jogos encerrados.
  const snapshotFresco = useMemo(() => {
    if (!snapshot) return false
    const encerrados = jogos.filter(j => j.encerrado && j.resultado).length
    return snapshot.baseadoEm?.jogosEncerrados === encerrados
  }, [snapshot, jogos])

  const classificacoes = useMemo<Record<string, ClassificacaoTime[]>>(
    () => (snapshotFresco && snapshot ? snapshot.classificacoes : calcularClassificacoesReais(jogos, grupos)),
    [snapshotFresco, snapshot, jogos, grupos],
  )

  const clinchPorGrupo = useMemo<Record<string, Record<string, ClinchTime>>>(() => {
    if (snapshotFresco && snapshot) return snapshot.clinch
    const out: Record<string, Record<string, ClinchTime>> = {}
    const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
    for (const g of grupos) {
      const letra = g.nome.replace('Grupo ', '')
      out[letra] = calcularClinchGrupo(jogosGrupos.filter(j => j.grupo === letra), g.times)
    }
    return out
  }, [snapshotFresco, snapshot, jogos, grupos])

  const resolver = useMemo<ResolverProvisorio>(() => {
    if (snapshotFresco && snapshot) {
      return (jogo: Jogo) => snapshot.bracket[jogo.id] ?? SLOTS_VAZIOS
    }
    return montarResolvedorProvisorio(jogos, grupos)
  }, [snapshotFresco, snapshot, jogos, grupos])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h1 className="text-xl font-bold text-gray-800">Resultados e Projeções</h1>
          {!erro && (
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
          )}
        </div>

        {loading ? (
          <p className="text-gray-500">Carregando…</p>
        ) : erro ? (
          <p className="text-red-600">Não foi possível carregar os resultados. Tente recarregar a página.</p>
        ) : modo === 'fase' ? (
          <PorFaseView
            jogos={jogos}
            times={times}
            resolver={resolver}
            grupos={grupos}
            classificacoes={classificacoes}
            clinchPorGrupo={clinchPorGrupo}
          />
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
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar typecheck e build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: build conclui sem erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Resultados.tsx
git commit -m "feat(resultados): consome snapshot _system/resultados em tempo real com fallback"
```

---

## Task 4: Verificação final

**Files:** nenhum novo. Verificação.

- [ ] **Step 1: Suíte completa de testes**

Run: `npm test`
Expected: todos passam (incluindo `snapshotResultados`).

- [ ] **Step 2: Typecheck + build de teste**

Run: `npx tsc -b --noEmit && npm run build`
Expected: sem erros. (NÃO `build:prod`.)

- [ ] **Step 3: Smoke manual end-to-end (ambiente teste)**

Pré-condição: `npm run dev`. Login admin de teste (`adm@bolao.com.br` / `bolao123`).

1. Abrir `/admin` → Inserir Resultados. Gravar/alterar um resultado de jogo de grupo.
2. No console do Firestore (ou via leitura), confirmar que `_system/resultados` foi criado/atualizado com `classificacoes`, `clinch`, `bracket`, `baseadoEm`, `atualizadoEm`.
3. Abrir `/resultados` em outra aba/sessão logada: confirmar que reflete o resultado **sem recarregar** (tempo real via `onSnapshot`).
4. Conferir que a projeção (badges de clinch, bracket provisório) bate com o estado dos jogos.
5. **Fallback:** apagar o doc `_system/resultados` no console do Firestore → a página `/resultados` continua exibindo tudo corretamente (recálculo client-side), sem erro no console.

- [ ] **Step 4: Confirmar contexto Firebase de teste**

Run: `firebase use`
Expected: `bolao-do-bolero-teste`. Nenhum deploy feito.

---

## Self-Review (cobertura da spec — adendo de persistência)

- **Lib `snapshotResultados.ts` reusando libs** → Task 1. ✓
- **Gravação em `_system/resultados` no fluxo do admin** → Task 2 (`setDoc` em `carregarDados`, best-effort). ✓
- **Leitura em tempo real + fallback client-side** → Task 3 (`onSnapshot` em jogos e doc; `snapshotFresco` via `baseadoEm`). ✓
- **`baseadoEm.jogosEncerrados` para staleness** → Task 1 (monta) + Task 3 (compara). ✓
- **Sem mudança em `firestore.rules`** (já cobre `_system/{docId}`) → Global Constraints. ✓
- **Sem Cloud Functions / sem `config` / ambiente teste** → Global Constraints + Task 4. ✓
- **Mesma interface `ResolverProvisorio`** para os componentes não mudarem → Task 3 (resolver do snapshot retorna `{casa,visitante}`). ✓
