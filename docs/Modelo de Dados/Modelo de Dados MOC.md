---
title: Modelo de Dados MOC
tags:
  - moc
  - dados
status: documentado
related:
  - "[[Início]]"
  - "[[Coleções do Firestore]]"
  - "[[Regras de segurança do Firestore]]"
---

# 🗃️ Modelo de Dados e Segurança — MOC

Como o estado do bolão é representado no **Firestore** e protegido pelas **security rules**. Os tipos vivem em `src/types/index.ts`; o cálculo usa um subconjunto isolado em [[Tipos compartilhados de cálculo]].

## 📦 Coleções e entidades

- [[Coleções do Firestore]] — o mapa geral de todas as coleções.
- [[Entidade Usuario]] — perfil, papel (`admin`/`participante`) e liberação.
- [[Entidades de palpite]] — `Palpite`, `PalpiteEspecial`, `DesempateTerceiros`.
- [[Entidades estáticas]] — `Jogo`, `Time`, `Grupo`.
- [[Coleção _system]] — documentos de sistema (ranking meta, resultados) com leitura pública.

## 🔐 Segurança

- [[Regras de segurança do Firestore]] — helpers, validadores e quem escreve o quê.
- [[Coleção config]] — ⚠️ regra crítica: só `geral` e `resultado_especial`.
- [[Regras do Storage]] — fotos de perfil.
- [[Índices do Firestore]] — índices compostos (ex.: `audit_log`).

> [!danger] A [[Coleção config]] é restrita
> Criar qualquer documento além de `geral` e `resultado_especial` quebra leituras em produção. Sempre use uma coleção separada (ex.: [[Coleção _system]]) para outros dados de sistema.

## 🔗 Conexões

O modelo de dados é consumido pelo [[Frontend MOC|frontend]] e escrito pelas [[Cloud Functions MOC|Cloud Functions]] (coleções write-only como `ranking` e `audit_log`). As regras de [[Regras de segurança do Firestore|segurança]] espelham a [[Entidade Usuario|escalação de privilégio]] e a [[Auditoria]].

## Notas nesta área

```dataview
LIST FROM "Modelo de Dados" WHERE file.name != "Modelo de Dados MOC" SORT file.name ASC
```
