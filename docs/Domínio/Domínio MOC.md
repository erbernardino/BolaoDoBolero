---
title: Domínio MOC
tags:
  - moc
  - dominio
status: documentado
related:
  - "[[Início]]"
  - "[[Pontuação]]"
  - "[[Bracket oficial]]"
---

# ⚽ Domínio / Regras de Negócio — MOC

Camada de **funções puras** em `src/lib/` (sem Firestore, sem `Timestamp`, sem efeitos colaterais) compartilhada entre o frontend e as [[Cloud Functions MOC|Cloud Functions]]. É o coração das regras do bolão. Os [[Tipos compartilhados de cálculo]] (`calc.ts`) garantem que frontend e backend calculem igual.

## 🎯 Cálculo de pontos e classificação

- [[Pontuação]] — tiers não-cumulativos placar exato > coluna > total de gols.
- [[Classificação de grupos]] — critérios FIFA (Article 13), head-to-head antes do saldo.
- [[Melhores terceiros]] — os 8 melhores terceiros que avançam.

## 🗝️ Chaveamento e mata-mata

- [[Alocação de terceiros por slot]] — backtracking que encaixa os terceiros nos slots.
- [[Bracket personalizado do usuário]] — o mata-mata derivado dos palpites de cada um.
- [[Bracket oficial]] — o mata-mata derivado dos resultados reais.

## 📊 Projeções e estado ao vivo

- [[Clinch de grupo]] — quando uma vaga já está matematicamente garantida.
- [[Resolução provisória vs oficial]] — preencher slots com a tabela parcial vs apenas quando confirmado.
- [[Snapshot de resultados]] — fotografia derivada da página Resultados/Projeções.

> [!tip] Mesmas libs, dois mundos
> As funções de [[Classificação de grupos|classificação]] e chaveamento alimentam tanto o [[Bracket personalizado do usuário]] (palpites) quanto o [[Bracket oficial]] (resultados reais). Divergências intencionais estão em [[Divergências conhecidas]].

## Notas nesta área

```dataview
LIST FROM "Domínio" WHERE file.name != "Domínio MOC" SORT file.name ASC
```
