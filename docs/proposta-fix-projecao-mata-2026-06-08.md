# Proposta de Correção — Divergência Visual Palpite-Congelado vs Bracket Ao Vivo (Mata-Mata)

> **Status: PROPOSTA. Nada foi alterado no código.** Todo `codeSketch` é ilustrativo e marcado como NÃO aplicado. Decisão de qual fase executar fica com o usuário.
> Gerado em 2026-06-08 via workflow multi-agente (15 agentes: brief + 4 abordagens + crítica adversarial + síntese).

---

## 1. Contexto e problema

No mata-mata, o documento de palpite grava o **ID do time resolvido no momento do save** (`palpite.timeCasa`, `palpite.timeVisitante`, e `palpite.classificado` para empates). A tela, porém, renderiza o confronto recalculando o bracket **ao vivo** via `resolverTimesDoJogo()` → `resolverTimeMataMataPersonalizado()`. Quando o usuário editou palpites de fases anteriores depois de salvar um jogo de mata-mata, o bracket muda mas o palpite mantém os times antigos, produzindo a contradição reportada: **"Alemanha 5x1 Brasil, mas campeão projetado = Irã"**.

O problema é **puramente visual**. A pontuação está intacta e confirmada (`functions/src/pontuacao.ts:181-200`): o ranking compara somente o placar previsto (`p.golsCasa`/`p.golsVisitante`) vs o placar real (`jogo.resultado`), casando por `jogoId` — os campos de time do palpite **não entram no cálculo**. O **prazo está encerrado**: usuários não podem mais re-salvar. Escala em produção: **51 divergências em 14 de 60 usuários**, concentradas na `fase32`, com cascata para fases seguintes.

---

## 2. Superfícies afetadas

| # | Superfície | Arquivo:linha | Comportamento | Veredito |
|---|---|---|---|---|
| 1 | **Projeção "Campeão/Classificados projetados"** | `PalpitesMataMata.tsx:299-302`, `306-313`, `411-418` | Usa IDs **congelados** | ❌ BUG — fonte do incidente |
| 2 | **Card do confronto** | `PalpitesMataMata.tsx:272-298`, `347-350`, `379-392` | Usa bracket **ao vivo** | ✅ OK (referência) |
| 3a | **Imprimir (Admin)** | `ImprimirPalpites.tsx:196-205` | Fallback `jogo.timeCasa \|\| p?.timeCasa` → congelado | ❌ BUG |
| 3b | **Imprimir (Meus palpites)** | `ImprimirMeusPalpites.tsx:155-156, 177-182` | Mesmo padrão → congelado | ❌ BUG |
| 4 | **Tabela PalpitesGeral** | `PalpitesGeral.tsx:447-457` | Lê `jogo.timeCasa` direto da coleção `jogos` → null/TBD | ⚠️ Em branco (não mostra time errado) |

**Nota crítica (superfície 4):** `PalpitesGeral.tsx` lê a coleção `jogos`, não `palpites`. Não é corrigível trocando a fonte do palpite — exige render do bracket ao vivo na própria tabela. É um fix diferente.

**Alerta amarelo existente** (`PalpitesMataMata.tsx:367-371`): já detecta a divergência. Qualquer correção deve **preservá-lo** (não esconder).

---

## 3. Abordagens consideradas

| Abordagem | correctness | scopeFit | safety | cheapness | **total** | risco/esforço |
|---|---|---|---|---|---|---|
| **1 — Correção mínima de display** | 7,3 | 9,3 | 9,0 | 9,3 | **8,0** | baixo / S |
| 2 — Fonte única (`vencedorPorPlacar`) | 6,0 | 6,0 | 5,0 | 4,0 | **5,2** | médio / M |
| 3 — Modelo estrutural recursivo | 8,0 | 2,5 | 4,0 | 2,5 | **4,1** | médio / L |
| 4 — Reconciliação CF (escrita) | 3,5 | 1,5 | 2,0 | 2,0 | **2,7** | alto / L |

### 3.1 Correção mínima de display (recomendada)
Trocar `vencedorDoPalpite(palpite)` (IDs congelados) por uma função que recebe o `jogo`, chama `resolverTimesDoJogo(jogo)` (o mesmo que o card já usa) e escolhe o vencedor **por lado** conforme o placar congelado. Empate: mapeia o lado salvo; se `classificado` é null → null. ~2 linhas + a chamada em `classificadosDaFase:311`.
**Invariante confirmado no código:** `handleChange` (`223-225`) grava `timeCasa`/`timeVisitante` resolvidos, e o `<select>` de classificado (`PalpiteInput.tsx:199-200`) só oferece os dois times resolvidos ao vivo no save → `palpite.classificado` é sempre `=== timeCasa` ou `=== timeVisitante`. O mapeamento por lado é correto por construção e dissolve os orphans sem código especial.

