---
title: Snapshot de resultados
tags:
  - dominio
  - resultados
  - cloud-functions
  - cache
status: documentado
related:
  - "[[Bracket oficial]]"
  - "[[Trigger de snapshot]]"
  - "[[Coleção _system]]"
  - "[[Página Resultados]]"
---

Fotografia serializável (cache de dados derivados) da [[Página Resultados]] — classificações parciais, status de [[Clinch de grupo]] e [[Bracket oficial]] provisório — montada reusando as libs puras de cálculo, sem nenhuma duplicação de regra. É recalculada por um [[Trigger de snapshot]] sempre que um resultado de jogo muda e persistida na [[Coleção _system]] (`_system/resultados`).

## O que o snapshot contém

A função pura `montarSnapshotResultados(jogos, grupos)` (`src/lib/snapshotResultados.ts:27`) retorna um `SnapshotResultados` com quatro campos:

| Campo | Tipo | Origem |
| --- | --- | --- |
| `classificacoes` | `Record<string, ClassificacaoTime[]>` | `calcularClassificacoesReais` ([[Classificação de grupos]]) |
| `clinch` | `Record<string, Record<string, ClinchTime>>` | `calcularClinchGrupo` por letra de grupo ([[Clinch de grupo]]) |
| `bracket` | `Record<string, { casa, visitante }>` | `montarResolvedorProvisorio` ([[Resolução provisória vs oficial]]) |
| `baseadoEm.jogosEncerrados` | `number` | marcador de staleness / invalidação de cache |

- O **clinch** é calculado só sobre jogos da fase `'grupos'` (`snapshotResultados.ts:31`), iterando cada grupo e derivando a letra de `g.nome.replace('Grupo ', '')`.
- O **bracket** aplica o resolvedor provisório apenas a jogos com `fase !== 'grupos'` (`snapshotResultados.ts:40`) — é a [[Resolução provisória vs oficial]] aplicada ao mata-mata.
- `baseadoEm.jogosEncerrados` conta jogos com `encerrado && resultado` (`snapshotResultados.ts:43`) e serve de marcador de obsolescência para invalidar o cache.

> [!info] Sem `Timestamp` na lib
> A lib pura não inclui `atualizadoEm` — esse campo é adicionado **na gravação**, pela Cloud Function, com `serverTimestamp()`. Assim a mesma lib roda no frontend e no backend sem depender de tipos do Firestore. Veja [[Tipos compartilhados de cálculo]].

## Fonte única: zero duplicação

Tudo é derivado das libs puras já existentes ([[Classificação de grupos]], [[Clinch de grupo]], [[Resolução provisória vs oficial]]). A lib `src/lib/snapshotResultados.ts` é **espelhada** em `functions/src/_shared/lib/snapshotResultados.ts`, então frontend e [[Cloud Functions MOC|Cloud Function]] consomem exatamente a mesma lógica — fonte única declarada para evitar [[Divergências conhecidas]]. Faz parte da [[Lógica compartilhada do backend]].

## O trigger que recalcula

O [[Trigger de snapshot]] `onResultadoParaSnapshot` é um `onDocumentWritten('jogos/{jogoId}')` em `functions/src/resultadosProjecoes.ts:36` (exportado via `functions/src/index.ts:8`).

- Dispara quando `resultadoMudou` (compara `JSON.stringify` do `resultado` antes/depois) **ou** `encerradoMudou` (`(antes?.encerrado ?? false) !== (depois?.encerrado ?? false)`) — `resultadosProjecoes.ts:39-41`.
- `recalcularSnapshotResultados()` (`resultadosProjecoes.ts:13`) lê as coleções `jogos` e `grupos` em paralelo (`Promise.all`), monta `GrupoRef[]` (`nome`, `times`) e chama `montarSnapshotResultados`.
- Grava `_system/resultados` com `{ ...snapshot, atualizadoEm: serverTimestamp() }` (`resultadosProjecoes.ts:26-29`).
- **Idempotente**: recomputa do zero a partir de TODOS os jogos e sobrescreve o doc, então disparos concorrentes convergem (last-write-wins).

> [!warning] Jogos de grupos não entram no bracket
> O `bracket` do snapshot só inclui jogos com `fase !== 'grupos'`. Jogos da fase de grupos ficam de fora do bracket (mas continuam alimentando `classificacoes` e `clinch`). Para o [[Bracket oficial]] usar as projeções, isso significa que o snapshot só projeta a fase32 em diante.

> [!danger] Nunca gravar na coleção `config`
> O snapshot é persistido em `_system/resultados`, **fora** da [[Coleção config]]. Por regra do projeto, `config` só pode conter `geral` e `resultado_especial` — qualquer outro doc ali quebra leituras de produção. Por isso o snapshot vive na [[Coleção _system]].

> [!warning] Segundo trigger no mesmo doc — cuidado com concorrência
> `onResultadoParaSnapshot` é o **segundo** trigger sobre `jogos/{jogoId}`; o outro é o [[Trigger onJogoEncerrado]]. Ambos disparam no mesmo write, em paralelo e de forma independente. Além disso, os escopos diferem: este é `onDocumentWritten` (captura create/update/delete), enquanto `onJogoEncerrado` é `onDocumentUpdated` (só update). Ver [[Race condition de triggers]].

> [!note] Por que disparar em `jogos` e não em `_system`
> O comentário no código deixa explícito (`resultadosProjecoes.ts:34`): o trigger observa a coleção `jogos`, não `_system`, justamente para **não criar loop** — escrever o snapshot não dispara o próprio recálculo.

## Relacionados

- [[Domínio MOC]]
- [[Bracket oficial]]
- [[Trigger de snapshot]]
- [[Coleção _system]]
- [[Página Resultados]]
- [[Clinch de grupo]]
- [[Classificação de grupos]]
- [[Resolução provisória vs oficial]]
- [[Trigger onJogoEncerrado]]
- [[Race condition de triggers]]
- [[Lógica compartilhada do backend]]
- [[Coleção config]]
- [[Tipos compartilhados de cálculo]]
