---
title: Observabilidade
tags:
  - frontend
  - observabilidade
  - telemetria
  - sentry
  - analytics
status: documentado
related:
  - "[[Inicialização Firebase]]"
  - "[[Stack e Ambientes]]"
  - "[[Hooks e PWA]]"
  - "[[Frontend MOC]]"
---

A camada de observabilidade do front reúne três provedores complementares de telemetria: **Sentry** captura erros em runtime (sem performance tracing), o **Firebase Analytics** registra `page_view` por rota e associa o `uid` do usuário, e o **Firebase Performance** coleta web vitals automaticamente. Toda a integração é gatilhada pela [[Inicialização Firebase]] e configurada via env vars (`VITE_*`), descritas em [[Stack e Ambientes]].

## Sentry — captura de erros

A inicialização vive em `src/lib/sentry.ts` na função `initSentry()`, chamada em `src/main.tsx:7` **antes** do render da aplicação. A função só inicializa o SDK se a env var `VITE_SENTRY_DSN` existir (`src/lib/sentry.ts:4-5`); sem DSN, é um no-op silencioso.

Configuração de `Sentry.init` (`src/lib/sentry.ts:7-13`):

| Opção | Valor | Observação |
| --- | --- | --- |
| `dsn` | `VITE_SENTRY_DSN` | gate de inicialização |
| `environment` | `VITE_FIREBASE_PROJECT_ID \|\| 'unknown'` | separa erros por projeto Firebase |
| `release` | `__APP_VERSION__` | injetada em build time |
| `sendDefaultPii` | `true` | envia dados pessoais |
| `tracesSampleRate` | `0` | tracing desligado de propósito |

> [!warning] `tracesSampleRate: 0` é intencional
> O performance tracing do Sentry está **desligado por design** — a coleta de performance é delegada ao Firebase Performance, não ao Sentry. Não trate isso como bug ou configuração faltante: o Sentry aqui serve apenas para capturar erros/exceptions.

> [!danger] `sendDefaultPii: true` envia dados pessoais
> Com `sendDefaultPii: true`, o Sentry anexa informações pessoais (IP, dados de usuário) aos eventos. Atenção a privacidade e ao escopo do que vaza para o serviço externo — qualquer revisão de LGPD/privacidade deve considerar esse flag.

## Firebase Analytics — page_view e uid

O tracking de navegação SPA fica no hook `useAnalyticsTracking()` em `src/hooks/useAnalytics.ts`, montado dentro do `AppContent`. Ele faz duas coisas via dois `useEffect`:

- **`page_view` por rota** (`src/hooks/useAnalytics.ts:13-21`): a cada mudança de `location` (`useLocation` do react-router) loga o evento `page_view` com `page_path`, `page_location` e `page_title`.
- **Associação de `uid`** (`src/hooks/useAnalytics.ts:23-27`): quando o `firebaseUser` do [[useAuth]] muda, chama `setUserId(uid)` — ou `null` no logout — para alimentar retenção/funil.

Ambos os efeitos checam `getAnalyticsInstance()` e abortam (`return`) se for `null`, ou seja, se o Analytics não foi inicializado.

### Eventos custom — `trackEvent`

O helper `trackEvent(name, params)` (`src/hooks/useAnalytics.ts:31-35`) dispara eventos custom do bolão (ex.: `palpite_salvo`, `ranking_visto`) via `logEvent`. Também é **no-op** se `getAnalyticsInstance()` retornar `null`.

> [!info] Onde o Analytics é instanciado
> A instância de Analytics vive na [[Inicialização Firebase]] (`src/config/firebase.ts`) e só é criada quando o config tem `measurementId` (`VITE_FIREBASE_MEASUREMENT_ID`). Os hooks apenas consomem `getAnalyticsInstance()`.

## Firebase Performance — web vitals

O Firebase Performance é inicializado na própria [[Inicialização Firebase]] via `getPerformance(app)` (`src/config/firebase.ts:39`), dentro de um `try/catch` que falha em silêncio em ambientes não suportados (SSR etc.). Uma vez ativo, **auto-coleta** web vitals e traces de fetch/XHR sem instrumentação manual. É essa coleta que justifica o `tracesSampleRate: 0` do Sentry.

## Resumo dos provedores

| Provedor | Init | Gate | Coleta |
| --- | --- | --- | --- |
| Sentry | `src/main.tsx:7` → `initSentry()` | `VITE_SENTRY_DSN` | erros/exceptions (sem tracing) |
| Analytics | [[Inicialização Firebase]] | `VITE_FIREBASE_MEASUREMENT_ID` | `page_view`, `uid`, eventos custom |
| Performance | [[Inicialização Firebase]] | suporte do ambiente | web vitals, traces auto |

> [!warning] Telemetria desliga silenciosamente sem env vars
> Toda a observabilidade é desabilitada **sem erro visível** quando as env vars não estão setadas: sem `VITE_SENTRY_DSN` o Sentry não inicia, e sem `VITE_FIREBASE_MEASUREMENT_ID` o Analytics fica `null` (e todos os `trackEvent`/`page_view` viram no-op). Em ambientes onde a telemetria não aparece, verifique primeiro a configuração de [[Stack e Ambientes]] antes de suspeitar do código.

## Relacionados

- [[Inicialização Firebase]] — onde Analytics e Performance são instanciados
- [[Stack e Ambientes]] — env vars (`VITE_*`) que gatilham cada provedor
- [[Hooks e PWA]] — `useAnalyticsTracking` no ciclo de vida do app
- [[useAuth]] — fonte do `firebaseUser`/`uid` associado ao Analytics
- [[Frontend MOC]] — mapa da área de frontend
