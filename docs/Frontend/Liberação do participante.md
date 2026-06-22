---
title: Liberação do participante
tags:
  - frontend
  - autorizacao
  - guards
status: documentado
related:
  - "[[Rotas e Guards]]"
  - "[[Entidade Usuario]]"
  - "[[Banners de estado]]"
  - "[[Configurações do bolão]]"
---

A **liberação do participante** é o gate de autorização do front controlado pelo flag booleano `usuario.liberado` da [[Entidade Usuario]]. Um participante só é "liberado" depois que o admin confirma manualmente o pagamento (PIX) e marca a flag; até lá ele consegue ver e navegar pelo bolão, mas com conteúdo e edição restritos.

## Estado inicial

No fluxo de cadastro, todo novo usuário nasce **não liberado**: `src/pages/Cadastro.tsx:67-68` cria o documento com `role: 'participante'` e `liberado: false`. A promoção para `liberado: true` é manual (ver [[Gerenciar Usuários e Convites]]).

## As três camadas de enforcement

A liberação é aplicada em três pontos distintos do front. Nenhum substitui o outro — juntos formam a defesa em profundidade.

| Camada | Onde | Efeito para não-liberado |
| --- | --- | --- |
| 1. Rota | `LiberadoRoute` (guard) | Bloqueia páginas inteiras e redireciona para `/` |
| 2. Navegação | [[Navbar]] + `BannerLiberacao` | Oculta links e exibe aviso âmbar |
| 3. Inputs | Páginas de palpite + [[Página Home]] | Desabilita inputs e esconde stats |

### Camada 1 — Guard de rota

O componente `LiberadoRoute` (`src/components/LiberadoRoute.tsx`) envolve as rotas restritas. Sua regra de bloqueio é estrita: `usuario && usuario.liberado !== true` → `<Navigate to="/" replace />` (`src/components/LiberadoRoute.tsx:8`). Ele também trata `loading` e ausência de `firebaseUser` (redireciona para `/login`), reusando o padrão das demais [[Rotas e Guards]] via [[useAuth]].

Em `src/App.tsx` ele protege exatamente duas rotas:

- `/ranking` → [[Página Ranking]] (`src/App.tsx:41`)
- `/todos-palpites` → "Geral" / todos os palpites (`src/App.tsx:44`)

### Camada 2 — Navegação e banner

A [[Navbar]] calcula `liberado = usuario?.liberado === true` (`src/components/Navbar.tsx:14`) e só inclui os links **Geral** e **Ranking** quando liberado (`src/components/Navbar.tsx:19-22`). Os links **Palpites**, **Resultados**, **Regulamento** e **Formato Copa** continuam visíveis para todos.

O `BannerLiberacao` (`src/components/BannerLiberacao.tsx`) é um aviso âmbar fixo no topo. Ele aparece apenas para participantes não liberados — retorna `null` quando não há usuário, quando `usuario.liberado === true` ou quando `usuario.role === 'admin'` (`src/components/BannerLiberacao.tsx:6`). O texto orienta a enviar o comprovante de PIX para o WhatsApp do administrador. Faz parte do conjunto de [[Banners de estado]].

> [!info] Admin nunca vê o banner
> Além de já ser liberado na prática, o admin é explicitamente excluído do `BannerLiberacao` pela checagem de `role === 'admin'`.

### Camada 3 — Inputs desabilitados

As páginas de palpite computam o flag local `naoLiberado = usuario != null && usuario.liberado !== true` e o propagam para `disabled` dos controles:

- [[Página Palpites]] / fase de grupos — `src/pages/PalpitesGrupos.tsx:135` (placar via `PalpiteInput`, `src/pages/PalpitesGrupos.tsx:216`; botões disciplinares `src/pages/PalpitesGrupos.tsx:325` e `:338`).
- Mata-mata — `src/pages/PalpitesMataMata.tsx:248` (botão de avançar/salvar, `src/pages/PalpitesMataMata.tsx:402`).
- [[Resultados Especiais]] / palpites especiais — `src/pages/PalpitesEspeciais.tsx:52` (selects `:129` e `:159`; o `salvar` aborta cedo se `naoLiberado`, `src/pages/PalpitesEspeciais.tsx:65`).

Na [[Página Home]], `liberado = usuario?.liberado === true` (`src/pages/Home.tsx:56`) gateia os cards de stats (Posição / Pontos / Palpites, `src/pages/Home.tsx:136`), o card-link de Ranking (`src/pages/Home.tsx:186`) e o bloco enriquecido.

> [!note] O palpite continua visível
> Fase de grupos, mata-mata e especiais são **navegáveis** para o não-liberado — ele enxerga jogos e estrutura. O que muda é que os inputs ficam desabilitados: dá para olhar, não dá para salvar.

## Liberação x prazo

O `naoLiberado` não é a única trava de edição. Cada página de palpite combina-o com `prazoExpirado`, derivado de `config.prazoLimitePalpites` (ver [[Configurações do bolão]]): por exemplo, `config.prazoLimitePalpites.toDate() < new Date()` em `src/pages/PalpitesGrupos.tsx:136`. Os inputs ficam desabilitados quando **qualquer** condição é verdadeira (`disabled={prazoExpirado || jogo.encerrado || naoLiberado}`).

> [!warning] Prazo e liberação são travas independentes
> Um usuário liberado ainda fica travado se o `prazoLimitePalpites` passou; um usuário dentro do prazo ainda fica travado se não estiver liberado. Não confunda os dois gates ao depurar "não consigo salvar".

> [!danger] Três pontos de enforcement = risco de inconsistência
> A regra de liberação está espalhada por guard de rota (`LiberadoRoute`), [[Navbar]] + `BannerLiberacao`, cada página de palpite e a [[Página Home]]. Mudar a regra de negócio (ex.: liberar uma nova área para não-liberados, ou esconder mais algo) exige tocar **todos** esses lugares de forma coerente. Esquecer um deixa o front inconsistente — link visível para rota bloqueada, input habilitado em página sem guard, etc. Estas checagens são apenas UX/front: a autoridade real é o servidor (ver [[Regras de segurança do Firestore]]).

## Relacionados

- [[Frontend MOC]]
- [[Rotas e Guards]]
- [[Entidade Usuario]]
- [[Banners de estado]]
- [[Configurações do bolão]]
- [[Navbar]]
- [[Página Home]]
- [[Página Palpites]]
- [[Gerenciar Usuários e Convites]]
- [[Regras de segurança do Firestore]]
