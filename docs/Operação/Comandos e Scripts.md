---
title: Comandos e Scripts
tags:
  - operacao
  - scripts
  - firebase
  - firestore
  - seed
  - backup
status: documentado
related:
  - "[[Stack e Ambientes]]"
  - "[[Backup diário]]"
  - "[[Coleção config]]"
  - "[[Operação MOC]]"
---

Catálogo dos scripts em `scripts/*.ts` (rodados com `npx tsx`) que populam o catálogo da Copa (times, grupos, jogos), configuram o admin, criam o doc `config/geral` e fazem manutenção pesada do Firestore (backup, cópia prod→teste, reset de produção, correção de horários e diff FIFA). São o complemento manual e local da automação documentada em [[Stack e Ambientes]].

## Como rodam

Todos usam **`firebase-admin` + `tsx`** e inicializam com `initializeApp({ projectId })`. Autenticam via **Application Default Credentials** — exigem `gcloud auth application-default login` (alguns aceitam `GOOGLE_APPLICATION_CREDENTIALS` apontando para `application_default_credentials.json`).

Apenas três têm alias no `package.json` (`package.json:14-16`); o resto roda com o caminho completo:

```bash
npm run setup:admin   # npx tsx scripts/setup-admin.ts <email>
npm run seed:times    # npx tsx scripts/seed-times.ts
npm run seed:jogos    # npx tsx scripts/seed-jogos.ts
```

## Setup e seed (catálogo + admin)

| Script | Projeto-alvo | O que faz |
| --- | --- | --- |
| `setup-admin.ts` | `bolao-do-bolero` (prod) | Recebe `<email>`, promove o usuário a `role: 'admin'` em `/usuarios` e cria `config/geral` se não existir (`setup-admin.ts:45`). |
| `setup-admin-teste.ts` | `bolao-do-bolero-teste` | Cria/atualiza o admin **Emerson** (`emerson.rocco@gmail.com`, telefone `+5511982666671`) no Auth + `/usuarios/{uid}` com `role: 'admin'` e `liberado: true`; garante `config/geral` idêntico ao de prod. |
| `criar-admin-testes.ts` | `bolao-do-bolero-teste` | Cria o usuário **"ADM Testes"** (telefone de teste `+5599999999999`) e registra esse número como *test phone number* na Identity Toolkit, fazendo **bypass do SMS real**. |
| `seed-times.ts` | `bolao-do-bolero` (hardcoded) | Limpa e recria `times` (**48 times**) e `grupos` (**12 grupos A–L**), com bandeiras via `flagcdn.com`; define grupo e confederação de cada seleção. |
| `seed-jogos.ts` | `bolao-do-bolero` (hardcoded) | Limpa e recria os jogos; tipa `Fase` incluindo `'fase32'` e a `Origem` (grupo/jogo) com `resultado: 'vencedor' | 'perdedor'`. Ver [[Formato da Copa 2026]]. |
| `seed-fake-users.ts` | teste | Cria 5 usuários fake (Carlos/Ana/Pedro/Julia/Marcos) com palpites para todos os 104 jogos + palpites especiais; preenche ranking para testes. |

> [!danger] Seeds apontam para PRODUÇÃO e DELETAM antes de recriar
> `seed-times.ts` (`seed-times.ts:5`) e `seed-jogos.ts` (`seed-jogos.ts:5`) têm `projectId: 'bolao-do-bolero'` **hardcoded** e chamam `deleteCollection()` nas coleções antes de recriá-las. **Não há flag de ambiente nem dry-run.** Rode com extremo cuidado — não há rede de segurança.

> [!info] O `config/geral` criado pelos scripts é a fonte de verdade da pontuação
> `setup-admin.ts:46` grava `pontos { placarExato: 5, colunaCerta: 3, totalGols: 1, palpiteEspecial: 10 }`, `premiacao { primeiro: 50, segundo: 25, terceiro: 10, antepenultimo: 5, doacao: 10, taxaInscricao: 250 }`, `prazoLimitePalpites` 2026-06-11 e `visibilidadePalpites: 'apos_jogo'`. Esses pesos **5/3/1 + especial 10** são a [[Pontuação]] real e divergem da spec — ver [[Divergências conhecidas]]. Sobre o documento em si, ver [[Coleção config]].

## Manutenção, backup e cópia

