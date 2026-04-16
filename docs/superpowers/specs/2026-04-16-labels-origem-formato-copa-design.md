# Design: Labels de Origem no Mata-mata + Página Formato Copa

**Data:** 2026-04-16  
**Status:** Aprovado

---

## Resumo

Duas melhorias relacionadas ao chaveamento da Copa 2026:

1. **Labels de origem sempre visíveis** nos palpites do mata-mata (ex: "1º Grupo E", "3º dos Grupos A, B, C, D ou F")
2. **Página `/formato-copa`** no Navbar com as regras oficiais da FIFA para o torneio

---

## 1. Estrutura de Dados

### Campos novos no tipo `Jogo`

```typescript
// src/types/index.ts
export interface Jogo {
  // ... campos existentes ...
  labelCasa?: string       // ex: "2º Grupo A", "Venc. Jogo 73"
  labelVisitante?: string  // ex: "3º dos Grupos A, B, C, D ou F"
}
```

Esses campos são opcionais e só existem para jogos do mata-mata (fase32, oitavas, quartas, semi, terceiro, final).

### Seed script

O `scripts/seed-jogos.ts` popula `labelCasa` e `labelVisitante` para todos os 32 jogos do mata-mata:

**Fase 32 (16 jogos) — Jogos 73 a 88:**

| ID interno   | Jogo FIFA | labelCasa                          | labelVisitante                           |
|--------------|-----------|-------------------------------------|------------------------------------------|
| fase32_1     | Jogo 73   | 2º Grupo A                          | 2º Grupo B                               |
| fase32_2     | Jogo 74   | 1º Grupo E                          | 3º dos Grupos A, B, C, D ou F           |
| fase32_3     | Jogo 75   | 1º Grupo F                          | 2º Grupo C                               |
| fase32_4     | Jogo 76   | 1º Grupo C                          | 2º Grupo F                               |
| fase32_5     | Jogo 77   | 1º Grupo I                          | 3º dos Grupos C, D, F, G ou H           |
| fase32_6     | Jogo 78   | 2º Grupo E                          | 2º Grupo I                               |
| fase32_7     | Jogo 79   | 1º Grupo A                          | 3º dos Grupos C, E, F, H ou I           |
| fase32_8     | Jogo 80   | 1º Grupo L                          | 3º dos Grupos E, H, I, J ou K           |
| fase32_9     | Jogo 81   | 1º Grupo D                          | 3º dos Grupos B, E, F, I ou J           |
| fase32_10    | Jogo 82   | 1º Grupo G                          | 3º dos Grupos A, E, H, I ou J           |
| fase32_11    | Jogo 83   | 2º Grupo K                          | 2º Grupo L                               |
| fase32_12    | Jogo 84   | 1º Grupo H                          | 2º Grupo J                               |
| fase32_13    | Jogo 85   | 1º Grupo B                          | 3º dos Grupos E, F, G, I ou J           |
| fase32_14    | Jogo 86   | 1º Grupo J                          | 2º Grupo H                               |
| fase32_15    | Jogo 87   | 1º Grupo K                          | 3º dos Grupos D, E, I, J ou L           |
| fase32_16    | Jogo 88   | 2º Grupo D                          | 2º Grupo G                               |

**Oitavas (8 jogos) — Jogos 89 a 96:**

| ID interno  | Jogo FIFA | labelCasa          | labelVisitante     |
|-------------|-----------|--------------------|--------------------|
| oitavas_1   | Jogo 89   | Venc. Jogo 74      | Venc. Jogo 77      |
| oitavas_2   | Jogo 90   | Venc. Jogo 73      | Venc. Jogo 75      |
| oitavas_3   | Jogo 91   | Venc. Jogo 76      | Venc. Jogo 78      |
| oitavas_4   | Jogo 92   | Venc. Jogo 79      | Venc. Jogo 80      |
| oitavas_5   | Jogo 93   | Venc. Jogo 83      | Venc. Jogo 84      |
| oitavas_6   | Jogo 94   | Venc. Jogo 81      | Venc. Jogo 82      |
| oitavas_7   | Jogo 95   | Venc. Jogo 86      | Venc. Jogo 88      |
| oitavas_8   | Jogo 96   | Venc. Jogo 85      | Venc. Jogo 87      |

**Quartas (4 jogos) — Jogos 97 a 100:**

| ID interno  | Jogo FIFA | labelCasa          | labelVisitante     |
|-------------|-----------|--------------------|--------------------|
| quartas_1   | Jogo 97   | Venc. Jogo 89      | Venc. Jogo 90      |
| quartas_2   | Jogo 98   | Venc. Jogo 93      | Venc. Jogo 94      |
| quartas_3   | Jogo 99   | Venc. Jogo 91      | Venc. Jogo 92      |
| quartas_4   | Jogo 100  | Venc. Jogo 95      | Venc. Jogo 96      |

**Semifinais (2 jogos) — Jogos 101 e 102:**

| ID interno | Jogo FIFA | labelCasa          | labelVisitante     |
|------------|-----------|--------------------|--------------------|
| semi_1     | Jogo 101  | Venc. Jogo 97      | Venc. Jogo 98      |
| semi_2     | Jogo 102  | Venc. Jogo 99      | Venc. Jogo 100     |

