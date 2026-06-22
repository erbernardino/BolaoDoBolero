---
title: Coleções do Firestore
tags:
  - dados
  - firestore
  - modelo-de-dados
status: documentado
related:
  - "[[Regras de segurança do Firestore]]"
  - "[[Entidade Usuario]]"
  - "[[Entidades de palpite]]"
  - "[[Modelo de Dados MOC]]"
---

Inventário completo das coleções **raiz** do Firestore do Bolão do Bolero: nome, chave de documento e o que cada uma armazena. A autoridade máxima é o código — as coleções raiz são exatamente as que têm um bloco `match` em `firestore.rules`, e a forma dos documentos vem dos tipos em `src/types/index.ts`. Para a leitura/escrita de cada uma, veja [[Regras de segurança do Firestore]].

> [!info] Como a chave de documento é definida
> Algumas coleções usam **nome fixo** (`config`), outras são **chaveadas pelo `uid` do usuário**, e outras usam **auto-ID** gerado pelo Firestore (`.add()`). Quando o `uid` é a chave, ele costuma também aparecer como campo redundante dentro do documento (validado nas regras).

## Tabela de coleções raiz

| Coleção | Chave do documento | Tipo (src/types/index.ts) | Armazena |
|---|---|---|---|
| `config` | nome fixo (`geral`, `resultado_especial`) | `Config`, `ResultadoEspecial` | Configuração do bolão e resultado dos palpites especiais — ver [[Coleção config]] |
| `times` | auto-ID (`timeId`) | `Time` | Seleções da Copa (estático) — ver [[Entidades estáticas]] |
| `grupos` | auto-ID (`grupoId`) | `Grupo` | Grupos A–L da Copa (estático) — ver [[Entidades estáticas]] |
| `jogos` | auto-ID (`jogoId`) | `Jogo` | Jogos/tabela e resultado oficial — ver [[Entidades estáticas]] |
| `palpites` | **auto-ID** (`palpiteId`) | `Palpite` | Palpites de placar por jogo; dono é campo `uid` — ver [[Entidades de palpite]] |
| `palpites_especiais` | **`uid`** do usuário | `PalpiteEspecial` | Palpite de campeão/vice/3º/4º/país artilheiro — ver [[Entidades de palpite]] |
| `desempates_terceiros` | **`uid`** do usuário | `DesempateTerceiros` | Pontos disciplinares para posicionar 3º colocados no chaveamento — ver [[Melhores terceiros]] |
| `chat` | auto-ID (`messageId`) | (sem tipo em index.ts) | Mensagens do [[Chat Global]] |
| `_system` | nome fixo (`docId`) | (sem tipo em index.ts) | Flags de sistema (ex.: `isteste`) — ver [[Coleção _system]] |
| `audit_log` | auto-ID (`logId`) | (sem tipo em index.ts) | Trilha de [[Auditoria]], escrita só via Admin SDK |
| `ranking` | **`uid`** do usuário | `Ranking` | Pontuação acumulada por usuário — ver [[Pontuação]] |
| `usuarios` | **`uid`** do usuário | `Usuario` | Perfil do participante — ver [[Entidade Usuario]] |
| `usuarios_excluidos` | **`uid`** do usuário | (sem tipo em index.ts) | Backup de usuários excluídos, só Admin SDK |
| `convites` | auto-ID (`conviteId`) | `Convite` | Convites de cadastro — ver [[Gerenciar Usuários e Convites]] |

## Detalhes por categoria

### Chaveadas por nome fixo
A [[Coleção config]] só pode conter `config/geral` (mapeia a interface `Config`, `src/types/index.ts:11`) e `config/resultado_especial` (mapeia `ResultadoEspecial`, `src/types/index.ts:117`).

> [!danger] Nunca crie outros documentos em `config`
> A coleção `config` só pode ter `geral` e `resultado_especial`. Qualquer outro documento quebra leituras que dependem da estrutura conhecida (incidente `config/app_version` em produção). Para outros dados de sistema, use a [[Coleção _system]] (`_system/{docId}`), cuja regra é `allow read: if true` — leitura **pública**, não apenas autenticada (`firestore.rules:189`).

### Estáticas da Copa (escrita só admin)
`times/{timeId}` (`Time`, `src/types/index.ts:31`) e `grupos/{grupoId}` (`Grupo`, `src/types/index.ts:40`) são dados estáticos da Copa. `jogos/{jogoId}` (`Jogo`) carrega a tabela e o resultado oficial. Todas têm `allow write: if isAdmin()`. Detalhamento em [[Entidades estáticas]] e [[Formato da Copa 2026]].

### Entidades de palpite
A coleção `palpites/{palpiteId}` usa **auto-ID**: o dono **não** é a chave, mas sim o campo `uid` do documento (`firestore.rules:136`, validado em `isValidPalpite`, `firestore.rules:55`). Já `palpites_especiais/{uid}` e `desempates_terceiros/{uid}` são chaveadas diretamente pelo `uid` do usuário, com o `uid` também presente como campo validado. Mais em [[Entidades de palpite]].

### Por usuário (`{uid}`)
`ranking/{uid}` (`Ranking`, escrita só por Cloud Functions via Admin SDK), `usuarios/{uid}` (`Usuario`) e `usuarios_excluidos/{uid}` (backup, só Admin SDK) são todas chaveadas pelo `uid`. Ver [[Entidade Usuario]].

> [!note] `fcmToken` é campo, não coleção
> O token de push **não** é uma coleção separada: é um campo opcional do documento `usuarios/{uid}`, presente nos whitelists de `create` e `update` das regras (`firestore.rules:93` e `firestore.rules:102`). Curiosamente, o campo `fcmToken` está nas regras mas **não** aparece na interface `Usuario` em `src/types/index.ts:74`. Ver [[FCM e notificações]].

### Auto-ID gerado pelo Firestore
`convites/{conviteId}` (`Convite`, `src/types/index.ts:89`), `chat/{messageId}` e `audit_log/{logId}` (criado via `.add()`, escrita só Admin SDK) usam IDs automáticos.

## Armadilhas

> [!warning] A lista de entidades de palpite não é exaustiva
> Além de palpites e usuários, existem também `chat` ([[Chat Global]]), `_system` ([[Coleção _system]]), `audit_log` ([[Auditoria]]), `usuarios_excluidos` e `desempates_terceiros` — todas mapeadas aqui. Não pressuponha que só existem as coleções "óbvias".

> [!warning] A coleção `notificacoes` não existe
> A interface `Notificacao` (`src/types/index.ts:98`) é definida mas **nunca** gravada no Firestore: é um tipo client-side usado apenas para push via FCM, sem coleção nem regra de segurança. Não procure por uma coleção `notificacoes` — ela não existe. Ver [[FCM e notificações]].

## Relacionados

- [[Modelo de Dados MOC]]
- [[Regras de segurança do Firestore]]
- [[Coleção config]]
- [[Coleção _system]]
- [[Entidade Usuario]]
- [[Entidades de palpite]]
- [[Entidades estáticas]]
- [[FCM e notificações]]
- [[Chat Global]]
- [[Auditoria]]
- [[Pontuação]]
