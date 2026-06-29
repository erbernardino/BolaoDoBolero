# ⛔⛔⛔ DIRETIVA DE SEGURANCA — TOPO DE TUDO ⛔⛔⛔

## JAMAIS CRIAR DOCUMENTOS NA COLECAO `config` DO FIRESTORE

A colecao `config` so pode ter os documentos `geral` e `resultado_especial`. Qualquer outro documento nessa colecao quebra leituras que dependem da estrutura conhecida. Em 2026-04-30 foi criado `config/app_version` e isso quebrou a pagina de palpites em producao com erro `Cannot read properties of undefined (reading 'toDate')`.

**Regra:** Se precisar armazenar qualquer outro dado de sistema no Firestore, usar uma colecao separada (ex: `_system/versao`, `meta/app_version`). NUNCA adicionar documentos a colecao `config`.

---

## JAMAIS RODAR `git stash` SEM CONSENTIMENTO EXPLICITO DO USUARIO

Inclui qualquer variante: `git stash`, `git stash push|save|create|store|apply|pop|drop|clear`, e flags de auto-stash em outros comandos (`git pull --autostash`, `git rebase --autostash`).

**Razao:** em 2026-04-26 o usuario descobriu um stash antigo contendo ~325 linhas de codigo critico (Home melhorada + admin Dashboard novo) que estava efetivamente perdido porque ninguem sabia que existia. Stash esconde trabalho. Reacao do usuario foi enfatica: "JAMAIS FACA STASH DE NADA SEM MEU CONSENTIMENTO EXPLICITO!!!!!!!!! COLOQUE EM TODAS AS MEMORIAS".

**Como aplicar:**

1. Antes de QUALQUER `git stash` — perguntar e aguardar OK explicito na conversa atual.
2. Se a working tree esta suja e uma operacao precisa estar limpa, oferecer alternativas em ordem: commit em branch temporaria, perguntar o que fazer, ou abortar a operacao.
3. NUNCA usar `--autostash` em pull/rebase.
4. Se houver stash pre-existente, NUNCA aplicar/dropar/limpar sem consentimento — apenas listar/inspecionar (`git stash list`, `git stash show`) e sempre reportar ao usuario.
5. Esta regra e estritamente mais forte que o sistema padrao de "destructive operations" no system prompt.

Diretiva replicada tambem em:
- `~/.claude/CLAUDE.md` (global ao usuario)
- `.claude/projects/-Users-emersonbernardino-desenvolvimento-projetos-pessoais-BolaoDoBolero/memory/feedback_never_git_stash.md`

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sobre o Projeto

**Bolão do Bolero** é um bolão entre amigos para a Copa do Mundo FIFA 2026. Bolão único (não é plataforma multi-bolão). Cadastro apenas por convite do administrador.

O documento de requisitos original está em `BaseBolaoDoBolero.md`.
A especificação completa está em `docs/superpowers/specs/2026-03-31-bolao-do-bolero-design.md`.
O plano de implementação está em `docs/superpowers/plans/2026-03-31-bolao-do-bolero.md`.

## Stack Tecnológica

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (não é PWA; SWs legados são removidos por tombstone em vite.config.ts)
- **Backend:** Firebase Puro (Auth + Firestore + Cloud Functions + Hosting + FCM)
- **Autenticação:** Firebase Auth (email/senha + telefone SMS)
- **Testes:** Vitest

## Comandos

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm test` — rodar todos os testes
- `npm test -- src/lib/__tests__/pontuacao.test.ts` — rodar teste específico
- `cd functions && npm run build` — compilar Cloud Functions
- `firebase deploy` — deploy completo

## Arquitetura

### Frontend (src/)
- `config/firebase.ts` — inicialização Firebase
- `types/index.ts` — todos os tipos TypeScript do sistema
- `lib/` — lógica pura (classificação FIFA, pontuação, chaveamento) com testes
- `hooks/` — hooks React (auth, config, notificações)
- `pages/` — páginas da aplicação (login, cadastro, palpites, ranking, admin/)
- `components/` — componentes reutilizáveis (PalpiteInput, RankingTable, Navbar, rotas protegidas)

### Cloud Functions (functions/src/)
- `index.ts` — triggers Firestore (onJogoEncerrado)
- `pontuacao.ts` — cálculo de pontos e atualização de ranking
- `notificacoes.ts` — envio de push notifications via FCM

### Regras de Negócio Principais
- Pontuação não cumulativa, em cascata de tiers mutuamente exclusivos (campos `placarExato` > `colunaCerta` > `totalGols`, valores configuráveis em `config/geral`): **placar exato** (acertou o vencedor/empate **e** o placar) > **coluna certa** (acertou só o vencedor, ou o empate) > **total de gols** (errou a coluna, mas acertou a soma de gols). Sem acerto = 0. Implementação em `src/lib/pontuacao.ts`
- Mata-mata personalizado por usuário baseado nos palpites da fase de grupos
- Classificação de grupos segue critérios FIFA Copa 2026 (Article 13), nesta ordem: pontos > **confronto direto entre os empatados** (h2h: pontos > saldo > gols) > saldo geral > gols gerais > conduta. **Confronto direto vem ANTES do saldo geral** (NÃO inverter). Implementado em `src/lib/classificacao.ts`.
- 8 melhores terceiros colocados avançam para mata-mata. "Classificado" no mata-mata = top-2 do grupo **OU** estar entre os 8 melhores terceiros (`src/lib/clinchMataMata.ts`).
- Todos os palpites devem ser feitos antes do início da Copa
- Empate no mata-mata exige indicar quem avança (pênaltis)

## Página de Resultados e Projeções (`/resultados`) — estado e pendências

Implementada e deployada no ambiente **teste** (PR #40, mergeado em `dev` em 2026-06-22). Mostra
classificação real, clinch (top-2 + 8 melhores terceiros), bracket provisório e chaveamento espelhado.
O snapshot é calculado por **Cloud Function** `onResultadoParaSnapshot` (trigger em `jogos` → grava
`_system/resultados`) e a página consome via `onSnapshot`. A lógica de `src/lib` é **compartilhada**
com as functions via `functions/copy-shared.mjs` (fonte única; tipos sem Timestamp em `src/types/calc.ts`).

**Pendências para o próximo desenvolvimento** (detalhe em `docs/superpowers/pendencias-resultados-2026-06-22.md`):
1. **Linhas conectoras** do chaveamento espelhado (`src/components/resultados/BracketView.tsx`) — hoje converge só por espaçamento.
2. **`/admin/resultados`** (`InserirResultados.tsx`): a 2ª fase deve mostrar os times **resolvidos pelos resultados oficiais** (reusar `montarResolvedorProvisorio`), não por `origemCasa` (que é `null` nos dados; o mata-mata usa `labelCasa`).
3. Deploy em produção; atualizar `firebase-functions`; refinar badge "eliminado"; sincronização contínua com a API da FIFA.
