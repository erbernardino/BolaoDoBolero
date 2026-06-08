# Relatório Final de Revisão de Código — Bolão do Bolero (Copa 2026)

> Gerado em 2026-06-07 via análise multi-agente (64 agentes, 7 dimensões, verificação adversarial).
> 22 achados confirmados de 56 levantados. Sem achados Critical ou High após verificação.

## 1. Resumo Executivo

O código está em boa saúde geral. O TypeScript compila limpo (`tsc -b` com exit 0), a build de produção passa, a lógica de domínio (pontuação, classificação FIFA, chaveamento) é consistente entre cliente e servidor, listeners do Firestore são corretamente desinscritos e os guards de idempotência do resolvedor de mata-mata são sólidos. Os achados confirmados são, em sua quase totalidade, defeitos de robustez, consistência e manutenibilidade de baixo risco prático — vários itens originalmente classificados como críticos/altos foram rebaixados após confirmação de que o contexto (bolão privado entre amigos, por convite, dezenas de usuários) reduz drasticamente o impacto. Não há perda durável de dados de origem, corrupção irreversível, nem escalonamento de privilégio confirmado.

**Os 3 pontos mais urgentes:**
1. **(Medium) Ranking reescrito de forma não-atômica** (`functions/src/pontuacao.ts:244-261`) — delete e write em batches separados deixam a coleção `ranking` momentaneamente vazia em todo recálculo; correção barata e de alto valor.
2. **(Medium) Cast inseguro de `Config` mascarando bug de exibição de pontos** (`src/pages/PalpitesGeral.tsx:198-201`) — a tela mostra pontos com defaults hardcoded (5/3/1) em vez dos valores configurados pelo admin.
3. **(Medium) Race condition em `PalpitesMataMata`** (`src/pages/PalpitesMataMata.tsx:86-212`) — troca rápida de aba pode exibir transitoriamente jogos da fase anterior por falta de cancellation guard.

## 2. Achados por Severidade

### Critical
Nenhum achado confirmado. Todos os itens propostos como críticos foram rebaixados após verificação adversarial pelo contexto real da aplicação.

### High
Nenhum achado confirmado.

### Medium

**M1 — Reescrita não-atômica do ranking (delete-then-write)** · `functions/src/pontuacao.ts:244-261`
`recalcularTodoRanking()` apaga todos os docs de ranking num batch (commit L251) e grava os novos num batch separado (commit L260). Entre os dois commits a coleção `ranking` fica vazia. Se a função morrer (timeout, OOM, redeploy, rede) entre L251 e L260, o ranking fica vazio até o próximo recálculo. Sob triggers concorrentes, um "last writer" pode vencer com dados stale. Sem try-catch. Ranking é cache reconstruível (não é critical), mas é janela vazia garantida em cada recálculo afetando funcionalidade central.
**Correção:** Combinar delete + set num único batch atômico (muito longe do limite de 500 writes). Envolver em try-catch.

**M2 — Cast inseguro de `Config` mascara bug de exibição de pontos** · `src/pages/PalpitesGeral.tsx:198-201`
`(config as Record<string, number> | null)?.placarExato ?? 5`. A interface `Config` (`src/types/index.ts:3-9`) aninha os pontos em `config.pontos.{...}`, e o admin grava nesse formato (`Configuracoes.tsx:96-117`). Como não há chave top-level `placarExato`, o acesso retorna sempre `undefined` e o `?? 5/3/1` dispara sempre. O cast esconde o erro que o TypeScript apontaria. A aba "Todos" exibe pontos com defaults hardcoded em vez dos configurados. Display-only (o ranking autoritativo vem das CFs), por isso medium.
**Correção:** `config?.pontos?.placarExato ?? 5`, alinhando com `AoVivo.tsx:66`.

**M3 — Race condition em `PalpitesMataMata` sem cancellation guard** · `src/pages/PalpitesMataMata.tsx:86-212`
O efeito (deps `[firebaseUser, fase]`) roda `load()` async com múltiplos awaits sem flag de cancelamento. Trocar de aba (muda `fase` sem remontar — `Palpites.tsx:169`) com `load()` pendente pode fazer resolução tardia sobrescrever estado novo. Único estado fase-dependente é `setJogos`. Impacto: glitch transitório exibindo jogos da fase anterior. Sem perda de dados.
**Correção:** `let cancelled = false;` antes de `load()`, retornar `() => { cancelled = true }`, checar `if (cancelled) return;` após cada await. Padrão já em `useRemoteConfig.ts:17-22`.

### Low

