---
title: Bracket oficial
tags:
  - dominio
  - resultados
  - mata-mata
  - bracket
status: documentado
related:
  - "[[Bracket personalizado do usuário]]"
  - "[[Resolução provisória vs oficial]]"
  - "[[Snapshot de resultados]]"
  - "[[Resolver mata-mata]]"
---

O **bracket oficial** converte os resultados oficiais dos jogos em "palpites reais" sintéticos e reusa as libs de [[Bracket personalizado do usuário]] para resolver as tabelas de grupo e o chaveamento do mata-mata a partir do que realmente aconteceu. Implementado em `src/lib/resultadosOficiais.ts`, ele alimenta a [[Página Resultados]] e serve de base para a [[Resolução provisória vs oficial]].

## Conversão para palpites reais

A ideia central é tratar o resultado oficial de um jogo exatamente como se fosse um palpite, podendo então reaproveitar toda a lógica de [[Classificação de grupos]] e [[Resolver mata-mata]] sem código novo.

- `jogoParaPalpiteReal(j)` (`src/lib/resultadosOficiais.ts:9`) cria um Palpite sintético: `id: \`real_${j.id}\``, `uid: 'real'`, `jogoId: j.id`, com `golsCasa`/`golsVisitante`/`classificado` copiados de `j.resultado`.
- `jogosParaPalpitesReais(jogos)` (`src/lib/resultadosOficiais.ts:23`) filtra apenas `j.encerrado && j.resultado` e indexa os palpites reais por `jogoId` num `Record<string, Palpite>`.

> [!warning] Non-null assertion em `j.resultado!`
> `jogoParaPalpiteReal` acessa `j.resultado!.golsCasa`, `j.resultado!.golsVisitante` e `j.resultado!.classificado` com o operador `!` (`src/lib/resultadosOficiais.ts:16-18`). A função **pressupõe um jogo encerrado com resultado** — chamá-la para um jogo sem resultado quebra em runtime. Por isso só é chamada após o filtro `j.encerrado && j.resultado` em `jogosParaPalpitesReais` e em `calcularClassificacoesReais`.

## Tabelas: classificação parcial por grupo

`calcularClassificacoesReais(jogos, grupos)` (`src/lib/resultadosOficiais.ts:44`) produz a classificação real **parcial** de cada grupo e alimenta as tabelas exibidas na tela:

- Filtra os jogos da fase `'grupos'` e, para cada grupo, separa os jogos cuja letra bate (`grupo.nome.replace('Grupo ', '')`).
- Converte apenas os jogos encerrados em palpites reais e chama `calcularClassificacaoGrupo` (a mesma lib usada nos palpites dos usuários).
- A chave do `Record` retornado é a **letra** do grupo (ex.: `'A'`).
- Um grupo só entra no mapa se tiver **pelo menos 1 jogo encerrado** (`palpitesReais.length > 0`); grupos sem jogo encerrado ficam ausentes do resultado.

## Bracket: slots de grupo só com grupo completo

`montarResolvedorBracketOficial(jogos, grupos)` (`src/lib/resultadosOficiais.ts:69`) reusa `montarResolvedorBracket` do [[Bracket personalizado do usuário]], passando `palpitesPorJogoId: jogosParaPalpitesReais(jogos)`. O resolvedor preenche os jogos de mata-mata cujas origens são slots de grupo (`1A`, `2B`...) ou vencedores de jogos anteriores.

Pela lógica herdada de `montarResolvedorBracket`, um **slot de grupo só resolve quando todos os jogos daquele grupo estão encerrados** — garantindo que a posição (1º, 2º, melhor terceiro) seja exata e definitiva, nunca uma posição parcial que poderia mudar com os jogos restantes. Veja também [[Melhores terceiros]], [[Alocação de terceiros por slot]] e [[Clinch de grupo]].

## Divergência intencional: parcial (tabela) vs completo (bracket)

> [!danger] Não "consertar" achando que é bug
> Existe uma divergência **proposital** entre as duas saídas, documentada no próprio código (`src/lib/resultadosOficiais.ts:38-42`):
>
> | Saída | Critério de inclusão | Por quê |
> | --- | --- | --- |
> | Tabela de grupo (`calcularClassificacoesReais`) | ≥ 1 jogo encerrado no grupo | Mostrar o andamento parcial é útil ao usuário |
> | Slot de grupo no bracket (`montarResolvedorBracketOficial`) | grupo 100% completo | O slot nunca pode exibir uma posição incerta |
>
> Ou seja, a tabela pode mostrar BRA em 1º com 1 jogo, enquanto o slot `1A` do bracket continua vazio até o grupo A terminar. Isso é intencional para o slot nunca exibir uma posição que ainda pode mudar.

## Cobertura de testes

`src/lib/__tests__/resultadosOficiais.test.ts` cobre os três pontos:

- `jogosParaPalpitesReais` converte só jogos encerrados e mapeia `classificado` (linha 21).
- `calcularClassificacoesReais` gera classificação parcial com 1 jogo encerrado e omite grupo sem jogos encerrados (linhas 35 e 44).
- `montarResolvedorBracketOficial` resolve o slot `1A` quando o grupo A está completo (linha 52).

> [!info] Relação com persistência e ranking
> O bracket oficial é a fonte de verdade em runtime; a persistência do resultado consolidado é tratada pelo [[Snapshot de resultados]] e pela [[Trigger de snapshot]], enquanto a pontuação dos usuários contra esses resultados passa por [[Pontuação]] e [[Recálculo de ranking]].

## Relacionados

- [[Bracket personalizado do usuário]] — libs reusadas (`montarResolvedorBracket`, `calcularClassificacaoGrupo`)
- [[Resolução provisória vs oficial]] — como provisório e oficial coexistem
- [[Snapshot de resultados]] — persistência do resultado consolidado
- [[Resolver mata-mata]] — resolução de slots e vencedores no chaveamento
- [[Classificação de grupos]] · [[Melhores terceiros]] · [[Clinch de grupo]]
- [[Página Resultados]] — consumidor na UI
- [[Domínio MOC]]
