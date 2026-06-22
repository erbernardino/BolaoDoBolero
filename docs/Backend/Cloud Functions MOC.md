---
title: Cloud Functions MOC
tags:
  - moc
  - backend
status: documentado
related:
  - "[[Início]]"
  - "[[Recálculo de ranking]]"
  - "[[Trigger de snapshot]]"
---

# ☁️ Cloud Functions (Backend) — MOC

Funções Firebase (Node 22, Functions v6, TypeScript) que reagem a mudanças no Firestore e centralizam cálculos sensíveis no servidor. A [[Lógica compartilhada do backend]] espelha as libs puras do [[Domínio MOC|domínio]] via `_shared`, mantendo paridade com o frontend.

## 🔁 Pontuação e ranking

- [[Trigger onJogoEncerrado]] — dispara quando um jogo é encerrado.
- [[Recálculo de ranking]] — recalcula todo o ranking do zero e grava em `ranking/{uid}` + [[Coleção _system|_system/ranking_meta]].
- [[Resolver mata-mata]] — callable que resolve o [[Bracket oficial]].

## 📸 Projeções

- [[Trigger de snapshot]] — recalcula o [[Snapshot de resultados]] e grava em [[Coleção _system|_system/resultados]].

## 🧰 Infra de backend

- [[Backup diário]] — exportação agendada do Firestore.
- [[Auditoria]] — registro em `audit_log` (ignora updates triviais como `fcmToken`).
- [[Lógica compartilhada do backend]] — espelho das libs de cálculo.
- [[FCM e notificações]] — estado atual (push notifications).

> [!warning] Concorrência
> Múltiplos triggers observam o documento `jogos/{id}`. Veja [[Race condition de triggers]] para o risco de execuções concorrentes ao salvar resultados em lote via [[Inserir Resultados]].

## Notas nesta área

```dataview
LIST FROM "Backend" WHERE file.name != "Cloud Functions MOC" SORT file.name ASC
```
