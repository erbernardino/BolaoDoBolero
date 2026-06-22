---
title: Admin MOC
tags:
  - moc
  - admin
status: documentado
related:
  - "[[Início]]"
  - "[[Inserir Resultados]]"
  - "[[Entidade Usuario]]"
---

# 🛠️ Administração — MOC

Telas restritas ao `admin` (protegidas por [[Rotas e Guards|AdminRoute]]) que controlam o ciclo de vida do bolão: dados estáticos, resultados, usuários e auditoria. Toda escrita sensível passa pelas [[Regras de segurança do Firestore|regras de segurança]] e, quando recalcula pontos, dispara as [[Cloud Functions MOC|Cloud Functions]].

## 🗓️ Dados e resultados

- [[Gerenciar Jogos e Times]] — cadastro de `Jogo`/`Time` (ver [[Entidades estáticas]]).
- [[Inserir Resultados]] — ⭐ fluxo crítico: grava placar e dispara o recálculo.
- [[Resultados Especiais]] — palpites especiais (artilheiro, campeão etc.).
- [[Configurações do bolão]] — pontos, liberação, datas (grava na [[Coleção config]]).

## 👥 Pessoas

- [[Gerenciar Usuários e Convites]] — convites, papéis e exclusão.
- [[Ver Palpites]] — inspeção dos palpites de cada participante.

## 🔎 Observação

- [[Auditoria]] — `audit_log` das ações sensíveis.

> [!warning] Inserir resultado é irreversível em cascata
> [[Inserir Resultados]] → [[Trigger onJogoEncerrado]] → [[Recálculo de ranking]] → [[Página Ranking]] e [[Trigger de snapshot]]. Entenda a [[Race condition de triggers]] antes de salvar em lote.

## Notas nesta área

```dataview
LIST FROM "Admin" WHERE file.name != "Admin MOC" SORT file.name ASC
```
