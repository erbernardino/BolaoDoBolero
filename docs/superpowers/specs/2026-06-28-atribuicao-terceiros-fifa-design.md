# Design — Atribuição oficial dos melhores terceiros (Copa 2026)

Data: 2026-06-28 · Branch: `feat/melhorias-bracket-admin`

## Problema

Dois bugs, ambos na determinação/uso dos **8 melhores terceiros** da fase de grupos:

1. **Atribuição do bracket (Round of 32).** `montarTerceirosPorSlot` (`src/lib/chaveamento.ts`)
   e a implementação irmã `montarMapaTerceirosPorSlot` (`functions/src/resolverMataMata.ts`)
   resolvem qual terceiro enfrenta cada 1º colocado via **backtracking guloso pelo ranking**
   (primeira solução viável nas labels de elegibilidade). Isso acha *uma* atribuição válida,
   mas **não a tabela oficial fixa da FIFA**. Para a combinação real da Copa
   (`{B,D,E,F,I,J,K,L}`) produz 4 confrontos errados:
   - App: GER×SWE, FRA×PAR, BEL×ALG, SUI×SEN
   - Oficial: GER×PAR, FRA×SWE, BEL×SEN, SUI×ALG

2. **Marcação de classificados na tabela de grupos.** `calcularClassificadosMataMata`
   (`src/lib/clinchMataMata.ts`) classifica terceiros por **contagem conservadora só de pontos**
   (ignora saldo). Com a fase de grupos **completa**, isso vira falso negativo: SEN (Grupo I,
   3 pts, SG +2) é o 8º melhor terceiro mas não recebe o selo ✓ — só 31/32 classificados.

Confirmado empiricamente que (1) é independente de (2) e dos placares: re-rodando o snapshot com
os placares corretos, as 4 trocas persistem.

## Fonte da verdade

`Template:2026 FIFA World Cup third-place table` (FIFA): 495 combinações publicadas. Colunas dos
vencedores na ordem `1A, 1B, 1D, 1E, 1G, 1I, 1K, 1L`. Âncora validada: combinação `BDEFIJKL`
→ `{A:E, B:J, D:B, E:D, G:I, I:F, K:L, L:K}`, idêntica ao Round of 32 oficial.

## Solução

### Dados
- `src/lib/data/terceirosFifa2026.ts` — tabela gerada (495 entradas), commitada. Chave = combinação
  ordenada dos 8 grupos com 3º classificado; valor = `{ grupoVencedor: grupoTerceiro }`.
- `scripts/gerar-tabela-terceiros-fifa.ts` — gerador reproduzível (parseia o wikitext), com
  validações: 495 entradas, 8/8 por linha, atribuições dentro da combinação e distintas, âncora.

### Correção 1 — atribuição do bracket
- Reescrever `montarTerceirosPorSlot` (`src/lib/chaveamento.ts`): quando os **8** terceiros são
  conhecidos (`melhoresTerceiros.length === 8`), montar a combinação, consultar a tabela e, para
  cada slot de terceiro (`labelVisitante`/`labelCasa` = `3XYZ…`), atribuir o 3º do grupo que a
  tabela mapeia ao **vencedor irmão** (`1X` do outro lado do mesmo jogo). Com menos de 8 terceiros
  definidos (estado provisório), **não resolver** (retorna `null`/label), preservando o
  comportamento atual da página parcial.
- `functions/src/resolverMataMata.ts`: remover `montarMapaTerceirosPorSlot` e reusar o helper
  compartilhado (via `copy-shared.mjs`), eliminando a 2ª implementação divergente.

### Correção 2 — marcação de classificados (clinch)
- Em `clinchMataMata.ts`: quando **todos os grupos estão completos**, determinar os 8 melhores
  terceiros pela ordenação definitiva (`selecionarMelhoresTerceiros`, mesma fonte do bracket) em
  vez da contagem conservadora — SEN passa a ser marcado ✓.
- Simetricamente, terceiros completos fora do top-8 ficam `eliminado` (✕) em vez de neutro.
- A contagem conservadora atual permanece para grupos **incompletos** (sem falso positivo no meio
  do torneio).

## Invariantes / consistência
- O conjunto de 8 terceiros marcados no clinch deve ser **idêntico** ao usado no bracket.
- A atribuição vencedor→terceiro deve bater 16/16 com o Round of 32 oficial para a combinação real.

## Testes (TDD)
- Bracket: combinação `{B,D,E,F,I,J,K,L}` → GER×PAR, FRA×SWE, BEL×SEN, SUI×ALG; ≥2 outras
  combinações do quadro oficial; <8 terceiros → não resolve.
- Clinch: fase completa marca exatamente os 8 terceiros (SEN incluído) e elimina os 4 de fora;
  estado provisório mantém comportamento conservador (regressão).
- Tabela: 495 entradas; toda atribuição dentro da combinação e distinta.

## Verificação
`npm test`, typecheck (app + functions), `npm run build` (app) e `cd functions && npm run build`;
re-rodar o snapshot do teste e conferir R32 16/16 e 32 classificados; revisão adversarial multi-agente.

## Fora de escopo
Classificação de grupos, pontuação, clinch de top-2, labels de elegibilidade (já corretas), UI
além da marcação ✓/✕ que decorre do clinch.
