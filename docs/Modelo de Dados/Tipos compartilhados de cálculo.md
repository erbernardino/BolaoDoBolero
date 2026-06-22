---
title: Tipos compartilhados de cálculo
tags:
  - dados
  - tipos
  - calculo
  - backend
status: documentado
related:
  - "[[Lógica compartilhada do backend]]"
  - "[[Snapshot de resultados]]"
  - "[[Modelo de Dados MOC]]"
  - "[[Divergências conhecidas]]"
---

Os tipos de cálculo vivem em `src/types/calc.ts` (sem `Timestamp`) e são re-exportados e estendidos em `src/types/index.ts` (com `Timestamp`). Essa divisão existe para que a mesma definição de tipos sirva ao frontend e às Cloud Functions, que usam toolchains diferentes e não podem compartilhar `firebase/firestore`.

## Por que a divisão calc.ts × index.ts

O frontend roda sobre Vite + client SDK; as Cloud Functions rodam sobre o admin SDK. As duas pontas têm pacotes `firebase` incompatíveis para import comum. Se `Timestamp` (de `firebase/firestore`) aparecesse nos tipos de cálculo, esses tipos não poderiam ser compartilhados com as functions.

A solução: tudo que as libs puras de cálculo precisam fica em `calc.ts`, **livre de `Timestamp`**. Os campos `Timestamp` ficam apenas no `index.ts`, usado só pelo frontend.

| Arquivo | Dependência de `firebase/firestore` | Tipos definidos |
| --- | --- | --- |
| `src/types/calc.ts` | nenhuma | `Fase`, `Origem` (`OrigemGrupo`/`OrigemJogo`), `Resultado`, `JogoCalc`, `PalpiteCalc`, `ClassificacaoTime` |
| `src/types/index.ts` | importa `Timestamp` | `Jogo`, `Palpite` (estendem os de calc) + `Config`, `Usuario`, `Ranking`, etc. |

A extensão é direta (`src/types/index.ts:46-52`):

- `Jogo extends JogoCalc` + `dataHora: Timestamp`
- `Palpite extends PalpiteCalc` + `criadoEm: Timestamp`

> [!info] Re-exportação transparente
> `index.ts` re-exporta `Fase, Origem, OrigemGrupo, OrigemJogo, Resultado, ClassificacaoTime, JogoCalc, PalpiteCalc` de `./calc` (`src/types/index.ts:6-9`). Assim os chamadores do frontend continuam passando `Jogo`/`Palpite` sem nenhuma alteração — a divisão é invisível para quem consome.

> [!warning] NÃO importar `firebase/firestore` em `calc.ts`
> Qualquer import de `firebase/firestore` (direto ou via `Timestamp`) em `src/types/calc.ts` quebra o compartilhamento client/functions: as Cloud Functions deixam de compilar a mesma lógica. O cabeçalho do arquivo (`src/types/calc.ts:1-10`) deixa isso explícito.

> [!warning] Libs de cálculo nunca acessam campos `Timestamp`
> As libs puras em `src/lib/` usam **exclusivamente** os tipos calc (`JogoCalc`/`PalpiteCalc`) e nunca devem ler `dataHora`/`criadoEm`. Migração das 7 libs de cálculo para importar de `types/calc` foi confirmada em 2026-06-22. Estes campos `Timestamp` só existem no frontend e não fazem parte do contrato de cálculo. Ver [[Entidades de palpite]] e [[Entidades estáticas]] para as entidades completas com `Timestamp`.

## Fonte única: o diretório `_shared`

Para garantir uma única fonte da lógica de cálculo, o build das functions **espelha** as libs puras do frontend para `functions/src/_shared` antes de compilar (relação detalhada em [[Lógica compartilhada do backend]]).

O script é `functions/copy-shared.mjs`, disparado pelo build:

```
"build": "node copy-shared.mjs && tsc"
```

O diretório `_shared` é **gerado e gitignored**: nunca editar à mão — editar sempre em `src/lib` / `src/types`. A allowlist copiada inclui:

- `_shared/lib`: `classificacao` ([[Classificação de grupos]]), `melhoresTerceiros` ([[Melhores terceiros]]), `chaveamento`, `bracketUsuario` ([[Bracket personalizado do usuário]]), `clinchGrupo` ([[Clinch de grupo]]), `resultadosOficiais` ([[Bracket oficial]]), `resolverProvisorio` ([[Resolução provisória vs oficial]]), `snapshotResultados` ([[Snapshot de resultados]])
- `_shared/types`: `calc.ts`

> [!note] A allowlist é explícita de propósito
> O script não copia tudo de `src/lib` — há arquivos acoplados ao Vite (ex.: `sentry.ts` usa `import.meta.env`) que não compilam nas functions. Por isso a lista de libs é fechada.

## Quem consome no backend

O trigger de projeções/snapshot (`functions/src/resultadosProjecoes.ts`) importa direto de `_shared`:

- `montarSnapshotResultados` de `_shared/lib/snapshotResultados` (`functions/src/resultadosProjecoes.ts:3`)
- `GrupoRef` de `_shared/lib/bracketUsuario` (`:4`)
- `JogoCalc` de `_shared/types/calc` (`:5`)

Os documentos do Firestore são lidos e tratados como `JogoCalc`/`GrupoRef`, recomputando o [[Snapshot de resultados]] do zero (idempotente). O objetivo declarado é **fonte única, sem divergência** entre frontend e backend. Ver [[Trigger de snapshot]].

## Armadilha: a TERCEIRA cópia da lógica FIFA

> [!danger] `resolverMataMata.ts` NÃO usa `_shared`
> `functions/src/resolverMataMata.ts` **replica inline** a classificação FIFA e o comparador de terceiros, em vez de importar de `_shared`. O próprio arquivo admite: "este arquivo replica a logica" (`functions/src/resolverMataMata.ts:51`). Resultado: existem **três cópias** da mesma lógica — `src/lib` (frontend), `functions/src/_shared` (gerada) e `resolverMataMata.ts` (manual) — com risco real de divergirem. Ver [[Resolver mata-mata]] e [[Divergências conhecidas]].

## Relacionados

- [[Lógica compartilhada do backend]] — como `_shared` é gerado e usado pelos triggers
- [[Snapshot de resultados]] — principal consumidor de `JogoCalc` no backend
- [[Resolver mata-mata]] — a terceira cópia, fora do `_shared`
- [[Divergências conhecidas]] — risco de drift entre as três cópias
- [[Entidades de palpite]] · [[Entidades estáticas]] — entidades `Jogo`/`Palpite` com `Timestamp`
- [[Modelo de Dados MOC]] · [[Domínio MOC]]