**L1 — Inconsistência `encerrado`: ranking vs classificação/bracket** · `functions/src/pontuacao.ts:152`
`recalcularTodoRanking` filtra só por `resultado != null` sem checar `encerrado`; `calcularClassificacaoGrupo` (`resolverMataMata.ts:65`) exige ambos. Em jogo ao vivo, pontos contam pro ranking mas não pra classificação. Reconcilia ao encerrar; plausivelmente intencional.
**Correção:** Adicionar `&& j.encerrado` ao filtro, ou documentar o placar ao vivo.

**L2 — Recálculo completo do ranking por update de jogo (amplificação)** · `functions/src/index.ts:11-21`
Cada update dispara recálculo completo; cliques sucessivos geram múltiplos recálculos concorrentes (agrava M1). Custo trivial no porte real; idempotente.
**Correção:** Mesma do M1 — único batch delete+set. Debounce só se necessário.

**L3 — Código morto: `processarResultadoJogo` nunca chamado** · `functions/src/pontuacao.ts:64-106`
Função exportada sem call site/import/teste. Estratégia incremental (com N+1) divergente do caminho ativo "recalcular-tudo".
**Correção:** Remover, ou documentar como fallback.

**L4 — Enumeração de telefones em `telefoneJaCadastrado`** · `functions/src/index.ts:44-55`
`onCall` sem `request.auth`, sem rate limit/App Check, retorna booleano de existência (CWE-204/307). Universo pequeno/privado, só booleano, cadastro gated por convite, e a callable não é mais usada pelo frontend.
**Correção:** App Check / checar `request.auth`, ou remover (já não usada).

**L5 — `excluirUsuario` pode orfãnar Auth se `deleteUser` falhar** · `functions/src/index.ts:127-132`
Doc Firestore deletado (batch L125) antes de `deleteUser` (L128); erro != `user-not-found` relançado deixa Auth órfão. Mitigado por backup em `usuarios_excluidos/{uid}` (L118), baixa probabilidade, idempotente.
**Correção:** Checar existência do Auth antes do batch, ou aceitar/documentar o backup.

**L6 — Componentes definidos em render** · `src/pages/admin/ImprimirPalpites.tsx:150, 251, 343`
`ActionBar`, `VisaoPorUsuario`, `VisaoPorJogo`, `Legenda`, `CardJogo` dentro do corpo; ESLint `static-components` falha. Nenhum tem estado próprio — qualidade/lint, não bug.
**Correção:** Extrair para escopo de módulo, passar dados via props.

**L7 — Race condition em `PalpitesGeral` sem cancellation guard** · `src/pages/PalpitesGeral.tsx:41-135`
Mesmo anti-pattern do M3 (deps `[firebaseUser, isAdmin]`). Rota protegida; regras Firestore impõem auth server-side. Pior caso: flash transitório, sem leak.
**Correção:** Mesmo cancellation guard do M3.

**L8 — Sincronização de estado desnecessária via effects** · `src/components/PalpiteInput.tsx:48-59`
Três effects espelham props em estado local; ESLint `set-state-in-effect` falha (L50/54/58). Double-render só quando props mudam (raro). Impacto desprezível.
**Correção:** Consolidar num effect, ou usar reset via prop `key`/estado derivado.

**L9 — Parâmetro não usado `_melhoresTerceirosReais`** · `src/pages/PalpitesMataMata.tsx:37`
Declarado em `resolverTimeReal`, nunca consumido; ESLint `no-unused-vars` falha (projeto não tem `argsIgnorePattern: '^_'`).
**Correção:** Remover da assinatura e das chamadas (L354, L357).

**L10 — Duplicação entre as duas páginas de impressão** · `ImprimirPalpites.tsx` / `ImprimirMeusPalpites.tsx`
Duplicação verbatim de `bgAcerto`, `ESPECIAIS_COLS`, `FASE_LABELS`+`FASES_ORDEM` e o componente `Flag`. (Nota: "FASE_LABELS replicado em 4 arquivos" é falso — `GerenciarJogos`/`VerPalpites` usam labels propositalmente diferentes.)
**Correção:** Extrair para `src/lib/` / `src/components/Flag.tsx`, reusar nas duas telas. Preservar labels distintos.

**L11 — Magic color codes inline** · `src/pages/admin/ImprimirPalpites.tsx` (35+ ocorrências)
Cores HEX hardcoded em inline styles, sem paleta central; 4 cores semânticas repetidas entre `bgAcerto` e legenda exigem sincronização manual. Confinado às páginas de impressão.
**Correção:** `src/lib/theme.ts` com constantes `COLORS` semânticas.

**L12 — Inconsistência de nome: `COLUNAS_ESPECIAIS` vs `ESPECIAIS_COLS`** · 4 arquivos
Mesma estrutura, 4 definições, dois nomes (variante com `icone` em tela, sem em impressão). Type key idêntica.
**Correção:** Nome único exportado, preservando label/ícone por contexto.