**Terceiro lugar e Final — Jogos 103 e 104:**

| ID interno | Jogo FIFA | labelCasa          | labelVisitante     |
|------------|-----------|--------------------|--------------------|
| terceiro   | Jogo 103  | Perd. Semi 1       | Perd. Semi 2       |
| final      | Jogo 104  | Venc. Semi 1       | Venc. Semi 2       |

---

## 2. UI — Labels sempre visíveis no PalpiteInput

### Mudança no componente `PalpiteInput`

O `labelCasa`/`labelVisitante` já existe como prop. Atualmente só é exibido quando `!timeCasa`. A mudança é exibi-lo **sempre** como texto secundário abaixo do nome/bandeira:

```
Com time resolvido:
┌──────────────────────────────────┐
│  🇧🇷 Brasil    2  ×  1   🇦🇷 Argentina  │
│  2º Grupo A              1º Grupo B  │
└──────────────────────────────────┘

Sem time resolvido (placeholder):
┌──────────────────────────────────┐
│    [?] ——    × × ×    [?] ——     │
│  2º Grupo A        1º Grupo B    │
└──────────────────────────────────┘
```

Estilo: `text-xs text-gray-400 text-center mt-0.5`

### Mudança em `PalpitesMataMata`

- Passa `labelCasa={jogo.labelCasa}` e `labelVisitante={jogo.labelVisitante}` (campo do Firestore) **sempre**, independente de o time estar resolvido
- Remove a lógica `!timeCasa ? descreverOrigem(...) : undefined`
- A função `descreverOrigem()` pode ser removida (não é mais necessária)

---

## 3. Página `/formato-copa`

### Rota e Navbar

- Nova rota: `/formato-copa` → componente `FormatoCopa`
- Navbar: adiciona item "Formato Copa" no menu (entre Regulamento e outros itens)
- Acesso: todos os usuários autenticados (não requer `liberado: true`)

### Conteúdo da página

Página estática (sem dados do Firestore), dividida em 5 seções com scroll:

#### 3.1 Visão Geral
- 48 seleções, 12 grupos (A a L), 4 times por grupo
- 104 jogos no total: 72 na fase de grupos + 32 no mata-mata
- Mata-mata com 32 times: 24 classificados (1º e 2º de cada grupo) + 8 melhores 3ºs colocados

#### 3.2 Fase de Grupos
- Cada grupo joga round-robin (6 jogos, cada time joga 3)
- Classificação: pontos → saldo de gols → gols marcados → confronto direto → fair play → sorteio
- Top 2 de cada grupo avançam automaticamente ao mata-mata
- Os 8 melhores 3ºs colocados (entre os 12) também avançam

#### 3.3 Os 495 Cenários — Como os 3ºs são distribuídos
- Explicação: de 12 grupos, 8 terceiros avançam → C(12,8) = 495 combinações possíveis
- A FIFA pré-definiu o bracket para cada uma das 495 combinações
- Nenhum sorteio adicional ocorre após a fase de grupos
- Cada slot de 3º colocado tem 5 grupos possíveis que podem preenchê-lo

#### 3.4 Chaveamento do Mata-mata
Tabela com os 16 jogos da Fase 32 e suas origens exatas (conforme tabela da seção 1).
Depois, as oitavas, quartas, semis e final com "Venc. Jogo X".

#### 3.5 Regras do Mata-mata
- Empate em 90 min → 30 min de prorrogação → pênaltis se necessário
- Para o bolão: resultados valem apenas nos 90 minutos regulamentares (gols em prorrogação/pênaltis não contam para pontuação)
- Em caso de empate no mata-mata, o participante indica quem avança para resolver as fases seguintes (sem pontuação extra)

---

## Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/types/index.ts` | Adicionar `labelCasa?: string` e `labelVisitante?: string` ao tipo `Jogo` |
| `scripts/seed-jogos.ts` | Adicionar labels nos 32 jogos do mata-mata |
| `src/components/PalpiteInput.tsx` | Exibir label sempre (não só quando sem time) |
| `src/pages/PalpitesMataMata.tsx` | Passar `jogo.labelCasa/labelVisitante`; remover `descreverOrigem` |
| `src/pages/FormatoCopa.tsx` | Criar página nova |
| `src/components/Navbar.tsx` | Adicionar link "Formato Copa" |
| `src/App.tsx` | Adicionar rota `/formato-copa` |

---

## Dados FIFA confirmados — Slots de 3ºs Colocados

| Slot | Jogo FIFA | Campeão | Grupos elegíveis para o 3º |
|------|-----------|---------|----------------------------|
| 1    | Jogo 74   | 1º E    | A, B, C, D, F              |
| 2    | Jogo 77   | 1º I    | C, D, F, G, H              |
| 3    | Jogo 79   | 1º A    | C, E, F, H, I              |
| 4    | Jogo 80   | 1º L    | E, H, I, J, K              |
| 5    | Jogo 81   | 1º D    | B, E, F, I, J              |
| 6    | Jogo 82   | 1º G    | A, E, H, I, J              |
| 7    | Jogo 85   | 1º B    | E, F, G, I, J              |
| 8    | Jogo 87   | 1º K    | D, E, I, J, L              |

Fonte: FIFA Competition Regulations 2026, Annex C — 495 Cenários confirmados.