### 3.2 Fonte única de verdade: helper puro `vencedorPorPlacar`
Extrair helper puro em `src/lib/chaveamento.ts` (testável), usado pela projeção e (proposto) pelas impressões. **Prós:** elimina duplicação tripla, cobre 3 superfícies. **Cons:** impressões não importam as libs hoje → replicar o pipeline por usuário (incl. `desempates_terceiros/{uid}`) é a parte cara; o refator DRY do core não muda resultado funcional (churn de risco). Entra **podado** na Fase 2.

### 3.3 Modelo estrutural recursivo
Remover `timeCasa`/`timeVisitante` do schema, `classificado` vira `classificadoLado`, resolução recursiva ao vivo. **Maior correctness conceitual (8)** mas `displayOnly: false` e **incompatível com os dados da edição atual** — não resolve as 51 divergências. Item de próxima edição. O kernel recursivo-ao-vivo é separável e alcançável display-only sem deletar schema.

### 3.4 Reconciliação via Cloud Function admin (rejeitada na escrita)
Callable só-admin que regrava times. **Rejeitada:** troca uma ficção por outra ("Irã 5x1"), escreve em dados de 14 usuários pós-prazo, esconde o alerta amarelo, não trata classificado órfão nem PalpitesGeral. Só o **dry-run de auditoria** se aproveita.

---

## 4. Recomendação

**Adotar a Abordagem 1 como hotfix AGORA (Fase 1)**, extrair o helper puro da Abordagem 2 e estendê-lo às impressões como **Fase 2 opcional** (sem o refator DRY), e registrar o kernel recursivo-ao-vivo da Abordagem 3 (display-only, **sem** deletar schema) como **Fase 3 futura opcional**. **Rejeitar o caminho de escrita da Abordagem 4**; manter só o dry-run como auditoria.

A Abordagem 1 (8,0) é a resposta proporcional ao risco: problema puramente visual, pontuação intacta, prazo encerrado. ~2 linhas, um arquivo, zero escrita de dados, zero toque em `chaveamento.ts`/testes/regras. **Correta por construção** para a contradição central — a projeção passa a ler exatamente a mesma saída de `resolverTimesDoJogo(jogo)` que o card já renderiza.

---

## 5. Esboço da correção recomendada (Fase 1) — ILUSTRATIVO, NÃO APLICADO

```ts
// === src/pages/PalpitesMataMata.tsx ===

// ANTES (linhas 299-302) — fonte CONGELADA:
function vencedorDoPalpite(palpite: Palpite): string | null {
  if (palpite.golsCasa > palpite.golsVisitante) return palpite.timeCasa
  if (palpite.golsVisitante > palpite.golsCasa) return palpite.timeVisitante
  return palpite.classificado
}

// DEPOIS — lê a MESMA fonte que o card do confronto (resolverTimesDoJogo):
function vencedorDoPalpite(jogo: Jogo, palpite: Palpite): string | null {
  const { casaId, visitanteId } = resolverTimesDoJogo(jogo) // bracket AO VIVO
  if (palpite.golsCasa > palpite.golsVisitante) return casaId
  if (palpite.golsVisitante > palpite.golsCasa) return visitanteId
  // EMPATE → mapeia pelo LADO salvo, nunca pelo ID congelado.
  // INVARIANTE (handleChange:223-225 + PalpiteInput.tsx:199-200):
  // palpite.classificado é sempre === palpite.timeCasa OU palpite.timeVisitante no save.
  if (!palpite.classificado) return null   // empate sem escolha → "indefinido" (honesto)
  return palpite.classificado === palpite.timeCasa ? casaId : visitanteId
}

// classificadosDaFase (306-313): passar o jogo
const classificadosDaFase = todosJogosDaFasePreenchidos
  ? jogos.map((jogo) => {
      const palpite = palpites.get(jogo.id)!
      return {
        jogo,
        vencedorId: vencedorDoPalpite(jogo, palpite), // <-- agora recebe jogo
        placar: `${palpite.golsCasa}x${palpite.golsVisitante}`,
      }
    })
  : []
```

