---
title: Índices do Firestore
tags:
  - dados
  - firestore
  - indices
  - auditoria
status: documentado
related:
  - "[[Auditoria]]"
  - "[[Coleções do Firestore]]"
  - "[[Regras de segurança do Firestore]]"
  - "[[Modelo de Dados MOC]]"
---

Os índices compostos do Firestore são declarados em `firestore.indexes.json` e, neste projeto, existem **apenas 3** — todos sobre a coleção `audit_log`, que alimenta a tela de [[Auditoria]]. O bloco `fieldOverrides` está vazio (`firestore.indexes.json:29`).

## Os 3 índices de `audit_log`

Todos os índices têm `queryScope: COLLECTION` e ordenam pelo campo `at` em ordem **decrescente**, para listar os eventos mais recentes primeiro.

| # | Campos (ordem) | Query que habilita |
|---|----------------|--------------------|
| 1 | `eventType` ASC, `at` DESC | Filtrar por **tipo de evento** ordenado por data desc |
| 2 | `targetUid` ASC, `at` DESC | Filtrar por **usuário-alvo** ordenado por data desc |
| 3 | `eventType` ASC, `targetUid` ASC, `at` DESC | Filtrar por **tipo + usuário-alvo** ordenado por data desc |

Esses índices suportam exatamente as consultas de auditoria filtradas por tipo de evento e/ou usuário-alvo, sempre ordenadas por data decrescente — combinação que o Firestore exige índice composto para resolver.

> [!info] Por que `at` sempre DESC
> O Firestore só consegue ordenar por um campo após filtros de igualdade se houver um índice composto cobrindo a combinação. Como a [[Auditoria]] sempre mostra os eventos do mais novo ao mais antigo, `at DESC` aparece em todos os três índices.

## Coleções sem índice composto

> [!warning] Nenhuma outra coleção tem índice composto
> Fora de `audit_log`, **nenhuma** coleção do projeto possui índice composto declarado. Qualquer query nova que combine **filtro + ordenação** (ou múltiplos filtros de range) em outra coleção das [[Coleções do Firestore]] pode falhar em runtime exigindo um índice ainda não criado. Nesse caso o Firestore retorna um erro com link para criação do índice — adicione a definição em `firestore.indexes.json` antes de subir a feature.

> [!tip] Fluxo ao precisar de um novo índice
> 1. Reproduza a query localmente; o erro do Firestore traz a definição pronta.
> 2. Acrescente o índice em `firestore.indexes.json`.
> 3. Faça deploy (`firebase deploy --only firestore:indexes`).
> Não confunda índices com as [[Regras de segurança do Firestore]]: índices controlam **performance/viabilidade** das queries, as rules controlam **quem pode ler/escrever**.

## Relacionados

- [[Auditoria]] — única consumidora dos índices de `audit_log`.
- [[Regras de segurança do Firestore]] — controle de acesso (complementar aos índices).
- [[Coleções do Firestore]] — visão das demais coleções, nenhuma com índice composto.
- [[Modelo de Dados MOC]]
