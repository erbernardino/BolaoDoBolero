---
title: Bracket personalizado do usuário
tags:
  - dominio
  - mata-mata
  - calculo
  - bracket
status: documentado
related:
  - "[[Classificação de grupos]]"
  - "[[Melhores terceiros]]"
  - "[[Bracket oficial]]"
  - "[[Entidades de palpite]]"
---

O **bracket personalizado do usuário** é o resolvedor do mata-mata calculado **ao vivo** a partir dos palpites de um único usuário. É cálculo puro em memória — **não persiste nada** — e responde, para cada jogo de mata-mata, qual time o usuário projetou em casa e qual como visitante, refletindo o bracket atual dele (e não os IDs congelados no documento de palpite).

A entrada principal é `montarResolvedorBracket` em `src/lib/bracketUsuario.ts:20`, que usa a mesma lógica de `resolverTimesDoJogo` da tela de palpites de mata-mata. É consumido principalmente nas telas de [[Impressão de palpites]].

## Assinatura e retorno

`montarResolvedorBracket({ jogos, grupos, palpitesPorJogoId, pontosDisciplinares = {} })` retorna um `ResolverBracket`:

```ts
type ResolverBracket = (jogo: Jogo) => { casaId: string | null; visitanteId: string | null }
```

| Parâmetro | Papel |
| --- | --- |
| `jogos` | todos os jogos (grupos + mata-mata) usados para classificação e resolução |
| `grupos` | referência `{ nome, times }` por grupo |
| `palpitesPorJogoId` | mapa `jogoId → Palpite` do usuário (ver [[Entidades de palpite]]) |
| `pontosDisciplinares` | tie-break opcional para [[Melhores terceiros]] (default `{}`) |

## Pipeline de montagem

1. **Classificação por grupo** — para cada grupo, só calcula a [[Classificação de grupos]] quando **todos** os jogos cadastrados do grupo foram palpitados: `palpitesGrupo.length === jogosDoGrupo.length && jogosDoGrupo.length > 0` (`src/lib/bracketUsuario.ts:40`). Grupos incompletos ficam sem entrada em `classPorGrupo`.
2. **Melhores terceiros** — só são selecionados quando **todos** os grupos estão completos (`todosGruposCompletos`, `src/lib/bracketUsuario.ts:46`); caso contrário a lista de terceiros é vazia. O terceiro de cada grupo é `classPorGrupo[letra][2]` (índice 2). Ver [[Melhores terceiros]].
3. **Terceiros por slot** — `montarTerceirosPorSlot` aloca cada terceiro classificado ao slot FIFA correto. Ver [[Alocação de terceiros por slot]].
4. **Resolvedor** — devolve a função que, por jogo, chama `resolverTimeMataMataPersonalizado` para casa e visitante.

> [!info] Nada é gravado
> Todo o cálculo acontece em memória a cada chamada. O bracket personalizado é derivado: muda automaticamente conforme o usuário ajusta palpites, sem snapshot. Compare com o [[Snapshot de resultados]], que é persistido.

## Resolução de um lado do jogo

`resolverTimeMataMataPersonalizado` (`src/lib/chaveamento.ts:181`) decide a fonte na seguinte ordem:

- **Se há `origem`** (`origemCasa`/`origemVisitante`): resolve por `resolverTimeMataMataPorPalpites`. **Não aplica fallback** neste caminho — pode retornar `null`.
- **Senão**: resolve por `label` FIFA via `resolverTimePorLabelFifa`, e **só aqui** cai no `fallbackTimeId` (`jogo.timeCasa`/`jogo.timeVisitante` congelado) quando o label não resolve.

### Resolução por origem

- **`origem.tipo === 'grupo'`**: retorna `classificacao[posicao - 1].timeId` do grupo (`src/lib/chaveamento.ts:19`). Sem classificação ou posição fora do alcance → `null`.
- **`origem.tipo === 'jogo'`**: resolve vencedor/perdedor do palpite do jogo anterior (`origem.resultado`).

### Vencedor, perdedor e empate (pênaltis)

Em jogo de mata-mata empatado, o **vencedor é `palpite.classificado`** (quem o usuário marcou avançando nos pênaltis) e o **perdedor é o outro time**. Sem `classificado` no empate → `null` (`src/lib/chaveamento.ts:34`, `src/lib/chaveamento.ts:62`).

### Resolução por label FIFA

`resolverTimePorLabelFifa` (`src/lib/chaveamento.ts:74`) normaliza o label (`trim`, upper, sem espaços) e entende:

| Padrão | Regex | Significado |
| --- | --- | --- |
| `1A`, `2B` | `/^([123])([A-L]+)$/` | posição + grupo único → `classificacao[posicao-1]` |
| `3ABC` | mesmo regex, `posicao===3` e múltiplos grupos | terceiro multi-grupo → resolve por `terceirosPorSlot[slotKey]` |
| `W74`, `L74`, `RU101` | `/^(W\|L\|RU)(\d+)$/` | vencedor/perdedor do jogo com aquele `numero` |

`RU` (runner-up) é tratado como **perdedor** (`src/lib/chaveamento.ts:105`).

> [!warning] Label `3` único vs. multi-grupo
> `3A` (um único grupo) é tratado como **posição direta** no grupo. Já `3ABC` (múltiplos grupos) **exige** `slotKey` + `terceirosPorSlot` — sem `slotKey`, retorna `null` (`src/lib/chaveamento.ts:90`). O `slotKey` tem o formato `` `${jogo.id}:casa` `` ou `` `${jogo.id}:visitante` `` (`src/lib/bracketUsuario.ts:59`).

> [!danger] Não confunda as duas fontes do bracket
> O **bracket personalizado** é alimentado pelos **palpites** do usuário. O [[Bracket oficial]] **reusa esta mesma lib**, mas alimentada com **resultados reais** (jogos no formato `jogosParaPalpitesReais`). A diferença está apenas na fonte dos dados, não no algoritmo. Tratar uma como a outra produz um bracket errado. Ver [[Resolução provisória vs oficial]].

## Relacionados

- [[Classificação de grupos]] — base por grupo, consumida antes do mata-mata
- [[Melhores terceiros]] — seleção dos 8 terceiros e tie-break disciplinar
- [[Alocação de terceiros por slot]] — distribuição dos terceiros nos slots FIFA
- [[Bracket oficial]] — mesma lib, fonte de resultados reais
- [[Entidades de palpite]] — formato dos palpites consumidos
- [[Resolução provisória vs oficial]] — provisório (palpites) vs. oficial
- [[Tipos compartilhados de cálculo]] — tipos de `types/calc`
- [[Domínio MOC]]
