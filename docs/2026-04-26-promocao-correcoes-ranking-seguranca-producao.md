# Promocao para Producao - Correcoes de Seguranca e Ranking

Data do registro: 2026-04-26

## Ambientes

- Teste: `bolao-do-bolero-teste`
- URL teste: `https://bolao-do-bolero-teste.web.app`
- Producao: `bolao-do-bolero`
- URL producao: `https://bolao-do-bolero.web.app`

Regra operacional: toda correcao deve ser validada primeiro em `teste`. Deploy em producao deve usar sempre `--project prod`; nao usar o projeto `default`, pois ele aponta para producao.

## Objetivo

Promover para producao as correcoes aplicadas e validadas em teste para:

- endurecer regras Firestore;
- impedir auto-liberacao de usuarios;
- restringir leitura de palpites conforme configuracao de visibilidade;
- impedir criacao arbitraria de notificacoes por clientes;
- tornar o ranking idempotente;
- exibir todos os participantes no ranking, mesmo com zero pontos;
- mover notificacoes de mencao no chat para uma Callable Function validada no backend.

## Arquivos alterados

- `firestore.rules`
- `functions/src/index.ts`
- `functions/src/pontuacao.ts`
- `src/pages/Chat.tsx`
- `src/pages/PalpitesGeral.tsx`
- `src/pages/PalpitesGrupos.tsx`
- `src/pages/PalpitesMataMata.tsx`
- `src/pages/Ranking.tsx`
- `src/pages/admin/GerenciarUsuarios.tsx`

## Resumo tecnico

### Firestore Rules

As regras agora:

- validam schema basico de `palpites`;
- validam schema de `palpites_especiais`;
- impedem que participante altere `role`, `liberado`, `uid` e `conviteId`;
- exigem `liberado == false` na criacao de usuario participante;
- aplicam visibilidade real para leitura de palpites:
  - proprio palpite;
  - admin;
  - `sempre`;
  - `apos_prazo` quando o prazo expirou;
  - `apos_jogo` somente para palpites de jogos encerrados;
- bloqueiam criacao direta de notificacoes por clientes comuns;
- permitem que usuario atualize apenas `lida` nas proprias notificacoes.

### Ranking

O ranking passou a ser recalculado do zero por `recalcularTodoRanking()`, evitando duplicidade de pontos quando uma Function reexecuta.

O recalc tambem inicializa ranking zerado para todos os documentos em `usuarios`, para todos aparecerem mesmo antes de pontuar.

A tela `Ranking` tambem tem fallback local: se um usuario ainda nao tem documento em `ranking`, ela monta um ranking zerado em memoria.

### Chat e Notificacoes

As mencoes no chat nao gravam mais diretamente em `notificacoes_usuario` pelo cliente.

Fluxo atual:

1. Cliente cria a mensagem em `chat`.
2. Cliente chama `notificarMencoesChat`.
3. Backend valida se a mensagem pertence ao usuario autenticado.
4. Backend cria as notificacoes por Admin SDK.

### Admin de Usuarios

Ao liberar usuario, o admin usa a Callable `enviarNotificacao` em vez de gravar diretamente em `notificacoes_usuario`.

## Validacoes ja feitas em teste

Comandos executados localmente:

```bash
npm test
npm run build
cd functions && npm run build
firebase deploy --only firestore:rules --project teste --dry-run
```

Resultados:

- `npm test`: passou, 4 arquivos e 19 testes.
- `npm run build`: passou.
- `functions` build: passou.
- dry-run de regras em `teste`: passou.

Deploys feitos em teste:

```bash
firebase deploy --only hosting,firestore:rules,functions:onJogoEncerrado,functions:recalcularRanking,functions:notificarMencoesChat,functions:enviarNotificacao,functions:telefoneJaCadastrado,functions:excluirUsuario --project teste
firebase deploy --only hosting,functions:onJogoEncerrado,functions:recalcularRanking --project teste
```

Resultado final:

- Hosting teste publicado.
- Firestore Rules teste publicadas.
- Functions alteradas publicadas em teste.
- `https://bolao-do-bolero-teste.web.app/ranking` respondeu HTTP 200.

Observacao: um deploy completo inicial falhou apenas em `backupFirestoreDiario` por erro de Cloud Scheduler. Essa funcao nao fazia parte da correcao. O deploy restrito das funcoes alteradas concluiu com sucesso.