| Script | Modo | O que faz |
| --- | --- | --- |
| `backup-firestore.ts` | leitura | Dump local de **TODO** o Firestore (coleções de topo + subcoleções), preservando `Timestamp`/`GeoPoint`/`DocumentReference`. Saída em `backups/<projectId>/<timestamp>.json`. |
| `backup-palpites.ts` | **somente leitura** | Backup focado de `palpites` e `palpites_especiais` (as [[Entidades de palpite]]) preservando `Timestamp`. Saída em `backups/palpites/<projectId>-<timestamp>.json`. |
| `copiar-catalogo-prod-para-teste.ts` | **DRY-RUN por padrão** | Copia `times`, `grupos`, `jogos`, `config` de `bolao-do-bolero` → `bolao-do-bolero-teste`, sobrescrevendo docs de mesmo id. Só grava com `--execute`. |
| `limpar-prod.ts` | **DRY-RUN por padrão** | RESETA prod para "pronto para a Copa": remove `palpites`, `palpites_especiais`, `ranking` e `usuarios` (Auth + Firestore) exceto 3 emails protegidos; zera `resultado`/`encerrado` dos jogos. Só executa com `--execute`. |

> [!tip] Estes scripts NÃO são o backup automático
> `backup-firestore.ts` e `backup-palpites.ts` são backups **manuais e locais**, sob demanda. O backup agendado é a Cloud Function [[Backup diário]] — não confundir os dois.

> [!danger] `limpar-prod.ts` é destrutivo e irreversível em produção
> Mesmo defaultando para dry-run, rodar `--execute` apaga usuários (Auth + Firestore), palpites e ranking de `bolao-do-bolero`, preservando apenas `cacavivi@uol.com.br`, `cyrosoldani@gmail.com` e `emerson.rocco@gmail.com` (`limpar-prod.ts:18-22`). **Confira o projeto-alvo antes de passar `--execute`.**

## Correção e auditoria de jogos

| Script | O que faz |
| --- | --- |
| `corrigir-horarios-auditoria.ts` | Corrige horários dos jogos com base em [[auditoria-horarios-copa2026]] (horários em BRT/UTC-3). |
| `diff-fifa-vs-firestore.ts` | Compara os jogos do Firestore com a tabela FIFA oficial; gerou [[fifa-vs-firestore-diff]]. Lê os dumps de `.firebase-dumps/times.json` e `.firebase-dumps/jogos.json`. |
| `corrigir-jogos-fifa.ts` / `corrigir-mata-mata-fifa.ts` | Aplicam correções de jogos e do bracket conforme a tabela FIFA. |
| `parse-fifa-fixtures.ts` | Faz parse das fixtures FIFA (insumo das correções/diff). |
| `update-labels-jogos.ts` / `update-numero-jogos.ts` | Atualizam rótulos e números dos jogos. |

> [!note] `.firebase-dumps/` é entrada, não saída
> `diff-fifa-vs-firestore.ts:72,88` **lê** `.firebase-dumps/times.json` e `.firebase-dumps/jogos.json` (gerados externamente, ex.: export do gcloud). Não confundir com a saída de `backup-firestore.ts`, que vai para `backups/`.

## Checagem e infra

- `_check-fases.ts`, `_check-palpites-mata.ts`, `_check-palpites-mata-prod.ts`, `_check-divergencia-mata.ts` — checagens pontuais de fases, palpites de mata-mata e divergências.
- `setup-cloud-monitoring.sh` — provisiona [[Observabilidade]] (Cloud Monitoring).
- `verify-build-target.sh` — verifica o alvo de build (prod vs teste).

## A armadilha do `config/app_version`

> [!danger] `atualizar-versao-app.ts` VIOLA a diretiva de segurança do projeto
> O script grava em **`config/app_version`** (`atualizar-versao-app.ts:45`) o SHA do `HEAD` + timestamp de deploy, e os clients escutam esse doc para mostrar o banner de "nova versão". Porém a [[Coleção config]] só pode conter `geral` e `resultado_especial`. Em **2026-04-30** o doc `config/app_version` quebrou a [[Página Palpites]] em produção (`Cannot read properties of undefined (reading 'toDate')`). Dados de sistema devem ir para a [[Coleção _system]] (ex.: `_system/versao`), nunca em `config`. Ver [[Divergências conhecidas]].

## Relacionados

- [[Stack e Ambientes]] — projetos `bolao-do-bolero` e `bolao-do-bolero-teste`, ADC e deploy.
- [[Backup diário]] — backup agendado via Cloud Function (estes scripts são o backup manual).
- [[Coleção config]] e [[Coleção _system]] — a diretiva crítica do `config/app_version`.
- [[Pontuação]] e [[Divergências conhecidas]] — pesos 5/3/1 + especial 10 vindos do `config/geral`.
- [[Formato da Copa 2026]] — 48 times, 12 grupos, fase de 32 (`fase32`).
- [[auditoria-horarios-copa2026]] · [[fifa-vs-firestore-diff]] — insumos/saídas das correções FIFA.
- [[Operação MOC]] — índice da área de operação.