**L13 — ESLint: 19 erros, 4 warnings** · vários arquivos
`set-state-in-effect`, `static-components`, `purity` (`Home.tsx:129` `Date.now()` em render), `exhaustive-deps`. Lint NÃO está no CI (workflows rodam só `npm run build`), `tsc -b` limpo, sem bug de runtime — dívida técnica.
**Correção:** Corrigir incrementalmente. Considerar adicionar `npm run lint` ao CI após zerar.

**L14 — `PalpitesGeral` (560 linhas) mistura concerns** · `src/pages/PalpitesGeral.tsx`
Carrega dados, filtra, calcula pontos e renderiza tabelas inline. (Nota: "useEffect com 16 deps" é falso — L135 tem 2 deps.) Manutenibilidade.
**Correção:** Extrair `usePalpitesGeral()`, cálculos pra `src/lib/`, componentes `<FiltrosAbas>`, `<TabelaJogos>`, `<TabelaEspeciais>`.

**L15 — TOCTOU na validação de convite único no cadastro** · `src/pages/Cadastro.tsx:49-96`
Janela entre `validateConvite()` (L50-61) e `createUsuarioAndMarkConvite()` (L64-81): sem transação/lock. Dois cadastros concorrentes no mesmo link único podem ambos passar. Contexto privado por convite e gate `liberado:false` mitigam fortemente.
**Correção:** Cloud Function transacional ou Firestore transaction, ou doc único `convites_usados/{conviteId}`. Auditoria se Auth suceder e Firestore falhar.

## 3. Tabela Resumo por Dimensão

| Dimensão | Analisados | Confirmados | Medium | Low |
|---|---|---|---|---|
| Segurança & Autenticação | 7 | 1 | 0 | 1 |
| Lógica de Negócio | 5 | 2 | 0 | 2 |
| Cloud Functions | 6 | 5 | 1 | 4 |
| React Hooks, Efeitos e Estado | 7 | 5 | 1 | 4 |
| Integridade de Dados & Firestore | 5 | 0 | 0 | 0 |
| Qualidade Frontend / Duplicação | 14 | 8 | 0 | 5 |
| Type Safety & Robustez | 12 | 1 | 1 | 0 |
| **Total** | **56** | **22** | **3** | **16** |

## 4. Pontos Fortes

- **TypeScript limpo:** `tsc -b` exit 0; build de produção passa.
- **Lógica de domínio consistente cliente/servidor:** pontuação não-cumulativa e classificação FIFA com a mesma lógica nos dois lados.
- **Idempotência sólida:** `recalcularTodoRanking` recomputa do zero deterministicamente; guards do resolvedor de mata-mata corretos.
- **Higiene de hooks na maioria dos casos:** listeners desinscritos, cleanups presentes; cancellation pattern aplicado em `useRemoteConfig`/`useAppVersion`.
- **Cloud Functions sensíveis protegidas:** `recalcularRanking`, `definirSenhaUsuario`, `excluirUsuario` checam `request.auth`.
- **Regras Firestore** estruturadas; a diretiva crítica da coleção `config` (só `geral`/`resultado_especial`) está sendo seguida.
- **Backup antes de exclusão:** `excluirUsuario` grava `usuarios_excluidos/{uid}` antes de deletar.

## 5. Plano de Ação Priorizado

**Fase 1 — Impacto funcional (rápido, alto valor):**
1. **M1 + L2:** Unificar delete+set do ranking num único batch atômico com try-catch (`pontuacao.ts:244-261`).
2. **M2:** Trocar cast por `config?.pontos?.placarExato ?? ...` (`PalpitesGeral.tsx:198-201`).
3. **M3 + L7:** Cancellation guard nos efeitos de `PalpitesMataMata` e `PalpitesGeral`.

**Fase 2 — Robustez e segurança:**
4. **L15:** Cadastro com convite transacional + auditoria de Auth órfão.
5. **L4:** App Check / checar auth em `telefoneJaCadastrado`, ou remover.
6. **L1:** Alinhar filtro com `&& j.encerrado` ou documentar placar ao vivo.
7. **L5:** Robustecer `excluirUsuario` ou documentar o backup.

**Fase 3 — Limpeza e manutenibilidade:**
8. **L3:** Remover `processarResultadoJogo`.
9. **L9:** Remover parâmetro `_melhoresTerceirosReais`.
10. **L10/L11/L12:** Extrair `bgAcerto`, `ESPECIAIS_COLS`, `FASES_ORDEM`, `FASE_LABELS`, `Flag`, paleta `COLORS`.
11. **L6/L8/L13:** Zerar erros ESLint. Depois, considerar `npm run lint` no CI.
12. **L14:** Refatorar `PalpitesGeral` em hook + componentes.
