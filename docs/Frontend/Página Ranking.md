---
title: Página Ranking
tags:
  - frontend
  - ranking
  - leitura
  - visibilidade
status: documentado
related:
  - "[[Recálculo de ranking]]"
  - "[[Pontuação]]"
  - "[[Banners de estado]]"
  - "[[Frontend MOC]]"
---

Conjunto de **telas de leitura** do bolão — classificação geral, palpites de todos, resultados oficiais/bracket e impressão — junto com os **componentes de apresentação puros** que dão suporte à classificação (cards de pódio/antepenúltimo). São telas que apenas *consomem* dados já calculados pelo backend (ver [[Recálculo de ranking]]); nenhuma delas escreve no Firestore.

> [!info] Escopo desta nota
> O foco é a página **Ranking** (`/ranking`) e seus componentes `RankingTable` e `RankingDestaques`. As telas irmãs ([[Página Palpites|PalpitesGeral]] de todos, [[Página Resultados]], [[Impressão de palpites]], [[Banners de estado|BannerLiberacao]]) são descritas em nível de comportamento e linkadas para suas notas próprias.

## Página Ranking (`/ranking`)

Protegida por `LiberadoRoute` (App.tsx:41) — só participantes com `liberado === true` (ou admin) entram. Ver [[Liberação do participante]] e [[Rotas e Guards]].

A página (`src/pages/Ranking.tsx`) faz uma leitura única das coleções `ranking` e `usuarios` em paralelo (Ranking.tsx:134), monta `RankingComUsuario` casando cada usuário com seu doc de ranking (ou um ranking zerado, Ranking.tsx:13) e **ordena no cliente** com a cadeia de desempates abaixo.

### Ordenação e desempates

A ordenação (Ranking.tsx:162) reproduz as regras oficiais do bolão. Os critérios de [[Pontuação]] determinam `pontosTotal`; o restante são os desempates:

| Ordem | Critério | Campo |
| --- | --- | --- |
| 1 | Maior pontuação total | `pontosTotal` |
| 2 | Mais placares exatos | `placaresExatos` |
| 3 | Mais pontos em jogos (sem especiais) | `pontosJogos` |
| 4 | Mais pontos na fase de grupos | `pontosFaseGrupos` |
| 5 | Mais pontos nos jogos do Brasil | `pontosJogosBrasil` |
| 6 | Ordem alfabética | `apelido` ou `nome` |

> [!note] "Atualizado em"
> O carimbo de última atualização vem de `onSnapshot` em `_system/ranking_meta` (Ranking.tsx:42), documento gravado pela Cloud Function a cada recálculo (ver [[Coleção _system]] e [[Recálculo de ranking]]). `serverTimestamp` pode chegar `null` momentaneamente por latency compensation, então o código trata `ts ?? null`.

### Colunas ao vivo de palpites alheios

Quando há jogos com `aoVivo === true`, a `RankingTable` pode exibir colunas extras com o palpite de cada participante para aquele jogo — mas só se a visibilidade configurada permitir. O cálculo de `podeVerAlheios` (Ranking.tsx:83) replica no cliente a lógica de `canReadPalpite` das [[Regras de segurança do Firestore]]:

- `sempre` → mostra;
- `apos_prazo` → mostra se `agoraMs >= prazoLimitePalpites`;
- `apos_jogo` (jogo ao vivo não está encerrado) ou `nunca` → não mostra.

Os jogos ao vivo são ordenados por horário e limitados a **30** (limite do operador `in` do Firestore, Ranking.tsx:99). Uma `liveKey` estável (concatenação dos ids) evita refazer o `getDocs` de palpites a cada gol — placar muda, conjunto de jogos não (Ranking.tsx:109). Config, times e jogos ao vivo são lidos via `onSnapshot` para refletir mudanças em tempo real sem reload.

> [!warning] Espelhamento da visibilidade
> `podeVerAlheios` é uma **réplica cliente** de `canReadPalpite` das [[Regras de segurança do Firestore]]. Se as duas divergirem, o resultado é erro de permissão (cliente tenta ler o que as rules negam) ou vazamento percebido (cliente esconde o que as rules permitiriam). Qualquer mudança na regra de visibilidade tem de ser feita nos **dois** lados em sincronia. A mesma lógica aparece em [[Página Palpites|PalpitesGeral]].

## RankingTable (componente)

