---
title: Regras de segurança do Firestore
tags:
  - dados
  - seguranca
  - firestore
status: documentado
related:
  - "[[Coleções do Firestore]]"
  - "[[Entidade Usuario]]"
  - "[[Coleção config]]"
  - "[[Coleção _system]]"
---

As regras em `firestore.rules` (`rules_version = '2'`) definem **quem lê e escreve cada coleção** e validam o **schema** de cada documento gravado pelo cliente. São a primeira linha de defesa: tudo que não for explicitamente permitido é negado. Complementam as [[Coleções do Firestore]] e a [[Coleção config]].

## Funções helper

As regras se apoiam em funções declaradas no topo do `match`:

| Função | Definição | Onde lê |
| --- | --- | --- |
| `isAuthenticated()` | `request.auth != null` | `firestore.rules:7` |
| `isAdmin()` | autenticado **e** `usuarios/{uid}.role == 'admin'` | `firestore.rules:11` |
| `isOwner(uid)` | autenticado **e** `request.auth.uid == uid` | `firestore.rules:16` |
| `prazoAberto()` | `request.time < config/geral.prazoLimitePalpites` | `firestore.rules:20` |
| `isLiberado()` | `usuarios/{uid}.liberado == true` | `firestore.rules:25` |
| `isValidScore(v)` | `v is int && v >= 0 && v <= 99` | `firestore.rules:29` |

> [!info] Acoplamento com config/geral
> `prazoAberto()`, `canReadPalpite()` e `canReadPalpiteEspecial()` dependem de campos lidos da [[Coleção config]] (`prazoLimitePalpites`, `visibilidadePalpites`). Cada chamada gera um `get()` extra. A `prazoAberto()` se conecta diretamente à [[Liberação do participante]] e à [[Página Palpites]].

## Validadores de schema (palpites)

A escrita de palpites passa por `hasOnly([...])` mais checagem de tipos. Veja [[Entidades de palpite]].

- **`isValidPalpite(data)`** (`firestore.rules:55`): `hasOnly(['id','uid','jogoId','timeCasa','timeVisitante','golsCasa','golsVisitante','classificado','criadoEm'])`; `golsCasa`/`golsVisitante` via `isValidScore` (0–99); `classificado` pode ser `null` ou `string`; `criadoEm is timestamp`.
- **`isValidPalpiteEspecial(data, uid)`** (`firestore.rules:70`): `hasOnly(['uid','campeao','vice','terceiro','quarto','paisArtilheiro','criadoEm'])` e `data.uid == uid`. Liga aos [[Resultados Especiais]].
- **`isValidDesempateTerceiros(data, uid)`** (`firestore.rules:83`): `hasOnly(['uid','pontosDisciplinares','criadoEm'])`, com `pontosDisciplinares is map`. Usado em [[Alocação de terceiros por slot]] / [[Melhores terceiros]].

Toda **escrita** de `palpites`, `palpites_especiais` e `desempates_terceiros` exige a combinação `isOwner` + `prazoAberto()` + `isLiberado()` + o validador correspondente. O `delete` é sempre `false`.

## Visibilidade de leitura dos palpites

Quem pode ler palpites de outro usuário depende de `config/geral.visibilidadePalpites`:

- **`canReadPalpite(uid, jogoId)`** (`firestore.rules:33`): dono **ou** admin **ou** `'sempre'` **ou** (`'apos_prazo'` e prazo passou) **ou** (`'apos_jogo'` e `jogos/{jogoId}.encerrado == true`).
- **`canReadPalpiteEspecial(uid)`** (`firestore.rules:46`): dono **ou** admin **ou** `'sempre'` **ou** (`'apos_prazo'` e prazo passou).

> [!warning] Palpite especial é mais restrito que palpite de jogo
> `canReadPalpiteEspecial` **NÃO tem o branch `'apos_jogo'`**. Os palpites de campeão/vice/etc. nunca são revelados "após o jogo" — só após o prazo ou se a visibilidade for `'sempre'`. A [[Página Ranking]] e a [[Ver Palpites]] precisam respeitar essa assimetria.

## Coleções só preenchidas pelas Cloud Functions

Estas coleções têm `allow write: if false` — **nenhuma escrita do cliente é aceita**; apenas o Admin SDK (Cloud Functions) grava nelas.

| Coleção | Leitura | Escrita | Origem |
| --- | --- | --- | --- |
| `ranking/{uid}` | autenticado | `if false` | [[Recálculo de ranking]] |
| `audit_log/{logId}` | só admin | `if false` | [[Auditoria]] |
| `usuarios_excluidos/{uid}` | só admin | `if false` | backup de [[Gerenciar Usuários e Convites]] |

