---
title: Especificação e Design
tags:
  - operacao
  - spec
  - modelo-de-dados
  - firestore
status: documentado
related:
  - "[[Visão Geral e Regulamento]]"
  - "[[Coleções do Firestore]]"
  - "[[Divergências conhecidas]]"
  - "[[Operação MOC]]"
---

A **Especificação e Design** é o documento original que define o sistema do Bolão do Bolero: modelo de dados Firestore, fluxos de palpite e mata-mata, visibilidade de palpites e notificações. Fonte: `docs/superpowers/specs/2026-03-31-bolao-do-bolero-design.md`.

> [!info] Sobre a autoridade desta nota
> Esta nota resume a **spec de design**, que descreve a intenção original. Onde o código real diverge da spec, o código vence — essas divergências estão marcadas como callouts e centralizadas em [[Divergências conhecidas]].

## Escopo do produto

Bolão único (não é plataforma multi-bolão) entre amigos para a Copa do Mundo FIFA 2026, com cadastro apenas por convite do administrador. Regras de uso e premiação são tratadas em [[Visão Geral e Regulamento]]. O contexto de torneio está em [[Formato da Copa 2026]].

A stack definida na spec: PWA no frontend, Firebase puro no backend (Auth + Firestore + Hosting + Cloud Functions + FCM), com login por email/senha e telefone via SMS. Ver [[Stack e Ambientes]] e [[Autenticação Login e Cadastro]].

## Modelo de dados (Firestore)

A spec define as coleções abaixo. O detalhamento campo a campo do estado atual está em [[Coleções do Firestore]]; aqui fica o desenho original.

| Coleção | Chave | Propósito |
|---------|-------|-----------|
| `/config` | documento único (`geral`) | pontuação, prazo, visibilidade, regras de premiação — ver [[Coleção config]] |
| `/times/{timeId}` | id do time | nome, sigla, bandeira, grupo, confederação ([[Entidades estáticas]]) |
| `/grupos/{grupoId}` | id do grupo | nome e referências aos times do grupo |
| `/jogos/{jogoId}` | id do jogo | fase, times/origens, dataHora, resultado, encerrado |
| `/palpites/{uid}_{jogoId}` | composta uid+jogo | palpite do usuário ([[Entidades de palpite]]) |
| `/ranking/{uid}` | uid | totais agregados de pontos e acertos ([[Página Ranking]]) |
| `/usuarios/{uid}` | uid | perfil, role, conviteId ([[Entidade Usuario]]) |
| `/convites/{conviteId}` | id do convite | controle de convite usado/não-usado |

> [!danger] `/config` só pode ter `geral` e `resultado_especial`
> A coleção [[Coleção config]] não aceita documentos arbitrários. Em 2026-04-30 a criação de `config/app_version` quebrou a página de palpites em produção. Dados de sistema vão em [[Coleção _system]], não em `config`.

### Entidade Jogo

Campo `fase` na spec: `'grupos' | 'oitavas' | 'quartas' | 'semi' | 'terceiro' | 'final'`. Jogos da fase de grupos têm `grupo`, `timeCasa` e `timeVisitante` diretos; jogos de mata-mata têm `origemCasa`/`origemVisitante` ao invés dos times fixos. O `resultado` é `{ golsCasa, golsVisitante, classificado }` e `encerrado` marca o jogo como apurado.

> [!warning] Spec não inclui `fase32`
> A spec lista as fases começando em `oitavas`, mas o domínio real e o `functions/src/seed-jogos.ts` usam **`fase32`** como primeira fase eliminatória (mata-mata de 32). Trate `fase32` como a fase canônica de entrada no mata-mata. Detalhe em [[Divergências conhecidas]].

### Origem no mata-mata

Os times das fases eliminatórias não são fixos: cada slot tem uma **origem** que aponta de onde o time virá. Dois formatos:

- `{ tipo: 'grupo', grupo: 'A', posicao: 1 }` — classificado de um grupo. A [[Classificação de grupos]] e os [[Melhores terceiros]] resolvem quem ocupa o slot (ver [[Alocação de terceiros por slot]]).
- `{ tipo: 'jogo', jogoId: 'xxx', resultado: 'vencedor' | 'perdedor' }` — vencedor/perdedor de um jogo anterior (usado no terceiro lugar/final).

Essa estrutura de origem é o que permite resolver tanto o [[Bracket oficial]] quanto o [[Bracket personalizado do usuário]]. A diferença entre resolver com dados provisórios e oficiais está em [[Resolução provisória vs oficial]].

## Fluxo de palpites

Todos os palpites (grupos + mata-mata) devem ser registrados **antes do início da Copa**, com data-limite configurável em `/config`. Após o prazo, os palpites ficam travados. O fluxo, conforme a spec:

