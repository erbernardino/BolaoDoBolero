---
title: Início
tags:
  - moc
  - home
status: documentado
aliases:
  - Home
  - Índice
  - Mapa do Vault
related:
  - "[[Visão Geral e Regulamento]]"
  - "[[Domínio MOC]]"
  - "[[Modelo de Dados MOC]]"
---

# 🏆 Bolão do Bolero — Segundo Cérebro

> [!info] O que é este vault
> Documentação viva do **Bolão do Bolero**, um bolão entre amigos para a **Copa do Mundo FIFA 2026**. Cada nota é atômica e conectada por _wikilinks_ (`[[Nota]]`) — navegue pelo grafo, não pela árvore de pastas. Comece pela [[Visão Geral e Regulamento]] ou pelo **Mapa de áreas** abaixo.

Bolão **único** (não é plataforma multi-bolão), cadastro **apenas por convite** do administrador. Frontend React + TypeScript (PWA) sobre **Firebase puro** (Auth, Firestore, Cloud Functions, Hosting, FCM, Storage). Detalhes em [[Stack e Ambientes]].

## 🧭 Por onde começar

1. [[Visão Geral e Regulamento]] — o que é o bolão e as regras para o participante.
2. [[Formato da Copa 2026]] — 12 grupos, melhores terceiros, mata-mata de 32.
3. [[Pontuação]] — como os palpites viram pontos.
4. [[Coleções do Firestore]] — o modelo de dados que sustenta tudo.
5. [[Rotas e Guards]] — como o app se organiza no frontend.

## 🗺️ Mapa de áreas

| Área | MOC | Do que trata |
|------|-----|--------------|
| ⚽ Domínio / Regras | [[Domínio MOC]] | Pontuação, classificação FIFA, terceiros, chaveamento, projeções |
| 🗃️ Modelo de Dados | [[Modelo de Dados MOC]] | Coleções Firestore, tipos, regras de segurança, Storage |
| 💻 Frontend | [[Frontend MOC]] | Páginas, rotas, hooks, PWA, observabilidade |
| 🛠️ Administração | [[Admin MOC]] | Telas admin: jogos, resultados, usuários, convites |
| ☁️ Cloud Functions | [[Cloud Functions MOC]] | Triggers, recálculo de ranking, snapshot, backup |
| 🧩 Features | [[Features MOC]] | Chat global, gerenciamento de perfil |
| 🚀 Operação | [[Operação MOC]] | Stack, ambientes, comandos, scripts, divergências |
| 📜 Histórico | [[Histórico MOC]] | Análises, auditorias e propostas anteriores |

## 🔗 Fluxos que cruzam áreas

> [!tip] O segundo cérebro brilha nas conexões
> Os fluxos mais importantes atravessam várias áreas — siga os links:

- **Pontuação ponta-a-ponta:** [[Inserir Resultados]] → [[Trigger onJogoEncerrado]] → [[Recálculo de ranking]] → [[Página Ranking]], tudo regido por [[Pontuação]].
- **Resultados e Projeções:** [[Snapshot de resultados]] derivado de [[Bracket oficial]] + [[Clinch de grupo]] + [[Resolução provisória vs oficial]], persistido por [[Trigger de snapshot]] em [[Coleção _system]] e exibido na [[Página Resultados]].
- **Chaveamento personalizado:** os palpites de grupo de cada usuário ([[Entidades de palpite]]) alimentam [[Classificação de grupos]] → [[Melhores terceiros]] → [[Alocação de terceiros por slot]] → [[Bracket personalizado do usuário]].
- **Acesso e liberação:** [[useAuth]] + [[Rotas e Guards]] + [[Liberação do participante]] controlam o que cada [[Entidade Usuario|usuário]] vê.

## ⚠️ Regras críticas (não ignore)

> [!danger] Coleção `config` é restrita
> A [[Coleção config]] só pode conter `geral` e `resultado_especial`. Qualquer outro documento quebra a leitura de palpites em produção. Detalhes e histórico do incidente na própria nota.

> [!danger] Nunca `git stash` sem consentimento
> Diretiva permanente do dono do projeto — ver [[Stack e Ambientes]] / `CLAUDE.md`.

## 🕸️ Grafo

Veja `vault.canvas` para o mapa visual da arquitetura. No grafo do Obsidian, os MOCs são os hubs; cada área é um cluster.

## 📌 Notas que apontam para o Início

```dataview
LIST FROM [[Início]] SORT file.name ASC
```
