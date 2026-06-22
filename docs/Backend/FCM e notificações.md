---
title: FCM e notificações
tags: [backend, cloud-functions, fcm, gap, divergencia]
status: documentado
related:
  - "[[Cloud Functions MOC]]"
  - "[[Chat Global]]"
  - "[[Banners de estado]]"
  - "[[Auditoria]]"
---

Esta nota registra um **gap**: apesar de a stack do projeto mencionar FCM (Firebase Cloud Messaging), **não existe nenhuma Cloud Function de notificações push no backend atual**, e nenhuma notificação in-app (sininho) é gravada por código. As specs descrevem notificações que simplesmente **não estão implementadas**.

> [!danger] Não assuma que menção dispara aviso
> A spec de [[Chat Global]] prevê notificação in-app ao mencionar um usuário (gravando em `notificacoes_usuario/{uid}/items`). **Essa coleção não existe e nenhum código a escreve.** Mencionar alguém no chat **não** gera qualquer aviso, push ou sininho. Tratar menção como puramente visual no texto da mensagem.

## O que não existe no backend

- **`functions/src/notificacoes.ts` não existe.** A arquitetura descrita no `CLAUDE.md` lista esse arquivo entre as Cloud Functions, mas ele não está no repositório. Os arquivos reais em `functions/src/` são: `index.ts`, `audit.ts`, `backup.ts`, `pontuacao.ts`, `resolverMataMata.ts`, `resultadosProjecoes.ts` e `_shared/`.
- **Nenhuma função importa `firebase-admin/messaging` nem chama `admin.messaging()`.** Não há envio de push server-side.
- A **única** ocorrência de `notific`/`fcm` em `functions/src` é um comentário em `functions/src/audit.ts:146` — e ele apenas explica por que writes triviais de refresh de token são ignorados, não envia nada.
- Nenhuma Cloud Function reage a documentos de `chat`. O trigger do [[Trigger onJogoEncerrado]] observa apenas `jogos/{jogoId}`; o resto de `functions/src/index.ts` são callables (`recalcularRanking`, `telefoneJaCadastrado`, `definirSenhaUsuario`, `excluirUsuario`) e re-exports (backup, audit, [[Resolver mata-mata]], [[Trigger de snapshot]]).

## Tabela: documentado vs. real

| Item | Documentação / spec | Código atual |
| --- | --- | --- |
| `notificacoes.ts` (Cloud Function) | Listado no `CLAUDE.md` | Não existe |
| Push via FCM server-side | Implícito na stack | `admin.messaging()` nunca chamado |
| Notificação in-app de menção | Spec do [[Chat Global]] (`notificacoes_usuario/{uid}/items`) | Coleção e código inexistentes |
| Hook de notificações no frontend | — | Não há (só `useAuth`, `useChat`, `useAnalytics`, `useAppVersion`, `useOffline`, `useRemoteConfig`) |

## O resíduo `fcmToken`

> [!warning] `fcmToken` é legado, não é canal de envio
> O campo `fcmToken` ainda aparece como campo permitido nas [[Regras de segurança do Firestore]] (`firestore.rules:93` e `:102`, no `hasOnly` de criação/atualização de usuário) e é tratado pela [[Auditoria]] como write trivial a ser pulado (`functions/src/audit.ts:146`). **Isso é resíduo do sistema de push que foi removido** — nada lê esse campo para enviar push.

- A [[Entidade Usuario]] tolera `fcmToken` por compatibilidade, mas ele não alimenta nenhum fluxo de notificação.
- A [[Auditoria]] usa esse campo só para **não poluir o log** com refreshes de token (`usuario_update` sem campo sensível é ignorado).

## Resíduo no frontend

> [!info] FCM ficou pela metade no client
> `src/config/firebase.ts:24` ainda exporta um helper `messaging = async () => (await isSupported()) ? getMessaging(app) : null`, importando `getMessaging`/`isSupported` de `firebase/messaging`. Porém esse helper **não é importado nem chamado em lugar nenhum** do `src/`, e **não há uso de `getToken` nem `onMessage`**. Ou seja: a infraestrutura mínima existe dormente, mas não há registro de token nem recebimento de push. A [[Inicialização Firebase]] mantém isso por legado.

Como não há push nem notificação in-app, o usuário só percebe mudanças de estado por outros meios — por exemplo os [[Banners de estado]] (avisos de fase/liberação na UI) e a leitura ativa do [[Chat Global]] e da [[Página Ranking]]. Não existe canal assíncrono de notificação.

## Implicações

- Qualquer requisito que dependa de "avisar o usuário" (menção no chat, jogo encerrado, mudança de fase) **não tem suporte técnico hoje**.
- A descrição da arquitetura no `CLAUDE.md` está **desatualizada** quanto a `notificacoes.ts`/FCM — ver [[Divergências conhecidas]].

## Relacionados

- [[Cloud Functions MOC]]
- [[Chat Global]]
- [[Banners de estado]]
- [[Auditoria]]
- [[Trigger onJogoEncerrado]]
- [[Regras de segurança do Firestore]]
- [[Entidade Usuario]]
- [[Inicialização Firebase]]
- [[Divergências conhecidas]]
