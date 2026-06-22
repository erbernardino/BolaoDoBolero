---
title: Classificação de grupos
tags:
  - dominio
  - classificacao
  - fifa
  - desempate
status: documentado
related:
  - "[[Pontuação]]"
  - "[[Melhores terceiros]]"
  - "[[Bracket personalizado do usuário]]"
  - "[[Domínio MOC]]"
---

Cálculo da tabela de um grupo da Copa a partir dos palpites (ou resultados) de um usuário, ordenando os times por pontos e resolvendo empates com **head-to-head primeiro** e fallback determinístico. Implementa o Article 13 do regulamento FIFA Copa 2026 (`src/lib/classificacao.ts:3`), e alimenta tanto a tabela exibida quanto a montagem do [[Bracket personalizado do usuário]].

A função pública é `calcularClassificacaoGrupo(palpitesGrupo, timesDoGrupo)` (`src/lib/classificacao.ts:24`). O parâmetro `timesDoGrupo` vem das [[Entidades estáticas]] do bolão (os times de cada grupo), e `palpitesGrupo` são os palpites/resultados dos jogos daquele grupo.

## Acúmulo da tabela

Para cada palpite a função soma, por time (`src/lib/classificacao.ts:42`):

- **Pontos de partida:** vitória = 3, empate = 1, derrota = 0.
- Gols marcados, gols sofridos e **saldo** (`golsMarcados - golsSofridos`).
- Contadores de **V / E / D** e número de jogos.

> [!info] Não confundir com a [[Pontuação]] do bolão
> Esses 3/1/0 são os pontos **da partida de futebol** dentro da tabela do grupo. Não têm relação com os pontos configuráveis que o participante ganha por acertar o palpite (placar exato, um time, vencedor) — isso é o sistema de [[Pontuação]], que é independente e cumulativo no ranking.

## Ordem e clusters de empate

A lista é ordenada **primeiro por pontos (desc)** (`src/lib/classificacao.ts:63`). Times com o mesmo número de pontos formam um *cluster* contíguo, e cada cluster com 2+ times é resolvido por `resolverEmpate` (`src/lib/classificacao.ts:74`). Clusters de um único time já entram na posição final.

## Step 1 — Head-to-head (prioritário sobre o saldo geral)

Dentro de um cluster empatado, monta-se uma **mini-tabela** considerando **apenas os jogos entre os times empatados** (`calcularH2H`, `src/lib/classificacao.ts:87`). A ordenação usa, nesta ordem:

1. **a)** Pontos no confronto direto (h2h)
2. **b)** Saldo de gols no h2h
3. **c)** Gols marcados no h2h

Se o h2h separa o cluster **parcialmente**, o algoritmo **re-aplica o Step 1 recursivamente** apenas no sub-grupo ainda empatado — e, crucialmente, com escopo restrito aos jogos entre esses times remanescentes (`src/lib/classificacao.ts:143`).

> [!note] Guard anti-loop infinito
> Se o h2h **não separa ninguém** (`sub.length === empatados.length`, `src/lib/classificacao.ts:140`), o algoritmo **não recursa** — cairia num loop infinito sobre o mesmo conjunto. Nesse caso desce direto para o Step 2.

## Step 2 — Critérios gerais

`aplicarCriteriosGerais` (`src/lib/classificacao.ts:153`) ordena por:

- **d)** Saldo de gols **geral**
- **e)** Gols marcados **geral**

> [!warning] Conduta/cartões NÃO desempata aqui
> O Step 2f do Article 13 (conduta — cartões) **não é implementado** nesta etapa (`src/lib/classificacao.ts:157`). O bolão não registra cartões na fase de grupos. Disciplina só entra em cena na comparação entre os [[Melhores terceiros]], não dentro do grupo.

## Step 3 e fallback determinístico

O Step 3 (FIFA Ranking) **não se aplica** ao bolão. O critério final é determinístico: `a.timeId.localeCompare(b.timeId)` (`src/lib/classificacao.ts:160`).

> [!danger] O fallback é uma ordenação alfabética ativa, não "ordem de entrada"
> Quando dois ou mais times permanecem 100% empatados (mesmos pontos, mesmo saldo, mesmos gols, e h2h sem separação), o `localeCompare(timeId)` **reordena alfabeticamente por `timeId`** — ele não preserva a ordem em que os times chegaram. Na FIFA real esse caso seria resolvido por sorteio; aqui é determinístico **de propósito**, para que a tabela exibida e o [[Bracket personalizado do usuário]] (e o [[Bracket oficial]]) nunca divirjam sobre quem ficou em cada posição.

A consistência dessa ordem importa porque a colocação final no grupo é o que dispara o [[Clinch de grupo]] e seleciona quem avança ao mata-mata.

## Comportamento confirmado pelos testes

O teste-chave (`src/lib/__tests__/classificacao.test.ts:82`) confirma a prioridade do h2h **antes** do saldo geral: **BRA** (saldo geral **-1**) fica à frente de **ALE** (saldo geral **+5**) porque BRA venceu ALE no confronto direto. Sem o Step 1, o saldo geral colocaria ALE na frente — é exatamente o que o Article 13 evita.

Outros testes cobrem 3+ times empatados resolvidos pela mini-tabela (`:33`) e o caso de empate total entre 3 times (`:58`), onde só o fallback determinístico decide a ordem dos três.

## Relacionados

- [[Pontuação]] — sistema de pontos do participante (distinto dos pontos de partida da tabela)
- [[Melhores terceiros]] — onde a disciplina/conduta efetivamente desempata
- [[Clinch de grupo]] — consumidor da colocação final calculada aqui
- [[Bracket personalizado do usuário]] e [[Bracket oficial]] — dependem da ordem estável da tabela
- [[Entidades estáticas]] — fonte de `timesDoGrupo`
- [[Domínio MOC]]
