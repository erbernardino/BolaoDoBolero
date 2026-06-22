---
title: Operação MOC
tags:
  - moc
  - operacao
status: documentado
related:
  - "[[Início]]"
  - "[[Stack e Ambientes]]"
  - "[[Visão Geral e Regulamento]]"
---

# 🚀 Operação e Visão Geral — MOC

Visão de produto, stack, ambientes e o dia a dia de operar o bolão.

## 📖 Produto

- [[Visão Geral e Regulamento]] — o que é o bolão e as regras.
- [[Formato da Copa 2026]] — estrutura do torneio (grupos, terceiros, mata-mata).
- [[Especificação e Design]] — a spec original do sistema.

## 🧱 Infra e processo

- [[Stack e Ambientes]] — tecnologias e os projetos `prod`/`teste`.
- [[Comandos e Scripts]] — build, test, deploy, seed e setup.
- [[Backup diário]] — exportação agendada (também listada no [[Cloud Functions MOC]]).

## ⚖️ Cuidado

- [[Divergências conhecidas]] — onde o código real diverge da spec/`CLAUDE.md` (ex.: tier de pontuação).

> [!danger] Diretivas permanentes
> Nunca `git stash` sem consentimento explícito; nunca criar documentos extras na [[Coleção config]]. Ambas estão no `CLAUDE.md` e replicadas no [[Stack e Ambientes]].

## Notas nesta área

```dataview
LIST FROM "Operação" WHERE file.name != "Operação MOC" SORT file.name ASC
```
