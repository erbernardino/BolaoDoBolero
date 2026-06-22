---
title: Página Palpites
tags: [frontend, palpites, ui, copa2026]
status: documentado
related:
  - "[[Entidades de palpite]]"
  - "[[Bracket personalizado do usuário]]"
  - "[[Impressão de palpites]]"
  - "[[Frontend MOC]]"
---

A **Página Palpites** (`/palpites`, `src/pages/Palpites.tsx`) é a tela onde o participante registra todos os seus palpites da Copa. Ela funciona como um **orquestrador de abas por fase**: não tem lógica de palpite própria além de barras de progresso e indicadores de status — a captura real acontece nos três subcomponentes que ela renderiza condicionalmente (`PalpitesGrupos`, `PalpitesMataMata`, `PalpitesEspeciais`).

## Estrutura de abas

As abas são definidas pela constante `TABS` (`src/pages/Palpites.tsx:13`), e o estado `tabAtiva` (`useState`) inicia em `'grupos'`:

| Aba (label) | `value` | Render |
| --- | --- | --- |
| Grupos | `grupos` | `<PalpitesGrupos />` |
| Segunda Fase | `fase32` | `<PalpitesMataMata fase="fase32" />` |
| Oitavas | `oitavas` | `<PalpitesMataMata fase="oitavas" />` |
| Quartas | `quartas` | `<PalpitesMataMata fase="quartas" />` |
| Semis | `semi` | `<PalpitesMataMata fase="semi" />` |
| 3o Lugar | `terceiro` | `<PalpitesMataMata fase="terceiro" />` |
| Final | `final` | `<PalpitesMataMata fase="final" />` |
| Especiais | `especiais` | `<PalpitesEspeciais />` |

O render condicional (`src/pages/Palpites.tsx:164`) é direto: `grupos` → `PalpitesGrupos`; `especiais` → `PalpitesEspeciais`; **qualquer outra fase** → `PalpitesMataMata fase={tabAtiva}`. A nomenclatura `fase32` aparece como "Segunda Fase" na UI, mas é a nova fase de 32 seleções do [[Formato da Copa 2026]].

> [!warning] Deep-link para abas não é possível
> `grupos`, `mata-mata` e `especiais` **não têm rota própria** — a aba ativa é `useState` interno. Um link direto para `/palpites` sempre abre na aba Grupos; não há como apontar para uma fase específica via URL. Ver [[Rotas e Guards]].

## Barras de progresso (sticky)

Quando há jogos cadastrados, a página exibe duas barras de progresso fixas no topo (`sticky top-0`):

- **Jogos** — `totalPalpites / totalJogos`. `totalPalpites` vem de um `onSnapshot` em tempo real sobre `palpites where uid == firebaseUser.uid` (`src/pages/Palpites.tsx:49`); `totalJogos` é um `getDocs` único da coleção `jogos`. A barra fica verde a 100%, azul caso contrário.
- **Especiais** — contagem de quantos dos 5 campos (`campeao`, `vice`, `terceiro`, `quarto`, `paisArtilheiro`) estão preenchidos em `palpites_especiais/{uid}`, via `onSnapshot` (`src/pages/Palpites.tsx:61`). Verde a 5/5, âmbar caso contrário.

O `uid` usado nas queries vem do hook [[useAuth]] (`firebaseUser`), e o cabeçalho da página renderiza a [[Navbar]] compartilhada.

Cada aba mostra ainda uma **bolinha de status** calculada por `statusFase` (`src/pages/Palpites.tsx:74`): verde (`completo`), âmbar (`parcial`) ou **vermelha (`vazio`)** — o cálculo usa `jogosPorFase`/`palpitesPorFase` (ou a contagem dos 5 especiais).

> [!tip] Botão Imprimir
> Um botão "Imprimir" no cabeçalho faz `window.open('/imprimir-meus-palpites', '_blank')`, abrindo a tela de [[Impressão de palpites]] em nova aba.

## Subcomponentes

