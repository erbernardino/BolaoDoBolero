---
title: Recálculo de ranking
tags:
  - backend
  - cloud-functions
  - ranking
  - pontuacao
status: documentado
related:
  - "[[Pontuação]]"
  - "[[Trigger onJogoEncerrado]]"
  - "[[Página Ranking]]"
  - "[[Coleção _system]]"
---

A função server-side `recalcularTodoRanking()` recomputa o ranking inteiro **do zero** a partir de todos os jogos com resultado e dos palpites especiais, gravando um documento por usuário em `ranking/{uid}` e o metadado `_system/ranking_meta`. Ela vive em `functions/src/pontuacao.ts:136` e encapsula a [[Pontuação]] não cumulativa de cada palpite contra o resultado real do jogo.

## Como é disparada

A função é chamada por dois pontos em `functions/src/index.ts`:

- pelo [[Trigger onJogoEncerrado]] (`onDocumentUpdated('jogos/{jogoId}')`, `index.ts:12`), sempre que um jogo é encerrado/atualizado;
- pelo callable `recalcularRanking` (`onCall`, `index.ts:24`), que retorna `{ recalculados }` para acionamento manual pelo admin.

Ambos os caminhos executam o **recálculo completo** — não há atualização incremental no fluxo ativo.

## O que faz, passo a passo

1. Lê `config/geral` para obter `config.pontos` (`ConfigPontos`). Se o documento não existir, **retorna `0`** sem fazer nada (`pontuacao.ts:142`).
2. Define `ptsEspecial = pontos.palpiteEspecial ?? 10` (fallback 10).
3. Identifica o `brasilId` procurando, na coleção `times`, o time com `sigla === 'BRA'` (`null` se não achar) — usado para o campo `pontosJogosBrasil`.
4. Carrega **todos** os jogos e filtra os que têm `resultado != null`.
5. Carrega **todos** os palpites e os indexa num `Map<jogoId, PalpiteRanking[]>`, evitando varredura O(N*M) dentro do loop de jogos.
6. Inicializa o `rankingMap` com **todos os usuários** (`emptyRanking()` por uid), de modo que todo participante apareça no ranking mesmo sem ter pontuado.
7. Acumula, por palpite, os pontos de cada jogo (ver tabela abaixo).
8. Soma os **palpites especiais** a partir de `config/resultado_especial`.
9. Persiste o resultado (delete + set).
10. Grava `_system/ranking_meta` com `atualizadoEm: serverTimestamp()`.
11. Retorna `Promise<number>` = quantidade de jogos com resultado processados.

## Acumulação por palpite de jogo

Para cada palpite de um jogo com resultado, chama-se `calcularPontos()` e acumula-se no `RankingData` do uid:

| Campo | Como acumula |
| --- | --- |
| `pontosJogos` | `+= resultado.pontos` |
| `pontosTotal` | `+= resultado.pontos` (jogos) e depois `+= pontosEsp` (especiais) |
| `placaresExatos` | `+1` se `tipo === 'placarExato'` |
| `colunasCertas` | `+1` se `tipo === 'colunaCerta'` |
| `totalGolsAcertados` | `+1` se `tipo === 'totalGols'` |
| `pontosFaseGrupos` | `+= resultado.pontos` se `jogo.fase === 'grupos'` |
| `pontosJogosBrasil` | `+= resultado.pontos` se o jogo envolve o Brasil |

Esses campos são exatamente os gravados em `ranking/{uid}`, mais `pontosEspeciais`, e alimentam a [[Página Ranking]].

## Palpites especiais

Lê `config/resultado_especial` (gabarito) e, para cada documento de `palpites_especiais`, soma `ptsEspecial` por acerto de `campeao`, `vice`, `terceiro` e `quarto`, além de verificar se `pe.paisArtilheiro` está contido em `re.paisesArtilheiros` (`pontuacao.ts:222-231`). Veja [[Resultados Especiais]] para o gabarito.

