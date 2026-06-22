---
title: Coleção _system
tags: [dados, firestore, seguranca, convites]
status: documentado
related:
  - "[[Regras de segurança do Firestore]]"
  - "[[Snapshot de resultados]]"
  - "[[Coleções do Firestore]]"
  - "[[Modelo de Dados MOC]]"
---

As coleções `_system` e `convites` são as duas únicas com **leitura pública** (`if true`) em todo o [[Regras de segurança do Firestore|firestore.rules]] — todas as demais exigem `isAuthenticated()`. Esta nota cobre essas duas coleções de leitura aberta e a mecânica de **auto-claim** que permite a um usuário recém-cadastrado marcar o próprio convite como usado.

## `_system/{docId}` — flags de sistema

Guarda flags de sistema (ex.: `isteste`). A leitura é **pública** justamente para que o app possa consultar essas flags antes mesmo de qualquer login.

| Operação | Regra | Fonte |
| --- | --- | --- |
| `read` | `if true` (público, não só autenticado) | firestore.rules:190 |
| `write` | `if isAdmin()` | firestore.rules:191 |

> [!warning] `_system` é a exceção pública entre as coleções
> Diferente de **todas** as outras coleções — que exigem `isAuthenticated()` na leitura — `_system` tem `read: if true` (`firestore.rules:190`; escrita só admin, linha 191). Não coloque nada sensível aqui: qualquer cliente, autenticado ou não, lê esta coleção.

> [!info] Coleção de sistema separada de `config`
> Por diretiva crítica do projeto, dados de sistema **não** podem ir para a coleção [[Coleção config|config]] (só pode conter `geral` e `resultado_especial`). `_system` existe exatamente para abrigar esses dados de sistema fora de `config`. O persistido pelo [[Snapshot de resultados]] / [[Recálculo de ranking]] (ex.: `_system/resultados`) reside nesta coleção.

## `convites/{conviteId}` — convites de cadastro

O cadastro no bolão é apenas por convite do administrador. Cada documento de convite tem o formato:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | identificador do convite |
| `criadoPor` | string | uid do admin que criou |
| `tipo` | `'unico'` \| `'multiplo'` | uso único ou reutilizável |
| `usado` | boolean | já foi consumido |
| `usadoPor` | string \| null | uid de quem consumiu |
| `criadoEm` | timestamp | data de criação |

### Regras

| Operação | Regra | Fonte |
| --- | --- | --- |
| `read` | `if true` (público) | firestore.rules:226 |
| `create` | `if isAdmin()` | firestore.rules:227 |
| `update` | admin **ou** auto-claim (ver abaixo) | firestore.rules:228-234 |
| `delete` | `if false` | firestore.rules:235 |

> [!warning] `convites` também é de leitura pública
> A leitura é `if true` para permitir **validar o convite antes do login** — o usuário ainda não está autenticado quando abre o link de cadastro. É a segunda (e última) coleção pública do projeto, ao lado de `_system`.

### Auto-claim de convite único

O `update` permite que o **próprio usuário** consuma um convite único durante o cadastro, sem precisar de admin. A regra autoriza quando **todas** as condições valem (firestore.rules:228-234):

- `isAuthenticated()` — usuário já autenticado;
- `resource.data.tipo != 'multiplo'` — convite não é múltiplo (logo, único);
- `!resource.data.usado` — convite ainda não consumido;
- `request.resource.data.usado == true` — a transição é marcar como usado;
- `diff(...).affectedKeys().hasOnly(['usado', 'usadoPor'])` — só esses dois campos podem mudar.

> [!tip] Por que isto é seguro
> O usuário não pode reabrir um convite (`!usado` barra o uso duplo), não pode mexer em convites múltiplos, e não pode tocar em nenhum outro campo além de `usado`/`usadoPor`. Convites múltiplos não precisam ser marcados como usados — apenas o admin os atualiza. Veja também [[Gerenciar Usuários e Convites]] e [[Liberação do participante]].

## Comparação: leitura pública vs. autenticada

> [!note] Mapa rápido
> - **Públicas** (`read: if true`): `_system`, `convites`.
> - **Autenticadas** (`read: if isAuthenticated()`): `config`, `times`, `grupos`, `jogos`, `ranking`, `usuarios`, `chat`, e demais — detalhadas em [[Coleções do Firestore]].

A coleção [[Chat Global|chat]] (`/chat/{messageId}`), por contraste, exige autenticação para leitura; o `create` só passa se `request.resource.data.uid == request.auth.uid`; o `delete` cabe ao dono (`isOwner`) ou admin; e `update` é sempre `false` (firestore.rules:181-186).

## Relacionados

- [[Regras de segurança do Firestore]] — o `firestore.rules` completo
- [[Coleções do Firestore]] — visão geral de todas as coleções
- [[Coleção config]] — a coleção que não pode receber dados de sistema
- [[Snapshot de resultados]] — snapshot persistido fora de `config`
- [[Recálculo de ranking]] — produtor de estado de sistema
- [[Gerenciar Usuários e Convites]] — fluxo administrativo de convites
- [[Liberação do participante]] — etapa seguinte ao consumo do convite
- [[Chat Global]] — outra coleção comparada nas regras
- [[Modelo de Dados MOC]]
