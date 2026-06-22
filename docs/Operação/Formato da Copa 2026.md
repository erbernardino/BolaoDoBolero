---
title: Formato da Copa 2026
tags:
  - operacao
  - formato
  - fifa
  - mata-mata
status: documentado
related:
  - "[[Operação MOC]]"
  - "[[Visão Geral e Regulamento]]"
  - "[[Bracket oficial]]"
  - "[[Melhores terceiros]]"
---

A página `/formato-copa` (rota no [[Navbar]], componente `src/pages/FormatoCopa.tsx`) documenta o formato oficial da Copa do Mundo FIFA 2026 dentro do próprio bolão, e nasceu de uma spec/plano aprovado em **2026-04-16** com duas melhorias: tornar **sempre visíveis as labels de origem** nos palpites do mata-mata e publicar uma página de regras oficiais FIFA acessível pelo menu.

> [!info] Status
> Spec/plano **Aprovado em 2026-04-16**. À data desta nota o código de `src/pages/FormatoCopa.tsx` já está implementado — a página existe e está completa. Os documentos históricos são os arquivos de design e plano (ver callout abaixo).

## As duas melhorias da spec

1. **Labels de origem sempre visíveis no mata-mata.** Cada confronto da Fase 32 (Jogos 73–88) mostra a procedência do time mesmo antes de definido — ex.: `1º Grupo E`, `2º Grupo C`, e para os slots de terceiro colocado `3º dos Grupos A, B, C, D ou F`. Para suportar isso a spec adiciona **campos novos ao tipo `Jogo`** (a origem de cada lado do confronto). As labels conectam o [[Bracket oficial]] aos critérios de [[Classificação de grupos]] e à [[Alocação de terceiros por slot]].
2. **Página `/formato-copa` no [[Navbar]]** com as regras oficiais FIFA do torneio (Anexo C / Artigo 13), servindo de referência única dentro do app e complementando a [[Visão Geral e Regulamento]].

## O que a página cobre

`src/pages/FormatoCopa.tsx` renderiza, em seções:

- **Visão Geral** — 48 seleções em 12 grupos (A–L) de 4 times, 104 jogos (72 de grupos + 32 de mata-mata), sedes EUA/Canadá/México (`src/pages/FormatoCopa.tsx:39`).
- **Fase de Grupos** — round-robin e os critérios FIFA de [[Classificação de grupos]] em três steps (head-to-head, saldo/gols geral + conduta, FIFA Ranking), com callouts explicando **como o Bolão trata** cada critério (`src/pages/FormatoCopa.tsx:52`).
- **Quem avança** — 1º e 2º de cada grupo (24 times) + os 8 [[Melhores terceiros]], totalizando 32 no mata-mata (`src/pages/FormatoCopa.tsx:74`).
- **Os 495 cenários** — `C(12,8) = 495` combinações de quais 8 terceiros classificam; cada slot tem 5 grupos elegíveis (`src/pages/FormatoCopa.tsx:95`). Ver [[Alocação de terceiros por slot]].
- **Chaveamento da Fase 32 (Jogos 73–88)** — tabela completa com as labels de origem (`src/pages/FormatoCopa.tsx:139`).
- **Regras do Mata-mata** — eliminatória simples; para o bolão valem apenas os 90 minutos (prorrogação e pênaltis não pontuam); empate exige indicar quem avança, sem pontuação extra (`src/pages/FormatoCopa.tsx:169`).

> [!note] Pontuação só nos 90 minutos
> Gols na prorrogação e pênaltis não contam para [[Pontuação]]. A indicação de quem avança no empate serve apenas para resolver o chaveamento das fases seguintes (relevante para o [[Bracket personalizado do usuário]]) e não rende pontos extras.

## Slots de terceiro colocado (resumo da tabela)

| Jogo | Campeão do grupo | Grupos elegíveis p/ o 3º |
| ---- | ---------------- | ------------------------ |
| 74   | 1º Grupo E       | A, B, C, D ou F          |
| 77   | 1º Grupo I       | C, D, F, G ou H          |
| 79   | 1º Grupo A       | C, E, F, H ou I          |
| 80   | 1º Grupo L       | E, H, I, J ou K          |
| 81   | 1º Grupo D       | B, E, F, I ou J          |
| 82   | 1º Grupo G       | A, E, H, I ou J          |
| 85   | 1º Grupo B       | E, F, G, I ou J          |
| 87   | 1º Grupo K       | D, E, I, J ou L          |

Fonte: `src/pages/FormatoCopa.tsx:117`. Nenhum terceiro enfrenta o 1º ou 2º do próprio grupo na primeira rodada.

## Plano de execução

O plano usa o workflow **superpowers** (subagent-driven-development / executing-plans) com checkboxes por tarefa, mesmo padrão de outras features do projeto.

> [!warning] Documentos históricos — não sobrescrever
> A spec e o plano são documentos de referência datados. **Não os altere nem os mescle nesta nota.** Linke-os: [[2026-04-16-labels-origem-formato-copa-design]] (design) e [[2026-04-16-labels-origem-formato-copa]] (plano). Esta nota é o índice vivo; aqueles registram a decisão original.

> [!tip] Onde os critérios FIFA viram código
> Os textos da página descrevem o comportamento real do bolão: head-to-head e saldo/gols vivem em [[Classificação de grupos]], o ranking dos terceiros em [[Melhores terceiros]], e o encaixe nos slots em [[Alocação de terceiros por slot]]. Empates persistentes usam desempate determinístico para que tabela e chaveamento não divirjam.

## Relacionados

- [[Operação MOC]]
- [[Visão Geral e Regulamento]]
- [[Bracket oficial]]
- [[Classificação de grupos]]
- [[Melhores terceiros]]
- [[Alocação de terceiros por slot]]
- [[Bracket personalizado do usuário]]
- [[Pontuação]]
- [[Navbar]]
- [[2026-04-16-labels-origem-formato-copa-design]]
- [[2026-04-16-labels-origem-formato-copa]]
