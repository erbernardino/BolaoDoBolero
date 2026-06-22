---
title: Entidades estáticas
tags:
  - dados
  - tipos
  - firestore
  - mata-mata
status: documentado
related:
  - "[[Gerenciar Jogos e Times]]"
  - "[[Classificação de grupos]]"
  - "[[Formato da Copa 2026]]"
  - "[[Tipos compartilhados de cálculo]]"
---

As **entidades estáticas** são as estruturas que descrevem a Copa em si — times, grupos e jogos — mais o tipo de resultado por jogo e o tipo de classificação usado nos cálculos. São "estáticas" no sentido de que descrevem o torneio (estrutura e placares oficiais), não os palpites dos participantes (ver [[Entidades de palpite]]). Todas vivem em `src/types/index.ts` e `src/types/calc.ts`.

> [!info] Divisão entre `index.ts` e `calc.ts`
> Os tipos de **cálculo** (livres de `Timestamp`) ficam em `src/types/calc.ts` e são reexportados por `src/types/index.ts:6`. As entidades persistidas no frontend estendem os tipos de cálculo adicionando os campos `Timestamp`. Detalhes em [[Tipos compartilhados de cálculo]].

## Time, Grupo e a estrutura da Copa

`Time` (`src/types/index.ts:31`) descreve uma seleção; `Grupo` (`src/types/index.ts:40`) agrupa times por chave da fase de grupos. A organização em grupos e o avanço para o mata-mata seguem o [[Formato da Copa 2026]].

| Entidade | Campos | Observação |
| --- | --- | --- |
| `Time` | `id`, `nome`, `sigla`, `bandeira`, `grupo`, `confederacao` | `grupo` é a chave (string) do grupo do time |
| `Grupo` | `id`, `nome`, `times` (`string[]`) | `times` é lista de `timeId` |

Times e grupos alimentam diretamente a [[Classificação de grupos]] (ordenação por critérios FIFA) e os [[Melhores terceiros]]. São editados pelo admin em [[Gerenciar Jogos e Times]].

## Jogo e JogoCalc

`Jogo` (`src/types/index.ts:46`) estende `JogoCalc` (`src/types/calc.ts:35`) adicionando apenas `dataHora: Timestamp`. O `JogoCalc` é o que as libs puras de cálculo consomem (sem dependência de Firebase).

Campos de `JogoCalc`:

- `id`, `numero` (número do jogo na tabela oficial), `fase` (`Fase`)
- `grupo` (`string | null` — só preenchido na fase de grupos)
- `timeCasa`, `timeVisitante` (`string`, `timeId`)
- `origemCasa`, `origemVisitante` (`Origem | null` — chaveamento do mata-mata)
- `resultado` (`Resultado | null`)
- `encerrado` (`boolean`)
- `aoVivo?`, `labelCasa?`, `labelVisitante?` (opcionais)

### Fase

`Fase` (`src/types/calc.ts:12`) é uma das: `'grupos' | 'fase32' | 'oitavas' | 'quartas' | 'semi' | 'terceiro' | 'final'`.

> [!note] `fase32` e `terceiro`
> A ordem do enum coloca a **fase de 32** (`fase32`) antes das oitavas, refletindo o [[Formato da Copa 2026]]. `terceiro` é a disputa de terceiro lugar.

### Origem (chaveamento do mata-mata)

`Origem` (`src/types/calc.ts:26`) é a união discriminada que descreve de onde vem cada lado de um jogo de mata-mata, permitindo montar o bracket antes dos resultados existirem:

- `OrigemGrupo` — `{ tipo: 'grupo', grupo, posicao }`: o time é o classificado em `posicao` no `grupo`.
- `OrigemJogo` — `{ tipo: 'jogo', jogoId, resultado: 'vencedor' | 'perdedor' }`: o time é o vencedor/perdedor de outro jogo.

Essa estrutura é a base para resolver o [[Bracket oficial]] e o [[Bracket personalizado do usuário]].

### Resultado

`Resultado` (`src/types/calc.ts:28`): `golsCasa`, `golsVisitante`, `classificado` (`string | null`). O `classificado` indica **quem avança em caso de empate** (decisão por pênaltis) no mata-mata — é um `timeId`.

> [!warning] `resultado.classificado` ≠ `config/resultado_especial`
> São entidades distintas e fáceis de confundar:
> - **`resultado.classificado`** é por jogo (quem avançou naquele confronto empatado).
> - **`ResultadoEspecial`** (em [[Coleção config]], doc `resultado_especial`) é o resultado especial **global** do bolão — campeão, vice, terceiro, quarto e país(es) artilheiro(s). Ver [[Resultados Especiais]].

## ClassificacaoTime

`ClassificacaoTime` (`src/types/calc.ts:63`) é o tipo de cálculo da [[Classificação de grupos]] — um tipo derivado dos jogos, usado em memória pelas libs de cálculo:

- `timeId`, `grupo?`
- `pontos`, `jogos`, `vitorias`, `empates`, `derrotas`
- `golsMarcados`, `golsSofridos`, `saldoGols`
- `fairPlayPontos?` (desempate disciplinar)

## Persistência e segurança

`times`, `grupos` e `jogos` são [[Coleções do Firestore]] raiz: leitura por qualquer autenticado, escrita só pelo admin (ver [[Regras de segurança do Firestore]], `firestore.rules:117-132`).

> [!danger] `jogos.write` não valida campos de resultado
> A regra `match /jogos/{jogoId}` libera `allow write: if isAdmin()` **sem nenhum validador de schema** (`firestore.rules:129`). Um admin pode gravar qualquer estrutura em `resultado`/`encerrado` sem que as regras barrem inconsistências — gap conhecido. Quem escreve esses campos é [[Inserir Resultados]], e o [[Trigger onJogoEncerrado]] reage a `encerrado`. Listado em [[Divergências conhecidas]].

## Relacionados

- [[Gerenciar Jogos e Times]] — onde times, grupos e jogos são editados
- [[Classificação de grupos]] — consome `Time`, `Grupo` e produz `ClassificacaoTime`
- [[Formato da Copa 2026]] — fases, grupos e avanço ao mata-mata
- [[Tipos compartilhados de cálculo]] — separação `calc.ts` vs `index.ts`
- [[Entidades de palpite]] — contraparte (palpites dos participantes)
- [[Bracket oficial]] / [[Bracket personalizado do usuário]] — usam `Origem`
- [[Resultados Especiais]] — distinção entre `classificado` e `ResultadoEspecial`
- [[Modelo de Dados MOC]]
