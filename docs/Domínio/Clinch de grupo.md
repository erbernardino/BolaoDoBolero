---
title: Clinch de grupo
tags:
  - dominio
  - classificacao
  - algoritmo
status: documentado
related:
  - "[[Classificação de grupos]]"
  - "[[Resolução provisória vs oficial]]"
  - "[[Snapshot de resultados]]"
  - "[[Domínio MOC]]"
---

# Clinch de grupo

O **clinch de grupo** determina, antes do fim da fase de grupos, se cada time já garantiu o top-2 (classificação), já fixou sua posição exata (1º ou 2º) ou já está eliminado — enumerando **todos** os cenários possíveis dos jogos restantes. É o lastro algorítmico para exibir badges de "classificado" / "eliminado" sem esperar todos os jogos terminarem, e complementa a [[Classificação de grupos]] (que ordena de fato) com uma leitura de _garantia matemática_.

A função `calcularClinchGrupo(jogosDoGrupo, timesDoGrupo)` (`src/lib/clinchGrupo.ts:33`) retorna um `Record<timeId, ClinchTime>`, onde cada `ClinchTime` tem `classificadoTop2: boolean`, `posicaoExataGarantida: 1 | 2 | null` e `eliminado: boolean` (`src/lib/clinchGrupo.ts:5`).

## Entradas e pontos base

- Os pontos fixos vêm **só** dos jogos encerrados (`j.encerrado && j.resultado`): vitória = 3, empate = 1 para cada lado (`src/lib/clinchGrupo.ts:53`).
- Jogos ainda não encerrados entram como **restantes** (par `casa`/`visitante`).
- Os resultados já existentes são convertidos para o formato de palpite real via `jogoParaPalpiteReal`, importado de `resultadosOficiais` — o mesmo conversor que sustenta a [[Resolução provisória vs oficial]] e alimenta o [[Snapshot de resultados]].

> [!info] Grupo sem jogos cadastrados
> Se `jogosDoGrupo.length === 0`, a função devolve a base com tudo indefinido (`classificadoTop2=false`, `posicaoExataGarantida=null`, `eliminado=false`) — nada a decidir (`src/lib/clinchGrupo.ts:48`).

## Dois caminhos: grupo completo vs. incompleto

### Grupo completo (`restantes.length === 0`)

Quando todos os jogos cadastrados do grupo estão encerrados, a função delega para `calcularClassificacaoGrupo` (desempates FIFA completos — saldo, gols, confronto direto) e mapeia a ordem (`src/lib/clinchGrupo.ts:62`):

| Índice na classificação | Resultado |
| --- | --- |
| `idx === 0` | `posicaoExataGarantida = 1` + `classificadoTop2 = true` |
| `idx === 1` | `posicaoExataGarantida = 2` + `classificadoTop2 = true` |
| demais | `eliminado = true` |

Aqui o clinch é exatamente a [[Classificação de grupos]] congelada.

### Grupo incompleto: enumeração de cenários

Com `k` jogos restantes, a função enumera os **3^k** cenários — cada jogo assume vitória da casa / empate / vitória do visitante, decodificado em base 3 (`src/lib/clinchGrupo.ts:85`). Para cada cenário soma os pontos e, para cada time `x`, calcula:

- `aheadEqual` = nº de times com **pontos ≥** os de `x` (excluindo `x`);
- `strictAhead` = nº de times com **pontos >** os de `x`.

A decisão final agrega os cenários (`src/lib/clinchGrupo.ts:113`):

- **`classificadoTop2`** ⟺ em **todo** cenário `aheadEqual ≤ 1` (i.e. `sempreAheadEqualMax ≤ 1`).
- **`posicaoExataGarantida = 1`** ⟺ em todo cenário ninguém alcança seus pontos (`sempreAheadEqualMax === 0`).
- **`posicaoExataGarantida = 2`** ⟺ `classificadoTop2` **e** em todo cenário exatamente um time estritamente à frente e nenhum empatado (`strictAhead === 1 && aheadEqual === 1`).
- **`eliminado`** ⟺ **nenhum** cenário teve `strictAhead ≤ 1` (`!algumTop2`).

## Critério conservador (por pontos)

O algoritmo usa apenas **pontos** — o 1º critério de desempate FIFA — e nunca aplica saldo/gols na decisão do clinch incompleto.

> [!warning] Conservadorismo intencional: falsos negativos por design
> Como só conta pontos, um time líder por **saldo** (e não por pontos) **não** recebe o badge de top-2. Isso é proposital: garante **zero falsos positivos** (nunca declara classificado quem não está), ao custo de às vezes **atrasar** o badge em empates que o desempate por saldo já resolveria. O teste `falso-negativo conservador` (`src/lib/__tests__/clinchGrupo.test.ts:112`) valida exatamente esse comportamento: três times com 3 pts e jogos abertos não dão clinch, mesmo com saldo melhor.

> [!warning] Custo exponencial (3^k)
> O nº de cenários cresce como 3^k com os jogos restantes. O cálculo assume que o carregamento traz **todos** os jogos do grupo de uma vez; jogos ainda não cadastrados não contam e podem distorcer o "grupo completo". Em grupos de 4 times (round-robin = 6 jogos), `k` é pequeno o suficiente para ser barato.

## Cobertura de testes

`src/lib/__tests__/clinchGrupo.test.ts` cobre: grupo sem jogos (tudo indefinido), clinch antecipado de 1º, top-2 sem posição exata (dois líderes empatados, 1º/2º indefinido), grupo completo consistente com a classificação, `posicaoExataGarantida = 2` via enumeração e o falso-negativo conservador.

> [!note] Falso negativo relatado historicamente — não reproduz no código atual
> Em 2026-06-22 houve um **relato** (diagnóstico operacional, não confirmado em código na época) de que **Argentina** no Grupo J — 6 pts, saldo +5, 1 jogo restante, rivais com no máximo 3 pts — teria recebido `classificadoTop2 = false`, valor que chegou a ser gravado no [[Snapshot de resultados]] em `_system/resultados`.
>
> **Verificação (durante esta documentação):** ao reconstruir esse exato cenário contra a `calcularClinchGrupo` atual (`src/lib/clinchGrupo.ts`), o resultado é `classificadoTop2 = true` em todas as variantes testadas (rivais com 2 e com 3 pts). Ou seja, **o defeito não reproduz** no código atual — provavelmente já corrigido, ou o sintoma original vinha de dados de entrada (ex.: jogos não cadastrados inflando a lista de "restantes", ou snapshot defasado), não do algoritmo em si.
>
> Mantido aqui como nota histórica. Se o sintoma reaparecer, suspeite primeiro da **completude dos jogos do grupo** carregados (ver callout "Custo exponencial") antes do algoritmo. Registrado também em [[Divergências conhecidas]].

## Relacionados

- [[Classificação de grupos]] — ordenação real do grupo (desempates FIFA), base do caminho "grupo completo".
- [[Resolução provisória vs oficial]] — origem de `jogoParaPalpiteReal`, usado para converter os jogos encerrados.
- [[Snapshot de resultados]] — onde o resultado do clinch é persistido (`_system/resultados`).
- [[Melhores terceiros]] — quem fica fora do top-2 ainda pode avançar como terceiro; o clinch trata só de top-2/eliminado dentro do grupo.
- [[Domínio MOC]]
