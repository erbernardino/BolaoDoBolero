---
title: Melhores terceiros
tags:
  - dominio
  - classificacao
  - mata-mata
  - fifa
status: documentado
related:
  - "[[Classificação de grupos]]"
  - "[[Alocação de terceiros por slot]]"
  - "[[Formato da Copa 2026]]"
  - "[[Domínio MOC]]"
---

Critério de ordenação e corte que seleciona os **8 melhores terceiros colocados** dentre os 12 grupos (A–L) da [[Formato da Copa 2026]] para avançar ao mata-mata. Recebe os terceiros já apurados pela [[Classificação de grupos]] e devolve, em ordem de mérito, exatamente os 8 que se classificam — base para a [[Alocação de terceiros por slot]].

## Função principal

`selecionarMelhoresTerceiros(terceiros, pontosDisciplinaresPorTime = {})` ordena os terceiros com `compararTerceirosFifa` e fatia os 8 primeiros com `.slice(0, 8)` (`src/lib/melhoresTerceiros.ts:28`). O segundo parâmetro é **opcional** — um mapa `timeId → pontos disciplinares`; quando omitido, vale `{}`.

> [!info] São sempre exatamente 8
> O corte é fixo em `slice(0, 8)`, assumindo o formato de 12 grupos (A–L) da Copa 2026, onde 8 dos 12 terceiros avançam. A função não valida a quantidade de entrada; ela apenas ordena e corta.

## Ordem de comparação

`compararTerceirosFifa(a, b, pontosDisciplinaresPorTime = {})` aplica os critérios em cascata (`src/lib/melhoresTerceiros.ts:8`):

| Ordem | Critério | Direção |
| --- | --- | --- |
| 1 | `pontos` | desc (mais pontos primeiro) |
| 2 | `saldoGols` (saldo de gols) | desc |
| 3 | `golsMarcados` | desc |
| 4 | pontos disciplinares | desc (menos negativo = melhor) |
| 5 | fallback determinístico | grupo, depois `timeId` |

Os três primeiros critérios são idênticos aos da [[Classificação de grupos]]. A diferença está nos critérios 4 e 5.

## Pontos disciplinares: aqui SÃO usados

Ao contrário da tabela de grupo (onde o desempate disciplinar costuma não ser aplicado), aqui os pontos disciplinares entram como **4º critério**. São normalizados por `normalizarPontosDisciplinares` (`src/lib/melhoresTerceiros.ts:3`):

```ts
if (!Number.isFinite(valor)) return 0
return Math.min(0, Math.trunc(valor ?? 0))
```

- `NaN`, `undefined` e qualquer valor não finito viram `0`.
- O resultado é **sempre ≤ 0** (clamp com `Math.min(0, ...)`): pontos disciplinares representam penalidades, então valores positivos são descartados para `0`.
- A comparação é `disc(b) - disc(a)`: quem tem o valor **menos negativo** (menos cartões) fica à frente.

> [!warning] `pontosDisciplinares` é opcional e clampado a no máximo 0
> Se nenhum mapa for passado, ninguém tem penalidade e este critério nunca desempata. Mesmo passando um valor positivo por engano, ele é clampado para `0`. Nunca conte com esse critério para "premiar" disciplina — ele só pune.

## Fallback determinístico (sem sorteio FIFA)

Se pontos, saldo, gols e disciplina empatarem totalmente, a FIFA resolveria por **sorteio**. O app substitui isso por um desempate determinístico (`src/lib/melhoresTerceiros.ts:22`):

1. Se os times são de grupos diferentes → `grupo.localeCompare` (ordem alfabética do grupo).
2. Se mesmo grupo → `timeId.localeCompare`.

> [!note] Por que evitar o sorteio
> Um sorteio aleatório faria a tabela exibida e o chaveamento projetado divergirem entre renders. O desempate determinístico garante que [[Classificação de grupos]], esta seleção e o [[Bracket oficial]] sempre cheguem ao mesmo resultado. Relevante para a [[Resolução provisória vs oficial]].

O teste confirma o comportamento: com tudo empatado e ambos com disciplina `-1`, **PAR (grupo D)** vem antes de **PAN (grupo L)**, pois `'D'.localeCompare('L') < 0` (`src/lib/__tests__/melhoresTerceiros.test.ts:35`).

## Relacionados

- [[Classificação de grupos]] — produz os terceiros e define os 3 primeiros critérios de desempate.
- [[Alocação de terceiros por slot]] — consome os 8 selecionados e os encaixa nos slots do mata-mata.
- [[Formato da Copa 2026]] — 12 grupos, 8 melhores terceiros avançam.
- [[Bracket oficial]] — chaveamento que depende desta ordenação determinística.
- [[Domínio MOC]]
