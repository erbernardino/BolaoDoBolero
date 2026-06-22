---
title: Pontuação
tags:
  - dominio
  - pontuacao
  - regras-de-negocio
status: documentado
related:
  - "[[Configurações do bolão]]"
  - "[[Recálculo de ranking]]"
  - "[[Entidades de palpite]]"
  - "[[Divergências conhecidas]]"
---

A **pontuação** é o cálculo de quantos pontos um palpite vale ao ser confrontado com o resultado real de um jogo. A função pura `calcularPontosPalpite(palpite, resultado, config)` resolve isso em **tiers mutuamente exclusivos** (não-cumulativos): cada palpite cai em exatamente um tier e recebe os pontos daquele tier — nunca a soma de vários. Implementada em `src/lib/pontuacao.ts:19`.

## Assinatura e retorno

`calcularPontosPalpite(palpite, resultado, config)` recebe dois placares (`{ golsCasa, golsVisitante }`) e a [[Configurações do bolão|config de pontos]], e retorna `{ pontos, tipo }`, onde `tipo ∈ 'placarExato' | 'colunaCerta' | 'totalGols' | null`.

Os valores de cada tier vêm de `ConfigPontos { placarExato, colunaCerta, totalGols }` (`src/lib/pontuacao.ts:6`), que são **configuráveis** — sua origem é o documento de configuração no Firestore (ver [[Coleção config]] e [[Configurações do bolão]]).

> [!warning] Não trate 5/3/1 como valores fixos
> Os números `5`, `3` e `1` aparecem apenas como a config usada nos testes e exemplos (`src/lib/__tests__/pontuacao.test.ts:5`). Em produção, esses valores são definidos pelo admin via [[Configurações do bolão]]. O código nunca hardcoda pontos — ele lê de `config`.

## Os três tiers (em cascata)

A avaliação é feita por uma cascata de `if`/`return` (`src/lib/pontuacao.ts:39`-51), do mais alto para o mais baixo. O primeiro que casa vence e encerra; por isso são **mutuamente exclusivos**.

| Prioridade | `tipo` | Condição | Pontos |
|---|---|---|---|
| 1 | `placarExato` | Coluna certa **E** placar idêntico ao real | `config.placarExato` |
| 2 | `colunaCerta` | Acertou a coluna, mas errou o placar | `config.colunaCerta` |
| 3 | `totalGols` | **Errou** a coluna, mas a soma de gols bate | `config.totalGols` |
| — | `null` | Errou coluna **e** total | `0` |

### Coluna

A "coluna" é o **sinal** do jogo: vitória da casa, empate ou vitória do visitante. Calculada com `Math.sign(golsCasa - golsVisitante)` para palpite e resultado (`src/lib/pontuacao.ts:25`). `colunaCerta` quando `vPalpite === vResultado` — ou seja, mesmo vencedor **ou** ambos empate.

### Placar exato

`colunaCerta && resultadoCerto`, onde `resultadoCerto` exige que `golsCasa` **e** `golsVisitante` do palpite sejam iguais aos reais (`src/lib/pontuacao.ts:30`). É o único tier que exige o placar literal.

### Total de gols

Tier intermediário-baixo: só é alcançado se a **coluna estiver errada**, mas a soma `golsCasa + golsVisitante` do palpite igualar a soma real (`src/lib/pontuacao.ts:36`). Exemplo: palpite `3x1` (total 4, casa vence) contra real `2x2` (total 4, empate) → coluna errada, total certo → `totalGols`.

## Não-cumulativo: a prioridade da coluna

> [!info] Coluna certa absorve o total certo
> Como o tier `colunaCerta` aparece **antes** de `totalGols` na cascata, um palpite que acerta a coluna **e** o total ainda recebe só `colunaCerta` — nunca soma o `totalGols`. Da mesma forma, coluna certa com total errado continua valendo `colunaCerta`. O teste em `src/lib/__tests__/pontuacao.test.ts:102` ("coluna certa com mesmo total de gols → ainda 3 pts (não soma)") fixa exatamente esse comportamento.

Isso significa que `totalGols` é um **prêmio de consolação**: só vale para quem errou quem ganharia, mas chegou perto no volume de gols.

## Exemplo do regulamento (real 2x2)

Caso canônico nos testes (`src/lib/__tests__/pontuacao.test.ts:7`), com config `5/3/1`:

| Palpite | Resultado | Pontos | `tipo` | Por quê |
|---|---|---|---|---|
| 2x0 | 2x2 | 0 | `null` | errou coluna (vitória casa ≠ empate) e total (2 ≠ 4) |
| 3x1 | 2x2 | 1 | `totalGols` | errou coluna, mas total 4 = 4 |
| 1x1 | 2x2 | 3 | `colunaCerta` | acertou empate, errou o placar |
| 2x2 | 2x2 | 5 | `placarExato` | coluna certa + placar idêntico |

## Onde isso é usado

Esta função é a unidade de cálculo consumida pelo [[Recálculo de ranking]] e pela [[Trigger onJogoEncerrado]] no backend, que percorrem as [[Entidades de palpite]] de cada jogo encerrado e somam os pontos. A mesma lógica é espelhada no frontend (ver [[Tipos compartilhados de cálculo]] e [[Página Ranking]]) e depende da [[Classificação de grupos]] e do [[Bracket personalizado do usuário]] para saber quais jogos do mata-mata pontuar por usuário.

> [!danger] Divergência com o CLAUDE.md
> O `CLAUDE.md` descreve o tier intermediário como **"placar de um time (5)"** — acertar os gols de um dos times. **Esse tier não existe no código.** O tier intermediário real é o **`totalGols`**: soma de gols correta com a coluna errada. Esta nota documenta o código (autoridade máxima); a descrição do CLAUDE.md está desatualizada. Registrado também em [[Divergências conhecidas]].

## Relacionados

- [[Configurações do bolão]] — origem dos valores `placarExato`, `colunaCerta`, `totalGols`
- [[Recálculo de ranking]] — consome esta função para somar pontos
- [[Entidades de palpite]] — o dado de entrada (`palpite`)
- [[Classificação de grupos]] — determina quais jogos pontuam por usuário
- [[Tipos compartilhados de cálculo]] — lógica compartilhada frontend/backend
- [[Divergências conhecidas]] — registro do conflito código vs. CLAUDE.md
- [[Domínio MOC]]
