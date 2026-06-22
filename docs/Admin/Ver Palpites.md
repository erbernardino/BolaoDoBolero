---
title: Ver Palpites
tags:
  - admin
  - palpites
  - frontend
status: documentado
related:
  - "[[Impressão de palpites]]"
  - "[[Entidades de palpite]]"
  - "[[Resultados Especiais]]"
  - "[[Admin MOC]]"
---

Tela administrativa (somente leitura) que monta uma tabela com os palpites de **todos** os participantes, organizada por fase e por jogo, colorindo cada célula conforme o tipo de acerto. Possui ainda uma aba dedicada aos palpites especiais (campeão, vice etc.). Implementada em `src/pages/admin/VerPalpites.tsx`.

## O que carrega

No `load()` inicial (`src/pages/admin/VerPalpites.tsx:42-49`), a tela faz seis leituras em paralelo, todas read-only:

- collection `jogos` — ordenada por `dataHora` crescente
- collection `times` — mapa `id -> Time` para siglas, nomes e bandeiras
- collection `palpites` — palpites de placar (ver [[Entidades de palpite]])
- collection `usuarios` — para apelido/nome do participante (ver [[Entidade Usuario]])
- collection `palpites_especiais` — um doc por uid
- doc `config/resultado_especial` — o gabarito dos especiais (ver [[Resultados Especiais]] e [[Coleção config]])

> [!info] Esta página não escreve nada no Firestore. É um painel de consulta dentro de [[Rotas e Guards]] / [[Admin MOC]].

## Filtros

A barra de filtros combina três controles:

- **Fase** (`FASES`): `todos`, `grupos`, `fase32` (rotulada "Segunda Fase"), `oitavas`, `quartas`, `semi`, `terceiro` ("3o Lugar"), `final` e `especiais`. O default é `grupos`.
- **Grupo**: select visível apenas quando a fase ativa é `grupos`; opções derivadas dos jogos de grupos existentes.
- **Participante**: campo de texto que filtra por `apelido` ou `nome` (case-insensitive).

Trocar de fase reseta o filtro de grupo (`setGrupoFiltro('')`).

## Matriz jogo × participante

O componente monta um mapa `jogoId -> uid -> Palpite` (`palpiteMap`, linha 126) e renderiza uma linha por participante e uma coluna por jogo. Cada coluna de cabeçalho mostra o número do jogo (`jogo.numero`), as duas seleções (bandeira + nome, ou "A definir") e, se o jogo está encerrado, o placar real em verde.

Na visão `todos`, uma linha extra de cabeçalho agrupa as colunas por fase via `faseSpans` (colspans). Quando não há palpite para o cruzamento, a célula mostra `-`.

### Cores por tipo de acerto

Para cada célula de jogo encerrado, o código compara o palpite com `jogo.resultado` (`src/pages/admin/VerPalpites.tsx:357-373`):

| Cor | Critério | Legenda |
| --- | --- | --- |
| Verde (`bg-green-50` negrito) | `golsCasa` e `golsVisitante` exatos | "Placar exato (5 pts)" |
| Amarelo (`bg-yellow-50`) | mesmo vencedor/empate (`Math.sign` do saldo) | "Coluna certa (3 pts)" |
| Azul (`bg-blue-50`) | soma de gols igual à real | "Total de gols certo (1 pt)" |
| Vermelho (`text-red-400`) | nenhum dos acima | "Errou (0 pts)" |

A classificação é exclusiva e em cascata (exato > coluna > total de gols), espelhando a lógica não cumulativa de [[Pontuação]]. A legenda só aparece quando há ao menos um jogo encerrado na fase filtrada.

> [!warning] Pontos hardcoded na UI
> Os valores **5 / 3 / 1** exibidos nos comentários do código e na legenda são literais cravados no componente. Eles **não leem** os valores configuráveis de `config/geral` (`placarExato` default 5, `colunaCerta` 3, `totalGols` 1 — ver [[Configurações do bolão]] e [[Pontuação]]). Se o admin alterar a pontuação na configuração, as cores ainda correspondem aos tipos de acerto, mas os números da legenda podem divergir da pontuação real aplicada pelas [[Cloud Functions MOC]].

## Aba Especiais

Com a fase `especiais` ativa, renderiza uma tabela separada com uma coluna por palpite especial: campeão 🏆, vice 🥈, 3º lugar 🥉, 4º lugar e país artilheiro ⚽ (`COLUNAS_ESPECIAIS`, linha 19). Cada célula compara a seleção do participante com `config/resultado_especial` via `timeAcerta()`:

- `paisArtilheiro` acerta se o time está em `resultadoEspecial.paisesArtilheiros` (array — admite múltiplos).
- Demais colunas acertam por igualdade direta (`resultadoEspecial[coluna] === timeId`).

Acerto fica verde/negrito; havendo gabarito carregado mas sem acerto, fica vermelho-claro; sem gabarito ainda definido, fica neutro. Detalhes do gabarito em [[Resultados Especiais]].

## Imprimir PDF

O botão "Imprimir PDF" no topo apenas navega para `/admin/imprimir-palpites` (`src/pages/admin/VerPalpites.tsx:178`), a tela de [[Impressão de palpites]], que gera o layout otimizado para impressão dos mesmos dados.

## Relacionados

- [[Impressão de palpites]] — destino do botão Imprimir PDF
- [[Entidades de palpite]] — estrutura dos palpites de placar e especiais
- [[Resultados Especiais]] — gabarito `config/resultado_especial` usado na aba Especiais
- [[Pontuação]] — regra de acerto que as cores representam
- [[Configurações do bolão]] — onde vivem os pontos configuráveis que a legenda não lê
- [[Admin MOC]]
