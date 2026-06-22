---
title: Divergências conhecidas
tags:
  - operacao
  - pontuacao
  - divergencia
  - bug
status: documentado
related:
  - "[[Pontuação]]"
  - "[[Especificação e Design]]"
  - "[[Operação MOC]]"
  - "[[analise-codigo-2026-06-07]]"
---

Registro das divergências conhecidas entre documentação e código no Bolão do Bolero. A mais relevante é a escala de pontos: a [[Especificação e Design]] descreve uma escala que **não** corresponde à [[Pontuação]] realmente implementada, e essa inconsistência já causou um bug de exibição.

> [!warning] Fonte de verdade das regras de pontuação
> A fonte de verdade das regras de negócio é o documento **Considerações Gerais** + o documento `config/geral` no Firestore (ver [[Coleção config]]) — **não** a spec. A [[Especificação e Design]] está desatualizada quanto à escala de pontos e não deve ser usada como referência para regras de pontuação.

## A divergência da escala de pontos

Há três descrições diferentes da escala de pontos circulando no projeto. Apenas a do código + regulamento real vale.

| Origem | Tier alto | Tier intermediário | Tier baixo | Especial |
| --- | --- | --- | --- | --- |
| **Regulamento real** (Considerações Gerais + `config/geral`) | `placarExato`: 5 | `colunaCerta`: 3 | `totalGols`: 1 | `palpiteEspecial`: 10 |
| **Spec de design** (2026-03-31) | `placarExato`: 10 | `placarUmTime`: 5 | `vencedor`: 3 | — |
| **CLAUDE.md** (alinhado em 2026-06-22) | `placarExato` | `colunaCerta` | `totalGols` | — |

A escala real é **0 / 1 / 3 / 5 por jogo**, mais **10 por palpite especial acertado** (ver [[Resultados Especiais]]). Os valores são configuráveis pelo admin via [[Configurações do bolão]] e persistidos em `config/geral`.

> [!warning] O tier "placar de um time" NÃO existe no código (CLAUDE.md já corrigido)
> A **spec de design** ("placarUmTime") descrevia um tier intermediário que premiava acertar os gols de **um** dos times. **Esse tier não existe** em `src/lib/pontuacao.ts`: o tier intermediário real é `colunaCerta` (acertar o vencedor/empate) e o tier baixo é `totalGols` (acertar a **soma** de gols com a **coluna errada**).
> O `CLAUDE.md` repetia essa descrição incorreta na linha 75, mas foi **alinhado ao código em 2026-06-22**. A spec histórica (`docs/superpowers/specs/2026-03-31-bolao-do-bolero-design.md`) é preservada como registro e **não** reflete o código atual — ao documentar comportamento, a autoridade é sempre o **código**.

## Como os pontos de um palpite são calculados

A função `calcularPontosPalpite(palpite, resultado, config)` em `src/lib/pontuacao.ts:19` recebe o palpite do usuário, o resultado real do jogo e a `ConfigPontos`, e retorna `{ pontos, tipo }`, onde `tipo ∈ 'placarExato' | 'colunaCerta' | 'totalGols' | null`. Os pontos saem do confronto **palpite × resultado** com tiers **mutuamente exclusivos** (não cumulativos).

Definições internas:

- **Coluna** = sinal de `(golsCasa − golsVisitante)` via `Math.sign` (`pontuacao.ts:25-27`). `colunaCerta` quando `vPalpite === vResultado` — mesmo vencedor **ou** ambos empate.
- **Placar exato** = coluna certa **e** placar idêntico (`golsCasa` e `golsVisitante` iguais aos reais).
- **Total de gols** = soma `golsCasa + golsVisitante` do palpite igual à soma real.

A avaliação é um `if/else` em cascata, com prioridade decrescente (`pontuacao.ts:39-51`):

| Condição | Retorno | `tipo` |
| --- | --- | --- |
| coluna certa **e** placar exato | `config.placarExato` (ex.: 5) | `placarExato` |
| coluna certa, placar errado | `config.colunaCerta` (ex.: 3) | `colunaCerta` |
| coluna errada, total de gols certo | `config.totalGols` (ex.: 1) | `totalGols` |
| errou coluna **e** total | `0` | `null` |

> [!info] Não-cumulativo e prioridade da coluna
> Os tiers são exclusivos: coluna certa **com** total certo ainda dá só `colunaCerta` — **não soma** o `totalGols`. A coluna certa tem prioridade sobre o total certo. Os valores `placarExato`, `colunaCerta` e `totalGols` vêm de `ConfigPontos` (origem `config/geral` no Firestore — [[Coleção config]]); `5 / 3 / 1` são apenas o exemplo usado em testes, **não** valores fixos de produção.

### Exemplo do regulamento (resultado real 2×2)

| Palpite | Pontos | Motivo |
| --- | --- | --- |
| 2×0 | 0 | errou coluna (vitória vs empate) e total (2 ≠ 4) |
| 3×1 | 1 | errou coluna, mas total = 4 bate |
| 1×1 | 3 | coluna certa (empate), placar errado |
| 2×2 | 5 | placar exato |

## O bug de exibição (2026-06-07)

A [[analise-codigo-2026-06-07|análise de código]] confirmou um bug de exibição na [[Página Palpites]] (visão geral). `PalpitesGeral.tsx:198-201` fazia um **cast inseguro** de `Config` para `Record<string, number>` e caía em **defaults hardcoded (5 / 3 / 1)** quando os campos não vinham com o nome esperado — mostrando uma escala fixa em vez dos valores realmente configurados pelo admin em `config/geral`.

> [!warning] Ao mexer em pontuação/exibição
> Use **sempre** os valores de `config/geral`. **Nunca** hardcode `10 / 5 / 3` (da spec de design antiga) nem `5 / 3 / 1` (defaults do cast inseguro). Trate `5 / 3 / 1` como exemplo configurável, não como produção. A mesma `calcularPontosPalpite` alimenta o cálculo oficial — divergência aqui propaga para a [[Página Ranking]] e para o [[Trigger onJogoEncerrado]].

## Relacionados

- [[Pontuação]] — regra de negócio completa do cálculo de pontos
- [[Especificação e Design]] — spec desatualizada quanto à escala (fonte da divergência)
- [[Bracket oficial]] — outra área onde resolução provisória vs oficial pode divergir
- [[Configurações do bolão]] — onde o admin define `ConfigPontos`
- [[Coleção config]] — `config/geral`, fonte de verdade dos valores
- [[Resultados Especiais]] — palpite especial (10 pontos)
- [[analise-codigo-2026-06-07]] — análise que confirmou o bug de exibição
- [[Operação MOC]] — índice da área de Operação
