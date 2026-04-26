# 2026-04-26 — Resumo do dia

Documento gerado ao final da sessão. Reúne tudo que foi implementado, as decisões tomadas e o que ficou pendente.

## Escopo

12 PRs (#14 a #25) mergeados em `main`, todos deployados em **prod** (`bolao-do-bolero`) e **teste** (`bolao-do-bolero-teste`) via GitHub Actions.

Branches `dev` e `main` em sync no SHA `fad3e7d`.

## PRs mergeados hoje

| PR | Título | Área |
|---|---|---|
| #14 | Promoção para produção: segurança, ranking idempotente, callable de menções e mata-mata | Segurança / Backend |
| #15 | Performance — corrige O(N*M) no recalc do ranking e N+1 em PalpitesGeral | Performance |
| #16 | UI alinhada com a rule do Firestore (`=== true`) | Bugfix |
| #17 | Foto de perfil com upload, crop, resize | Feature |
| #18 | Invalidação de cache + resgate de Home/AdminDashboard do stash | Infra / Feature |
| #19 | Tombstone do `firebase-messaging-sw` | Bugfix |
| #20 | Analytics, Performance, Remote Config, Audit Log + alertas | Observabilidade |
| #21 | Painel admin de auditoria + resolução do mata-mata | Feature |
| #22 | Resgate cirúrgico do stash (UX resultados, ver palpites, vínculo telefone) | Feature |
| #23 | Registra login com IP + user-agent + método | Auditoria |
| #24 | Ordem FIFA correta — head-to-head antes de saldo geral | Bugfix |
| #25 | Paginação em palpites pendentes (5 + mostrar mais) | UX |

## Por área

### 🔒 Segurança (firestore.rules)

- Schema validado em `palpites` e `palpites_especiais`.
- Bloqueado auto-promoção: participante não muda `role`, `liberado`, `uid`, `conviteId`.
- Cadastro novo entra com `liberado: false` obrigatório.
- Visibilidade real respeitada na leitura (`sempre` / `apos_prazo` / `apos_jogo` / próprio / admin).
- `notificacoes_usuario` removido (sistema de notificações descontinuado, ver abaixo).
- `audit_log/{logId}`: leitura só admin, escrita só via Admin SDK.
- `fotoURL` permitido em update/create do próprio usuário.

### 🏃 Performance

- **Recalc do ranking**: pré-agrupa palpites em `Map<jogoId, palpites[]>` antes do loop. O(N×M) → O(N+M). Em copa cheia, ~540k operações viraram ~5k.
- **PalpitesGeral em modo `apos_jogo`**: troca for-await sequencial por `Promise.all` com `where('jogoId', 'in', chunk)` em lotes de 10. 104 queries sequenciais → ~11 queries em paralelo. Chunk reduzido de 30 para 10 por causa do limite cumulativo de `get()` em rules (20 por query).
- **Home**: `getCountFromServer + where('uid')` no lugar de varrer todos os palpites — corrige permission-denied futuro e reduz tráfego.

### 🎨 UX / Features novas

- **Foto de perfil**: upload com crop circular (`react-easy-crop`), redimensiona para JPEG 512×512 q=0.85 (~30-60 KB), sobe pra Storage (`fotos_perfil/{uid}/{timestamp}.jpg`). Cada upload preserva os anteriores. Avatar reusable em Navbar, Ranking, Geral, Admin/Usuários, Perfil. Placeholder colorido estável por `uid` quando não tem foto.
- **Home enriquecida**: contagem regressiva pra Copa, AoVivo, posição no ranking, pontos atuais, palpites preenchidos, próximos jogos. Resgatado do stash. Atrás da flag `feature_home_enriched`.
- **Admin Dashboard**: `/admin/dashboard` (default do menu admin). Totais, jogos, palpites pendentes com barra de progresso (paginação 5 + "mostrar mais"), aguardando pagamento.
- **Auditoria** `/admin/auditoria`: lista os últimos 100 eventos do `audit_log` com filtros por tipo e usuário, diff antes/depois, IP/UA/método nos eventos de login.
- **Sticky bar de progresso** em `/palpites` (mobile + desktop).
- **Página Formato da Copa**: link para regulamento FIFA 2026 (PDF local em `/FWC2026_regulations_EN.pdf`) + critérios oficiais do Anexo C corrigidos.
- **InserirResultados**: botões `+/-` nos inputs de gols.
- **VerPalpites admin**: aba "Segunda Fase" (fase32), agrupamento por fase, cores de palpite alinhadas com regulamento (verde 5pts, amarelo 3pts, azul 1pt, vermelho 0pt).

### 🐛 Bugfixes importantes

- **`liberado` check incoerente**: UI usava `!== false` (tratava campo ausente como liberado), rule usava `== true` (estrita). Painel admin mostrava "Liberado" para usuários que o backend bloqueava no save de palpite. Alinhado tudo em `=== true`. 3 usuários com campo ausente em prod backfilled manualmente.
- **`config/app_version` quebrava `getDocs(collection 'config'))`**: ao criar o doc, código antigo de `PalpitesGrupos`/`PalpitesMataMata` que assumia 1 doc na coleção pegava `app_version` (sem `prazoLimitePalpites`) → `.toDate()` em undefined → tela quebrava. Corrigido para `getDoc(doc(db, 'config', 'geral'))` direto.
- **Cache-control errado**: `/` servia com `max-age=3600` (default Firebase Hosting). Corrigido para `no-cache, max-age=0, must-revalidate` em `/`, `/index.html`, `**/*.html`, `/version.json`, `/firebase-messaging-sw.js`.
- **Service worker FCM legado**: navegadores que tinham PWA antigo continuavam com `firebase-messaging-sw.js` registrado. Substituído por **tombstone** que se desregistra (`self.registration.unregister()`) e recarrega abas (`client.navigate(client.url)`) no `activate`. Resolve sozinho na próxima atualização do SW pelo navegador.
- **FIFA Article 13 — ordem invertida**: bolão aplicava saldo geral antes do head-to-head; FIFA manda h2h primeiro. Refatorado `src/lib/classificacao.ts` (e `functions/src/resolverMataMata.ts`) com Step 1 (h2h a/b/c) → Step 2 (geral d/e/f) → fallback determinístico. Suporta a recursão do Article 13.
- **Empate determinístico em 3ºs colocados**: caso real (Paraguai × Panamá com mesmos critérios) deixava tabela e Segunda Fase divergindo. `compararTerceirosFifa` ganhou desempate por letra do grupo após disciplina.

### 🗑️ Removido

- **Sistema de notificações in-app**: sino na navbar, hook `useNotificacoesInApp`, callables `notificarMencoesChat` e `enviarNotificacao`, triggers `notificarResultadoRegistrado` e `notificarRankingAtualizado`, coleção `notificacoes_usuario` (preservada em prod, mas regras removidas e clientes não acessam mais).
- **Service Worker FCM legado**: gerador no `vite.config.ts` removido. Substituído pelo tombstone.
- **PWA install** (já tinha sido removido em sessão anterior, mas restos foram limpos).

### 🔄 Migrações / Dados

- **3 usuários backfilled em prod** com `liberado: true`: Mussa (cyro@soldani.com.br), Mussa (cyrosoldani@hotmail.com), Tuga (cacavivi@uol.com.br) — cadastrados antes de o campo `liberado` ser obrigatório.
- **Time `RD Congo` renomeado para `RD do Congo`** em prod e teste (alinha com nome oficial da FIFA).
- **Coleção `config/app_version`** criada em teste, depois deletada para evitar bug do `toDate()`. **Não criada em prod** (decisão consciente — listener Firestore espera por ela mas falha silenciosa; polling cobre).
- **Backups manuais** em GCS export + dump JSON local foram disparados antes de operações críticas.

### 📊 Observabilidade

- **Firebase Analytics (GA4)** inicializado. `useAnalyticsTracking` loga `page_view` em cada mudança de rota com `user_id` setado. Helper `trackEvent` para eventos custom.
- **Firebase Performance Monitoring** auto-coleta web vitals e traces de fetch/XHR.
- **Remote Config** configurado com `defaultConfig` + `fetchAndActivate`. Refresh de 5 min em prod. Primeira flag em uso: `feature_home_enriched`.
- **Audit log granular** em Firestore (`audit_log`):
  - `auditPalpites` (onWrite em palpites)
  - `auditPalpitesEspeciais` (onWrite em palpites_especiais)
  - `auditUsuarios` (onWrite em usuarios, só campos sensíveis)
  - `registrarLogin` callable (captura IP via X-Forwarded-For, user-agent, método)
- **Cloud Monitoring alerts** criados em prod e teste:
  - Cloud Functions com erros >0 em 5 min → email
  - Backup Firestore não executou em 23h30 → email
- **Listener de invalidação de cache** em duas camadas (`useAppVersion`):
  - `onSnapshot('config/app_version')` (instantâneo, requer auth)
  - Polling de `/version.json` a cada 2 min (rede de segurança, sem auth)
  - Banner "Nova versão disponível" dispara qualquer um.

### 🛠️ Ferramentas e infra

- **`scripts/atualizar-versao-app.ts`**: escreve `config/app_version` com SHA do build atual via Admin SDK.
- **`scripts/setup-cloud-monitoring.sh`**: idempotente, cria notification channel + 2 alertas.
- **`scripts/backup-firestore.ts`**: dump JSON local (ver `backups/`).
- **GitHub Actions**: `deploy-dev.yml` e `deploy-prod.yml` ativados como caminho padrão de deploy.

### 🧹 Resgate do stash antigo

Stash `grupo-D-em-progresso-antes-ci` continha 16 arquivos não commitados. Resgatado cirurgicamente:
- ✅ `Home.tsx` (enriquecida)
- ✅ `admin/Dashboard.tsx` (novo)
- ✅ `admin/AdminDashboard.tsx` (rota Dashboard)
- ✅ `admin/InserirResultados.tsx` (botões +/-)
- ✅ `admin/VerPalpites.tsx` (fase32, agrupamento, cores)
- ✅ `VerificarVinculo.tsx` (useRef + PhoneInput)
- ✅ `PalpitesGeral.tsx` (tabela de especiais)

Pulados (conflitavam com trabalho recente): `Login.tsx`, `Perfil.tsx`, `RankingTable.tsx`, `Palpites.tsx`, `functions/src/index.ts`, `scripts/seed-times.ts`, `docs/...md`.

**Stash original preservado intacto** (regra estrita do projeto: nunca dar `git stash drop` sem consentimento explícito).

## Incidentes do dia

### 1. Deploy local com config errada
**Sintoma:** prod servia bundle apontando para Firebase de teste por ~30 min.

**Causa:** `npm run build` local pegou `.env.local` (config de teste) na ausência de `.env.production.local`. Bundle errado foi deployado em prod.

**Fix imediato:** rebuild com `.env.production.local` correto, redeploy.

**Prevenção definitiva:** deploys agora vão **sempre** via GitHub Actions (`workflow_dispatch`) — secrets garantem env certa.

### 2. Cache de navegador travado
**Sintoma:** usuários vendo bundle antigo mesmo após F5/recarregar.

**Causa raiz dupla:**
- `index.html` servido com `max-age=3600` (default do Firebase Hosting). Sem `must-revalidate`.
- Navegadores com `firebase-messaging-sw.js` legado registrado (do tempo do PWA).

**Fix:** cache-control corrigido em `firebase.json`. SW substituído pelo tombstone que se desregistra automaticamente.

### 3. Stash com trabalho perdido
**Sintoma:** Home enriquecida e admin Dashboard "sumiram".

**Causa:** trabalho ficou no stash `grupo-D-em-progresso-antes-ci` semanas atrás e ninguém percebeu.

**Fix:** resgate cirúrgico no PR #18 e #22.

**Prevenção definitiva:** diretiva absoluta nos 4 lugares (CLAUDE.md projeto, ~/.claude/CLAUDE.md global, auto-memory, MEMORY.md): **JAMAIS rodar `git stash` sem consentimento explícito**.

### 4. `getDocs(collection 'config')` quebrou ao criar `config/app_version`
**Sintoma:** tela `/palpites` quebrava com `Cannot read properties of undefined (reading 'toDate')`.

**Causa:** código antigo assumia 1 doc só na coleção `config`. Ao criar `config/app_version`, ele virou primeiro alfabeticamente.

**Fix:** trocou para `getDoc(doc(db, 'config', 'geral'))` direto.

## Operações deployadas (Cloud Functions)

Lista atual em prod e teste:

```
auditPalpites           Firestore trigger
auditPalpitesEspeciais  Firestore trigger
auditUsuarios           Firestore trigger
backupFirestoreDiario   Schedule (00:00 BRT diário)
excluirUsuario          Callable (admin)
onJogoEncerrado         Firestore trigger
recalcularRanking       Callable (admin)
registrarLogin          Callable (qualquer auth)
resolverMataMata        Callable (admin)
telefoneJaCadastrado    Callable (público)
```

Removidas hoje:
- `notificarMencoesChat`
- `enviarNotificacao`

## Caminho de deploy padrão (a partir de hoje)

1. Trabalho em `dev`
2. PR `dev → main`
3. Merge via GitHub
4. Fast-forward `dev` para alinhar SHAs
5. Disparar Action `Deploy Teste` via `gh workflow run deploy-dev.yml --ref main`
6. Validar em https://bolao-do-bolero-teste.web.app
7. Disparar Action `Deploy Produção` via `gh workflow run deploy-prod.yml --ref main`
8. Validar em https://bolao-do-bolero.web.app

**Nunca mais rodar `firebase deploy --project prod` localmente** sem checar que o build foi feito com config certa.

## Pendências para próxima sessão

| # | Item | Esforço | Prioridade |
|---|---|---|---|
| 5 | Limpeza de arquivos órfãos (scripts FIFA, dumps, screenshot, "Considerações Gerais.md") | 30 min | baixa |
| 7 | Testar restore de backup em projeto temp | 1-2h | média (validação importante antes da Copa) |
| 8 | Ativar BigQuery Export do GA4 | 5 min (você no console) | média |
| — | `git stash drop stash@{0}` (com consentimento explícito) | 1 min | baixa — só house-keeping |
| — | Documentar no README o ritual de deploy padrão (DEPLOY.md) | 30 min | média |
| — | Cloud Function que roda `resolverMataMata` automaticamente após cada jogo encerrado | 1h | média (eliminaria botão manual) |
| — | Painel admin com mais drilldown no audit_log (timeline por usuário, paginação) | 2h | baixa |

## Estado final

| | URL | SHA | Status |
|---|---|---|---|
| Prod | https://bolao-do-bolero.web.app | `fad3e7d` | ✅ |
| Teste | https://bolao-do-bolero-teste.web.app | `fad3e7d` | ✅ |
| `dev` branch | local + remoto | `fad3e7d` | ✅ aligned |
| `main` branch | local + remoto | `fad3e7d` | ✅ aligned |
| Backups GCS | `gs://bolao-do-bolero-backups/firestore-backups/` | 5 dias (22-26 abr) + 2 manuais | ✅ |
| Backups locais JSON | `backups/bolao-do-bolero/` | 22, 26 (madrugada), 26 (tarde) | ✅ |
| Cloud Monitoring alerts | prod + teste | configurados | ✅ |
| Stash original | `stash@{0}` | preservado | intocado |

## Lições aprendidas

1. **Cache de navegador é unidirecional** — uma vez que o servidor disse "guarde por 1h", não há header novo do servidor que invalide isso antes da expiração. Estratégias precisam estar **no código que já está rodando** (listener + polling) ou esperar o tempo passar.
2. **Service Workers persistem** — removê-los do código não desregistra os SWs já instalados nos navegadores. Solução: substituir por um tombstone que se desregistra ativamente.
3. **Default do Firebase Hosting é `max-age=3600`** — precisa override explícito em `firebase.json` para HTML / `/`.
4. **`set-e` + grep no script falha silencioso** — quando grep não encontra, exit 1, e `set -e` mata o script. Resolver com `|| true`.
5. **Coleções com mais de um doc quebram código que assume um único** — sempre ler por path direto (`doc(db, 'col', 'id')`).
6. **Deploy local é fonte de incidentes** — secrets em GitHub Actions é o caminho seguro.
7. **Stash esconde trabalho** — diretiva agora absoluta no projeto.
