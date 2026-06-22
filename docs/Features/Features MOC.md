---
title: Features MOC
tags:
  - moc
  - feature
status: documentado
related:
  - "[[Início]]"
  - "[[Chat Global]]"
  - "[[Gerenciamento de Perfil]]"
---

# 🧩 Features Transversais — MOC

Funcionalidades que cruzam UI, hooks, Firestore e (potencialmente) Cloud Functions, mas não pertencem a uma única página.

## 💬 Comunicação

- [[Chat Global]] — chat em tempo real do bolão, com menções (`@`). Depende da [[Entidade Usuario]], das [[Regras de segurança do Firestore]] e se relaciona a [[FCM e notificações]] (notificações de menção ainda não implementadas).

## 👤 Identidade

- [[Gerenciamento de Perfil]] — edição de perfil, [[Processamento de imagem|foto]], verificação de vínculo e onboarding (`CompletarPerfil`). Liga-se à [[Autenticação Login e Cadastro]], às [[Regras do Storage]] e à [[Entidade Usuario]].

> [!info] Onde mais aparecem
> Banners e destaques de ranking ficam em [[Banners de estado]]; a liberação do participante (que abre o acesso pós-cadastro) está em [[Liberação do participante]].

## Notas nesta área

```dataview
LIST FROM "Features" WHERE file.name != "Features MOC" SORT file.name ASC
```