`src/components/RankingTable.tsx` — tabela pura: recebe `ranking`, `jogosAoVivo` e `palpitesLive` via props e renderiza. Colunas fixas: `#`, **Participante** (sticky à esquerda), Pontos, Exatos, Coluna, Gols. As colunas ao vivo entram entre `#` e Participante.

A coloração de cada `CelulaPalpite` usa `calcularPontosPalpite` (de [[Pontuação]]) com config unitária — só interessa o **tipo** de acerto, não o valor:

| Tipo | Cor |
| --- | --- |
| `placarExato` | verde |
| `colunaCerta` (vencedor) | amarelo |
| `totalGols` | azul |
| não pontuou | vermelho |

O nome do participante é truncado em 15 caracteres (com `title` no hover mostrando o nome completo) e exibe `Avatar` com `fotoURL`.

## RankingDestaques (componente)

`src/components/RankingDestaques.tsx` — cards de destaque do pódio. Componente de apresentação **puro**: sem Firestore, sem Functions; recebe apenas `ranking` por prop.

- Só renderiza se `ranking.length >= 3` (RankingDestaques.tsx:22) — senão retorna `null`.
- Cards 1º/2º/3º com cores ouro / prata / bronze.
- O **antepenúltimo** (índice `length - 3`, card vermelho) só aparece se `idx > 2`, ou seja, quando ele *não* já está no pódio (RankingDestaques.tsx:26). Em bolões com 3 a 5 participantes o card some para não duplicar uma posição.

## Telas irmãs (mesma família de leitura)

> [!tip] Todas dependem de `liberado`
> `liberado` é o gate central: controla o [[Banners de estado|BannerLiberacao]], os links de [[Navbar]] (Geral/Ranking) e as [[Regras de segurança do Firestore|regras]] de escrita de palpites. Ver [[Liberação do participante]].

- **PalpitesGeral** (`/todos-palpites`, `LiberadoRoute`) — abas por fase + "Todos" + "Especiais"; carrega palpites de todos conforme a visibilidade. Admin, `sempre` ou `apos_prazo`+prazo expirado leem todos de uma vez; `apos_jogo` lê em chunks de 10 por `jogoId` encerrado (limite de `get()` nas rules). Filtros por usuário e por grupo. Detalhe em [[Página Palpites]] e [[Ver Palpites]].
- **Resultados** (`/resultados`, `ProtectedRoute`) — toggle "Chaveamento" ([[Bracket oficial|BracketView]]) vs "Por fase" (PorFaseView); jogos e [[Snapshot de resultados|snapshot]] `_system/resultados` em tempo real via `onSnapshot`. Usa o snapshot persistido se "fresco" (`baseadoEm.jogosEncerrados` bate com a contagem atual), senão recalcula no cliente via `calcularClassificacoesReais`/`montarResolvedorProvisorio`. Detalhe em [[Página Resultados]] e [[Resolução provisória vs oficial]].
- **ImprimirMeusPalpites** (`/imprimir-meus-palpites`, `ProtectedRoute`) — layout de impressão dos próprios palpites por fase + especiais, com cores de acerto (verde=exato, amarelo=vencedor, azul=soma de gols, vermelho=erro) e botões `window.history.back()` / `window.print()`. Detalhe em [[Impressão de palpites]].
- **BannerLiberacao** — retorna `null` se `usuario.liberado === true` ou `role === 'admin'`; senão exibe banner amarelo sticky pedindo o comprovante de PIX para **(11) 97177-0713**. Componente puro. Ver [[Banners de estado]].

> [!warning] Snapshot pode estar defasado
> `Resultados` confia no [[Snapshot de resultados|snapshot]] `_system/resultados` escrito por Cloud Function (ver [[Trigger de snapshot]]). Se ele estiver não-fresco, a tela **recalcula no cliente** — historicamente houve divergência possível entre a tabela e o bracket, ponto de atenção da branch `feat/resultados-oficiais`. Ver [[Divergências conhecidas]].

## Relacionados

- [[Recálculo de ranking]] — backend que alimenta a coleção `ranking` e `_system/ranking_meta`
- [[Pontuação]] — regras de pontos e tipos de acerto usados na coloração
- [[Banners de estado]] — `BannerLiberacao` e demais avisos de estado
- [[Liberação do participante]] — gate `liberado` que protege estas telas
- [[Página Palpites]] · [[Página Resultados]] · [[Impressão de palpites]]
- [[Regras de segurança do Firestore]] · [[Snapshot de resultados]] · [[Coleção _system]]
- [[Frontend MOC]]
