---
title: Histórico MOC
tags:
  - moc
  - historico
status: documentado
related:
  - "[[Início]]"
  - "[[Divergências conhecidas]]"
---

# 📜 Histórico, Análises e Specs — MOC

Documentos **pré-existentes** do repositório (análises, auditorias, propostas e especificações). Este MOC apenas os **conecta** ao segundo cérebro — o conteúdo original permanece intacto nos arquivos `docs/`.

## 🔍 Análises e auditorias

- [[analise-codigo-2026-06-07]] — análise completa de segurança, lógica, Functions e qualidade. Relaciona-se a [[Divergências conhecidas]] e [[Regras de segurança do Firestore]].
- [[auditoria-horarios-copa2026]] — auditoria dos horários dos jogos. Liga-se a [[Entidades estáticas]] e [[Gerenciar Jogos e Times]].
- [[fifa-vs-firestore-diff]] — diff entre os dados FIFA oficiais e o Firestore. Liga-se a [[Entidades estáticas]].

## 🩹 Propostas e correções

- [[proposta-fix-projecao-mata-2026-06-08]] — proposta de correção da projeção do mata-mata (campeão projetado inconsistente). Liga-se a [[Bracket personalizado do usuário]] e [[Resolução provisória vs oficial]].
- [[tdd-verificacao-cadastro-telefone]] — TDD da verificação de cadastro por telefone. Liga-se a [[Autenticação Login e Cadastro]].
- [[2026-04-26-promocao-correcoes-ranking-seguranca-producao]] — promoção para produção com correções de ranking e segurança.
- [[2026-04-26-trabalho-do-dia]] — registro de trabalho do dia.

## 📐 Especificações e planos (`docs/superpowers/`)

- [[2026-03-31-bolao-do-bolero-design]] — spec base do sistema (ver [[Especificação e Design]]).
- [[2026-03-31-gerenciamento-perfil-design]] — design do [[Gerenciamento de Perfil]].
- [[2026-04-01-chat-global-design]] — design do [[Chat Global]].
- [[2026-04-16-labels-origem-formato-copa-design]] — labels de origem + [[Formato da Copa 2026]].
- [[2026-06-22-resultados-oficiais-design]] — design dos [[Bracket oficial|resultados oficiais]].
- [[2026-06-22-resultados-snapshot]] — plano do [[Snapshot de resultados]].

## 📅 Dados de referência

- [[fifa-copa-2026-jogos]] — tabela de jogos da Copa 2026 (fonte FIFA).

> [!note] Estes arquivos são fonte primária
> Trate-os como registro histórico — não os reescreva. Quando uma decisão antiga for superada, documente o estado atual na nota de área correspondente e linke para cá.
