---
title: Auditoria
tags:
  - admin
  - seguranca
  - cloud-functions
  - firestore
status: documentado
related:
  - "[[Admin MOC]]"
  - "[[Índices do Firestore]]"
  - "[[Regras de segurança do Firestore]]"
  - "[[Entidade Usuario]]"
---

Tela administrativa que lista os últimos eventos sensíveis registrados na coleção `audit_log` — logins, alterações de palpites e mudanças em usuários —, exibindo diffs campo a campo e metadados de login. Os eventos são centralizados em `audit_log/{autoId}` por triggers e por um callable no backend, que descartam writes triviais como o refresh de `fcmToken` para não poluir o log.

## Como a tela lê os dados

A página `Auditoria` (`src/pages/admin/Auditoria.tsx:106`) carrega tudo no client via [[Inicialização Firebase]], sem Cloud Function de leitura:

- Carrega a coleção `usuarios` inteira para resolver nomes, apelidos e avatares dos `targetUid` (`Auditoria.tsx:117`).
- Monta a query da `audit_log` (`Auditoria.tsx:122`) com filtros opcionais `where('eventType', ...)` e `where('targetUid', ...)`, sempre `orderBy('at', 'desc')` e `limit(PAGE_SIZE)`, com `PAGE_SIZE = 100` (`Auditoria.tsx:33`).
- Para eventos de tipo `login`, renderiza `MetadataLogin` (método, IP, User-Agent); para os demais, renderiza `Diff` com cada campo alterado no formato `valor antigo (riscado) → valor novo` (`Auditoria.tsx:210`).

### Tipos de evento

A tela expõe um filtro com todos os tipos (`Auditoria.tsx:19`):

| Origem | Tipos de evento |
| --- | --- |
| Login | `login` |
| [[Entidades de palpite]] (palpites) | `palpite_create`, `palpite_update`, `palpite_delete` |
| Palpites especiais ([[Resultados Especiais]]) | `palpite_especial_create`, `palpite_especial_update`, `palpite_especial_delete` |
| [[Entidade Usuario]] | `usuario_create`, `usuario_update`, `usuario_delete` |

### Estrutura do documento `AuditDoc`

Schema gravado em `audit_log` (`functions/src/audit.ts:18`):

`eventType`, `targetUid` (string ou null), `targetPath`, `before`, `after`, `changedFields`, `at` (Timestamp) e `metadata?` (presente só em `login`).

> [!info] Schema e segurança
> Conforme [[Coleções do Firestore]], a escrita em `audit_log` acontece exclusivamente via Admin SDK (nos triggers/callable) e a leitura é restrita a admin pelas [[Regras de segurança do Firestore]]. O comentário no topo do backend (`audit.ts:16`) reforça essa regra.

## Backend — quem popula a `audit_log`

Toda a captura vive em `functions/src/audit.ts`, somando-se ao inventário de [[Cloud Functions MOC]]. A função `gravar` (`audit.ts:46`) faz o `add` no `audit_log`, e `diffKeys` (`audit.ts:29`) compara `before`/`after` por `JSON.stringify` de cada chave para montar `changedFields`.

- **`auditPalpites`** — `onDocumentWritten('palpites/{palpiteId}')` (`audit.ts:51`). Deriva `palpite_create/update/delete` a partir da presença de `before`/`after`; `targetUid = after?.uid ?? before?.uid ?? null`.
- **`auditPalpitesEspeciais`** — `onDocumentWritten('palpites_especiais/{uid}')` (`audit.ts:72`). Gera `palpite_especial_create/update/delete`; `targetUid` vem direto do param `uid`.
- **`auditUsuarios`** — `onDocumentWritten('usuarios/{uid}')` (`audit.ts:134`). Gera `usuario_create/update/delete`, mas em **update só registra se algum campo sensível mudou** (`audit.ts:147`).
- **`registrarLogin`** — `onCall` (`audit.ts:97`). O frontend chama após cada `signIn` bem-sucedido (ver [[Autenticação Login e Cadastro]]); grava `eventType 'login'` com `metadata { ip, userAgent, metodo }`.

### Campos sensíveis de usuário

`CAMPOS_SENSIVEIS_USUARIO` (`audit.ts:93`) inclui: `liberado`, `role`, `fotoURL`, `apelido`, `nome`, `email`, `telefone`. Um `usuario_update` que altere apenas campos fora desse conjunto não gera entrada. Mudanças em `liberado`/`role` cruzam com [[Liberação do participante]] e com o controle de acesso de [[Rotas e Guards]].

### Captura de IP e User-Agent no login

`registrarLogin` prioriza o cabeçalho `X-Forwarded-For` (cliente real atrás do proxy do Google), com fallback para `rawRequest.ip`, e lê `User-Agent` dos headers (`audit.ts:104`). O parâmetro `metodo` vem do `request.data`, com fallback `'desconhecido'` (`audit.ts:117`).

> [!warning] Login não é automático
> `registrarLogin` é um callable e **depende do frontend chamá-lo** após o `signIn` — não há trigger do Firebase Auth. Se a chamada falhar ou for omitida em algum fluxo de login, o evento simplesmente não entra na `audit_log`.

## Armadilhas

> [!danger] fcmToken é deliberadamente excluído
> Em `usuario_update`, se nenhum campo de `CAMPOS_SENSIVEIS_USUARIO` mudou, o trigger faz `return` antes de gravar (`audit.ts:147`). O comentário diz "Skip writes triviais (ex.: fcmToken refresh) para não poluir o log". Logo, qualquer write em `usuarios` que altere apenas `fcmToken` (ou outro campo não-sensível) **não gera entrada** no audit_log. Isso é intencional, mas significa que a auditoria não é um log de todas as escritas — só das sensíveis. Veja [[FCM e notificações]] para o ciclo de vida do token.

> [!warning] Só os últimos 100 eventos
> A tela mostra no máximo `PAGE_SIZE = 100` eventos (sem paginação por cursor) e exibe o aviso "Mostrando os últimos 100 eventos. Para histórico completo, consulte BigQuery ou Firestore Console" (`Auditoria.tsx:219`). Histórico completo só fora da UI.

> [!warning] Possível índice composto
> Os filtros combinados `where('eventType') + where('targetUid')` somados a `orderBy('at', 'desc')` (`Auditoria.tsx:122`) podem exigir índice composto no Firestore. Verifique [[Índices do Firestore]] antes de usar os dois filtros simultaneamente em produção, sob risco do erro de "índice ausente" do Firestore.

## Relacionados

- [[Admin MOC]]
- [[Índices do Firestore]]
- [[Regras de segurança do Firestore]]
- [[Coleções do Firestore]]
- [[Entidade Usuario]]
- [[Entidades de palpite]]
- [[Resultados Especiais]]
- [[Autenticação Login e Cadastro]]
- [[Liberação do participante]]
- [[FCM e notificações]]
- [[Cloud Functions MOC]]
