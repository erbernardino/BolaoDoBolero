---
title: Página Resultados
tags: [frontend, resultados, bracket, projecao]
status: documentado
related:
  - "[[Resolução provisória vs oficial]]"
  - "[[Snapshot de resultados]]"
  - "[[Bracket oficial]]"
  - "[[Frontend MOC]]"
---

A página **Resultados** (`/resultados`, `src/pages/Resultados.tsx`) é uma tela de leitura que mostra os resultados oficiais da Copa e a projeção do mata-mata: classificação dos grupos, [[Clinch de grupo]] e bracket preenchido. É protegida por `ProtectedRoute` (App.tsx:49) e o título exibido é "Resultados e Projeções".

> [!info] Esta nota cobre a página **Resultados**; as telas vizinhas de leitura têm notas próprias: [[Página Ranking]] (classificação do bolão) e [[Impressão de palpites]] (layout de impressão dos palpites do usuário). Os palpites de todos ficam em [[Ver Palpites]].

## Dois modos de visualização

Um toggle alterna entre dois modos (estado `modo`, default `'chaveamento'`):

- **Chaveamento** — `BracketView` (`src/components/resultados/BracketView.tsx`): tabelas dos 8 grupos no topo + o mata-mata em colunas horizontais por fase (`2ª Fase` → `Oitavas` → `Quartas` → `Semis` → `Final`), mais a disputa de 3º lugar. Cada confronto é um card com o número do jogo, os dois lados e o placar; quando há `resultado.classificado` exibe quem avançou nos pênaltis.
- **Por fase** — `PorFaseView` (`src/components/resultados/PorFaseView.tsx`): abas por `Fase` (`Grupos`, `2ª Fase`, `Oitavas`, `Quartas`, `Semis`, `3º Lugar`, `Final`). Na aba `Grupos` mostra as tabelas + os jogos da fase de grupos (lados via `slotDireto`, sem provisoriedade); nas demais, resolve cada lado via o resolvedor provisório.

Ambos os modos consomem os mesmos três cálculos derivados (memoizados em `Resultados.tsx`): `calcularClassificacoesReais` (classificação parcial), `calcularClinchGrupo` por grupo (só jogos da fase `grupos`) e `montarResolvedorProvisorio`.

## Componentes de apoio

| Componente | Arquivo | Papel |
|---|---|---|
| `GrupoTabela` | `GrupoTabela.tsx` | Tabela de um grupo (P, J, SG) com badge ✓ (classificado / `bg-green-50`) e ✕ (eliminado / esmaecido), lendo `clinch[timeId].classificadoTop2` e `.eliminado`. |
| `TimeChip` | `TimeChip.tsx` | Renderiza um lado do confronto a partir de um `SlotResolvido`: bandeira + sigla, ✓ verde quando `classificado`, itálico esmaecido quando `provisorio && !classificado`. Sem `timeId`, cai para o `label` de origem (ex.: `2A`, `W74`). Exporta também `slotDireto`. |

## Resolvedor provisório — o coração da projeção

`montarResolvedorProvisorio(jogos, grupos)` (`src/lib/resolverProvisorio.ts:33`) retorna `(jogo) => { casa: SlotResolvido, visitante: SlotResolvido }`, onde `SlotResolvido = { timeId: string | null, classificado: boolean, provisorio: boolean }`. Ele combina três fontes: `calcularClassificacoesReais` (parcial), `montarResolvedorBracketOficial` ([[Bracket oficial]]) e `calcularClinchGrupo` por grupo.

Cada lado é resolvido por prioridade (`resolverLado`, linhas 44-70):

1. **Resolução oficial** — se o [[Bracket oficial]] já dá um `timeId` (grupo completo ou cascata com resultado): `provisorio = false`; `classificado` vem do clinch top-2 quando é slot de grupo, senão `true` (`resolverProvisorio.ts:48-53`).
2. **Slot direto de grupo `1X`/`2X`** (regex `/^([12])([A-L])$/`) sem oficial: usa `cls[letra][pos-1]` (líder parcial atual); `classificado = clinch.classificadoTop2`; `provisorio = !(posicaoExataGarantida === pos)` — resolve cedo, mas marca esmaecido (`resolverProvisorio.ts:56-66`).
3. **Terceiros (`3XYZ`) e cascatas (`W##`/`RU##`)** NÃO resolvem cedo: retornam `VAZIO` (`timeId: null`), exibidos só como label (`resolverProvisorio.ts:68-69`).

