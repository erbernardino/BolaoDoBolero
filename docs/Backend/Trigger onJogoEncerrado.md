---
title: Trigger onJogoEncerrado
tags:
  - backend
  - cloud-functions
  - firestore
  - trigger
  - ranking
status: documentado
related:
  - "[[Recálculo de ranking]]"
  - "[[Inserir Resultados]]"
  - "[[Race condition de triggers]]"
  - "[[Cloud Functions MOC]]"
---

`onJogoEncerrado` é o trigger Firestore que dispara o [[Recálculo de ranking]] completo sempre que o resultado de um jogo muda. É um `onDocumentUpdated('jogos/{jogoId}')` definido em `functions/src/index.ts:11`.

## Como funciona

O handler compara o estado do documento antes e depois do write:

- `antes = event.data?.before.data()` e `depois = event.data?.after.data()` (`functions/src/index.ts:12-13`).
- Se `antes` ou `depois` forem `undefined`, retorna sem fazer nada (`functions/src/index.ts:14`).
- `resultadoMudou` compara `JSON.stringify(antes.resultado ?? null)` com `JSON.stringify(depois.resultado ?? null)` (`functions/src/index.ts:16`).
- `encerradoMudou` compara `antes.encerrado !== depois.encerrado` (`functions/src/index.ts:17`).
- Se `resultadoMudou || encerradoMudou`, chama `await recalcularTodoRanking()` (`functions/src/index.ts:18-20`), função importada de `./pontuacao`.

> [!info] Só captura update
> Por ser `onDocumentUpdated`, o trigger reage **apenas a updates** do documento `jogos/{jogoId}`. Create e delete de jogos não disparam `onJogoEncerrado` — o que é coerente, pois o recálculo só faz sentido quando um resultado já existente muda. Inserir resultados é feito via [[Inserir Resultados]], que atualiza o doc do jogo e assim aciona este trigger.

## Callable admin associado

No mesmo arquivo existe o callable `recalcularRanking` (`onCall`, `functions/src/index.ts:23-35`), que dá ao administrador uma forma manual de forçar o mesmo recálculo:

| Passo | Comportamento |
| --- | --- |
| Autenticação | exige `request.auth?.uid`; sem ele lança `HttpsError('unauthenticated')` |
| Autorização | lê `usuarios/{uid}` e exige `role === 'admin'`, senão `HttpsError('permission-denied')` |
| Ação | chama o mesmo `recalcularTodoRanking()` |
| Retorno | `{ recalculados }` |

A checagem de papel depende da [[Entidade Usuario]] (`usuarios/{uid}.role`) e do desenho das [[Regras de segurança do Firestore]].

## Pontos de atenção

> [!warning] Dois triggers no mesmo documento
> Pelo design documentado, `onJogoEncerrado` e o [[Trigger de snapshot]] (`onResultadoParaSnapshot`) observam o **mesmo** documento `jogos/{jogoId}` e disparam no mesmo write de resultado, em paralelo — o que abre espaço para uma [[Race condition de triggers]]. Eles são independentes: um recalcula o ranking, o outro persiste o [[Snapshot de resultados]]. Observação de fonte: no `functions/src/` deste repositório, o único trigger sobre `jogos/{jogoId}` presente é `onJogoEncerrado` (`functions/src/index.ts:11`); o trigger de snapshot não aparece nesse arquivo — confira [[Trigger de snapshot]] e [[Race condition de triggers]] para a localização real.

> [!danger] Recálculo é sempre total, nunca incremental
> Qualquer alteração de resultado dispara o recálculo de **TODO** o ranking via `recalcularTodoRanking()`. O custo é da ordem de `O(jogos * palpites)` por write — não há atualização incremental por jogo. Edições em lote de resultados multiplicam esse custo.

> [!note] Critério de disparo
> Como a comparação é feita por `JSON.stringify`, qualquer diferença na ordem/forma do objeto `resultado` pode contar como mudança. Já um write que não altere `resultado` nem `encerrado` não dispara o recálculo.

## Relacionados

- [[Recálculo de ranking]] — função `recalcularTodoRanking()` chamada pelo trigger
- [[Inserir Resultados]] — fluxo admin que atualiza o jogo e aciona este trigger
- [[Race condition de triggers]] — concorrência entre os dois triggers do mesmo doc
- [[Trigger de snapshot]] — o outro trigger sobre `jogos/{jogoId}`
- [[Snapshot de resultados]] — dado persistido pelo trigger de snapshot
- [[Pontuação]] — regras de cálculo de pontos usadas no recálculo
- [[Cloud Functions MOC]] — mapa de conteúdo da área de backend
