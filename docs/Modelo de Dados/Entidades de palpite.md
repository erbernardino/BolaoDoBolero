---
title: Entidades de palpite
tags:
  - dados
  - palpites
  - firestore
status: documentado
related:
  - "[[Pontuação]]"
  - "[[Bracket personalizado do usuário]]"
  - "[[Página Palpites]]"
  - "[[Resultados Especiais]]"
---

Os três tipos de palpite que um participante pode registrar no bolão: o **palpite de jogo** (placar de cada partida), o **palpite especial** (campeão, vice e afins) e o **desempate de terceiros** (pontos disciplinares para posicionar os 3os colocados). Cada tipo tem sua própria entidade, coleção no Firestore e conjunto de regras de escrita.

> [!info] Fontes de autoridade
> Os tipos vivem em `src/types/index.ts` e `src/types/calc.ts`. As regras de leitura/escrita vivem em `firestore.rules`. Veja também [[Coleções do Firestore]] e [[Regras de segurança do Firestore]].

## Palpite de jogo

A entidade `Palpite` estende `PalpiteCalc` (definido em `src/types/calc.ts:53`) e acrescenta apenas o campo `criadoEm: Timestamp` (`src/types/index.ts:50`). A separação existe porque `PalpiteCalc` é livre de `Timestamp` e por isso pode ser compartilhado entre frontend e Cloud Functions — ver [[Tipos compartilhados de cálculo]].

Campos de `PalpiteCalc`:

| Campo | Tipo | Significado |
| --- | --- | --- |
| `id` | string | id do documento |
| `uid` | string | dono do palpite |
| `jogoId` | string | jogo apostado |
| `timeCasa` | string | timeId mandante |
| `timeVisitante` | string | timeId visitante |
| `golsCasa` | number | placar palpitado da casa |
| `golsVisitante` | number | placar palpitado do visitante |
| `classificado` | string \| null | timeId que avança (usado no mata-mata) |

O `classificado` é o time que o participante indica que avança quando seu palpite resulta em empate no mata-mata (pênaltis); é o insumo que alimenta o [[Bracket personalizado do usuário]] e entra no cálculo de [[Pontuação]]. O placar de cada jogo é editado na [[Página Palpites]].

### Coleção `palpites` e regras

- **Leitura** (`firestore.rules:136`): `canReadPalpite(uid, jogoId)` — o dono e o admin sempre leem; os demais participantes leem conforme `config/geral.visibilidadePalpites` (`sempre`, `apos_prazo` quando passou o `prazoLimitePalpites`, ou `apos_jogo` quando o jogo está `encerrado`).
- **Criar/atualizar**: exige ser o dono (`isOwner`), `prazoAberto()`, `isLiberado()` e `isValidPalpite()` (schema com chaves exatas). Ver [[Liberação do participante]] e [[Coleção config]].

## Palpite especial

A entidade `PalpiteEspecial` (`src/types/index.ts:107`) é **chaveada por `uid`** — há no máximo um documento por usuário na coleção `palpites_especiais/{uid}`. Campos (todos `timeId`, exceto `criadoEm`):

- `uid`
- `campeao`
- `vice`
- `terceiro`
- `quarto`
- `paisArtilheiro` — país do artilheiro
- `criadoEm: Timestamp`

Esses palpites são confrontados com `ResultadoEspecial` (ver [[Resultados Especiais]]) e somam à parcela `pontosEspeciais` do ranking — parte do esquema de [[Pontuação]].

### Coleção `palpites_especiais` e regras

- **Leitura** (`firestore.rules:152`): `canReadPalpiteEspecial(uid)` — dono e admin sempre; os demais conforme `visibilidadePalpites` (`sempre` ou `apos_prazo`). Note que, diferente do palpite de jogo, **não há modo `apos_jogo`** aqui.
- **Criar/atualizar**: dono, `prazoAberto()`, `isLiberado()` e `isValidPalpiteEspecial()` (que exige `data.uid == uid`).

## Desempate de terceiros

A entidade `DesempateTerceiros` (`src/types/index.ts:54`) guarda `uid`, `pontosDisciplinares: Record<string, number>` e `criadoEm`. É chaveada por `uid` na coleção `desempates_terceiros/{uid}`. Os pontos disciplinares servem para posicionar os 3os colocados no chaveamento personalizado — ver [[Melhores terceiros]] e [[Alocação de terceiros por slot]], que consomem esse desempate ao montar o [[Bracket personalizado do usuário]].

> [!danger] Leitura PRIVADA — comportamento divergente
> Em `desempates_terceiros` a leitura é **só do dono ou admin** (`firestore.rules:167`: `isOwner(uid) || isAdmin()`). Não segue `visibilidadePalpites`. Isso é diferente de `palpites` e `palpites_especiais`, que podem se tornar **públicos** aos demais participantes conforme a configuração de visibilidade.

### Regras de escrita

- **Criar/atualizar**: dono, `prazoAberto()`, `isLiberado()` e `isValidDesempateTerceiros()`.

## Invariantes de escrita compartilhadas

> [!warning] Palpites não podem ser deletados nem editados após o prazo
> As três coleções têm `allow delete: if false` (`firestore.rules:147`, `:162`, `:177`) — nenhum palpite pode ser apagado, nem pelo dono nem pelo admin. Toda escrita (create e update) exige `prazoAberto()`, isto é, `request.time < config/geral.prazoLimitePalpites`. Passado o prazo, os palpites ficam congelados.

> [!note] Imutabilidade de identidade no update
> No update, as regras impedem trocar `uid`/`jogoId` (jogo) e `uid` (especial e desempate): os campos de identidade do `request.resource.data` precisam bater com os do `resource.data` existente.

## Relacionados

- [[Pontuação]]
- [[Bracket personalizado do usuário]]
- [[Página Palpites]]
- [[Resultados Especiais]]
- [[Tipos compartilhados de cálculo]]
- [[Melhores terceiros]]
- [[Alocação de terceiros por slot]]
- [[Coleções do Firestore]]
- [[Regras de segurança do Firestore]]
- [[Coleção config]]
- [[Liberação do participante]]
- [[Modelo de Dados MOC]]
