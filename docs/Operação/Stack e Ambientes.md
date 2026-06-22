---
title: Stack e Ambientes
tags:
  - operacao
  - stack
  - firebase
  - deploy
status: documentado
related:
  - "[[Operação MOC]]"
  - "[[Comandos e Scripts]]"
  - "[[Inicialização Firebase]]"
  - "[[Backup diário]]"
---

A stack tecnológica do **Bolão do Bolero** e os dois ambientes Firebase (produção e teste) com seus comandos de desenvolvimento, build, teste e deploy. É a base operacional do projeto: define onde o código roda, como é construído e como chega ao ar.

## Stack tecnológica

Bolão único para a Copa do Mundo FIFA 2026 (ver [[Visão Geral e Regulamento]]), construído sobre **Firebase puro**.

### Frontend
- **React 18/19** + **TypeScript** + **Vite 8** + **Tailwind CSS 4** (PWA).
- **react-router-dom 7** para roteamento (ver [[Rotas e Guards]]).
- **firebase 12** como SDK cliente (inicializado em [[Inicialização Firebase]]).
- **@sentry/react** para monitoramento de erros (ver [[Observabilidade]]).
- **react-easy-crop** para [[Processamento de imagem]].

### Backend
- **Firebase puro**: Auth + Firestore + Cloud Functions + Hosting + FCM.
- Cloud Functions em **Node 22** (`functions/package.json`, campo `engines.node`).
- Triggers e jobs vivem em `functions/src/`: `index.ts`, `pontuacao.ts`, `resolverMataMata.ts`, `resultadosProjecoes.ts`, `audit.ts`, `backup.ts` e a [[Lógica compartilhada do backend]] em `_shared/`.

> [!info] Lógica compartilhada
> O build das functions copia código compartilhado antes de compilar: `functions/package.json` define `build` como `node copy-shared.mjs && tsc`. Esse passo materializa os [[Tipos compartilhados de cálculo]] dentro de `_shared/`.

## Ambientes Firebase

Dois projetos Firebase, configurados em `.firebaserc`:

| Alias | Project ID | URL | Uso |
| --- | --- | --- | --- |
| `default` | `bolao-do-bolero` | https://bolao-do-bolero.web.app | **Produção** (perigoso como default) |
| `prod` | `bolao-do-bolero` | https://bolao-do-bolero.web.app | Produção (alias explícito) |
| `teste` | `bolao-do-bolero-teste` | https://bolao-do-bolero-teste.web.app | Validação antes de produção |

> [!danger] O default aponta para PRODUÇÃO
> Em `.firebaserc`, o alias `default` é `bolao-do-bolero` (produção). Qualquer `firebase deploy` sem `--project` cai direto em produção. **Sempre use `--project teste` ou `--project prod` explicitamente** — nunca confie no default.

> [!warning] Validar primeiro em `teste`
> Regra operacional: toda correção é validada primeiro no ambiente `teste` (`bolao-do-bolero-teste`). O deploy de produção só acontece depois, e sempre com `--project prod`.

## Comandos de desenvolvimento

Ver a referência completa em [[Comandos e Scripts]].

### Frontend (`package.json`)
| Comando | Ação |
| --- | --- |
| `npm run dev` | `vite` — servidor de desenvolvimento |
| `npm run build` | `tsc -b && vite build` |
| `npm run build:prod` | `tsc -b && vite build --mode prod` |
| `npm run lint` | `eslint .` |
| `npm run preview` | `vite preview` |
| `npm test` | `vitest run` |
| `npm run test:watch` | `vitest` (modo watch) |

### Seed e setup (`package.json`)
| Comando | Ação |
| --- | --- |
| `npm run setup:admin` | `npx tsx scripts/setup-admin.ts` |
| `npm run seed:times` | `npx tsx scripts/seed-times.ts` ([[Entidades estáticas]]) |
| `npm run seed:jogos` | `npx tsx scripts/seed-jogos.ts` |

### Cloud Functions (`functions/package.json`)
| Comando | Ação |
| --- | --- |
| `npm run build` | `node copy-shared.mjs && tsc` |
| `npm run serve` / `npm run shell` | `firebase emulators` |
| `npm run deploy` | `firebase deploy --only functions` |

## Build e Hosting

`firebase.json` define o hosting servindo `public: "dist"` com rewrite SPA (`**` → `/index.html`):

- **Cache-Control immutable** em `/assets/**` (`public, max-age=31536000, immutable`).
- **no-cache** em `/`, `/index.html`, `**/*.html`, `/version.json` e `/firebase-messaging-sw.js` — garante que o app sempre busque a versão mais nova (relevante para o fluxo de atualização do PWA em [[Hooks e PWA]]).
- Header **`Cross-Origin-Opener-Policy: same-origin-allow-popups`** em `**`, necessário para o popup de login (ver [[Autenticação Login e Cadastro]]).
- O predeploy das functions roda `npm run build` automaticamente (`functions/package.json`).

## Deploy e CI

- **Deploy completo**: `firebase deploy` (hosting + functions + rules + indexes). Para alvos específicos use `--only hosting` / `--only functions`.
- **GitHub Actions**: PRs mergeados são deployados automaticamente em produção e teste, via os workflows `.github/workflows/deploy-prod.yml` e `.github/workflows/deploy-dev.yml`.
- A config de produção do frontend vem dos *secrets* do GitHub Actions (ambiente `prod` no `deploy-prod.yml`), não de arquivos locais.

> [!warning] Múltiplos arquivos `.env` — atenção ao alvo de build
> Existem `.env.development`, `.env.local`, `.env.prod.local` e `.env.production.local`. O `.env.development` aponta para **teste** (`bolao-do-bolero-teste`) e é o que o `npm run dev` usa. O `.env.prod.local`/`.env.production.local` apontam para **produção**. É fácil construir contra o projeto errado: existe `scripts/verify-build-target.sh` justamente para checar o alvo do build antes de publicar.

> [!tip]
> Antes de um build de produção (`npm run build:prod`), rode `scripts/verify-build-target.sh` para confirmar que as variáveis `VITE_FIREBASE_*` apontam para `bolao-do-bolero` (produção), e não para o ambiente de teste.

## Relacionados

- [[Operação MOC]]
- [[Comandos e Scripts]]
- [[Inicialização Firebase]]
- [[Backup diário]]
- [[Observabilidade]]
- [[Hooks e PWA]]
- [[Lógica compartilhada do backend]]
- [[Cloud Functions MOC]]