`resolverTimesDoJogo` está em `272`, antes de `306` — sem problema de ordem. O placar exibido continua o congelado do palpite (correto — é a previsão do usuário).

---

## 6. Edge cases e como a recomendação os trata

| Edge case | Gatilho | Tratamento na Fase 1 |
|---|---|---|
| **1/4 — Classificado órfão (empate)** | Bracket muda após save | **Resolvido por construção:** mapeia por lado, devolve time vivo. Nunca exibe órfão |
| **2/6 — Upstream incompleto** | Palpites de grupo faltando | Lado null → "indefinido". Baixo impacto (só monta com fase completa) |
| **3 — Side-swap** | Lados invertem ao vivo | **Limitação residual:** alinha projeção ao card, mas placar congelado é posicional. Raiz exigiria Fase 3 |
| **5 — Empate sem classificado** | Salvou 1x1 sem escolher | Retorna `null` → "indefinido" (decisão travada: não inventar vencedor) |
| **N+1 — Novo desacordo projeção × card do jogo seguinte** | Projeção de N lê ao vivo; card de N+1 resolve vencedor de N via `chaveamento.ts:24-39` (congelado) | ⚠️ **Trade-off consciente:** hoje (ambos congelados) concordam; após o fix podem divergir. Depende da Fase 3 |

**Duas verdades de honestidade:**
1. **"Ao vivo" é limitado.** `resolverTimesDoJogo` só é verdadeiramente ao vivo na fronteira grupos→fase32. De oitavas em diante, lê os times **congelados** do palpite do jogo-pai. A Fase 1 faz a projeção **espelhar fielmente o card** — não torna o bracket correto na cascata.
2. **PalpitesGeral não tem o mesmo fix.** Lê a coleção `jogos`. Em mata-mata mostra TBD/branco (não mostra time errado).

---

## 7. Plano faseado

### Fase 1 — Hotfix visual (RECOMENDADO, agora)
- Redefinir `vencedorDoPalpite` para receber `jogo` e ler `resolverTimesDoJogo`; ajustar `classificadosDaFase:311`; comentário do invariante; 2-3 testes leves.
- **Esforço:** S. **Risco:** baixo. **Display-only.**
- **Não resolve:** Imprimir*, PalpitesGeral, cascata interna, desacordo N+1 (documentar todos).

### Fase 2 — Fonte única + impressões (OPCIONAL)
- Extrair `vencedorPorPlacar` puro em `src/lib/chaveamento.ts` com testes; migrar `ImprimirPalpites.tsx:203-204` e `ImprimirMeusPalpites.tsx:155-156` para o bracket ao vivo por usuário (mesmos insumos da tela, incl. `desempates_terceiros/{uid}`).
- **NÃO entra:** refator DRY de `resolverTimeMataMataPorPalpites`/`resolverPorPalpiteAnterior` (risco sem ganho funcional).
- **Esforço:** M. **Risco:** médio (admin = 60 usuários, memoizar `terceirosPorSlot`). **Display-only.**

### Fase 3 — Modelo sem congelar / auditoria (FUTURO, OPCIONAL)
- **3a (recomendada se feita):** kernel recursivo-ao-vivo display-only — re-resolve o jogo-pai a partir dos grupos, **mantendo os campos** (sem deletar schema). Corrige cascata e desacordo N+1.
- **3b (próxima edição):** troca de schema completa (`classificadoLado`) — greenfield.
- **3c (auditoria):** CF da Abordagem 4 **só em dry-run**, em coleção separada (`_reconciliacao`, nunca `config`).

---

## 8. O que NÃO fazer (e por quê)

1. **NÃO regravar dados dos palpites de 14 usuários (Abordagem 4, escrita).** Pontuação intacta; manter "5x1" trocando Brasil→Irã fabrica outra ficção e esconde o alerta amarelo.
2. **NÃO deletar `timeCasa`/`timeVisitante` do schema agora (3b).** Incompatível com a edição encerrada; o kernel é alcançável sem deletar — deleção é gold-plating.
3. **NÃO fazer o refator DRY do core dentro deste fix.** Não muda resultado funcional — churn de risco em lógica testada.
4. **NÃO esconder o alerta amarelo** (`367-371`) — é a transparência honesta.
5. **NÃO criar documentos na coleção `config`** (regra estrita: só `geral`/`resultado_especial`).
6. **NÃO assumir que "todas as superfícies" foram cobertas pela Fase 1** — Imprimir* e PalpitesGeral seguem incorretos; devem ser follow-ups explícitos.
