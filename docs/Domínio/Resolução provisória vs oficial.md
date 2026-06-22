---
title: Resolução provisória vs oficial
tags:
  - dominio
  - mata-mata
  - bracket
  - resultados
status: documentado
related:
  - "[[Bracket oficial]]"
  - "[[Clinch de grupo]]"
  - "[[Página Resultados]]"
  - "[[Snapshot de resultados]]"
---

O **resolvedor provisório** preenche os slots diretos de grupo (`1X`/`2X`) de cada confronto de mata-mata com a [[Classificação de grupos]] **parcial atual**, sinalizando se o time já está matematicamente classificado (✓) e se a posição ainda é provisória (esmaecido). Ele é o complemento "otimista" do [[Bracket oficial]]: enquanto o oficial só resolve um slot de grupo quando o grupo está **completo**, o provisório resolve **cedo** com a parcial, mas marca visualmente o que ainda não está travado.

Implementado em `src/lib/resolverProvisorio.ts`, é o que alimenta a projeção do chaveamento na [[Página Resultados]].

## Assinatura e tipo de retorno

`montarResolvedorProvisorio(jogos, grupos)` retorna um `ResolverProvisorio` — uma função `(jogo) => { casa: SlotResolvido; visitante: SlotResolvido }` (`src/lib/resolverProvisorio.ts:33`).

Cada lado é um `SlotResolvido` (`src/lib/resolverProvisorio.ts:10`):

| Campo | Tipo | Significado |
| --- | --- | --- |
| `timeId` | `string \| null` | Time resolvido, ou `null` quando o slot ainda é um label (terceiro/cascata não resolvidos). |
| `classificado` | `boolean` | Vaga garantida ([[Clinch de grupo]] top-2) → exibir selo ✓. |
| `provisorio` | `boolean` | Posição ainda não travada (líder provisório / 1º-2º indefinido) → exibir esmaecido. |

O valor base para slots não resolvidos é `VAZIO = { timeId: null, classificado: false, provisorio: false }` (`src/lib/resolverProvisorio.ts:21`).

## Três fontes combinadas

A montagem combina três cálculos (`src/lib/resolverProvisorio.ts:34-42`):

- `calcularClassificacoesReais(jogos, grupos)` → a [[Classificação de grupos]] parcial (`cls`), usada para descobrir o líder atual de cada posição.
- `montarResolvedorBracketOficial(jogos, grupos)` → o resolvedor do [[Bracket oficial]] (`oficial`), que dá a resposta **definitiva** quando ela existe.
- `calcularClinchGrupo(...)` por grupo (`clinchPorGrupo`) → o [[Clinch de grupo]], que diz se cada time tem vaga top-2 garantida e se sua posição exata já travou.

## Ordem de prioridade na resolução de cada lado

A função interna `resolverLado(label, oficialId)` decide na seguinte ordem (`src/lib/resolverProvisorio.ts:44-70`):

1. **Resolução oficial** — se `oficialId` existe (grupo completo OU cascata `W##`/`RU##` já com resultado), o slot fica `provisorio = false`. Para slot de grupo, `classificado` vem do clinch top-2 do time (`classificadoTop2 ?? true`); se não for slot de grupo, `classificado = false`.
2. **Slot direto de grupo `1X`/`2X`** sem oficial — `label` casa com a regex `/^([12])([A-L])$/`. Usa `cls[letra][pos-1]` (o líder parcial daquela posição). `classificado = clinch.classificadoTop2 ?? false`; `provisorio = !(posicaoExataGarantida === pos)`.
3. **Terceiros (`3XYZ`) e cascatas (`W##`/`RU##`)** — não resolvem cedo: retornam `VAZIO` (timeId `null`), permanecendo como label.

> [!info] O lado de cada confronto
> O resolvedor final (`src/lib/resolverProvisorio.ts:72-78`) chama primeiro `oficial(jogo)` para obter `casaId`/`visitanteId` e então aplica `resolverLado` a `jogo.labelCasa` e `jogo.labelVisitante`. Ou seja, a fonte definitiva sempre tem a primeira palavra; a parcial só entra quando o oficial está em branco.

## Diferença essencial vs oficial

> [!warning] Só slots diretos de grupo (`1X`/`2X`) recebem preenchimento provisório
> Terceiros (`3XYZ`) e cascatas (`W##`/`RU##`) **esperam dado suficiente** e continuam como label até o [[Bracket oficial]] resolvê-los. O provisório nunca "adivinha" um melhor terceiro nem o vencedor de um confronto de mata-mata ainda não jogado — ver [[Melhores terceiros]] e [[Alocação de terceiros por slot]].

> [!danger] Resolver cedo ≠ resolver definitivo
> O [[Bracket oficial]] só resolve um slot de grupo quando o grupo está **completo**. O provisório resolve **antes**, com a classificação parcial, e usa `provisorio = true` (esmaecido) para deixar claro que a posição pode mudar. Não confunda um slot provisório esmaecido com uma vaga confirmada: o ✓ (`classificado`) e o esmaecido (`provisorio`) são sinais independentes.

## Combinações de sinais (do teste)

Confirmado em `src/lib/__tests__/resolverProvisorio.test.ts`:

| Situação | `timeId` | `classificado` (✓) | `provisorio` (esmaecido) |
| --- | --- | --- | --- |
| Grupo parcial, 1 jogo cada (BRA 1º, ESP 2º) | líder atual | `false` | `true` |
| Clinch top-2 garantido, mas 1º/2º ainda em disputa | os dois classificados | `true` | `true` |
| Grupo completo | 1º/2º definidos | `true` | `false` |
| Slot de terceiro `3XYZ` | `null` | `false` | `false` |
| Grupo sem nenhum jogo encerrado | `null` | `false` | `false` |

> [!note] Sem jogo encerrado, slot de grupo também fica vazio
> Mesmo um slot `1X`/`2X` permanece como label (`timeId = null`) quando o grupo não tem jogos encerrados — não há classificação parcial da qual extrair um líder, então a prioridade 2 cai no `VAZIO`.

## Onde isso aparece

O snapshot persistido em [[Snapshot de resultados]] (coleção [[Coleção _system]]) e a projeção do chaveamento na [[Página Resultados]] usam esse resolvedor para mostrar o bracket "como está agora", distinto do desenho confirmado pelo [[Bracket oficial]]. Os tipos `JogoCalc` e `GrupoRef` vêm de [[Tipos compartilhados de cálculo]].

## Relacionados

- [[Bracket oficial]]
- [[Clinch de grupo]]
- [[Página Resultados]]
- [[Snapshot de resultados]]
- [[Classificação de grupos]]
- [[Melhores terceiros]]
- [[Tipos compartilhados de cálculo]]
- [[Domínio MOC]]
