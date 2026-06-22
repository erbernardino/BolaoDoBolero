---
title: Entidade Usuario
tags:
  - dados
  - modelo-de-dados
  - seguranca
  - usuario
status: documentado
related:
  - "[[Regras de segurança do Firestore]]"
  - "[[Gerenciar Usuários e Convites]]"
  - "[[Liberação do participante]]"
  - "[[useAuth]]"
---

A **Entidade Usuario** representa cada pessoa cadastrada no bolão (documento em `usuarios/{uid}`, com o `uid` do [[Autenticação Login e Cadastro|Firebase Auth]] como id). É o registro central que define quem você é, qual seu papel (`role`) e se você já está liberado para palpitar. As [[Regras de segurança do Firestore|rules]] tratam esse documento como superfície crítica de privilégio: o usuário nasce sem poder e só um admin pode promovê-lo ou liberá-lo.

## Modelo de dados

Definição em `src/types/index.ts:74`:

| Campo | Tipo | Observação |
| --- | --- | --- |
| `uid` | `string` | Igual ao uid do Firebase Auth (id do documento) |
| `nome` | `string` | Nome completo |
| `apelido` | `string` | Exibido no [[Página Ranking\|ranking]] e [[Navbar]] |
| `email` | `string` | |
| `telefone` | `string` | |
| `role` | `Role` (`'admin' \| 'participante'`) | Papel — `src/types/index.ts:72` |
| `liberado` | `boolean` | Se `true`, pode escrever palpites |
| `conviteId` | `string` | Convite que originou o cadastro ([[Gerenciar Usuários e Convites]]) |
| `criadoEm` | `Timestamp` | |
| `fotoURL?` | `string` (opcional) | Foto de perfil ([[Gerenciamento de Perfil]]) |

> [!info] `fcmToken` existe nas rules, não no tipo
> As [[Regras de segurança do Firestore|rules]] permitem o campo `fcmToken` no documento (`firestore.rules:93`), mas ele **não** consta da interface `Usuario` em `src/types/index.ts`. É o token usado por [[FCM e notificações]]. Divergência tipo-vs-rules: ambos os lados aceitam o campo, mas só as rules o declaram explicitamente.

## Regras de acesso (`usuarios/{uid}`)

Bloco em `firestore.rules:208`:

| Operação | Condição |
| --- | --- |
| `read` | Qualquer autenticado (`isAuthenticated()`) |
| `create` | `isOwner(uid)` **e** `isValidUsuarioCreate(...)` |
| `update` | `isAdmin()` **ou** (`isOwner(uid)` **e** `isValidUsuarioOwnerUpdate()`) |
| `delete` | `false` (nunca pelo cliente; exclusão via Admin SDK move para `usuarios_excluidos`) |

## Prevenção de escalação de privilégio

A barreira contra o usuário se autopromover ou se autoliberar é **dupla** — atua na criação e na atualização.

> [!danger] Defesa em duas camadas contra escalação de privilégio
> **1. Na criação** (`isValidUsuarioCreate`, `firestore.rules:90`): força `role == 'participante'` e `liberado == false`. O usuário **nasce sem privilégio e bloqueado** — não há como cadastrar-se já admin ou já liberado. A função também restringe as chaves permitidas e garante `uid == request.auth.uid`.
>
> **2. Na atualização pelo dono** (`isValidUsuarioOwnerUpdate`, `firestore.rules:100`): o próprio usuário só pode alterar `nome`, `apelido`, `email`, `telefone`, `fcmToken` e `fotoURL`. Os campos `role`, `liberado`, `uid` e `conviteId` precisam permanecer **iguais aos valores atuais** (`request.resource.data.X == resource.data.X`). Qualquer tentativa de mexer neles via owner update é rejeitada.

> [!warning] Quem pode mudar `role` e `liberado`
> Somente um **admin** (`isAdmin()`) consegue alterar `role` (promover/rebaixar) e `liberado` (liberar/bloquear acesso). Esse é o único caminho legítimo para [[Liberação do participante|liberar um participante]] ou promovê-lo a admin — feito pela tela de [[Gerenciar Usuários e Convites]].

## Efeito de `liberado == false` no cadastro

Como todo usuário é criado com `liberado == false`, ele **não consegue escrever palpites** até que um admin o libere. As rules de escrita de palpites checam `isLiberado()` (`firestore.rules:25`, que lê `usuarios/{uid}.liberado`). Portanto:

- Recém-cadastrado: vê o app (read é liberado), mas qualquer create de palpite é negado pela [[Liberação do participante|liberação]].
- Após o admin marcar `liberado == true`: as escritas passam a ser autorizadas (sujeitas ainda a `prazoAberto()` e demais regras das [[Entidades de palpite]]).

> [!note] Leitura no frontend
> O documento `usuarios/{uid}` é carregado pelo hook [[useAuth]], que expõe `role` e `liberado` para as [[Rotas e Guards|guards de rota]] e para o controle de UI (ex.: mostrar área admin, [[Banners de estado|banner de "aguardando liberação"]]).

## Relacionados

- [[Regras de segurança do Firestore]] — onde mora toda a lógica de escalação de privilégio
- [[Gerenciar Usuários e Convites]] — tela admin que promove/libera usuários
- [[Liberação do participante]] — efeito de `liberado` nas escritas
- [[useAuth]] — hook que carrega o documento e expõe `role`/`liberado`
- [[Coleções do Firestore]] · [[Rotas e Guards]] · [[FCM e notificações]]
- [[Modelo de Dados MOC]]
