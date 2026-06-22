---
title: Inicialização Firebase
tags: [frontend, firebase, bootstrap, config, observabilidade]
status: documentado
related:
  - "[[Stack e Ambientes]]"
  - "[[useAuth]]"
  - "[[Observabilidade]]"
  - "[[Frontend MOC]]"
---

Ponto único de bootstrap de todos os serviços Firebase do cliente. Concentra a inicialização do app e exporta as instâncias (`auth`, `db`, `storage`, etc.) consumidas pelo resto do [[Frontend MOC]], com inicialização defensiva (lazy/feature-detect) para serviços que não são suportados em todo ambiente.

## Configuração

O objeto `firebaseConfig` é montado inteiramente a partir de variáveis de ambiente `VITE_FIREBASE_*` (`src/config/firebase.ts:10`):

| Campo | Variável |
|---|---|
| `apiKey` | `VITE_FIREBASE_API_KEY` |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` |
| `appId` | `VITE_FIREBASE_APP_ID` |
| `measurementId` | `VITE_FIREBASE_MEASUREMENT_ID` |

A definição dessas variáveis e a separação por ambiente são tratadas em [[Stack e Ambientes]].

> [!warning] Config exposta no bundle não é segredo
> Como toda variável `VITE_*` é embutida no bundle do cliente, o `firebaseConfig` fica visível no navegador. Isso é esperado: trata-se de **client config pública** do Firebase, não de credencial. Não confunda com credenciais de admin (Service Account), que vivem apenas no backend. A proteção real dos dados vem das [[Regras de segurança do Firestore]], não do sigilo dessa config.

## Serviços de inicialização direta

Logo após `initializeApp(firebaseConfig)`, são exportadas as instâncias usadas em quase toda a aplicação (`src/config/firebase.ts:20`):

- `auth` via `getAuth(app)` — base de toda a autenticação, consumida pelo hook [[useAuth]].
- `db` via `getFirestore(app)` — acesso a todas as [[Coleções do Firestore]].
- `storage` via `getStorage(app)`.

## Serviços com inicialização defensiva

Vários SDKs do Firebase não funcionam em todo ambiente (SSR, iframes restritos, extensões bloqueando, navegadores sem suporte). Por isso a inicialização é feita de forma lazy ou com feature-detect, sempre podendo resultar em `null`.

### Messaging (FCM)

`messaging` é uma **função async** que retorna `getMessaging(app)` apenas se `isSupported()` resolver `true`, e `null` caso contrário (`src/config/firebase.ts:24`).

> [!danger] O export `messaging` é vestigial
> Não há nenhum `getToken`/`onMessage` em `src`, nem uso de FCM em `functions/src`. O push em background está **defunto** após o tombstone do Service Worker. O export permanece como resíduo — ver [[FCM e notificações]] para o histórico do recurso.

### Analytics

`analyticsInstance` só é criado via `getAnalytics(app)` depois que `isAnalyticsSupported()` resolver `true` **e** `firebaseConfig.measurementId` existir (`src/config/firebase.ts:29`). Exposto por `getAnalyticsInstance()`, que pode retornar `null`.

### Performance

`getPerformance(app)` é chamado dentro de um `try/catch`; se o ambiente não suportar, a falha é engolida silenciosamente (`src/config/firebase.ts:38`). Exposto por `getPerformanceInstance()`, que também pode retornar `null`.

> [!warning] Sempre checar `null` antes de usar
> Tanto `getAnalyticsInstance()` quanto `getPerformanceInstance()` podem devolver `null` (inicialização assíncrona/feature-detect ou ambiente não suportado). Nunca assuma que a instância existe — cheque antes de chamar métodos. O consumo correto desses sinais é detalhado em [[Observabilidade]].

## Remote Config

`remoteConfig` é inicializado por `getRemoteConfig(app)` com `settings.minimumFetchIntervalMillis = 5 * 60 * 1000` (5 minutos em produção) (`src/config/firebase.ts:47`).

Os defaults vivem em `REMOTE_CONFIG_DEFAULTS`, que serve de fallback caso o Remote Config não baixe (`src/config/firebase.ts:56`):

```ts
export const REMOTE_CONFIG_DEFAULTS = {
  feature_home_enriched: true,
}
```

A função `ensureRemoteConfig()` executa `fetchAndActivate` **uma única vez**, memoizando a promise em `rcReady` e engolindo erros com `.catch(() => {})` (`src/config/firebase.ts:63`). Esse helper é a porta de ativação lazy chamada pelo hook de Remote Config (ver [[Hooks e PWA]]), e a flag `feature_home_enriched` controla o enriquecimento da [[Página Home]].

> [!note] Erros silenciosos por design
> Tanto Analytics/Performance quanto `ensureRemoteConfig()` engolem erros propositalmente: nenhum desses serviços deve quebrar o boot da aplicação. O custo é que falhas passam despercebidas — daí a importância de tratar as instâncias como opcionais.

## Relacionados

- [[Stack e Ambientes]] — origem das variáveis `VITE_FIREBASE_*` e separação por ambiente.
- [[useAuth]] — principal consumidor da instância `auth`.
- [[Observabilidade]] — uso de Analytics e Performance expostos aqui.
- [[FCM e notificações]] — contexto do export `messaging` vestigial.
- [[Hooks e PWA]] — consumo de `ensureRemoteConfig()`.
- [[Coleções do Firestore]] — dados acessados via `db`.
- [[Frontend MOC]]
