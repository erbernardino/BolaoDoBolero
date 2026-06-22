---
title: Inserir Resultados
tags: [admin, resultados, ranking, mata-mata, firestore]
status: documentado
related:
  - "[[Trigger onJogoEncerrado]]"
  - "[[Recálculo de ranking]]"
  - "[[Snapshot de resultados]]"
  - "[[Gerenciar Jogos e Times]]"
---

Tela administrativa que **insere e edita os placares oficiais dos jogos**, marca partidas ao vivo e remove resultados. Cada salvamento grava direto no doc `jogos/{id}` e, por consequência, dispara o recálculo de [[Pontuação]] e do ranking via [[Trigger onJogoEncerrado]] — não há botão de recálculo nesta tela. Fonte: `src/pages/admin/InserirResultados.tsx`.

## Como a tela carrega e agrupa os jogos

`carregarDados()` lê em paralelo as coleções `jogos`, `times` e `grupos` (ver [[Coleções do Firestore]]) e ordena os jogos por `dataHora` (`InserirResultados.tsx:58-79`). Os jogos são então separados em três seções (`InserirResultados.tsx:200-202`):

| Seção | Filtro | Significado |
| --- | --- | --- |
| Ao Vivo | `aoVivo === true && !encerrado` | partida em andamento, placar parcial editável |
| Pendentes | `!encerrado && !aoVivo` | ainda não jogada / sem placar final |
| Encerrados | `encerrado` | placar oficial registrado |

> [!note]
> Apesar dos nomes das seções, **todos os cards são renderizados com `editable=true`**, inclusive os "Encerrados" (`InserirResultados.tsx:432`, `:445`, `:458`). Os ramos `!editable` (badge "Encerrado", placar somente-leitura) existem na função `renderJogoCard` mas não são acionados pela árvore atual. Na prática, jogos encerrados continuam editáveis e exibem o botão **Remover Resultado**.

## Salvar resultado

`handleSalvar(jogo)` (`InserirResultados.tsx:146-175`):

1. Exige `golsCasa` e `golsVisitante` preenchidos; senão `alert`.
2. Em mata-mata (`fase !== 'grupos'`) **com empate**, exige `form.classificado` (quem avança nos pênaltis); senão `alert`.
3. Grava em `jogos/{id}`:
   - `resultado = { golsCasa, golsVisitante, classificado }`, onde `classificado` só recebe valor quando `isMataMata && empate` — caso contrário é `null`.
   - Se `!jogo.aoVivo`, também grava `encerrado = true` e `aoVivo = false` (encerra o jogo). Se o jogo estiver ao vivo, salva o placar parcial **sem** encerrar.
4. Recarrega os dados.

> [!info]
> O placar é o dos **90 minutos regulamentares**. Gols na prorrogação e pênaltis não entram no placar — o vencedor de empate no mata-mata é registrado só no campo `classificado`. Esse texto aparece no cabeçalho da tela (`InserirResultados.tsx:416-419`).

## Marcar ao vivo e remover resultado

- `handleToggleAoVivo(jogo)` (`InserirResultados.tsx:188-198`) alterna `aoVivo`. Ao **ativar** sem resultado existente, inicializa `resultado = { golsCasa: 0, golsVisitante: 0, classificado: null }` (placar 0x0).
- `handleRemoverResultado(jogoId)` (`InserirResultados.tsx:177-186`) pede `confirm` e grava `resultado = null` e `encerrado = false`, revertendo o jogo a pendente.

> [!danger] Recálculo automático e race condition
> Salvar **ou** remover resultado escreve em `jogos/{id}`, o que aciona o [[Trigger onJogoEncerrado]] (`onDocumentUpdated jogos/{jogoId}`): se `resultado` **ou** `encerrado` mudou, ele chama `recalcularTodoRanking()` — a mesma função do botão manual `recalcularRanking`. Editar vários resultados em sequência rápida pode disparar recálculos concorrentes — é a [[Race condition de triggers]] já documentada. Detalhes em [[Recálculo de ranking]].

## Resolução dos times do mata-mata (projeção local)

Como os jogos de mata-mata nascem com `origemCasa`/`origemVisitante` (ex.: "1o Grupo A", "Venc. jogo X") em vez de times fixos, a tela calcula uma **projeção** dos times reais a partir dos resultados oficiais já lançados:

- `classReais` recalcula a [[Classificação de grupos]] real chamando `calcularClassificacaoGrupo` sobre palpites sintéticos montados dos resultados encerrados (`InserirResultados.tsx:86-111`).
- `resolverTimeReal(origem, classReais, jogos)` (`InserirResultados.tsx:13-49`) resolve o time:
  - origem `tipo === 'grupo'`: usa a posição na classificação real do grupo.
  - origem `tipo === 'jogo'`: usa o vencedor/perdedor do jogo referenciado (em empate, usa `resultado.classificado`).

> [!warning]
> Essa resolução é uma **projeção local da UI** ([[Resolução provisória vs oficial]]). A **fonte de verdade** dos times de cada jogo é o próprio doc `jogos/{id}`, preenchido pela callable [[Resolver mata-mata]] (`resolverMataMata`, idempotente). A tela só consegue salvar um jogo de mata-mata quando `casaId` e `visitanteId` estão resolvidos — caso contrário o botão **Salvar Resultado** fica desabilitado (`InserirResultados.tsx:375`).

## Backend acionado por (ou ao redor de) esta tela

Escritas feitas aqui, e as callables que a área admin dispara, conversam com estas funções (ver [[Cloud Functions MOC]]):

- **[[Trigger onJogoEncerrado]]** (`onDocumentUpdated jogos/{jogoId}`) — detecta mudança em `resultado` ou `encerrado` e chama `recalcularTodoRanking()`. Recálculo é **automático**, não manual.
- **[[Recálculo de ranking]]** — a callable `recalcularRanking` (`onCall`) valida `role=admin`, chama a mesma `recalcularTodoRanking()` e retorna `{ recalculados }`.
- **[[Resolver mata-mata]]** — `resolverMataMata` (`onCall`) preenche os times dos jogos de mata-mata a partir dos resultados reais; idempotente. É quem materializa o que a tela aqui só projeta.
- **[[Snapshot de resultados]]** — `onResultadoParaSnapshot` (`onDocumentWritten jogos/{jogoId}`) persiste o snapshot de resultados/projeções (feature recente); ver [[Trigger de snapshot]].
- Triggers de [[Auditoria]] (`auditPalpites`, `auditPalpitesEspeciais`, `auditUsuarios`) e a callable `registrarLogin` gravam no `audit_log` — não disparados por esta tela, mas parte do mesmo backend.

> [!tip]
> Outras callables admin (`definirSenhaUsuario`, `excluirUsuario`, além de `recalcularRanking` e `resolverMataMata`) **validam `role=admin` no backend**. A checagem na UI é só conveniência — não confiar apenas nela. Veja [[Regras de segurança do Firestore]] e [[Gerenciar Usuários e Convites]].

## Relacionados

- [[Admin MOC]]
- [[Trigger onJogoEncerrado]]
- [[Recálculo de ranking]]
- [[Resolver mata-mata]]
- [[Snapshot de resultados]]
- [[Pontuação]]
- [[Gerenciar Jogos e Times]]
- [[Classificação de grupos]]
- [[Resolução provisória vs oficial]]
- [[Race condition de triggers]]
- [[Página Resultados]]