> [!warning] Atribuição, não acumulação, em `pontosEspeciais`
> Em `pontuacao.ts:237` o código usa `atual.pontosEspeciais = pontosEsp` (atribuição direta), enquanto `pontosTotal` usa `+=`. Isso está **correto hoje** porque cada uid tem no máximo um documento em `palpites_especiais`; mas é frágil — se a estrutura passar a permitir múltiplos documentos especiais por usuário, os pontos seriam sobrescritos em vez de somados.

## A lógica pura: `calcularPontos()`

`calcularPontos(palpite, resultado, config)` (`pontuacao.ts:36`) retorna `{ pontos, tipo }`, onde `tipo` é `'placarExato' | 'colunaCerta' | 'totalGols' | null`. É a [[Pontuação]] **não cumulativa**:

- **Coluna certa** = `Math.sign(palpite.golsCasa - palpite.golsVisitante) === Math.sign(resultado.golsCasa - resultado.golsVisitante)` (mesmo vencedor ou ambos empate).
- Hierarquia (apenas **um** prêmio por palpite):
  1. se coluna certa **e** placar exato → `placarExato`;
  2. senão, se coluna certa → `colunaCerta`;
  3. senão, se a soma de gols bate (`totalGols`) → `totalGols`;
  4. senão → `0` / `null`.

`ConfigPontos` tem `placarExato`, `colunaCerta`, `totalGols` e `palpiteEspecial?`, todos vindos de `config/geral.pontos` — ver [[Coleção config]] e [[Tipos compartilhados de cálculo]].

> [!note] Nomenclatura difere da terminologia FIFA
> Os campos de config (`placarExato` / `colunaCerta` / `totalGols`) não usam os mesmos nomes do CLAUDE.md ("placar exato" / "placar de um time" / "vencedor"). É a mesma regra, com rótulos diferentes — registrado em [[Divergências conhecidas]].

## Persistência

> [!warning] Delete + set não transacional
> A função apaga **toda** a coleção `ranking` num batch e, em seguida, regrava cada `ranking/{uid}` num batch novo (`pontuacao.ts:243-264`). Os dois batches **não** estão na mesma transação: entre o delete e o set existe uma janela em que o ranking fica vazio. Como a função roda inteira do zero a cada chamada, qualquer escrita concorrente é sobrescrita.

Ao final, grava `_system/ranking_meta` com `{ atualizadoEm: serverTimestamp() }`, na [[Coleção _system]]. O comentário no código reforça a regra de ouro do projeto: **nunca** usar a [[Coleção config]] para metadados de sistema — usar `_system`.

> [!danger] `processarResultadoJogo()` é provável dead code
> A rota incremental alternativa `processarResultadoJogo()` (`pontuacao.ts:64-106`) atualiza o ranking jogo a jogo, mas **não é chamada por nenhum trigger ou callable atual** — `index.ts` importa somente `recalcularTodoRanking`. O fluxo ativo é sempre o recálculo completo. Tratar como código morto até ser religado ou removido.

> [!info] Concorrência entre triggers
> Como o [[Trigger onJogoEncerrado]] dispara `recalcularTodoRanking()` a cada jogo encerrado, múltiplos encerramentos quase simultâneos podem disparar recálculos concorrentes. Detalhes e mitigação em [[Race condition de triggers]].

## Relacionados

- [[Pontuação]] — regra de pontuação não cumulativa (`calcularPontos`)
- [[Trigger onJogoEncerrado]] — gatilho que invoca o recálculo
- [[Página Ranking]] — consumidora de `ranking/{uid}` e `_system/ranking_meta`
- [[Coleção _system]] — onde mora `ranking_meta`
- [[Resultados Especiais]] — gabarito dos palpites especiais
- [[Race condition de triggers]] — concorrência entre recálculos
- [[Lógica compartilhada do backend]] — utilitários server-side
- [[Cloud Functions MOC]] — índice da área
