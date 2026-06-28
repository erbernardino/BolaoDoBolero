# Comparação /admin/resultados (teste) × resultados oficiais FIFA — 2026-06-28

Fonte do app: Firestore `bolao-do-bolero-teste`, coleção `jogos` (campo `resultado`).
Fonte oficial: Wikipedia por grupo + ESPN/FIFA/FOX/Yahoo (2ª fonte para divergências).

## Cobertura
- 72/72 jogos da **fase de grupos** lançados e encerrados no teste.
- **Nenhum** jogo de mata-mata (fase32/oitavas/…) tem resultado lançado ainda.

## Resultado
- **70 de 72 jogos batem exatamente** com o placar oficial.
- **2 divergências** (placar digitado errado no teste):

| Jogo | Grupo | Confronto | Teste | Oficial FIFA | Erro |
|------|-------|-----------|-------|--------------|------|
| #42 | I | França × Iraque | 1-0 | **3-0** | faltam 2 gols da França (Mbappé x2, Dembélé) |
| #52 | B | Bósnia × Catar | 3-0 | **3-1** | falta 1 gol do Catar (Al-Haydos 42') |

## Impacto na classificação / bracket
- **#42 (França 3-0 Iraque):** França termina o Grupo I em 1º com 9 pts de qualquer forma.
  O erro só subestima o saldo de gols da França (mostra +6, oficial +8). **Não muda quem classifica.**
- **#52 (Bósnia 3-1 Catar):** SUI (1º) e CAN (2º) não mudam. Mas afeta o 3º colocado:
  - Bósnia: saldo correto **-1** (o teste calcula **0**); gols sofridos -1.
  - Catar: gols pró corretos **2** (teste mostra **1**).
  - Como o saldo da Bósnia entra na disputa dos **8 melhores terceiros**, este erro **pode alterar**
    o corte de classificados ao mata-mata. Recomendado revisar após corrigir.

## Ação sugerida
Corrigir no /admin/resultados: #42 → França 3-0, #52 → Bósnia 3-1.
A Cloud Function `onResultadoParaSnapshot` recalcula o snapshot automaticamente.

---

# PARTE 2 — Classificação final fase 1 e 2ª fase (página /resultados)

## Classificação final dos grupos (posições)
- **Todas as 12 posições de cabeça de grupo e vice batem com o oficial.** Nenhuma posição muda.
- Apenas 2 células com número de gols errado, reflexo dos erros #42 e #52:
  - Grupo I: França aparece **+6 (8-2)**; oficial é **+8 (10-2)**.
  - Grupo B: Bósnia aparece **5-5 (SG 0)**; oficial é **5-6 (SG -1)**.
- Os 8 melhores terceiros do app (SWE, PAR, ECU, COD, BIH, ALG, SEN, GHA) são **os mesmos do oficial**.
  Os erros de placar NÃO mudam quem classifica (BIH tem 4 pts e passa independente do saldo).

## 2ª Fase (Round of 32) — 12/16 corretos, **4 ERRADOS**
Bug na atribuição "melhores terceiros → primeiros colocados" (independente dos erros de placar).

| Confronto no app | Confronto OFICIAL FIFA | Status |
|------------------|------------------------|--------|
| GER × **SWE** | GER × **PAR** | ❌ errado |
| FRA × **PAR** | FRA × **SWE** | ❌ errado |
| BEL × **ALG** | BEL × **SEN** | ❌ errado |
| SUI × **SEN** | SUI × **ALG** | ❌ errado |
| MEX × ECU, ENG × COD, USA × BIH, COL × GHA | idem | ✅ |
| + os 8 confrontos sem terceiros (RSA×CAN, BRA×JPN, NED×MAR, CIV×NOR, POR×CRO, ESP×AUT, ARG×CPV, AUS×EGY) | idem | ✅ |

Mapa terceiro→1º (combinação de grupos com 3º classificado = B,D,E,F,I,J,K,L):
- Oficial: 1A→3E, 1B→3J, 1D→3B, 1E→3D, 1G→3I, 1I→3F, 1K→3L, 1L→3K
- App:     1A→3E, 1B→**3I**, 1D→3B, 1E→**3F**, 1G→**3J**, 1I→**3D**, 1K→3L, 1L→3K
- Trocas erradas: **1E↔1I** (3D/3F invertidos) e **1B↔1G** (3J/3I invertidos).

Causa provável: tabela de combinações dos 8 melhores terceiros (FIFA) implementada com 4 entradas
trocadas para esta combinação. Verificar em `src/lib` (chaveamento/atribuição de terceiros).

## PROVA: bug do bracket é INDEPENDENTE dos erros de placar
Rodei `montarSnapshotResultados` com os dados atuais e com #42/#52 corrigidos.
**O Round of 32 sai idêntico** — as 4 trocas (GER×SWE, FRA×PAR, BEL×ALG, SUI×SEN) persistem.
→ Corrigir os placares **não** conserta a 2ª fase. São dois problemas separados.

## Causa raiz do bracket
- As *labels* de elegibilidade (`labelVisitante` dos jogos fase32) estão **corretas**:
  a atribuição oficial é viável sob elas (1A→3E, 1B→3J, 1D→3B, 1E→3D, 1G→3I, 1I→3F, 1K→3L, 1L→3K).
- O bug está na **estratégia de resolução** em `montarTerceirosPorSlot` (`src/lib/chaveamento.ts:115`):
  ela faz backtracking "guloso pelo ranking dos melhores terceiros + primeira solução viável",
  achando *uma* combinação válida — mas **não a tabela oficial fixa da FIFA** para a combinação
  de grupos classificados {B,D,E,F,I,J,K,L}. O correto é um lookup determinístico
  (combinação dos 8 grupos → atribuição predeterminada), como a FIFA publica.

## Resumo executivo
1. **Fase 1 (placares):** 70/72 corretos. 2 erros de digitação (#42 França 3-0, #52 Bósnia 3-1).
   Não alteram nenhuma posição nem quem classifica — só o saldo exibido de França e Bósnia.
2. **Fase 2 (chaveamento):** 12/16 corretos. 4 errados por bug de atribuição de terceiros
   (independente dos placares). Correto: GER×PAR, FRA×SWE, BEL×SEN, SUI×ALG.
