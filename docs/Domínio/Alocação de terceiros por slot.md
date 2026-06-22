---
title: Alocação de terceiros por slot
tags:
  - dominio
  - chaveamento
  - mata-mata
  - fifa
status: documentado
related:
  - "[[Melhores terceiros]]"
  - "[[Bracket oficial]]"
  - "[[Bracket personalizado do usuário]]"
  - "[[Domínio MOC]]"
---

Distribui os 8 [[Melhores terceiros]] nos slots da fase de 32 cujo rótulo FIFA tem a forma `3XYZ` (ex.: `3ABC`), garantindo que **nenhum time seja usado em mais de um slot**. A função `montarTerceirosPorSlot` em `src/lib/chaveamento.ts:115` resolve isso com uma busca em profundidade com retrocesso (backtracking).

## O problema

Na Copa 2026, vários jogos do mata-mata recebem um terceiro colocado, mas o regulamento FIFA não fixa de antemão *qual* terceiro vai para *qual* jogo: cada slot lista um conjunto de grupos elegíveis (ex.: `3ABCDF`), e a combinação real depende de quais grupos efetivamente colocaram um terceiro entre os melhores. Como os conjuntos de grupos se sobrepõem entre slots, uma escolha gulosa pode "roubar" o único time que outro slot poderia receber e deixá-lo vazio. O backtracking evita esse beco sem saída.

> [!info] Onde isso é usado
> O resultado alimenta tanto a projeção do [[Bracket oficial]] quanto, indiretamente, o [[Bracket personalizado do usuário]] — ambos precisam saber qual terceiro ocupa cada slot `3XYZ` antes de resolver os confrontos seguintes.

## Assinatura

```ts
montarTerceirosPorSlot(
  jogosFase32,            // jogos da fase de 32 com labelCasa/labelVisitante
  classificacoesPorGrupo, // Record<grupo, ClassificacaoTime[]>
  melhoresTerceiros,      // ClassificacaoTime[] já ordenados pelo ranking
): TerceirosPorSlot       // Record<slotKey, timeId | null>
```

`TerceirosPorSlot` é `Record<string, string | null>` (`src/lib/chaveamento.ts:8`). A chave **não** é o rótulo `3XYZ`: é `` `${jogo.id}:${lado}` `` (ex.: `fase32_2:visitante`).

## Etapas do algoritmo

1. **Conjunto dos elegíveis.** Constrói `melhoresIds` (Set) e `rankingMelhores` (Map timeId → índice) a partir de `melhoresTerceiros`. A ordem da lista é a fonte do ranking (`src/lib/chaveamento.ts:120-122`).
2. **Terceiros por grupo.** Para cada grupo, pega `classificacao[2]` (o 3º colocado) e só o registra se ele estiver em `melhoresIds` — terceiros que não entraram entre os melhores são ignorados (`src/lib/chaveamento.ts:124-130`).
3. **Montagem dos slots.** Ordena os jogos por `numero` ascendente (`jogosOrdenados`) e percorre lados `casa` e `visitante`. Um lado vira slot só se o rótulo limpo casar com `/^3([A-L]+)$/`. Os candidatos do slot são os terceiros dos grupos citados no rótulo, ordenados pelo `rankingMelhores` (melhor terceiro primeiro) (`src/lib/chaveamento.ts:132-153`).
4. **Resolução com retrocesso.** `resolverSlot(index)` tenta, para o slot atual, cada candidato ainda não usado: marca em `usados`, grava no resultado e recursa para o próximo slot. Se a recursão falha, **desfaz** (`usados.delete` + `delete terceirosPorSlot[slotKey]`) e tenta o próximo candidato. Se nenhum serve, o slot recebe `null` e retorna `false` (`src/lib/chaveamento.ts:155-170`).
5. **Garantia final.** Após a raiz `resolverSlot(0)`, um laço preenche com `null` qualquer slot que não tenha ficado no resultado (`src/lib/chaveamento.ts:173-176`).

## Ordem das tentativas

| Aspecto | Critério de ordenação |
| --- | --- |
| Slots (ordem do backtracking) | `numero` do jogo, ascendente |
| Candidatos dentro de um slot | posição em `melhoresTerceiros` (ranking), melhor primeiro |

> [!warning] A alocação depende da ordem dos números dos jogos
> Os slots são processados na ordem do `numero` do jogo da fase de 32. Mudanças nessa ordem (ou nos rótulos `3XYZ`) alteram qual terceiro cai em qual slot. Além disso, **slots e candidatos ficam limitados aos grupos cujo terceiro está entre os melhores** — um grupo cujo terceiro não classificou simplesmente não aparece como candidato em nenhum slot.

> [!danger] Slot pode ficar vazio legitimamente
> Se, mesmo com retrocesso, não houver candidato livre para um slot, ele recebe `null`. Quem consome `TerceirosPorSlot` deve tratar `null` (slot sem terceiro definido), não assumir que todo slot `3XYZ` está preenchido.

## Backtracking na prática (teste de regressão)

O teste "deve realocar terceiros por backtracking para nao deixar slot posterior vazio" (`src/lib/__tests__/chaveamento.test.ts:104`) monta 8 slots `3XYZ` com conjuntos de grupos sobrepostos e 8 melhores terceiros. Uma escolha gulosa esvaziaria um slot posterior; o algoritmo recua e reorganiza. As asserções confirmam: nenhum slot crítico fica nulo, há exatamente 8 valores preenchidos e `new Set(preenchidos).size === 8` — ou seja, **8 times distintos, sem repetição**.

> [!tip] Caso simples
> O teste "deve alocar terceiros por slot FIFA sem reutilizar o mesmo time" (`src/lib/__tests__/chaveamento.test.ts:72`) usa dois slots `3ABC`: o melhor terceiro disponível vai para o slot de menor número e o segundo melhor para o seguinte, sem repetir.

## Relacionados

- [[Melhores terceiros]] — define a lista ordenada que vira candidatos e ranking aqui.
- [[Classificação de grupos]] — produz `classificacoesPorGrupo`, de onde sai o 3º colocado de cada grupo.
- [[Bracket oficial]] — consome o mapa de terceiros por slot na projeção oficial.
- [[Bracket personalizado do usuário]] — usa a mesma lógica para o chaveamento de cada participante.
- [[Formato da Copa 2026]] — contexto dos rótulos FIFA `3XYZ` e dos 8 melhores terceiros.
- [[Domínio MOC]]
