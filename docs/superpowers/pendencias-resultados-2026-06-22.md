# Relatório de pendências — Página de Resultados e Projeções

**Data:** 2026-06-22 · **Branch base:** mergeada em `dev` (PR #40) · **Deploy:** ambiente **teste** (`bolao-do-bolero-teste`).

## Estado atual (concluído)

- Página **`/resultados`** ("Resultados e Projeções") com 2 modos: **Chaveamento** (bracket espelhado) e **Por fase**.
- **Clinch de classificação** (`src/lib/clinchGrupo.ts` + `src/lib/clinchMataMata.ts`): selo ✓ = garantido no mata-mata (top-2 **ou** 8 melhores terceiros). Conservador, cross-group, com testes.
- **Bracket provisório** (`src/lib/resolverProvisorio.ts`): slots de grupo preenchidos pela classificação atual; ✓ classificado, *itálico* = provisório.
- **Chaveamento espelhado** (`src/lib/arvoreMataMata.ts` + `BracketView`): final no centro, 3º lugar abaixo.
- **Persistência via Cloud Function** `onResultadoParaSnapshot` (trigger em `jogos` → grava `_system/resultados`); página consome via `onSnapshot` (tempo real) com fallback. Lógica **compartilhada** `src/lib` ↔ `functions/` (sem duplicar), via `src/types/calc.ts` + `functions/copy-shared.mjs`.
- **`/todos-palpites`** resolve os times do mata-mata pelos resultados oficiais.
- Grupos em ordem alfabética. Suíte: 49 testes passando.

## Pendências

### 1. Linhas conectoras do chaveamento (prioridade do usuário)
O bracket espelhado (`src/components/resultados/BracketView.tsx`) converge por espaçamento
(`justify-around`), **sem as linhas em "L"** que ligam cada par de jogos ao confronto seguinte (como
no site da FIFA). Falta desenhar essas linhas (CSS com pseudo-elementos/bordas, ou SVG sobreposto).
A estrutura de árvore já está pronta em `arvoreMataMata.ts` (colunas esquerda/direita + final).

### 2. `/admin/resultados` — 2ª fase com times resolvidos (prioridade do usuário)
Em `src/pages/admin/InserirResultados.tsx`, a função `getTimesReais(jogo)` resolve os times do
mata-mata via `jogo.origemCasa/origemVisitante` — **mas nos dados reais esses campos são `null`**
(o mata-mata usa `labelCasa`/`labelVisitante`, ex.: `2A`, `W74`). Resultado: a 2ª fase aparece com
label/origem em vez dos times confirmados.
**Correção:** reusar `montarResolvedorProvisorio` (ou `montarResolvedorBracketOficial`) de
`src/lib/resolverProvisorio.ts` / `resultadosOficiais.ts` — a mesma resolução já usada em `/resultados`
e `/todos-palpites` — para exibir os times **resolvidos pelos resultados oficiais** ao inserir o placar.

### 3. Deploy em produção
A página e a Cloud Function estão **só no ambiente teste**. Falta `npm run build:prod` + verify +
`firebase deploy --only hosting,functions --project prod` quando aprovado.

### 4. Atualizar `firebase-functions`
O deploy emite aviso de versão desatualizada de `firebase-functions` (há breaking changes). Atualizar
em `functions/package.json` e revalidar os triggers.

### 5. Refinar "eliminado do mata-mata" (✕)
Hoje o ✕ (`montarClinchCompleto`) só marca quem está garantido em **último (4º)**. Um 3º que já não
pode mais entrar nos 8 melhores não é marcado (conservador). Pode ser refinado com o complemento
otimista (melhor caso) da análise de terceiros.

### 6. Sincronização contínua com a FIFA
Os resultados de teste estão sincronizados com a Copa real (manualmente nesta sessão). Conforme a Copa
avança, novos resultados precisam entrar. Vale um script/rotina usando a API
`api.fifa.com/api/v3/calendar/matches?idCompetition=17&idSeason=285023` (mapear por `MatchNumber`,
`MatchStatus===0` = finalizado, gravar placar nos jogos de mesmo `numero`).
