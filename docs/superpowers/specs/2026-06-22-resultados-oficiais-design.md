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
4. **Preenchimento de slot no bracket — PROVISÓRIO (revisado em 2026-06-22):** os slots diretos de
   grupo (`1A`, `2A`, ...) são preenchidos com a **classificação atual** (parcial) do grupo: o 1º
   colocado atual vai para `1A`, o 2º atual para `2A`, atualizando conforme os jogos acontecem. O
   estado de cada time preenchido é sinalizado: **classificado** (clinch top-2 garantido) recebe selo
   `✓`; **provisório** (líder atual sem garantia, ou vaga garantida mas posição 1º/2º ainda não
   travada) é exibido **esmaecido**. Quando a posição exata trava (grupo completo ou clinch de
   posição), o time deixa de ser provisório.
   - _Observação:_ esta decisão **substitui** a regra original ("só preenche com posição exata
     garantida"), que na prática deixava o chaveamento vazio durante toda a fase de grupos. Comporta-se
     como brackets reais de torneio durante a fase de grupos.
   - _Limite:_ o preenchimento provisório vale **apenas** para slots diretos de grupo (`1X`/`2X`). Os
     "melhores terceiros" (`3XYZ...`) e as cascatas de mata-mata (`W##`/`RU##`) **não** resolvem cedo
     — permanecem como label até haver dado suficiente (grupos todos completos / resultado do jogo
     anterior).
5. **Classificados no bracket:** além do preenchimento provisório dos slots, cada grupo no modo
   chaveamento exibe a lista de times **já classificados** (badge), reforçando o clinch antecipado na
   visão de chaveamento.
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
- Qualquer alteração na coleção `config` do Firestore (proibido por diretiva).
- Build/deploy de produção.

---

# Adendo (2026-06-22) — Persistência do snapshot de Resultados/Projeções

## Objetivo

Hoje cada visita à página recalcula tudo no navegador (lê todos os jogos, roda `clinch 3^k` por
grupo, monta o bracket). Persistir o resultado computado no Firestore resolve três coisas: (1) visitas
deixam de recalcular; (2) todos os usuários veem o mesmo dado; (3) a página atualiza **ao vivo** quando
um novo resultado entra.

## Princípio

O snapshot é um **cache de dados derivados**, não fonte de verdade — a verdade continua sendo a
coleção `jogos`. O recálculo roda **no servidor, numa Cloud Function** disparada por trigger quando um
resultado é gravado. A lógica de cálculo é **compartilhada** (fonte única em `src/lib`, espelhada para
dentro de `functions/` no build) — **zero duplicação**: a function usa exatamente o mesmo código do
frontend, evitando a classe de divergência clinch/bracket que já causou bugs neste projeto.

> **Revisão (2026-06-22):** a versão inicial deste adendo propunha recálculo no fluxo do admin
> (client-side). O usuário definiu **servidor + trigger + snapshot único compartilhado**. O recálculo
> passou para a Cloud Function; a página apenas lê o snapshot (com fallback de cálculo local).

## Onde armazenar

Documento único **`_system/resultados`** (coleção `_system`, mesmo padrão seguro de
`_system/ranking_meta`). **NUNCA** a coleção `config` (diretiva de segurança do projeto).

## Componentes

### 1. Lib pura — `src/lib/snapshotResultados.ts` (+ testes)

```ts
export interface SnapshotResultados {
  classificacoes: Record<string, ClassificacaoTime[]>            // por letra de grupo
  clinch: Record<string, Record<string, ClinchTime>>            // por letra → por timeId
  bracket: Record<string, { casa: SlotResolvido; visitante: SlotResolvido }>  // por jogoId
  baseadoEm: { jogosEncerrados: number }                        // marcador de staleness
}

export function montarSnapshotResultados(jogos: Jogo[], grupos: GrupoRef[]): SnapshotResultados
```

Reusa `calcularClassificacoesReais`, `calcularClinchGrupo` e `montarResolvedorProvisorio`. Função pura,
serializável (sem `Timestamp`; o `atualizadoEm` é adicionado só na gravação). `baseadoEm.jogosEncerrados`
= contagem de jogos com `encerrado && resultado`.

### 2. Escrita — Cloud Function `functions/src/resultadosProjecoes.ts`

Trigger `onResultadoParaSnapshot` = `onDocumentWritten('jogos/{jogoId}')`: quando o `resultado` ou
`encerrado` de um jogo muda, `recalcularSnapshotResultados()` lê todos os jogos/grupos (admin SDK),
chama `montarSnapshotResultados()` (lib compartilhada) e grava:

```ts
await db.doc('_system/resultados').set({
  ...montarSnapshotResultados(jogos, grupos),
  atualizadoEm: FieldValue.serverTimestamp(),
})
```

Idempotente (recomputa do zero e sobrescreve um único doc) → disparos concorrentes convergem
(last-write-wins); não precisa de lock/debounce. Dispara em `jogos`, nunca em `_system` (evita loop).

**Compartilhamento da lib (sem duplicação):** `functions/copy-shared.mjs` espelha, no `npm run build`
das functions, uma allowlist de `src/lib/*.ts` + `src/types/calc.ts` para `functions/src/_shared/`
(gitignored). A fonte editável é única (`src/lib`); a function importa de `./_shared/lib/...`. O
desacoplamento de `Timestamp` (tipos de cálculo em `src/types/calc.ts`, sem `firebase`) é o que torna
as libs compiláveis no toolchain das functions.

### 3. Leitura (página) — `Resultados.tsx`

- Troca `getDocs` por `onSnapshot` (tempo real) em `jogos` e no doc `_system/resultados`; `times` e
  `grupos` lidos uma vez (não mudam durante a Copa).
- **Snapshot presente e fresco** (`baseadoEm.jogosEncerrados` == contagem real de encerrados): usa
  `classificacoes`/`clinch`/`bracket` do snapshot — **não recalcula**.
- **Snapshot ausente ou stale**: recalcula client-side com as libs (auto-heal). A página nunca quebra.
- O `resolver` consumido por `BracketView`/`PorFaseView` passa a vir do snapshot (uma função que lê
  `bracket[jogo.id]`) quando fresco, ou do `montarResolvedorProvisorio` no fallback. Mesma interface
  `ResolverProvisorio`, então os componentes não mudam.

### 4. Regras Firestore — `firestore.rules`

`_system/resultados`: leitura para autenticados; escrita apenas para admin (`role == 'admin'`). Seguir
o padrão de regras já usado para `_system`/`ranking`.

## Fluxo

```
Admin grava resultado (InserirResultados)
   │  updateDoc(jogos/{id}, {resultado, encerrado})
   │  recarrega jogos
   └─ persistirSnapshotResultados(jogos, grupos)
          montarSnapshotResultados() → setDoc(_system/resultados, {…, atualizadoEm})
                         │
                  onSnapshot (tempo real)
                         ▼
   Resultados.tsx — usa derivados do snapshot (sem recalcular); fallback calcula se ausente/stale
```

## Testes

- **Unitários (Vitest, lib pura):** `snapshotResultados.test.ts` — estrutura do snapshot (chaves por
  grupo, bracket por jogoId, `baseadoEm.jogosEncerrados` correto); consistência com as libs de origem
  para um cenário conhecido.
- **Manual:** gravar um resultado no admin (ambiente teste) e confirmar que `_system/resultados`
  é escrito e que a página atualiza ao vivo, sem recálculo quando o snapshot está fresco; remover o
  doc e confirmar o fallback (auto-heal).

## Fora de escopo (YAGNI)

- Cloud Function / trigger de servidor.
- Recompute fora do fluxo do admin (scripts de manutenção podem deixar o snapshot stale; a página
  detecta via `baseadoEm` e recalcula).
- Migração/seed do doc inicial — a primeira gravação de resultado o cria; até lá, a página usa o
  fallback de cálculo.
