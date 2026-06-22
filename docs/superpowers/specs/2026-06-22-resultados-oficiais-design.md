# Design — Página de Resultados Oficiais

**Data:** 2026-06-22
**Branch:** `feat/resultados-oficiais`
**Ambiente:** apenas teste (`npm run dev` / `npm run build`). Sem build/deploy de produção.

## Objetivo

Criar uma página que mostra o andamento **oficial** do torneio (não os palpites): resultados de
todos os jogos já realizados, classificação real dos grupos e o chaveamento oficial do mata-mata.
Quando um time já está **matematicamente classificado por pontos** para a próxima fase, ele já deve
aparecer como classificado — mesmo antes de o grupo terminar.

Esta página é distinta das páginas de palpites existentes (`PalpitesGeral`, `PalpitesMataMata`).
Ela reflete a verdade do torneio, igual ao que `InserirResultados.tsx` (admin) já calcula
internamente, porém em uma visão consolidada para qualquer usuário logado.

## Decisões (alinhadas com o usuário)

1. **Clinch (classificado por pontos):** garantia **matemática antecipada**. Se um time já garantiu
   vaga (top-2 do grupo) matematicamente, aparece como classificado mesmo com jogos do grupo ainda
   por disputar.
2. **Acesso:** qualquer usuário autenticado (`ProtectedRoute`). Resultados oficiais são fato público
   do torneio; não exige `usuario.liberado`.
3. **Visualização:** **dois modos** alternáveis por toggle:
   - **Chaveamento** (bracket visual do mata-mata + tabelas dos grupos);
   - **Por fase** (abas: Grupos · 2ª fase · Oitavas · Quartas · Semis · 3º lugar · Final).
4. **Preenchimento de slot no bracket:** um slot (`1º A`, `2º B`, ...) só é preenchido com um time
   quando a **posição exata** está matematicamente garantida. Garantir apenas top-2 (sem saber se é
   1º ou 2º) **não** preenche o slot.
5. **Classificados no bracket:** além da regra de slot exato, cada grupo no modo chaveamento exibe a
   lista de times **já classificados** (badge), sem afirmar 1º/2º, para que o clinch antecipado
   também apareça na visão de chaveamento.
6. **Melhores terceiros:** o clinch antecipado vale só para 1º/2º (lógica interna ao grupo). Os "8
   melhores terceiros" (comparação entre os 12 grupos) só são resolvidos quando **toda** a fase de
   grupos termina. Sem clinch antecipado para terceiros.

## Arquitetura

### Reúso (sem reinventar)

- **Leitura de dados:** mesmo padrão de `PalpitesGeral.tsx` — `getDocs` de `jogos`, `times`, `grupos`
  e `getDoc` de `config/geral`, com `Map<id, Time>` para lookup O(1).
- **Classificação oficial dos grupos:** reutiliza `calcularClassificacaoGrupo` (`src/lib/classificacao.ts`),
  convertendo cada `Jogo.resultado` oficial em um "palpite real" — exatamente o truque que
  `InserirResultados.tsx:86-110` (`classReais`) já usa.
- **Bracket oficial do mata-mata:** reutiliza `montarResolvedorBracket` (`src/lib/bracketUsuario.ts`)
  alimentado com a classificação **real** dos grupos e com os resultados oficiais convertidos em
  palpites. O campo `Resultado.classificado` (time que avança nos pênaltis) é mapeado para o
  `Palpite.classificado` que o resolvedor já espera, permitindo resolver as cascatas `W74` / `RU101`.

### Lógica nova — única peça realmente nova

Função pura `src/lib/clinchGrupo.ts` (+ testes TDD no padrão de `classificacao.test.ts`).

Responsabilidade: dado o conjunto de jogos de um grupo (encerrados e não encerrados) e os times do
grupo, determinar para cada time seu **status de clinch**.

```ts
export type StatusClinch = 'classificado' | 'posicao_garantida' | 'eliminado' | 'indefinido'

export interface ClinchTime {
  timeId: string
  classificadoTop2: boolean          // garantiu top-2 em todos os cenários
  posicaoExataGarantida: 1 | 2 | null // 1º ou 2º garantido em todos os cenários; senão null
  eliminado: boolean                  // não alcança top-2 em nenhum cenário
}

export function calcularClinchGrupo(
  jogosDoGrupo: Jogo[],
  timesDoGrupo: string[]
): Record<string, ClinchTime>
```

**Algoritmo (força bruta conservadora, zero falsos positivos):**

1. Separar jogos `encerrado === true` (resultado fixo) dos jogos restantes.
2. Enumerar todos os `3^k` cenários dos jogos restantes (cada jogo: vitória casa / empate /
   vitória visitante; `k` = nº de jogos restantes do grupo, máx. 6 → 729 cenários). Saldo de gols
   **não** é enumerado.
3. Para cada cenário, somar pontos de cada time (3/1/0). Os jogos encerrados entram com seus pontos
   reais.
