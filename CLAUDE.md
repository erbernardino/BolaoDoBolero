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
