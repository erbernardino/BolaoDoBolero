---
title: Trigger de snapshot
tags:
  - backend
  - cloud-functions
  - firestore
  - trigger
  - resultados
status: documentado
related:
  - "[[Snapshot de resultados]]"
  - "[[Coleção _system]]"
  - "[[Página Resultados]]"
  - "[[Cloud Functions MOC]]"
---

A **Trigger de snapshot** (`onResultadoParaSnapshot`) é a Cloud Function que recalcula o [[Snapshot de resultados]] — classificação, clinch e [[Bracket oficial|bracket]] provisório — sempre que um resultado de jogo muda, gravando o resultado em `_system/resultados` na [[Coleção _system]]. É a fonte que a [[Página Resultados]] consome em tempo real.

> [!info] Onde fica
> Definida em `functions/src/resultadosProjecoes.ts:36` e reexportada em `functions/src/index.ts:8`. A lib de cálculo vem de `functions/src/_shared/lib/snapshotResultados.ts`.

## Como dispara

É um `onDocumentWritten('jogos/{jogoId}')` (`functions/src/resultadosProjecoes.ts:36`) — captura **create, update e delete** do documento de jogo. Dentro do handler, só recalcula quando um dos dois mudou:

| Condição | Como é avaliada (`resultadosProjecoes.ts:39`-`41`) |
|---|---|
| `resultadoMudou` | `JSON.stringify(antes?.resultado ?? null) !== JSON.stringify(depois?.resultado ?? null)` |
| `encerradoMudou` | `(antes?.encerrado ?? false) !== (depois?.encerrado ?? false)` |

Se `resultadoMudou || encerradoMudou`, chama `recalcularSnapshotResultados()`. Caso contrário, sai sem fazer nada (writes em campos irrelevantes do jogo não gastam recálculo).

## O que `recalcularSnapshotResultados()` faz

`functions/src/resultadosProjecoes.ts:13` recomputa o snapshot **do zero**, ignorando o conteúdo do evento:

1. Lê as coleções `jogos` e `grupos` em paralelo (`Promise.all`) — ver [[Coleções do Firestore]].
2. Mapeia os jogos para `JogoCalc` e monta `GrupoRef[]` (`{ nome, times }`), com fallback `Grupo ${id}` quando o doc do grupo não traz `nome`.
3. Chama `montarSnapshotResultados(jogos, grupos)` da [[Lógica compartilhada do backend|lib espelhada em _shared]], que reusa as mesmas funções puras do frontend (`calcularClassificacoesReais`, `calcularClinchGrupo`, `montarResolvedorProvisorio`).
4. Grava `_system/resultados` com `{ ...snapshot, atualizadoEm: serverTimestamp() }`.

> [!note] Idempotente e last-write-wins
> Como recomputa tudo a partir do estado atual das coleções e sobrescreve o doc inteiro (`set`), disparos concorrentes convergem: vence a última escrita. O conteúdo do evento (`event.data`) só é usado para **decidir se** recalcula, nunca como base do cálculo.

## Fonte única de lógica

A função reusa a **mesma** lógica do frontend (`src/lib`), espelhada em `functions/src/_shared/lib/`. Isso é uma decisão de design declarada em comentário (`resultadosProjecoes.ts:9`) para evitar [[Divergências conhecidas|divergência]] entre o que a [[Página Resultados]] calcularia client-side (fallback) e o que o servidor grava no snapshot. Ver [[Tipos compartilhados de cálculo]] para os tipos `JogoCalc`/`ClassificacaoTime` usados nesse caminho compartilhado.

## Por que dispara em `jogos` e não em `_system`

> [!tip] Evita loop
> O comentário em `resultadosProjecoes.ts:34` é explícito: a trigger escuta `jogos/{jogoId}` (não `_system/resultados`). Se escutasse o próprio doc que grava, a escrita do snapshot re-disparararia o trigger indefinidamente.

## Armadilhas

> [!warning] Há DOIS triggers no mesmo documento `jogos/{jogoId}`
> `onResultadoParaSnapshot` não é o único trigger sobre o doc de jogo. O [[Trigger onJogoEncerrado]] (`functions/src/index.ts:12`) também escuta `jogos/{jogoId}` e dispara no **mesmo write**. Os dois rodam em paralelo e de forma independente: um faz [[Recálculo de ranking]], o outro recalcula o snapshot. Ver [[Race condition de triggers]].

> [!danger] Escopos de evento diferentes — não são intercambiáveis
> `onResultadoParaSnapshot` é `onDocumentWritten` (create/update/delete), enquanto `onJogoEncerrado` é `onDocumentUpdated` (**só update**). Um delete de jogo dispara o snapshot mas **não** o ranking. Ao raciocinar sobre efeitos colaterais de mexer num jogo, considerar que os dois cobrem conjuntos de eventos distintos.

## Relacionados

- [[Snapshot de resultados]] — o objeto derivado (classificações, clinch, bracket) que esta trigger grava.
- [[Coleção _system]] — onde vive o doc `_system/resultados`.
- [[Página Resultados]] — consumidora do snapshot em tempo real, com fallback client-side.
- [[Lógica compartilhada do backend]] — código `_shared` reusado pela trigger.
- [[Trigger onJogoEncerrado]] e [[Race condition de triggers]] — o outro trigger no mesmo doc.
- [[Recálculo de ranking]] — efeito paralelo disparado pelo mesmo write.
- [[Cloud Functions MOC]] — mapa da área.