4. Critério **conservador** baseado apenas em pontos (pontos é sempre o 1º critério FIFA; quem fica
   à frente de X tem necessariamente pontos ≥ X):
   - **`classificadoTop2`** ⟺ em **todos** os cenários, `#{times com pontos ≥ pontos_X, exceto X} ≤ 1`.
   - **`posicaoExataGarantida = 1`** ⟺ em todos os cenários, `#{times com pontos ≥ pontos_X, exceto X} = 0`
     (X estritamente à frente de todos).
   - **`posicaoExataGarantida = 2`** ⟺ em todos os cenários, existe exatamente um time estritamente
     à frente de X e nenhum outro com pontos ≥ pontos_X (sem empates em pontos com X) → X é
     seguramente o 2º.
   - **`eliminado`** ⟺ em **nenhum** cenário X alcança top-2.
5. Se o grupo já está completo (todos os jogos encerrados), o resultado deve ser consistente com a
   ordem final de `calcularClassificacaoGrupo` (1º → `posicaoExataGarantida = 1`,
   2º → `posicaoExataGarantida = 2`, 3º/4º → `eliminado`).

**Consequências intencionais (documentar para não serem lidas como bug):**

- **Falsos negativos por desempate:** um time que já clinchou via saldo de gols ou confronto direto
  já decidido só recebe o badge quando os **pontos** isolados resolverem. É conservador de propósito
  — nunca há falso positivo.
- **Posição exata é matematicamente rara antes da última rodada** (em especial "exatamente 2º").
  Por isso o **bracket** se preenche, na maioria dos casos, apenas quando o grupo termina; o efeito
  do clinch antecipado aparece principalmente nos **badges das tabelas de grupo** e na lista de
  "classificados" exibida no topo de cada grupo no modo chaveamento.

### Componentes / arquivos

| Arquivo | Tipo | Responsabilidade |
|---|---|---|
| `src/lib/clinchGrupo.ts` | novo (lib pura) | clinch matemático por grupo |
| `src/lib/__tests__/clinchGrupo.test.ts` | novo (testes) | cenários de clinch (TDD) |
| `src/pages/Resultados.tsx` | novo (página) | carrega dados, calcula classificação/bracket/clinch, alterna modos |
| `src/components/resultados/BracketView.tsx` | novo | modo chaveamento (grupos + árvore do mata-mata) |
| `src/components/resultados/PorFaseView.tsx` | novo | modo por fase (abas + lista de confrontos) |
| `src/components/resultados/GrupoTabela.tsx` | novo | tabela de classificação de um grupo com badges de clinch |
| `src/App.tsx` | editar | adicionar `<Route path="/resultados">` em `ProtectedRoute` |
| `src/components/Navbar.tsx` | editar | adicionar item de menu "Resultados" |

Componentes de exibição de jogo reaproveitam os helpers de `PalpitesGeral` (`sigla`, `bandeiraUrl`)
e o estilo de cards de `AoVivo.tsx`.

## Fluxo de dados

```
jogos + times + grupos (Firestore)
        │
        ├── resultados oficiais → "palpites reais" ──► calcularClassificacaoGrupo() → classReais (por grupo)
        │                                                      │
        │                                                      ├──► montarResolvedorBracket() → resolve slots do mata-mata
        │                                                      │      (com Resultado.classificado p/ pênaltis)
        │                                                      │
        └── jogos do grupo (encerrados + restantes) ──► calcularClinchGrupo() → status por time (badges)
                                                               │
                                          ┌────────────────────┴───────────────────┐
                                   BracketView (chaveamento)              PorFaseView (abas)
```

## Estados de borda

- **Nenhum jogo encerrado:** classificação zerada, nenhum clinch, slots do bracket mostram labels
  (`1º A`, `Vencedor 73`). Página funciona normalmente.
- **Grupo incompleto:** tabela mostra parciais + badges de clinch quando aplicável; slots do bracket
  daquele grupo permanecem como label até a posição exata ser garantida.
- **Fase de grupos completa, mata-mata em andamento:** terceiros resolvidos; bracket preenchido;
  jogos de mata-mata encerrados propagam o vencedor (via `resultado` e `classificado`).
- **Empate em jogo de mata-mata:** `resultado.classificado` indica quem avançou; o resolvedor usa
  esse campo.

## Testes

- **Unitários (Vitest, lib pura):** `clinchGrupo.test.ts` cobrindo:
  - grupo sem jogos (tudo indefinido);
  - clinch de 1º (estritamente à frente em todos os cenários);
  - clinch de top-2 sem posição exata (badge sim, slot não);
  - eliminação;
  - grupo completo consistente com `calcularClassificacaoGrupo`;
  - falso-negativo conservador (time líder por saldo ainda não recebe badge).
- **Verificação manual:** rodar `npm run dev` (ambiente teste), abrir `/resultados`, validar os dois
  modos com os dados atuais do Firestore de teste.

## Fora de escopo (YAGNI)

- Clinch antecipado para melhores terceiros (cross-group).
- Atualização em tempo real (listeners). A página usa `getDocs` pontual, como `PalpitesGeral`.
- Qualquer alteração em coleções do Firestore (especialmente `config`, proibido por diretiva).
- Build/deploy de produção.
