---
title: Backup diário
tags:
  - backend
  - cloud-functions
  - operacao
  - firestore
status: documentado
related:
  - "[[Cloud Functions MOC]]"
  - "[[Stack e Ambientes]]"
  - "[[Coleções do Firestore]]"
  - "[[Comandos e Scripts]]"
---

A **Backup diário** é a Cloud Function agendada `backupFirestoreDiario` que exporta **todo** o Firestore para um bucket do Google Cloud Storage uma vez por dia. É uma rotina de operação/desastre, independente dos triggers de negócio como [[Trigger onJogoEncerrado]] — ela apenas tira uma fotografia completa do banco.

## Como funciona

Definida com `onSchedule` (`firebase-functions/v2/scheduler`) em `functions/src/backup.ts:9`. Ao disparar, usa o `FirestoreAdminClient` (v1) do `@google-cloud/firestore` para chamar `exportDocuments` sobre o database `(default)` do projeto (`functions/src/backup.ts:27`).

| Parâmetro | Valor | Fonte |
| --- | --- | --- |
| `schedule` | `0 0 * * *` (00:00 diário) | `backup.ts:11` |
| `timeZone` | `America/Sao_Paulo` | `backup.ts:12` |
| `memory` | `256MiB` | `backup.ts:13` |
| `timeoutSeconds` | `540` | `backup.ts:14` |
| `collectionIds` | `[]` → todas as coleções | `backup.ts:35` |

> [!info] Horário
> A exportação roda às **00:00 no horário de Brasília**, conforme `timeZone: 'America/Sao_Paulo'`. Cobre integralmente as [[Coleções do Firestore]] (incluindo [[Coleção config]] e [[Coleção _system]]), pois `collectionIds` vazio significa "exportar tudo".

## Destino e projeto

O bucket de destino vem de `process.env.BACKUP_BUCKET`; se não definido, usa o padrão `${projectId}-backups` (`backup.ts:23`). O `projectId` é lido de `GCLOUD_PROJECT || GCP_PROJECT`. Se nenhuma dessas envs estiver presente no runtime, a função **loga erro e lança** `Error('projectId ausente')` (`backup.ts:17`).

O caminho final segue o padrão:

```
gs://<bucket>/firestore-backups/<YYYY-MM-DD>
```

A data `YYYY-MM-DD` vem de `new Date().toISOString().slice(0, 10)` (`backup.ts:24`), ou seja, em UTC — o prefixo do dia pode não coincidir com a meia-noite de Brasília usada no agendamento.

> [!info] Variáveis de ambiente
> `BACKUP_BUCKET` e o `projectId` (`GCLOUD_PROJECT`/`GCP_PROJECT`) fazem parte da configuração de runtime descrita em [[Stack e Ambientes]]. O deploy e a execução manual dependem dos [[Comandos e Scripts]] do projeto.

## Retenção

> [!danger] Não há rotina de retenção/limpeza
> O código **não remove** backups antigos. Cada execução cria um novo prefixo `firestore-backups/<YYYY-MM-DD>`, então o bucket cresce indefinidamente. A expiração precisa ser configurada **fora** do código — por exemplo, via Object Lifecycle Management no bucket GCS. Sem isso, o custo de armazenamento sobe sem limite.

> [!warning] Falha silenciosa de configuração
> Se `BACKUP_BUCKET` apontar para um bucket inexistente ou sem permissão, ou se o `projectId` faltar, a função falha e **nenhum backup é gerado naquele dia**. Vale acompanhar via [[Observabilidade]] os logs `Iniciando export...` / `Export iniciado...` / `Falha ao iniciar export...`.

## Relacionados

- [[Cloud Functions MOC]] — índice das Cloud Functions do backend
- [[Stack e Ambientes]] — configuração de runtime e variáveis de ambiente
- [[Comandos e Scripts]] — deploy e operação das functions
- [[Coleções do Firestore]] — o que entra no backup
- [[Lógica compartilhada do backend]]
- [[Observabilidade]] — logs e monitoramento da execução