### PalpitesGrupos
`src/pages/PalpitesGrupos.tsx` salva cada palpite em `palpites/{uid}_{jogoId}` via `setDoc`. Quando **todos** os jogos de grupos estão preenchidos, calcula a [[Classificação de grupos]] de cada grupo **apenas a partir dos próprios palpites** (critérios FIFA: pontos, saldo, gols, confronto direto), exibe os [[Melhores terceiros]] em ordem e, em caso de empate FIFA entre 3os, expõe o controle de **desempate disciplinar** persistido em `desempates_terceiros/{uid}`. Ver [[Entidades de palpite]].

### PalpitesMataMata
`src/pages/PalpitesMataMata.tsx` recebe `fase` como prop e resolve os times de cada confronto a partir do [[Bracket personalizado do usuário]] (função `resolverTimeMataMataPersonalizado`), salvando os IDs resolvidos no palpite. Em paralelo, resolve também os **times REAIS** a partir de `jogo.resultado` (`resolverTimeReal`) e os exibe como badge "Real:" no card. Quando o bracket personalizado diverge do palpite salvo (porque o usuário editou uma fase anterior), exibe o alerta **"Os times deste jogo mudaram"** — mas só com o prazo ainda aberto. O contraste entre projeção e oficial é o tema de [[Resolução provisória vs oficial]] e aparece também na [[Página Resultados]].

> [!danger] MataMata depende de TODOS os grupos palpitados
> Se nem todos os 12 grupos da fase de grupos estiverem completos (`Object.keys(classificacoes).length < totalGrupos`), o bracket não pode ser resolvido e a aba exibe o aviso **"Preencha os palpites da fase de grupos primeiro"** (`src/pages/PalpitesMataMata.tsx:343`). Os inputs ficam desabilitados enquanto os times não forem resolvidos (`!timeCasa || !timeVisitante`).

### PalpitesEspeciais
`src/pages/PalpitesEspeciais.tsx` apresenta 5 `select`: campeão, vice, 3o lugar, 4o lugar e país do artilheiro. As **4 colocações** não podem repetir país (cada select filtra os já escolhidos via `timesDisponiveis`); o **país do artilheiro pode repetir** uma das colocações. Cada mudança grava o documento inteiro `palpites_especiais/{uid}` (`setDoc`) mesclando o campo alterado.

## Regras compartilhadas pelos três subcomponentes

Os três respeitam dois bloqueios de input (ver [[Banners de estado]] e [[Liberação do participante]]):

- **`prazoExpirado`** — compara `config.prazoLimitePalpites` com o horário atual. Grupos/MataMata usam `prazoLimitePalpites.toDate() < new Date()`; Especiais usa `Timestamp.now().toMillis() > prazoLimitePalpites.toMillis()` (efeito equivalente). Quando expirado, mostram banner amarelo e desabilitam os campos.
- **`naoLiberado`** — `usuario != null && usuario.liberado !== true`. Participante ainda não liberado pelo admin não consegue salvar palpites.

Adicionalmente, em Grupos/MataMata cada `PalpiteInput` desabilita se `jogo.encerrado` for verdadeiro. A `config` vem da [[Coleção config]] (documento `geral`).

## Componente PalpiteInput

`src/components/PalpiteInput.tsx` é o card reutilizado por Grupos e MataMata: dois inputs de placar, bandeiras/labels dos times, exibição opcional do resultado oficial (`encerrado && resultado`) e do badge de times reais (`realTimeCasa`/`realTimeVisitante`). Quando `ehMataMata` e há empate no placar, mostra o `select` "Quem avança (pênaltis)?" — esse `classificado` só define os times das próximas fases e **não vale pontuação** (ver [[Pontuação]]).

## Relacionados

- [[Entidades de palpite]] — coleções `palpites`, `palpites_especiais`, `desempates_terceiros`
- [[Bracket personalizado do usuário]] — resolução dos confrontos do mata-mata
- [[Impressão de palpites]] — destino do botão Imprimir
- [[Página Resultados]] — visão oficial/projetada equivalente
- [[Classificação de grupos]] · [[Melhores terceiros]] · [[Pontuação]] · [[Liberação do participante]]
- [[Frontend MOC]]
