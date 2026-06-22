---
title: Race condition de triggers
tags:
  - backend
  - cloud-functions
  - ranking
  - risco-arquitetural
status: documentado
related:
  - "[[Trigger onJogoEncerrado]]"
  - "[[Recálculo de ranking]]"
  - "[[Trigger de snapshot]]"
  - "[[Cloud Functions MOC]]"
---

Risco arquitetural conhecido: **dois triggers** escutam o mesmo documento `jogos/{jogoId}` e disparam no mesmo write, e o [[Recálculo de ranking]] faz um *delete-then-write* não transacional que abre uma janela em que a coleção `ranking` fica vazia ou parcial. Esta nota documenta o risco; não há, no código, mecanismo de serialização, lock ou fila entre execuções concorrentes.

> [!warning] Dois triggers concorrentes no mesmo documento `jogos/{jogoId}`
> Múltiplos disparos de [[Trigger onJogoEncerrado]] podem chamar `recalcularTodoRanking` concorrentemente. Quando o admin atualiza vários jogos em sequência (ou em lote), cada gravação aciona seu próprio trigger e, portanto, sua própria execução completa do recálculo — sem nenhuma garantia de exclusão mútua entre elas.

## Dois triggers no mesmo write

Há **duas** Cloud Functions registradas em `jogos/{jogoId}`, e ambas disparam na mesma gravação de resultado:

| Trigger | Tipo | Ação |
| --- | --- | --- |
| [[Trigger onJogoEncerrado]] (`functions/src/index.ts:12`) | `onDocumentUpdated` | chama `recalcularTodoRanking()` |
| `onResultadoParaSnapshot` (`functions/src/resultadosProjecoes.ts:36`) — ver [[Trigger de snapshot]] | `onDocumentWritten` | chama `recalcularSnapshotResultados()` |

Os dois usam o mesmo gatilho lógico — comparam `resultado` e `encerrado` entre `before` e `after` (`functions/src/index.ts:16-18` e `functions/src/resultadosProjecoes.ts:39-41`) — então uma única edição de resultado de jogo dispara os dois ao mesmo tempo, em paralelo, sem ordem garantida entre eles.

## De onde vem a concorrência

O recálculo de ranking é global e idempotente em intenção (recomputa tudo do zero a partir de `jogos`, `palpites`, `palpites_especiais` e `config`), mas **não é atômico**. Cenários que geram execuções sobrepostas:

| Cenário | Efeito |
| --- | --- |
| Admin atualiza vários jogos em rápida sequência | Vários `onJogoEncerrado` em paralelo, cada um recalculando todo o ranking |
| Edição de um jogo dispara `onJogoEncerrado` + `onResultadoParaSnapshot` | Dois triggers no mesmo write, gravando em alvos diferentes (`ranking` vs `_system/resultados`) |
| Recálculo manual durante um trigger automático | Mesma `recalcularTodoRanking` rodando duas vezes em paralelo |

> [!info] Recálculo manual compartilha o mesmo código
> A callable `recalcularRanking` (`functions/src/index.ts:23`) chama a mesma `recalcularTodoRanking`. Um recálculo manual disparado pelo admin enquanto um trigger automático roda também sobrepõe execuções.

## A janela perigosa: delete-then-write não transacional

Em `recalcularTodoRanking` (`functions/src/pontuacao.ts:136`), a gravação do ranking acontece em **dois batches separados**, sem transação:

1. Apaga toda a coleção `ranking` num `deleteBatch` e dá `commit` (`functions/src/pontuacao.ts:244-252`).
2. Só depois grava o ranking novo em outro `batch` (`functions/src/pontuacao.ts:254-261`).

> [!danger] Ranking pode ficar vazio ou parcial
> Entre o `deleteBatch.commit()` (`functions/src/pontuacao.ts:251`) e o `batch.commit()` (`functions/src/pontuacao.ts:260`) existe uma janela em que a coleção `ranking` está vazia. Se a [[Página Ranking]] ler nesse instante, vê ranking vazio. Se duas execuções se intercalarem (uma apagando enquanto a outra grava), o estado final pode ficar parcial ou refletir um estado intermediário, não o último cálculo.

## Convergência: o que cada lado garante

- **Snapshot** ([[Trigger de snapshot]]): `recalcularSnapshotResultados` recomputa do zero e faz **um único** `db.doc('_system/resultados').set(...)` (`functions/src/resultadosProjecoes.ts:26`). Um só documento, sem delete prévio — *last-write-wins* limpo, convergente por design. Grava em [[Coleção _system]], não em `jogos`, para não criar loop.
- **Ranking** ([[Recálculo de ranking]]): também recomputa do zero, então a **última execução que terminar** tende a deixar o estado correto — mas só se as execuções não se intercalarem no meio do delete-then-write. Não há transação nem lock garantindo isso. A convergência é uma propriedade emergente do recálculo do zero, **não uma garantia explícita** do código, ao contrário do snapshot.

> [!note] Por que o snapshot é mais seguro que o ranking
> O snapshot escreve um documento único; o ranking apaga N documentos e grava N outros em dois passos. Mesmo recomputando do zero, só o snapshot fecha a janela de inconsistência, porque um `set` único é atômico no nível do documento.

## Mitigações possíveis (não implementadas no código)

- Envolver delete + write numa única transação, ou trocar o delete-then-write por `set`/`update` por documento (sem apagar a coleção inteira antes) — aproximando o ranking do modelo do snapshot.
- Serializar o recálculo (debounce/fila) para coalescer rajadas de atualização de jogos numa única execução.

## Relacionados

- [[Trigger onJogoEncerrado]] — origem dos disparos concorrentes do ranking
- [[Recálculo de ranking]] — onde mora o delete-then-write não transacional
- [[Trigger de snapshot]] — segundo trigger no mesmo write; convergência limpa por `set` único
- [[Página Ranking]] — leitor afetado pela janela de ranking vazio
- [[Coleção _system]] — alvo do snapshot (`_system/resultados`)
- [[Cloud Functions MOC]] — índice da área
