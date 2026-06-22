---
title: Hooks e PWA
tags: [frontend, hooks, remote-config, versionamento, service-worker]
status: documentado
related:
  - "[[Inicialização Firebase]]"
  - "[[Banners de estado]]"
  - "[[Observabilidade]]"
  - "[[Frontend MOC]]"
---

Conjunto de hooks de infraestrutura do frontend que cobrem três responsabilidades: detecção de nova versão por polling de `version.json`, leitura de feature flags do Firebase Remote Config e detecção de estado offline. Apesar do nome da nota, **o app não é um PWA instalável** — o único service worker que existe é um *tombstone* que se autodestrói para remover o SW de FCM legado.

## Detecção de nova versão (`useAppVersion`)

Sistema de auto-update sem service worker: o build carimba uma versão e o cliente faz polling de um `version.json` estático para descobrir quando há deploy novo.

- **Carimbo da versão** — `vite.config.ts:9` (`resolveAppVersion`) injeta `__APP_VERSION__` via `define`, usando `git rev-parse --short HEAD` (fallback `build-${Date.now()}` se git falhar). O valor é serializado em `define.__APP_VERSION__` (`vite.config.ts:92`).
- **Geração do `version.json`** — o plugin `appVersionJson` (`vite.config.ts:17`) serve `/version.json` em dev via middleware e escreve `dist/version.json` no `writeBundle`. Payload: `{ version, buildTime: new Date().toISOString() }`.
- **Polling** — `useAppVersion` (`src/hooks/useAppVersion.ts:13`) faz `fetch('/version.json?t=' + Date.now(), { cache: 'no-store' })` a cada **2 min** (`POLL_INTERVAL_MS`), na montagem e em todo `visibilitychange` para `visible`. Se `data.version` existir e for diferente de `__APP_VERSION__`, seta `hasUpdate = true`. Erros de rede (offline) são silenciosamente ignorados.
- **Banner** — `NovaVersaoBanner` (`src/components/NovaVersaoBanner.tsx`) consome o hook: se a aba está em background, recarrega silenciosamente; se está visível, mostra um countdown de **5 s** (`COUNTDOWN_SEC`) com botão "Atualizar agora" e dispara `window.location.reload()` ao zerar. Faz parte dos [[Banners de estado]].

> [!warning] Deploy sem commit não atualiza ninguém
> `__APP_VERSION__` é o **hash git curto**. Um deploy que reaproveita o mesmo commit produz o mesmo `version.json` e **não** dispara o banner de atualização para os usuários.

### Tombstone do service worker legado

O plugin `firebaseMessagingSwTombstone` (`vite.config.ts:43`) serve e escreve um `firebase-messaging-sw.js` mínimo. No evento `activate` ele chama `self.registration.unregister()` e percorre todos os clients de janela chamando `client.navigate(client.url)` — assim o SW de FCM antigo some do navegador do usuário sem necessidade de F5 manual. Faz parte do mesmo histórico de remoção do FCM descrito em [[FCM e notificações]].

> [!danger] Não há cache offline de assets
> O único service worker presente é este tombstone, que se **autodestrói** no primeiro ciclo de ativação. Não existe `vite-plugin-pwa`, nem cache de assets via SW, nem estratégia de funcionamento offline além do indicador do `useOffline`.

> [!warning] Não é um PWA instalável
> Não há `manifest`/`webmanifest`. O `index.html` traz apenas `theme-color` e as meta tags `apple-mobile-web-app-*` (add-to-homescreen no iOS) — isso **não** torna o app installable em Chrome/Android.

### Cache-Control coordenado

Para o polling funcionar, os arquivos voláteis nunca podem ser cacheados, e os imutáveis devem ser. Isso é declarado em dois lugares (dev no Vite, prod no `firebase.json`):

| Recurso | Cache-Control |
| --- | --- |
| `/`, `/index.html`, `**/*.html`, `/version.json`, `/firebase-messaging-sw.js` | `no-cache, max-age=0, must-revalidate` |
| `/assets/**` | `public, max-age=31536000, immutable` |

## Feature flags (`useRemoteConfig`)

`useRemoteFlag<T extends boolean | string | number>(key, fallback)` (`src/hooks/useRemoteConfig.ts:10`) é um hook genérico para ler uma flag do Firebase Remote Config. Retorna o `fallback` (síncrono, via `useState` inicial) enquanto `ensureRemoteConfig()` não resolve, e atualiza para o valor remoto depois do `fetchAndActivate`.

- **Leitura tipada** — `readValue` (`src/hooks/useRemoteConfig.ts:28`) usa `getValue(remoteConfig, key)` e escolhe `asBoolean()` / `asNumber()` / `asString()` conforme o tipo do `fallback`. Em erro, retorna `REMOTE_CONFIG_DEFAULTS[key] ?? fallback`.
- **Defaults centralizados** — `REMOTE_CONFIG_DEFAULTS` vive na [[Inicialização Firebase]] (`src/config/firebase.ts:56`, hoje só `feature_home_enriched: true`) e também é aplicado como `remoteConfig.defaultConfig`.
- **Inicialização lazy** — `ensureRemoteConfig()` (`src/config/firebase.ts:63`) memoiza uma única chamada de `fetchAndActivate` (engole erros), de modo que múltiplos hooks compartilham a mesma promise.
- **Uso real** — [[Página Home]] chama `useRemoteFlag('feature_home_enriched', true)` para decidir a variante enriquecida.

> [!warning] Propagação limitada a 5 min em produção
> `minimumFetchIntervalMillis = 5 * 60 * 1000` (`src/config/firebase.ts:49`) limita a frequência de fetch. Em prod, valores novos do Remote Config podem demorar até 5 min para chegar ao cliente.

> [!info] Remote Config ≠ coleção `config`
> Feature flags do Remote Config são um sistema **distinto** da coleção Firestore [[Coleção config]] (`geral` / `resultado_especial`). Não confunda: um é entrega de configuração do Google, o outro é dado de domínio versionado nas [[Coleções do Firestore]].

## Detecção de offline (`useOffline`)

`useOffline` (`src/hooks/useOffline.ts:3`) é um hook trivial: inicializa com `!navigator.onLine` e ouve os eventos `online`/`offline` da janela, retornando um booleano. Alimenta o indicador visual de conectividade entre os [[Banners de estado]] e complementa o tratamento de rede silencioso do polling de versão. Falhas de fetch correlatas são parte do que se observa em [[Observabilidade]].

## Relacionados

- [[Inicialização Firebase]] — onde vivem `remoteConfig`, `ensureRemoteConfig` e `REMOTE_CONFIG_DEFAULTS`
- [[Banners de estado]] — `NovaVersaoBanner` e o indicador de offline
- [[Observabilidade]] — captura de erros de rede/atualização
- [[FCM e notificações]] — contexto do SW de FCM removido pelo tombstone
- [[Página Home]] — consumidora de `feature_home_enriched`
- [[Coleção config]] — não confundir com Remote Config
- [[Frontend MOC]]