- **`ranking/{uid}`** (`firestore.rules:201`): documento de ranking com `uid`, `pontosTotal`, `pontosJogos`, `pontosEspeciais`, `placaresExatos`, `colunasCertas`, `totalGolsAcertados`, `pontosFaseGrupos`, `pontosJogosBrasil`. Escrito pela [[Trigger onJogoEncerrado]] / [[Recálculo de ranking]]. Ver [[Pontuação]].
- **`audit_log/{logId}`** (`firestore.rules:195`): grava create/update/delete de palpites e mudanças sensíveis de usuário, pulando writes triviais (ex.: refresh de `fcmToken`). O doc (`functions/src/audit.ts`) tem `eventType`, `targetUid` (string|null), `targetPath`, `before`, `after`, `changedFields` (string[]), `at` (Timestamp) e `metadata?`. Ver [[Auditoria]].
- **`usuarios_excluidos/{uid}`** (`firestore.rules:217`): backup dos documentos de [[Entidade Usuario]] removidos.

> [!danger] ranking, audit_log e usuarios_excluidos são read-only para o cliente
> `audit_log` e `usuarios_excluidos` só são **legíveis por admin**; `ranking` é legível por qualquer autenticado. Qualquer tentativa de escrita do cliente é negada — toda gravação vem do backend ([[Cloud Functions MOC]]).

As Cloud Functions referenciam as coleções `audit_log`, `grupos`, `jogos`, `palpites`, `palpites_especiais`, `ranking`, `times` e `usuarios`.

## Coleções com leitura pública (`if true`)

Duas coleções **fogem** do padrão `isAuthenticated()` na leitura e permitem `read: if true` (público, sem login):

- **`_system/{docId}`** (`firestore.rules:189`): `read: if true`, `write: if isAdmin()`. Guarda flags de sistema (ex.: `isteste`). Ver [[Coleção _system]].
- **`convites/{conviteId}`** (`firestore.rules:225`): `read: if true`, `create: if isAdmin()`, `delete: if false`. Público para permitir validar um convite **antes** do cadastro/login, na [[Autenticação Login e Cadastro]].

> [!warning] `_system` e `convites` são os únicos com leitura pública
> Todas as demais coleções exigem `isAuthenticated()` para ler. Manter `_system` público é intencional (`firestore.rules:190` — `read: if true`), mas qualquer dado sensível **não** deve ir para lá.

## Auto-claim de convite único

O `update` de `convites` (`firestore.rules:228`) permite duas vias:

1. `isAdmin()` — admin atualiza qualquer convite; **ou**
2. o próprio usuário autenticado marca um convite **único não-usado** como usado:
   - `resource.data.tipo != 'multiplo'`
   - `!resource.data.usado`
   - `request.resource.data.usado == true`
   - `diff(...).affectedKeys().hasOnly(['usado','usadoPor'])`

Ou seja, durante o cadastro o usuário só pode virar `usado`/`usadoPor` de um convite único ainda livre — nunca alterar `tipo`, `criadoPor` etc. O documento de convite tem `id`, `criadoPor`, `tipo` (`'unico'|'multiplo'`), `usado` (boolean), `usadoPor` (string|null) e `criadoEm`. Convites múltiplos não precisam ser marcados como usados. Ver [[Gerenciar Usuários e Convites]].

## Demais coleções (write por admin)

`config`, `times`, `grupos` e `jogos` são `read: if isAuthenticated()` e `write: if isAdmin()` (`firestore.rules:111`–`132`). A escrita administrativa flui de [[Gerenciar Jogos e Times]], [[Inserir Resultados]] e [[Configurações do bolão]].

> [!danger] Gap conhecido: resultados de jogo não são validados por schema
> `jogos write` é apenas `isAdmin()`, **sem validador de schema**. As rules NÃO checam os campos de resultado (placar, `encerrado` etc.) numa escrita de admin — confia-se inteiramente no frontend/admin. Registrado em [[Divergências conhecidas]].

## Coleção usuarios

`usuarios/{uid}` (`firestore.rules:208`): `read: if isAuthenticated()`; `create: if isOwner(uid) && isValidUsuarioCreate(...)` (força `role == 'participante'` e `liberado == false`); `update: if isAdmin() || (isOwner(uid) && isValidUsuarioOwnerUpdate())` — o dono só altera `nome/apelido/email/telefone/fcmToken/fotoURL` e **não** pode mexer no próprio `role` nem em `liberado` (prevenção de escalação de privilégio). `delete: if false`. Detalhes em [[Entidade Usuario]] e [[Gerenciamento de Perfil]].

## Chat Global

`chat/{messageId}` (`firestore.rules:181`): `read: if isAuthenticated()`; `create` exige `request.resource.data.uid == request.auth.uid`; `update: if false`; e — exceção entre as coleções — `delete: if isOwner(resource.data.uid) || isAdmin()` (dono ou admin podem apagar). Ver [[Chat Global]].

> [!note] Delete quase sempre é `false`
> `palpites`, `palpites_especiais`, `desempates_terceiros`, `usuarios` e `convites` têm `allow delete: if false`. A **única** coleção que permite delete pelo cliente é `chat`, restrito ao dono da mensagem ou ao admin.

## Relacionados

- [[Modelo de Dados MOC]]
- [[Coleções do Firestore]]
- [[Coleção config]]
- [[Coleção _system]]
- [[Entidade Usuario]]
- [[Entidades de palpite]]
- [[Auditoria]]
- [[Chat Global]]
- [[Recálculo de ranking]]
- [[Divergências conhecidas]]
