---
title: Resolver mata-mata
tags: [backend, cloud-functions, mata-mata, resultados-oficiais, fifa]
status: documentado
related:
  - "[[Bracket oficial]]"
  - "[[Resolução provisória vs oficial]]"
  - "[[Melhores terceiros]]"
  - "[[Cloud Functions MOC]]"
---

A `resolverMataMata` é uma **Cloud Function callable** de admin que resolve os _labels_ do mata-mata (`1A`, `2B`, `3ABCDF`, `W73`, `RU101`, etc.) para `timeId`s reais a partir dos **resultados oficiais** dos jogos e preenche os jogos do mata-mata cujos times ainda estão vazios. É a peça que materializa o [[Bracket oficial]], em contraste com a [[Resolução provisória vs oficial|resolução provisória]] feita no frontend a partir dos palpites.

> [!info] Fonte
> Todo o comportamento descrito vem de `functions/src/resolverMataMata.ts`. O código é a autoridade máxima.

## O que faz

A partir de uma leitura completa da coleção `jogos`, a função:

1. Calcula a [[Classificação de grupos|classificação final de cada grupo]] pelos critérios FIFA, usando o **resultado real** de cada jogo (não palpites).
2. Seleciona os 8 [[Melhores terceiros]] colocados.
3. Resolve cada _label_ de jogo do mata-mata para um `timeId` real.
4. Preenche, num único batch, os campos `timeCasa`/`timeVisitante` dos jogos do mata-mata que ainda estão vazios.

> [!danger] É callable, não trigger
> `resolverMataMata` é `onCall` (`functions/src/resolverMataMata.ts:270`) — acionada **manualmente pelo admin**, não automaticamente. Isso a diferencia do [[Recálculo de ranking]] e do [[Trigger onJogoEncerrado]], que rodam sozinhos. O preenchimento do bracket oficial só acontece quando o admin dispara a função.

## Autenticação e autorização

- Exige `request.auth?.uid`; sem isso, lança `HttpsError('unauthenticated', ...)` (`functions/src/resolverMataMata.ts:271-272`).
- Lê `usuarios/{uid}` e exige `role === 'admin'`; caso contrário lança `HttpsError('permission-denied', ...)` (`functions/src/resolverMataMata.ts:275-278`). Ver [[Entidade Usuario]].

## Pré-condição: fase de grupos completa

Antes de resolver qualquer coisa, verifica se **todos** os jogos `fase === 'grupos'` estão `encerrado` e com `resultado`. Se faltar algum, retorna sem alterar nada:

```ts
{ ok: false, motivo: 'fase_grupos_incompleta', gruposEncerrados, gruposTotal }
```

(`functions/src/resolverMataMata.ts:284-293`)

## Classificação de grupos (FIFA Article 13)

Para cada grupo, `calcularClassificacaoGrupo` ordena os times replicando o FIFA Article 13:

| Etapa | Critérios | Função |
| --- | --- | --- |
| Geral inicial | Pontos | `calcularClassificacaoGrupo` |
| Desempate (a/b/c) | Head-to-head: pontos → saldo → gols marcados no confronto direto | `resolverEmpate` + `calcularH2H` |
| Desempate (d/e/f) | Gerais: saldo de gols → gols marcados → `timeId` (localeCompare) | `aplicarCriteriosGerais` |

O desempate é recursivo: se um subconjunto continua empatado no H2H, reaplica-se o head-to-head ao subconjunto; só quando o subconjunto é igual ao grupo inteiro empatado caem-se nos critérios gerais (`functions/src/resolverMataMata.ts:122-155`).

> [!warning] Lógica de classificação duplicada
> Esta função **replica** a lógica de classificação que também existe em `src/lib/classificacao.ts` (citada como referência no próprio arquivo, linha 51) e na [[Lógica compartilhada do backend|cópia em _shared/lib]]. São cópias paralelas — há risco real de **divergência** entre elas se uma for alterada sem as outras. Ver [[Divergências conhecidas]] e [[Tipos compartilhados de cálculo]].

## Seleção dos 8 melhores terceiros

Pega o 3º colocado (`cl[2]`) de cada grupo e ordena por `compararTerceiros`: pontos → saldo de gols → gols marcados → grupo (letra) → `timeId`. Os 8 primeiros entram (`functions/src/resolverMataMata.ts:158-164`, `309-314`). Detalhes em [[Melhores terceiros]].

## Resolução de labels

`resolverLabelSimples` normaliza o label (trim, uppercase, remove espaços) e interpreta:

| Padrão | Significado | Resultado |
| --- | --- | --- |
| `^[12][A-L]$` | Posição em grupo (`1A`, `2B`) | `cl[pos-1].timeId` |
| `^3[A-L]$` | 3º de um grupo específico (raro) | `cl[2].timeId` |
| `^(W\|L\|RU)\d+$` | Vencedor / perdedor / runner-up de jogo por número | via `resolverGanhador` / `resolverPerdedor` |

(`functions/src/resolverMataMata.ts:187-214`)

> [!note] Quem ganha no empate
> `resolverGanhador` usa o maior placar; quando `golsCasa === golsVisitante`, recorre a `resultado.classificadoNosPenaltis`. `resolverPerdedor` apenas deriva: é o time que não foi o ganhador (`functions/src/resolverMataMata.ts:174-185`). Esses campos vêm de [[Inserir Resultados]].

### Slots de "3º de conjunto de grupos" (`3ABCDF`)

Labels como `^3[A-L]{2,}$` (ex.: `3ABCDF`) representam "o 3º colocado de algum desses grupos". Esses slots só existem na **fase32** e são atribuídos por `montarMapaTerceirosPorSlot` via **bipartite matching greedy com backtracking**, priorizando a ordem dos `melhoresTerceiros`: para cada slot tenta-se primeiro o terceiro melhor ranqueado entre os grupos permitidos e ainda não usado; se o preenchimento global travar, faz-se backtrack (`functions/src/resolverMataMata.ts:216-266`). Ver [[Alocação de terceiros por slot]].

## Idempotência e escrita

- Só processa jogos `fase !== 'grupos'`.
- Só preenche `timeCasa`/`timeVisitante` que estão **vazios** e cujo label é resolvível; jogos já preenchidos ou com label não resolvível são ignorados.
- Pode rodar várias vezes sem efeito colateral: tudo é gravado num único `batch`, comitado apenas se `atualizados > 0` (`functions/src/resolverMataMata.ts:325-354`).
- Um jogo com label esperado mas sem resolução possível conta como `pendentes`.

Retorno em sucesso:

```ts
{ ok: true, atualizados, pendentes, melhoresTerceirosIds }
```

(`functions/src/resolverMataMata.ts:356-361`). Os jogos preenchidos vivem na coleção `jogos` — ver [[Coleções do Firestore]] e [[Gerenciar Jogos e Times]].

## Relacionados

- [[Bracket oficial]]
- [[Resolução provisória vs oficial]]
- [[Melhores terceiros]]
- [[Alocação de terceiros por slot]]
- [[Classificação de grupos]]
- [[Inserir Resultados]]
- [[Lógica compartilhada do backend]]
- [[Recálculo de ranking]]
- [[Trigger onJogoEncerrado]]
- [[Divergências conhecidas]]
- [[Cloud Functions MOC]]
