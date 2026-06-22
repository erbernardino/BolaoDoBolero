---
title: Gerenciar Jogos e Times
tags:
  - admin
  - firestore
  - crud
  - copa2026
status: documentado
related:
  - "[[Entidades estáticas]]"
  - "[[Inserir Resultados]]"
  - "[[Resolver mata-mata]]"
  - "[[Admin MOC]]"
---

Tela administrativa que faz o **CRUD direto** das [[Entidades estáticas]] do bolão: as seleções (coleção `times`) e as partidas (coleção `jogos`). São, na prática, duas telas irmãs — `GerenciarTimes.tsx` e `GerenciarJogos.tsx` — que escrevem nas coleções do Firestore sem passar por Cloud Functions, populando a base que alimenta a [[Página Palpites]], o [[Bracket oficial]] e a pontuação.

> [!info] Pré-requisito
> Os times precisam existir e estar com o `grupo` correto **antes** de cadastrar os jogos da fase de grupos: os selects de Time da Casa / Visitante só listam seleções do grupo escolhido (`src/pages/admin/GerenciarJogos.tsx:58`).

## Gerenciar Times

CRUD sobre a coleção `times` via `addDoc` / `updateDoc` / `deleteDoc` (`src/pages/admin/GerenciarTimes.tsx:49`, `:85`, `:63`). Os dados são recarregados por `getDocs` após cada operação.

### Campos do time

| Campo | Tipo / regra |
| --- | --- |
| `nome` | texto livre, obrigatório |
| `sigla` | exatamente 3 caracteres; salvo em uppercase (`sigla.toUpperCase()`) |
| `bandeira` | URL da imagem da bandeira |
| `grupo` | um de A..L (12 grupos) |
| `confederacao` | UEFA, CONMEBOL, CONCACAF, CAF, AFC ou OFC |

As constantes `GRUPOS` (A..L) e `CONFEDERACOES` ficam em `src/pages/admin/GerenciarTimes.tsx:6-7`.

### Validação e exibição

- A única validação client-side é o tamanho da sigla: se `sigla.length !== 3`, dispara `alert` e bloqueia o submit (`src/pages/admin/GerenciarTimes.tsx:44` e `:80` para a edição).
- A lista é renderizada **agrupada por grupo** da Copa, com contador por grupo e um contador global `Total: N / 48` no topo (`src/pages/admin/GerenciarTimes.tsx:111`).
- Remover pede `confirm()` antes do `deleteDoc` (`src/pages/admin/GerenciarTimes.tsx:62`).

> [!warning] Não há unicidade nem limite real
> Não existe validação de **sigla ou nome duplicados**, e o `48` em `Total: N / 48` é apenas meta de exibição — nada impede cadastrar mais de 48 times ou repetir uma seleção. A integridade dos dados depende inteiramente do cuidado do administrador.

## Gerenciar Jogos

CRUD sobre a coleção `jogos` (`addDoc` / `updateDoc` / `deleteDoc`). O carregamento também busca a coleção `times` em paralelo, para popular os selects de seleções e traduzir IDs em nomes (`src/pages/admin/GerenciarJogos.tsx:42-51`). Os jogos são ordenados por `dataHora` antes de exibir.

### Fases

A constante `FASES` define a ordem, e `FASE_LABELS` traduz para o português exibido (`src/pages/admin/GerenciarJogos.tsx:7-16`):

| `Fase` (valor) | Label exibido |
| --- | --- |
| `grupos` | Fase de Grupos |
| `fase32` | Segunda Fase |
| `oitavas` | Oitavas de Final |
| `quartas` | Quartas de Final |
| `semi` | Semifinal |
| `terceiro` | Disputa pelo 3º Lugar |
| `final` | Final |

### Jogo de grupos vs. mata-mata

O formulário se comporta de duas maneiras conforme a fase selecionada:

- **Fase `grupos`** — exige `grupo` + `timeCasa` + `timeVisitante`, com os dois times obrigatórios e **diferentes entre si** (`src/pages/admin/GerenciarJogos.tsx:83-90`). Os selects listam apenas times do grupo escolhido, e trocar o grupo limpa os times já escolhidos.
- **Mata-mata (qualquer fase ≠ `grupos`)** — grava `grupo=null`, `timeCasa=''`, `timeVisitante=''`, `origemCasa=null` e `origemVisitante=null` (`src/pages/admin/GerenciarJogos.tsx:93-103`). Os times são resolvidos depois, não nesta tela.

Todo novo jogo é inicializado com `resultado=null`, `encerrado=false` e `dataHora=Timestamp.fromDate(...)` a partir do `datetime-local`.

> [!danger] Origens do mata-mata ficam nulas na criação pela UI
> Esta tela **não** define `origemCasa` / `origemVisitante` (de onde vêm os classificados/vencedores) — elas são gravadas como `null`. O preenchimento dos confrontos de mata-mata é responsabilidade de outro mecanismo (seed/script ou [[Resolver mata-mata]]), não desta UI. Criar um jogo de mata-mata aqui produz, sozinho, um confronto vazio.

### Edição

A edição permite alterar **fase, grupo, times e data/hora**, com as mesmas regras de validação do cadastro (`src/pages/admin/GerenciarJogos.tsx:148-170`). O `editForm` não inclui `resultado` nem `encerrado`, então o `updateDoc` de edição **não toca nesses campos**.

> [!warning] Editar aqui não recalcula nada
> O `resultado` e o `encerrado` só são alterados pela tela [[Inserir Resultados]], que é o gatilho do recálculo de pontos. Editar um jogo já encerrado por esta tela (mudar times ou horário) **não dispara recálculo de ranking** — pode deixar palpites e pontuação inconsistentes com o jogo editado.

## Relacionados

- [[Entidades estáticas]] — modelo de dados de `times` e `jogos` manipulados aqui
- [[Inserir Resultados]] — tela irmã que altera `resultado`/`encerrado` e dispara a pontuação
- [[Resolver mata-mata]] — preenche times/origens dos confrontos de mata-mata criados vazios
- [[Coleções do Firestore]] — visão geral das coleções escritas por esta tela
- [[Admin MOC]] — índice da área administrativa