## Checklist funcional em teste antes de producao

Validar em `https://bolao-do-bolero-teste.web.app`:

1. Entrar como admin.
2. Abrir `/ranking` e confirmar que todos os participantes aparecem, inclusive com `0` pontos.
3. Em Admin > Configuracoes, executar recalc de ranking e confirmar sucesso.
4. Abrir `/ranking` novamente e confirmar que todos continuam aparecendo.
5. Testar que participante nao liberado nao consegue registrar palpite.
6. Testar que participante comum nao consegue ver palpites de outros quando `visibilidadePalpites = nunca`.
7. Testar `apos_prazo` e `apos_jogo`, se necessario, alterando a configuracao no ambiente de teste.
8. Enviar mensagem no chat mencionando outro usuario e confirmar que a notificacao chega.
9. Liberar um usuario pelo admin e confirmar que a notificacao de liberacao e criada.

## Correcao adicional - 3os colocados e Segunda Fase

Problema encontrado em teste: para o usuario ADM Testes, Paraguai e Panama ficaram empatados entre os 3os colocados com os mesmos criterios FIFA visiveis:

- pontos: 3;
- saldo: -3;
- gols marcados: 1;
- pontos disciplinares: -1 para ambos.

Como a FIFA resolveria empate total por sorteio, o app estava deixando a ordenacao final depender da ordem de leitura dos dados. Isso podia mostrar um time como 8o na tabela de 3os colocados e outro time no slot da Segunda Fase.

Correcao aplicada: cada 3o colocado agora carrega a letra do grupo, e o comparador compartilhado (`compararTerceirosFifa`) usa a letra do grupo como desempate deterministico final quando ainda houver empate apos disciplina. Esse desempate final existe para manter tabela e chaveamento coerentes; os criterios principais continuam sendo pontos, saldo, gols marcados e disciplina.

Validacao esperada:

1. Preencher todos os palpites da fase de grupos.
2. Ajustar os pontos disciplinares dos 3os empatados.
3. Confirmar que a tabela "3os colocados em ordem FIFA" e os jogos da Segunda Fase mostram o mesmo conjunto de 8 classificados.
4. Em empate total apos disciplina, confirmar que a ordem e estavel ao recarregar a pagina e ao alternar entre Fase de Grupos e Segunda Fase.

## Promocao para producao

Antes de promover:

```bash
git status --short
npm test
npm run build
cd functions && npm run build
cd ..
firebase deploy --only firestore:rules --project prod --dry-run
```

Deploy recomendado para producao, restrito ao que foi alterado:

```bash
firebase deploy --only hosting,firestore:rules,functions:onJogoEncerrado,functions:recalcularRanking,functions:notificarMencoesChat,functions:enviarNotificacao,functions:telefoneJaCadastrado,functions:excluirUsuario --project prod
```

Evitar neste momento:

```bash
firebase deploy --project prod
```

Motivo: o deploy completo inclui `backupFirestoreDiario`, e houve falha anterior relacionada ao Cloud Scheduler no ambiente de teste. Se for necessario promover ou reparar essa funcao, tratar como tarefa separada.

## Pos-deploy em producao

Depois do deploy:

```bash
curl -I https://bolao-do-bolero.web.app
curl -I https://bolao-do-bolero.web.app/ranking
```

Depois, validar manualmente:

1. Abrir `https://bolao-do-bolero.web.app/ranking`.
2. Confirmar que todos os participantes aparecem.
3. Como admin, executar o recalc de ranking em Configuracoes.
4. Reabrir `/ranking` e confirmar que o ranking segue completo.
5. Conferir logs das Functions `onJogoEncerrado`, `recalcularRanking`, `notificarMencoesChat` e `enviarNotificacao` no Console Firebase.

## Rollback

Se houver problema no Hosting, usar rollback pelo Firebase Hosting Console do projeto `bolao-do-bolero`.

Se houver problema em Rules ou Functions, reverter o commit local e publicar explicitamente:

```bash
firebase deploy --only firestore:rules,functions:onJogoEncerrado,functions:recalcularRanking,functions:notificarMencoesChat,functions:enviarNotificacao,functions:telefoneJaCadastrado,functions:excluirUsuario --project prod
```

Nao usar comandos destrutivos de git sem revisar o estado local.
