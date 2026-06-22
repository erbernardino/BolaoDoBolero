---
title: Coleção config
tags:
  - dados
  - firestore
  - configuracao
  - invariante
  - seguranca
status: documentado
related:
  - "[[Configurações do bolão]]"
  - "[[Regras de segurança do Firestore]]"
  - "[[Resultados Especiais]]"
  - "[[Coleção _system]]"
---

A coleção Firestore `config` guarda os parâmetros globais do bolão. Por **convenção crítica do projeto** ela só pode conter dois documentos: `geral` e `resultado_especial`. Essa invariante NÃO é imposta pelo `firestore.rules` — é puramente documental, e já foi violada com impacto em produção.

> [!danger] Invariante crítica — só dois documentos
> A coleção `config` só pode conter os documentos `geral` e `resultado_especial`. Qualquer outro documento quebra leituras que dependem da estrutura conhecida da coleção. Para outros dados de sistema, use uma coleção separada como [[Coleção _system]] (ex: `_system/versao`, `meta/app_version`) — **nunca** `config`.

## Documentos permitidos

### config/geral
Mapeia a interface `Config` (`src/types/index.ts:11`). É editado pela tela [[Configurações do bolão]] e lido tanto pelo frontend quanto pelas próprias [[Regras de segurança do Firestore]].

| Campo | Tipo | Observação |
| --- | --- | --- |
| `pontos.placarExato` | number | usado pela [[Pontuação]] |
| `pontos.colunaCerta` | number | acerto do placar de um time |
| `pontos.totalGols` | number | acerto do total de gols |
| `pontos.palpiteEspecial` | number | pontos do palpite especial |
| `premiacao.primeiro` / `segundo` / `terceiro` / `antepenultimo` | number | premiação |
| `premiacao.doacao` / `taxaInscricao` | number | valores financeiros |
| `prazoLimitePalpites` | Timestamp | prazo global de envio de palpites |
| `visibilidadePalpites` | `'apos_prazo' \| 'apos_jogo' \| 'sempre' \| 'nunca'` | controla quando palpites alheios aparecem |
| `regrasPremiacao` | string | texto livre das regras |

### config/resultado_especial
Mapeia a interface `ResultadoEspecial` (`src/types/index.ts:117`). Alimenta a apuração dos [[Resultados Especiais]].

| Campo | Tipo |
| --- | --- |
| `campeao`, `vice`, `terceiro`, `quarto` | string (timeId) |
| `paisesArtilheiros` | string[] (timeIds) |

## A regra de segurança não restringe a dois docs

A regra em `firestore.rules:111` cobre qualquer `docId`:

```
match /config/{docId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}
```

> [!warning] As rules NÃO impõem o limite de dois documentos
> O `match /config/{docId}` permite que um admin escreva **qualquer** `docId` em `config`. O limite de dois documentos é convenção/documental, não uma garantia técnica. Não descreva as rules como "restringem `config` a dois docs" — elas não restringem; o controle é apenas convencional.

Vários campos de `config/geral` são lidos dentro das próprias funções de regra — `prazoAberto`, `canReadPalpite` e `canReadPalpiteEspecial` consultam `prazoLimitePalpites` e `visibilidadePalpites` via `get(.../config/geral)` (`firestore.rules:22`, `:35`, `:37-38`, `:41`, `:48`, `:50-51`). Ou seja, a integridade de `config/geral` é dependência direta da autorização de leitura de [[Entidades de palpite]].

## Incidente: config/app_version (2026-04-30)

> [!danger] Outage real causado por documento inesperado
> Em **2026-04-30**, a criação de `config/app_version` quebrou a [[Página Palpites]] em produção com o erro `Cannot read properties of undefined (reading 'toDate')`. Código que lê `config` assume a presença de campos como `prazoLimitePalpites` (um Timestamp) e chama `.toDate()`; ao topar com um documento sem esse campo, o acesso retorna `undefined` e o `.toDate()` falha.

O uso de `toDate()` em campos de timestamp é frágil a documentos inesperados na coleção `config`. A diretiva no topo do `CLAUDE.md` registra a regra de forma enfática: jamais criar documentos em `config` além de `geral` e `resultado_especial`.

## Dívida conhecida — o script ainda grava em config/app_version

> [!warning] Contradição ativa no repositório
> O script `scripts/atualizar-versao-app.ts` ainda grava e lê `/config/app_version` (`scripts/atualizar-versao-app.ts:45` e `:55`), contradizendo diretamente a diretiva do `CLAUDE.md`. Enquanto esse script for executado, leituras que assumem a estrutura de `config` podem quebrar como em 2026-04-30. Tratar como **dívida/risco conhecido** — ver [[Divergências conhecidas]]. O destino correto seria uma coleção separada como [[Coleção _system]] ou `meta/app_version`.

## Relacionados

- [[Configurações do bolão]] — tela admin que edita `config/geral`
- [[Resultados Especiais]] — consome `config/resultado_especial`
- [[Regras de segurança do Firestore]] — leem `config/geral` e não impõem o limite de docs
- [[Coleção _system]] — destino correto para dados de sistema fora de `config`
- [[Coleções do Firestore]] — panorama das coleções
- [[Divergências conhecidas]] — registra a dívida do `atualizar-versao-app.ts`
- [[Modelo de Dados MOC]]