1. **Fase de grupos:** o usuário palpita o placar de todos os jogos dos 12 grupos na [[Página Palpites]].
2. **Classificação automática:** o sistema calcula a [[Classificação de grupos]] de cada grupo a partir dos palpites do próprio usuário, pelos critérios FIFA (pontos > saldo de gols > gols marcados > confronto direto).
3. **Mata-mata personalizado:** o sistema preenche os times das fases eliminatórias para cada usuário com base na classificação derivada dos seus palpites — o [[Bracket personalizado do usuário]].
4. O usuário palpita cada fase eliminatória; o resultado define os times da fase seguinte (do ponto de vista dele).
5. Repete na ordem `grupos → mata-mata → ... → terceiro lugar → final`. Cada fase depende da anterior.

> [!note] Empate no mata-mata exige indicar quem avança
> O palpite considera o placar final incluindo prorrogação; pênaltis não entram no placar. Se o palpite for empate (ex.: 2x2), o usuário deve indicar o `classificado` (vencedor nos pênaltis) para o sistema montar a fase seguinte corretamente.

> [!tip] Alteração em palpite de grupo recalcula o mata-mata
> Se uma edição muda a classificação do grupo, os times do mata-mata são recalculados automaticamente. Os palpites de placar permanecem, mas o sistema exibe um aviso nos jogos afetados para o usuário revisar e confirmar, já que os times mudaram. Isso conecta com a notificação "times alterados" e com o conceito de [[Clinch de grupo]].

## Pontuação

A spec define pontuação **não cumulativa** (vale o maior acerto), avaliada na ordem placar exato → placar de um time → vencedor/empate.

> [!warning] Valores da spec NÃO batem com o config real
> A spec usa `placarExato=10`, `placarUmTime=5`, `vencedor=3`. O config de produção usa outra estrutura e outros valores: `placarExato: 5`, `colunaCerta: 3`, `totalGols: 1`, `palpiteEspecial: 10`. Para os números e a lógica vigentes, use [[Pontuação]] — não esta seção. Registrado em [[Divergências conhecidas]].

O ranking e desempate seguem: maior soma total > mais placares exatos > mais placares de um time > mais vencedores acertados. Ver [[Página Ranking]] e [[Recálculo de ranking]].

## Visibilidade dos palpites

Configurável pelo admin em `/config` via `visibilidadePalpites`:

| Opção | Comportamento |
|-------|---------------|
| `apos_prazo` | palpites visíveis após o prazo-limite |
| `apos_jogo` | palpites de cada jogo visíveis após o jogo encerrado |
| `sempre` | todos veem todos os palpites a qualquer momento |
| `nunca` | cada usuário só vê os próprios palpites |

> [!note] O usuário sempre vê os próprios palpites
> Independentemente da configuração, cada usuário enxerga os seus palpites. A aplicação dessa regra no acesso a dados pertence às [[Regras de segurança do Firestore]] e a leitura agregada vive em [[Ver Palpites]].

## Notificações (FCM)

Push via Firebase Cloud Messaging com Service Worker na PWA. Eventos previstos pela spec:

| Evento | Disparo |
|--------|---------|
| Lembrete de prazo | X dias/horas antes do prazo-limite (configurável) |
| Palpites incompletos | usuário não preencheu todos os palpites |
| Resultado registrado | admin insere o resultado de um jogo |
| Ranking atualizado | após cálculo de pontos de um jogo encerrado |
| Times alterados | mudança em palpite de grupo afeta jogos do mata-mata |

A implementação real está em [[FCM e notificações]]; o disparo de "ranking atualizado" liga ao [[Trigger onJogoEncerrado]].

## Autenticação e convites

Login por email/senha e telefone via SMS (Firebase Auth). Cadastro apenas por convite:

1. Admin gera o link `app.com/convite/{conviteId}` (ver [[Gerenciar Usuários e Convites]]).
2. O usuário acessa o link e cai na tela de cadastro.
3. O sistema valida que o `conviteId` existe e não foi usado.
4. Marca o convite como usado e vincula ao `uid` do novo usuário.
5. Sem convite válido, não há cadastro.

Roles: **admin** (cadastra jogos, insere resultados, gera convites, configura pontuação/prazo/visibilidade/premiação) e **participante** (palpita e visualiza). Ver [[Autenticação Login e Cadastro]] e [[Rotas e Guards]].

## Outras specs derivadas

A spec original também menciona **gerenciamento de perfil** ([[Gerenciamento de Perfil]]) e **chat global** ([[Chat Global]]) como funcionalidades previstas.

## Relacionados

- [[Visão Geral e Regulamento]] — regras de uso e premiação do bolão
- [[Divergências conhecidas]] — onde código e spec não batem (pontuação, `fase32`)
- [[Coleções do Firestore]] — modelo de dados vigente, campo a campo
- [[Pontuação]] — regra e valores reais de pontos
- [[Formato da Copa 2026]] — estrutura do torneio
- [[Operação MOC]] — mapa da área de Operação
