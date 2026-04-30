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

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS (PWA via vite-plugin-pwa)
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
- Pontuação não cumulativa: placar exato (10) > placar de um time (5) > vencedor (3) — valores configuráveis
- Mata-mata personalizado por usuário baseado nos palpites da fase de grupos
- Classificação de grupos segue critérios FIFA (pontos > saldo > gols marcados > confronto direto)
- 8 melhores terceiros colocados avançam para mata-mata
- Todos os palpites devem ser feitos antes do início da Copa
- Empate no mata-mata exige indicar quem avança (pênaltis)
