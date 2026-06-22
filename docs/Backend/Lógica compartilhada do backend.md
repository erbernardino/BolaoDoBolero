---
title: Lógica compartilhada do backend
tags:
  - backend
  - cloud-functions
  - arquitetura
  - tipos
status: documentado
related:
  - "[[Tipos compartilhados de cálculo]]"
  - "[[Trigger de snapshot]]"
  - "[[Snapshot de resultados]]"
  - "[[Cloud Functions MOC]]"
---

O diretório `functions/src/_shared` é uma **cópia gerada** da lógica pura de cálculo do frontend (classificação, terceiros, bracket, snapshot), usada pelos triggers das Cloud Functions para garantir **fonte única** — o backend roda exatamente o mesmo código que o frontend, sem reimplementar regras.

## Por que existe

Frontend (Vite, client SDK) e Cloud Functions (admin SDK) usam toolchains diferentes e **não podem compartilhar imports de `firebase/firestore`**. Para projetar os resultados oficiais no servidor sem divergir do que o usuário vê, as libs puras precisam rodar nos dois ambientes. A solução é espelhar `src/lib` (a fonte editável) para dentro das functions no momento do build.

> [!info] A fonte editável é sempre `src/lib` / `src/types`
> `_shared` é **gerado e gitignored**. NUNCA editar à mão — qualquer correção vai em `src/lib`/`src/types` e é re-copiada no próximo build.

## Como o build copia

O script `functions/copy-shared.mjs` roda **antes do `tsc`**, via `functions/package.json`:

```
"build": "node copy-shared.mjs && tsc"
```

Ele apaga e recria `functions/src/_shared`, copiando uma **allowlist explícita** das libs puras (não copia tudo de `src/lib`, porque há arquivos acoplados ao Vite — ex.: `sentry.ts` usa `import.meta.env` e não compilaria nas functions). Os 8 arquivos copiados para `_shared/lib`:

| Lib | Conceito |
| --- | --- |
| `classificacao.ts` | [[Classificação de grupos]] (critérios FIFA) |
| `melhoresTerceiros.ts` | [[Melhores terceiros]] |
| `chaveamento.ts` | montagem do [[Bracket oficial]] |
| `bracketUsuario.ts` | [[Bracket personalizado do usuário]] |
| `clinchGrupo.ts` | [[Clinch de grupo]] |
| `resultadosOficiais.ts` | resultados oficiais |
| `resolverProvisorio.ts` | [[Resolução provisória vs oficial]] |
| `snapshotResultados.ts` | [[Snapshot de resultados]] |

Além das libs, copia `src/types/calc.ts` para `_shared/types/calc.ts`.

## Quem consome

O [[Trigger de snapshot]] `onResultadoParaSnapshot` (definido em `functions/src/resultadosProjecoes.ts`, re-exportado em `functions/src/index.ts:8`) é o consumidor: importa `montarSnapshotResultados` de `_shared/lib/snapshotResultados`, o tipo `GrupoRef` de `_shared/lib/bracketUsuario` e `JogoCalc` de `_shared/types/calc` (`functions/src/resultadosProjecoes.ts:3-5`). Ele recomputa o snapshot do zero a cada escrita de jogo e grava o resultado consolidado.

## A divisão de tipos: calc.ts vs index.ts

A razão de os [[Tipos compartilhados de cálculo]] viverem separados é exatamente o problema de toolchain acima. A regra é:

- `src/types/calc.ts` — tipos de cálculo **sem nenhuma dependência de `firebase/firestore`**: `Fase`, `Origem` (`OrigemGrupo` | `OrigemJogo`), `Resultado`, `JogoCalc`, `PalpiteCalc`, `ClassificacaoTime`. É este arquivo que é copiado para `_shared`.
- `src/types/index.ts` — importa de `./calc` e **estende** com os campos `Timestamp` que só o frontend usa: `Jogo extends JogoCalc` adicionando `dataHora` (`src/types/index.ts:46-47`); `Palpite extends PalpiteCalc` adicionando `criadoEm` (`src/types/index.ts:50-51`).

As libs puras em `src/lib/` usam **exclusivamente** os tipos de `calc` — nunca `dataHora`/`criadoEm`. Essa separação foi consolidada com a migração das libs de cálculo para importar de `types/calc` (2026-06-22).

> [!warning] Não importar `firebase/firestore` em `calc.ts`
> Qualquer import de `firebase/firestore` (ou de `Timestamp`) dentro de `calc.ts` ou de uma lib copiada **quebra o compartilhamento client/functions**: o admin SDK não resolve o client SDK e o build das functions falha. Os campos `Timestamp` ficam isolados em `index.ts`, fora do que `_shared` copia.

> [!danger] Existe uma TERCEIRA cópia da classificação FIFA — `resolverMataMata.ts`
> O [[Resolver mata-mata]] (`functions/src/resolverMataMata.ts`) **NÃO usa `_shared`**: ele mantém uma cópia *inline* da classificação FIFA. O próprio arquivo admite isso em `functions/src/resolverMataMata.ts:51` ("este arquivo replica a logica"). Resultado: a lógica de classificação existe em **três lugares** — `src/lib/classificacao.ts` (fonte), `_shared/lib/classificacao.ts` (cópia gerada) e a cópia manual em `resolverMataMata.ts` — e essa terceira cópia pode divergir das outras duas. Ver [[Divergências conhecidas]].

## Relacionados

- [[Tipos compartilhados de cálculo]] — a divisão calc.ts / index.ts em detalhe
- [[Trigger de snapshot]] — o consumidor de `_shared`
- [[Snapshot de resultados]] — o que é projetado
- [[Bracket personalizado do usuário]] — origem de `GrupoRef`
- [[Resolver mata-mata]] — a cópia inline divergente
- [[Divergências conhecidas]]
- [[Domínio MOC]] · [[Cloud Functions MOC]]
