---
title: Gerenciar Usuários e Convites
tags:
  - admin
  - usuarios
  - convites
  - firestore
status: documentado
related:
  - "[[Entidade Usuario]]"
  - "[[Autenticação Login e Cadastro]]"
  - "[[Liberação do participante]]"
  - "[[Admin MOC]]"
---

Página de administração para a gestão de participantes do bolão e a emissão de convites de cadastro. Cobre dois componentes: `GerenciarUsuarios` (alterar role, liberar/pendenciar pagamento, definir nova senha e excluir usuário com backup) e `GerenciarConvites` (gerar e listar links de convite). Como o cadastro é só por convite — ver [[Autenticação Login e Cadastro]] —, esta tela é o único ponto de entrada de novos participantes.

## Gerenciar Usuários

O componente lê a coleção `usuarios` da [[Entidade Usuario]] (ver [[Coleções do Firestore]]) e ordena por nome/apelido (`src/pages/admin/GerenciarUsuarios.tsx:55`). A busca filtra por **nome, apelido, email ou telefone** client-side (`src/pages/admin/GerenciarUsuarios.tsx:134`).

### Ações disponíveis

| Ação | Como funciona | Onde escreve |
| --- | --- | --- |
| Alterar role | `alterarRole` → `updateDoc usuarios/{uid} { role }` (`participante` \| `admin`) | Firestore direto (client-side) |
| Liberar / pendenciar | `toggleLiberado` → `updateDoc usuarios/{uid} { liberado: bool }` | Firestore direto (client-side) |
| Definir nova senha | callable `definirSenhaUsuario({ uid, novaSenha })` | Backend → `admin.auth().updateUser` |
| Excluir usuário | callable `excluirUsuario({ uid })` | Backend (batch + Auth) |

O campo `liberado` controla a [[Liberação do participante]] (status de pagamento): liberado = verde, pendente = vermelho. Os palpites só pontuam/contam conforme essa liberação.

> [!warning] alterarRole e toggleLiberado escrevem direto no Firestore
> Diferente das outras ações, `alterarRole` (`src/pages/admin/GerenciarUsuarios.tsx:63`) e `toggleLiberado` (`src/pages/admin/GerenciarUsuarios.tsx:68`) **não passam por Cloud Function** — gravam direto via `updateDoc` no cliente. Quem garante que só um admin pode fazer isso são as [[Regras de segurança do Firestore]]. Se as rules afrouxarem, qualquer usuário autenticado poderia se promover a admin ou se liberar.

### Definir nova senha

O modal valida senha de **mínimo 6 caracteres** no cliente (`src/pages/admin/GerenciarUsuarios.tsx:87`, botão desabilitado abaixo de 6) e o mesmo é validado no backend. A callable `definirSenhaUsuario` usa `admin.auth().updateUser` para redefinir a senha do usuário no Firebase Auth.

### Excluir usuário (com backup)

A exclusão exige confirmação dupla na UI: o admin precisa **digitar o apelido/nome exato** do alvo num `window.prompt` (`src/pages/admin/GerenciarUsuarios.tsx:112`); se não conferir, a exclusão é cancelada.

> [!danger] Exclusão é irreversível na operação — mas os dados ficam preservados
> A callable `excluirUsuario` faz **backup completo** em `usuarios_excluidos/{uid}` antes de apagar: `usuario`, `palpites`, `palpites_especiais`, `ranking`, `excluidoEm`, `excluidoPor`. Em seguida apaga em batch: os `palpites`, `palpites_especiais/{uid}`, `ranking/{uid}`, `usuarios/{uid}` e **deleta o usuário do Auth**. A operação não tem "desfazer", mas os dados ficam consultáveis na coleção de backup — ver [[Entidades de palpite]] e a coleção de [[Ver Palpites]].

> [!warning] Não é possível excluir a própria conta
> Tanto a UI (`src/pages/admin/GerenciarUsuarios.tsx:107`, botão desabilitado e `alert`) quanto o backend bloqueiam a exclusão da conta do admin logado (`u.uid === auth.currentUser?.uid`).

## Gerenciar Convites

O cadastro de novos participantes é **exclusivamente por convite**. O componente lê as coleções `convites` e `usuarios` em paralelo (`src/pages/admin/GerenciarConvites.tsx:15`) — `usuarios` serve para mostrar **quem usou** cada convite, casando `usadoPor` com a [[Entidade Usuario]].

### Gerar convite

`gerarConvite(tipo)` faz `addDoc` em `convites` (`src/pages/admin/GerenciarConvites.tsx:38`) gravando:

- `criadoPor` — uid do admin logado (via [[useAuth]])
- `tipo` — `'unico'` ou `'multiplo'` (`TipoConvite`)
- `usado: false`
- `usadoPor: null`
- `criadoEm: Timestamp.now()`

A URL gerada é `{origin}/convite/{id}` e o botão **Copiar** a coloca no clipboard (`src/pages/admin/GerenciarConvites.tsx:52`). A rota `/convite/{id}` é tratada na [[Autenticação Login e Cadastro]] (ver [[Rotas e Guards]]).

### Tipos de convite

| Tipo | Comportamento | Aparência na lista |
| --- | --- | --- |
| `unico` | Vale para **um** cadastro; deve ser invalidado após uso (`usado: true`) | Quando usado, fica esmaecido e mostra nome/email de `usadoPor` |
| `multiplo` | **Nunca esgota/expira**; aceita vários cadastros | Sempre ativo (verde), nunca esmaecido |

> [!info] Único usado x múltiplo
> Um convite `unico` usado aparece com `opacity-50` e exibe o nome/email de quem o utilizou (`src/pages/admin/GerenciarConvites.tsx:96`). O `multiplo` permanece sempre ativo e **não exibe** `usadoPor`, pois pode ter sido usado por mais de uma pessoa.

> [!note] O fluxo de marcar `usado: true`
> O componente apenas **gera e lista** convites. A marcação de `usado`/`usadoPor` acontece no fluxo de aceite do convite durante o cadastro — ver [[Autenticação Login e Cadastro]]. Esta tela só reflete esse estado.

## Relacionados

- [[Entidade Usuario]] — modelo do documento `usuarios` manipulado aqui
- [[Autenticação Login e Cadastro]] — consumo dos convites e cadastro por convite
- [[Liberação do participante]] — significado do campo `liberado`
- [[Regras de segurança do Firestore]] — garantem que só admin escreve role/liberado
- [[Coleções do Firestore]] — `usuarios`, `convites`, `usuarios_excluidos`
- [[Ver Palpites]] · [[Entidades de palpite]] — dados apagados/preservados na exclusão
- [[Admin MOC]]
