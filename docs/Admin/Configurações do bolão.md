---
title: Configurações do bolão
tags: [admin, frontend, config, firestore, cloud-functions]
status: documentado
related:
  - "[[Coleção config]]"
  - "[[Pontuação]]"
  - "[[Recálculo de ranking]]"
  - "[[Resolver mata-mata]]"
---

Página administrativa que edita o documento [[Coleção config|`config/geral`]] (pontuação, premiação, prazo de palpites, visibilidade e regras) e expõe as duas ações administrativas pesadas do bolão: **recalcular ranking** e **resolver mata-mata**. Componente em `src/pages/admin/Configuracoes.tsx`.

A página combina dois padrões: gravação direta no Firestore (formulário de configuração) e chamada de Cloud Functions callable (botões de ação pesada).

## Leitura e gravação de `config/geral`

- **Leitura** no mount via `getDoc(doc(db, 'config', 'geral'))` (`src/pages/admin/Configuracoes.tsx:66`). Cada campo cai para um default se ausente (`data.pontos?.placarExato ?? DEFAULTS...`).
- **Gravação** no submit via `setDoc(doc(db, 'config', 'geral'), config)` (`src/pages/admin/Configuracoes.tsx:117`).

> [!warning] `setDoc` sobrescreve o documento inteiro
> A gravação usa `setDoc` **sem `{ merge: true }}`** — o documento `config/geral` é reescrito por completo a cada "Salvar". Qualquer campo que exista no Firestore e não esteja no objeto `config` montado no submit (linhas 95-115) é apagado. Veja a forma do documento em [[Coleção config]].

> [!danger] JAMAIS criar outros documentos na coleção `config`
> A coleção `config` só pode conter `geral` e `resultado_especial`. Criar qualquer outro documento (ex.: `config/app_version`) quebra leituras que dependem da estrutura conhecida e já derrubou a [[Página Palpites]] em produção. Para outros dados de sistema use a [[Coleção _system]]. Detalhes em [[Coleção config]].

## Campos editáveis

### Pontuação
Mapeiam para `config.pontos` e alimentam o cálculo descrito em [[Pontuação]]. Defaults em `src/pages/admin/Configuracoes.tsx:27`:

| Campo | Chave | Default | Significado |
|---|---|---|---|
| Placar Exato | `placarExato` | 5 | Acertou coluna e o resultado exato |
| Coluna Certa | `colunaCerta` | 3 | Acertou vencedor/empate, errou o placar |
| Total de Gols | `totalGols` | 1 | Errou a coluna, acertou o total de gols |
| Palpite Especial | `palpiteEspecial` | 10 | Por acerto em cada palpite especial |

> [!note] Divergência de nomenclatura
> Os labels e a chave do Firestore usam `colunaCerta` e `totalGols`; o regulamento e a engine de [[Pontuação]] costumam falar em "placar de um time" e "vencedor". Confira o mapeamento exato em [[Pontuação]] antes de assumir equivalência.

### Premiação
Mapeiam para `config.premiacao`. Defaults em `src/pages/admin/Configuracoes.tsx:32`:

| Campo | Chave | Default | Unidade |
|---|---|---|---|
| Taxa de Inscrição | `taxaInscricao` | 250 | R$ |
| 1º lugar | `primeiro` | 50 | % |
| 2º lugar | `segundo` | 25 | % |
| 3º lugar | `terceiro` | 10 | % |
| Antepenúltimo | `antepenultimo` | 5 | % |
| Doação | `doacao` | 10 | % |

> [!info] Taxa de inscrição é valor, não percentual
> Diferente dos demais campos de premiação, `taxaInscricao` é um valor em reais (label "Taxa de Inscrição (R$)", `src/pages/admin/Configuracoes.tsx:240`). Os outros cinco campos são percentuais com `min=0 max=100`.

### Prazo, visibilidade e regras
- **Prazo Limite para Palpites** (`prazoLimitePalpites`): input `datetime-local` convertido para `Timestamp` via `datetimeLocalToTimestamp`/`timestampToDatetimeLocal` (`src/pages/admin/Configuracoes.tsx:43`-`53`). Se o campo estiver **vazio no submit**, grava `Timestamp.now()` (`src/pages/admin/Configuracoes.tsx:112`) — ou seja, o prazo passa a ser o instante do save. Esse prazo governa a [[Liberação do participante]] e o fechamento dos palpites.
- **Visibilidade dos Palpites** (`visibilidadePalpites`): `apos_prazo` (default), `apos_jogo`, `sempre` ou `nunca` (`src/pages/admin/Configuracoes.tsx:332`-`335`). Controla quando os palpites alheios aparecem em [[Ver Palpites]].
- **Regras de Premiação** (`regrasPremiacao`): texto livre.

## Ações administrativas pesadas

Ambas usam `getFunctions()` instanciado no nível do módulo, **sem região explícita** (`src/pages/admin/Configuracoes.tsx:7`), e cada uma tem um botão próprio fora do `<form>`.

### Recalcular Ranking
Botão chama o callable `recalcularRanking({})` (`src/pages/admin/Configuracoes.tsx:150`), protegido por `confirm()`. Retorna `{ recalculados }` (nº de jogos processados) exibido na UI. Lógica em [[Recálculo de ranking]].

> [!warning] Operação destrutiva no ranking
> Recalcular **zera e recalcula todo o ranking do zero** a partir dos jogos encerrados. Protegida por `confirm()` no frontend e por `role=admin` no backend. Use após alterar pontos ou corrigir um resultado.

### Resolver Mata-mata
Botão chama o callable `resolverMataMata({})` (`src/pages/admin/Configuracoes.tsx:128`), também com `confirm()`. É **idempotente** — pode rodar várias vezes. Preenche os times dos jogos do mata-mata (1A, 2B, 3º melhor, vencedor do jogo X) a partir dos resultados reais. Lógica em [[Resolver mata-mata]].

Tratamento do retorno `{ ok, motivo?, atualizados?, pendentes?, gruposEncerrados?, gruposTotal? }`:

- `motivo === 'fase_grupos_incompleta'` → aviso `Fase de grupos ainda não terminou (gruposEncerrados/gruposTotal)`.
- `ok === true` → sucesso `atualizados jogo(s) atualizado(s)`, `pendentes ainda dependem de jogos posteriores`.
- caso contrário → erro.

## Relacionados

- [[Coleção config]] — documento `config/geral` lido e gravado aqui
- [[Pontuação]] — campos de pontuação editados nesta página
- [[Liberação do participante]] — governada pelo prazo limite configurado aqui
- [[Recálculo de ranking]] — backend do botão "Recalcular Ranking"
- [[Resolver mata-mata]] — backend do botão "Resolver Mata-mata"
- [[Coleção _system]] — destino correto para dados de sistema fora de `config`
- [[Ver Palpites]] — afetada pela visibilidade configurada
- [[Admin MOC]]