> [!tip] Comportamento por estado de grupo (coberto por teste): grupo com 1 jogo → `1A` = líder atual, `classificado=false`, `provisorio=true`. Clinch top-2 garantido mas posição (1º/2º) ainda indefinida → `classificado=true` e `provisorio=true`. Grupo completo → `provisorio=false`, `classificado=true`.

> [!warning] Só slots **diretos de grupo** (`1X`/`2X`) recebem preenchimento provisório; terceiros e cascatas esperam dado suficiente. É a [[Resolução provisória vs oficial]]: o **oficial** só resolve o slot de grupo quando o grupo está completo; o **provisório** resolve cedo com a parcial, mas sinaliza esmaecido. Toda a lógica é derivada das libs puras existentes — zero duplicação. Ver também [[Alocação de terceiros por slot]] e [[Melhores terceiros]].

## Snapshot de resultados (planejado)

> [!warning] **Estado atual do código vs. plano.** Hoje `Resultados.tsx` carrega `jogos`, `times` e `grupos` com `getDocs` em **um único `Promise.all`** (linhas 26-30, leitura pontual, não tempo real) e **sempre recalcula** tudo no cliente via `useMemo`. Não há leitura de `_system/resultados` nem `onSnapshot` no código atual.

O **[[Snapshot de resultados]]** — fotografia serializável (classificações + clinch + bracket provisório) gravada em [[Coleção _system]] (`_system/resultados`) por [[Trigger de snapshot]] — está **especificado mas ainda não implementado** nesta branch. Conforme `docs/superpowers/specs/2026-06-22-resultados-oficiais-design.md:199-248`:

- `montarSnapshotResultados(jogos, grupos)` retornaria `SnapshotResultados { classificacoes, clinch, bracket, baseadoEm: { jogosEncerrados } }` (spec:207-214). `classificacoes = calcularClassificacoesReais`; `clinch = calcularClinchGrupo` por letra (só fase `grupos`); `bracket = montarResolvedorProvisorio` aplicado **só a jogos com fase ≠ `grupos`** (jogos de grupos não entram no bracket do snapshot).
- `baseadoEm.jogosEncerrados` (nº de jogos encerrados com resultado) é o marcador de **staleness** / cache invalidation.
- A lib é serializável (sem `Timestamp`); o `atualizadoEm` seria adicionado só na gravação pela Cloud Function (spec:218). A mesma lib pura rodaria no frontend e na função que recalcula ao gravar um resultado.
- O plano troca `getDocs` por `onSnapshot` em `jogos` e em `_system/resultados`: se o snapshot estiver **fresco** (`baseadoEm.jogosEncerrados` == contagem real de encerrados) usa-o; senão recalcula no cliente (spec:237-239).

> [!danger] O snapshot **deve** ser persistido fora da coleção `config` do Firestore — a [[Coleção config]] só pode ter `geral` e `resultado_especial` (ver CLAUDE.md). Por isso o destino é [[Coleção _system]] (`_system/resultados`). A divergência possível entre tabela e bracket quando o snapshot estiver desatualizado foi ponto de atenção recente da branch (commit `b181ebc`). Ver [[Divergências conhecidas]].

## Relacionados

- [[Resolução provisória vs oficial]] — distinção central entre o resolvedor provisório (cedo, esmaecido) e o [[Bracket oficial]] (só com grupo completo).
- [[Snapshot de resultados]] — fotografia serializável planejada para `_system/resultados`.
- [[Bracket oficial]] — `montarResolvedorBracketOficial`, fonte da prioridade 1.
- [[Clinch de grupo]] — `calcularClinchGrupo`, origem dos selos ✓ / ✕ e da flag `classificado`.
- [[Coleção _system]] · [[Coleção config]] · [[Trigger de snapshot]] · [[Divergências conhecidas]]
- [[Página Ranking]] · [[Ver Palpites]] · [[Impressão de palpites]]
- [[Frontend MOC]]
