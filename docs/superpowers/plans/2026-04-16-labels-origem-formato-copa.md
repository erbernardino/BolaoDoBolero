# Labels de Origem no Mata-mata + Página Formato Copa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exibir sempre ao lado de cada time no mata-mata a origem da vaga (ex: "1º Grupo E", "3º dos Grupos A, B, C, D ou F", "Venc. Jogo 89"), e criar página `/formato-copa` no Navbar com as regras oficiais da FIFA 2026.

**Architecture:** Adicionar campos `labelCasa?` e `labelVisitante?` ao tipo `Jogo` e popular via seed script. O `PalpiteInput` exibe o label sempre abaixo do nome do time. A nova página `FormatoCopa` é estática (sem Firestore), adicionada ao Navbar e ao roteador.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Firebase Firestore, Vite

---

## Mapeamento de IDs → Número FIFA

| ID interno   | Jogo # | ID interno  | Jogo # |
|--------------|--------|-------------|--------|
| fase32_1     | 73     | oitavas_1   | 89     |
| fase32_2     | 74     | oitavas_2   | 90     |
| fase32_3     | 75     | oitavas_3   | 91     |
| fase32_4     | 76     | oitavas_4   | 92     |
| fase32_5     | 77     | oitavas_5   | 93     |
| fase32_6     | 78     | oitavas_6   | 94     |
| fase32_7     | 79     | oitavas_7   | 95     |
| fase32_8     | 80     | oitavas_8   | 96     |
| fase32_9     | 81     | quartas_1   | 97     |
| fase32_10    | 82     | quartas_2   | 98     |
| fase32_11    | 83     | quartas_3   | 99     |
| fase32_12    | 84     | quartas_4   | 100    |
| fase32_13    | 85     | semi_1      | 101    |
| fase32_14    | 86     | semi_2      | 102    |
| fase32_15    | 87     | terceiro    | 103    |
| fase32_16    | 88     | final       | 104    |

---

## Arquivos Modificados/Criados

| Arquivo | Ação |
|---------|------|
| `src/types/index.ts` | Adicionar `labelCasa?` e `labelVisitante?` ao tipo `Jogo` |
| `scripts/seed-jogos.ts` | Adicionar labels nos 32 jogos do mata-mata |
| `src/components/PalpiteInput.tsx` | Exibir label sempre abaixo do time |
| `src/pages/PalpitesMataMata.tsx` | Passar `jogo.labelCasa/labelVisitante`; remover `descreverOrigem` |
| `src/pages/FormatoCopa.tsx` | Criar página nova |
| `src/App.tsx` | Adicionar rota `/formato-copa` |
| `src/components/Navbar.tsx` | Adicionar link "Formato Copa" |

---

## Task 1: Adicionar campos ao tipo Jogo

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Adicionar `labelCasa` e `labelVisitante` ao interface `Jogo`**

No arquivo `src/types/index.ts`, localizar o `interface Jogo` (atualmente tem os campos `id`, `numero`, `fase`, `grupo`, `timeCasa`, `timeVisitante`, `origemCasa`, `origemVisitante`, `dataHora`, `resultado`, `encerrado`, `aoVivo?`) e adicionar dois campos opcionais ao final:

```typescript
export interface Jogo {
  id: string
  numero: number
  fase: Fase
  grupo: string | null
  timeCasa: string
  timeVisitante: string
  origemCasa: Origem | null
  origemVisitante: Origem | null
  dataHora: Timestamp
  resultado: Resultado | null
  encerrado: boolean
  aoVivo?: boolean
  labelCasa?: string
  labelVisitante?: string
}
```

- [ ] **Step 2: Verificar que o TypeScript compila sem erros**

```bash
cd /Users/emersonbernardino/desenvolvimento/projetos/pessoais/BolaoDoBolero
npm run build 2>&1 | head -30
```

Esperado: sem erros de tipo relacionados a `Jogo`.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: adicionar labelCasa/labelVisitante ao tipo Jogo"
```

---

## Task 2: Popular labels no seed script

**Files:**
- Modify: `scripts/seed-jogos.ts`

O seed cria os jogos do mata-mata em dois estágios: (1) `buildFase32()` que usa `g('A', 2)` para origens de grupo, e (2) funções para oitavas/quartas/semi/final que usam `jogo('fase32_X')` para origens de jogo. Precisamos adicionar `labelCasa` e `labelVisitante` em cada entrada.

- [ ] **Step 1: Adicionar labels na `buildFase32()`**

Localizar o array de objetos dentro de `buildFase32()` (começa na linha ~266) e substituir por:

```typescript
const fase32Entries = [
  { id: 'fase32_1',  casa: g('A', 2), visitante: g('B', 2), date: '2026-06-28T19:00:00Z', labelCasa: '2º Grupo A',  labelVisitante: '2º Grupo B' },
  { id: 'fase32_2',  casa: g('E', 1), visitante: g('A', 3), date: '2026-06-29T17:00:00Z', labelCasa: '1º Grupo E',  labelVisitante: '3º dos Grupos A, B, C, D ou F' },
  { id: 'fase32_3',  casa: g('F', 1), visitante: g('C', 2), date: '2026-06-29T20:00:00Z', labelCasa: '1º Grupo F',  labelVisitante: '2º Grupo C' },
  { id: 'fase32_4',  casa: g('C', 1), visitante: g('F', 2), date: '2026-06-29T23:00:00Z', labelCasa: '1º Grupo C',  labelVisitante: '2º Grupo F' },
  { id: 'fase32_5',  casa: g('I', 1), visitante: g('C', 3), date: '2026-06-30T17:00:00Z', labelCasa: '1º Grupo I',  labelVisitante: '3º dos Grupos C, D, F, G ou H' },
  { id: 'fase32_6',  casa: g('E', 2), visitante: g('I', 2), date: '2026-06-30T20:00:00Z', labelCasa: '2º Grupo E',  labelVisitante: '2º Grupo I' },
  { id: 'fase32_7',  casa: g('A', 1), visitante: g('F', 3), date: '2026-06-30T23:00:00Z', labelCasa: '1º Grupo A',  labelVisitante: '3º dos Grupos C, E, F, H ou I' },
  { id: 'fase32_8',  casa: g('L', 1), visitante: g('E', 3), date: '2026-07-01T17:00:00Z', labelCasa: '1º Grupo L',  labelVisitante: '3º dos Grupos E, H, I, J ou K' },
  { id: 'fase32_9',  casa: g('D', 1), visitante: g('B', 3), date: '2026-07-01T20:00:00Z', labelCasa: '1º Grupo D',  labelVisitante: '3º dos Grupos B, E, F, I ou J' },
  { id: 'fase32_10', casa: g('G', 1), visitante: g('H', 3), date: '2026-07-01T23:00:00Z', labelCasa: '1º Grupo G',  labelVisitante: '3º dos Grupos A, E, H, I ou J' },
  { id: 'fase32_11', casa: g('K', 2), visitante: g('L', 2), date: '2026-07-02T17:00:00Z', labelCasa: '2º Grupo K',  labelVisitante: '2º Grupo L' },
  { id: 'fase32_12', casa: g('H', 1), visitante: g('J', 2), date: '2026-07-02T20:00:00Z', labelCasa: '1º Grupo H',  labelVisitante: '2º Grupo J' },
  { id: 'fase32_13', casa: g('B', 1), visitante: g('G', 3), date: '2026-07-02T23:00:00Z', labelCasa: '1º Grupo B',  labelVisitante: '3º dos Grupos E, F, G, I ou J' },
  { id: 'fase32_14', casa: g('J', 1), visitante: g('H', 2), date: '2026-07-03T17:00:00Z', labelCasa: '1º Grupo J',  labelVisitante: '2º Grupo H' },
  { id: 'fase32_15', casa: g('K', 1), visitante: g('D', 3), date: '2026-07-03T20:00:00Z', labelCasa: '1º Grupo K',  labelVisitante: '3º dos Grupos D, E, I, J ou L' },
  { id: 'fase32_16', casa: g('D', 2), visitante: g('G', 2), date: '2026-07-03T23:00:00Z', labelCasa: '2º Grupo D',  labelVisitante: '2º Grupo G' },
]
```

Garantir que o código que cria os documentos Firestore inclua esses campos. Procurar onde `fase32Entries` é iterado para adicionar o jogo ao Firestore e incluir `labelCasa` e `labelVisitante`:

```typescript
const jogoData: Partial<Jogo> = {
  numero: jogoNumero++,
  fase: 'fase32',
  grupo: null,
  timeCasa: '',
  timeVisitante: '',
  origemCasa: entry.casa,
  origemVisitante: entry.visitante,
  dataHora: Timestamp.fromDate(new Date(entry.date)),
  resultado: null,
  encerrado: false,
  labelCasa: entry.labelCasa,
  labelVisitante: entry.labelVisitante,
}
```

- [ ] **Step 2: Adicionar labels nas oitavas de final**

Localizar o array dentro de `buildOitavas()` (linha ~308) e substituir por:

```typescript
const oitavasEntries = [
  { id: 'oitavas_1', casa: jogo('fase32_2'),  visitante: jogo('fase32_5'),  date: '2026-07-04T17:00:00Z', labelCasa: 'Venc. Jogo 74', labelVisitante: 'Venc. Jogo 77' },
  { id: 'oitavas_2', casa: jogo('fase32_1'),  visitante: jogo('fase32_3'),  date: '2026-07-04T21:00:00Z', labelCasa: 'Venc. Jogo 73', labelVisitante: 'Venc. Jogo 75' },
  { id: 'oitavas_3', casa: jogo('fase32_4'),  visitante: jogo('fase32_6'),  date: '2026-07-05T17:00:00Z', labelCasa: 'Venc. Jogo 76', labelVisitante: 'Venc. Jogo 78' },
  { id: 'oitavas_4', casa: jogo('fase32_7'),  visitante: jogo('fase32_8'),  date: '2026-07-05T21:00:00Z', labelCasa: 'Venc. Jogo 79', labelVisitante: 'Venc. Jogo 80' },
  { id: 'oitavas_5', casa: jogo('fase32_11'), visitante: jogo('fase32_12'), date: '2026-07-06T17:00:00Z', labelCasa: 'Venc. Jogo 83', labelVisitante: 'Venc. Jogo 84' },
  { id: 'oitavas_6', casa: jogo('fase32_9'),  visitante: jogo('fase32_10'), date: '2026-07-06T21:00:00Z', labelCasa: 'Venc. Jogo 81', labelVisitante: 'Venc. Jogo 82' },
  { id: 'oitavas_7', casa: jogo('fase32_14'), visitante: jogo('fase32_16'), date: '2026-07-07T17:00:00Z', labelCasa: 'Venc. Jogo 86', labelVisitante: 'Venc. Jogo 88' },
  { id: 'oitavas_8', casa: jogo('fase32_13'), visitante: jogo('fase32_15'), date: '2026-07-07T21:00:00Z', labelCasa: 'Venc. Jogo 85', labelVisitante: 'Venc. Jogo 87' },
]
```

- [ ] **Step 3: Adicionar labels nas quartas de final**

Localizar o array dentro de `buildQuartas()` (linha ~330) e substituir por:

```typescript
const quartasEntries = [
  { id: 'quartas_1', casa: jogo('oitavas_1'), visitante: jogo('oitavas_2'), date: '2026-07-09T21:00:00Z', labelCasa: 'Venc. Jogo 89', labelVisitante: 'Venc. Jogo 90' },
  { id: 'quartas_2', casa: jogo('oitavas_5'), visitante: jogo('oitavas_6'), date: '2026-07-10T21:00:00Z', labelCasa: 'Venc. Jogo 93', labelVisitante: 'Venc. Jogo 94' },
  { id: 'quartas_3', casa: jogo('oitavas_3'), visitante: jogo('oitavas_4'), date: '2026-07-11T17:00:00Z', labelCasa: 'Venc. Jogo 91', labelVisitante: 'Venc. Jogo 92' },
  { id: 'quartas_4', casa: jogo('oitavas_7'), visitante: jogo('oitavas_8'), date: '2026-07-11T21:00:00Z', labelCasa: 'Venc. Jogo 95', labelVisitante: 'Venc. Jogo 96' },
]
```

- [ ] **Step 4: Adicionar labels nas semis, terceiro e final**

Localizar `buildSemis()` (linha ~344) e `buildTerceiroEFinal()` (linha ~350) e substituir por:

```typescript
// semis
const semisEntries = [
  { id: 'semi_1', casa: jogo('quartas_1'), visitante: jogo('quartas_2'), date: '2026-07-14T21:00:00Z', labelCasa: 'Venc. Jogo 97', labelVisitante: 'Venc. Jogo 98' },
  { id: 'semi_2', casa: jogo('quartas_3'), visitante: jogo('quartas_4'), date: '2026-07-15T21:00:00Z', labelCasa: 'Venc. Jogo 99', labelVisitante: 'Venc. Jogo 100' },
]

// terceiro e final
const terceiroEFinalEntries = [
  {
    id: 'terceiro',
    fase: 'terceiro' as Fase,
    casa: jogo('semi_1', 'perdedor'),
    visitante: jogo('semi_2', 'perdedor'),
    date: '2026-07-18T17:00:00Z',
    labelCasa: 'Perd. Semi 1',
    labelVisitante: 'Perd. Semi 2',
  },
  {
    id: 'final',
    fase: 'final' as Fase,
    casa: jogo('semi_1', 'vencedor'),
    visitante: jogo('semi_2', 'vencedor'),
    date: '2026-07-19T17:00:00Z',
    labelCasa: 'Venc. Semi 1',
    labelVisitante: 'Venc. Semi 2',
  },
]
```

Garantir que o loop de criação de cada estágio inclua `labelCasa` e `labelVisitante` ao criar o documento Firestore.

- [ ] **Step 5: Compilar o script para verificar tipos**

```bash
cd /Users/emersonbernardino/desenvolvimento/projetos/pessoais/BolaoDoBolero
npx tsc --noEmit scripts/seed-jogos.ts 2>&1 | head -20
```

Esperado: sem erros de tipo.

- [ ] **Step 6: Commit**

```bash
git add scripts/seed-jogos.ts
git commit -m "feat: adicionar labels de origem FIFA nos jogos do mata-mata"
```

---

## Task 3: Atualizar PalpiteInput para sempre exibir o label

**Files:**
- Modify: `src/components/PalpiteInput.tsx`

Atualmente os campos `labelCasa` e `labelVisitante` são usados como fallback quando o time não está disponível (`timeCasa?.nome ?? labelCasa ?? '?'`). Precisamos exibi-los **também** como texto secundário abaixo do nome/bandeira, sempre que presentes.

- [ ] **Step 1: Adicionar label abaixo do time casa**

Localizar o bloco `{/* Time Casa */}` (~linha 103) em `src/components/PalpiteInput.tsx`. Atualmente:

```tsx
<div className="flex items-center gap-2 flex-1 justify-end">
  <span className={`font-semibold text-sm ${timeCasa ? 'text-gray-700' : 'text-gray-400 italic'}`}>
    {timeCasa?.nome ?? labelCasa ?? '?'}
  </span>
  {timeCasa?.bandeira ? (
    <img src={timeCasa.bandeira} alt={timeCasa.nome ?? timeCasa.sigla} className="w-8 h-6 object-cover rounded" />
  ) : (
    <div className="w-8 h-6 bg-gray-200 rounded" />
  )}
</div>
```

Substituir por:

```tsx
<div className="flex flex-col items-end flex-1 gap-0.5">
  <div className="flex items-center gap-2">
    <span className={`font-semibold text-sm ${timeCasa ? 'text-gray-700' : 'text-gray-400 italic'}`}>
      {timeCasa?.nome ?? labelCasa ?? '?'}
    </span>
    {timeCasa?.bandeira ? (
      <img src={timeCasa.bandeira} alt={timeCasa.nome ?? timeCasa.sigla} className="w-8 h-6 object-cover rounded" />
    ) : (
      <div className="w-8 h-6 bg-gray-200 rounded" />
    )}
  </div>
  {labelCasa && timeCasa && (
    <span className="text-xs text-gray-400">{labelCasa}</span>
  )}
</div>
```

- [ ] **Step 2: Adicionar label abaixo do time visitante**

Localizar o bloco `{/* Time Visitante */}` (~linha 139). Atualmente:

```tsx
<div className="flex items-center gap-2 flex-1">
  {timeVisitante?.bandeira ? (
    <img src={timeVisitante.bandeira} alt={timeVisitante.nome ?? timeVisitante.sigla} className="w-8 h-6 object-cover rounded" />
  ) : (
    <div className="w-8 h-6 bg-gray-200 rounded" />
  )}
  <span className={`font-semibold text-sm ${timeVisitante ? 'text-gray-700' : 'text-gray-400 italic'}`}>
    {timeVisitante?.nome ?? labelVisitante ?? '?'}
  </span>
</div>
```

Substituir por:

```tsx
<div className="flex flex-col items-start flex-1 gap-0.5">
  <div className="flex items-center gap-2">
    {timeVisitante?.bandeira ? (
      <img src={timeVisitante.bandeira} alt={timeVisitante.nome ?? timeVisitante.sigla} className="w-8 h-6 object-cover rounded" />
    ) : (
      <div className="w-8 h-6 bg-gray-200 rounded" />
    )}
    <span className={`font-semibold text-sm ${timeVisitante ? 'text-gray-700' : 'text-gray-400 italic'}`}>
      {timeVisitante?.nome ?? labelVisitante ?? '?'}
    </span>
  </div>
  {labelVisitante && timeVisitante && (
    <span className="text-xs text-gray-400">{labelVisitante}</span>
  )}
</div>
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | grep -E "error|warning" | head -20
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/components/PalpiteInput.tsx
git commit -m "feat: exibir label de origem sempre abaixo do time no mata-mata"
```

---

## Task 4: Atualizar PalpitesMataMata para passar labels do Firestore

**Files:**
- Modify: `src/pages/PalpitesMataMata.tsx`

- [ ] **Step 1: Substituir a lógica de labels**

Localizar a função `descreverOrigem` (~linha 216) e o uso dela na prop `labelCasa`/`labelVisitante` do `PalpiteInput` (~linha 293-294):

```tsx
// Linha ~293-294 (atual):
labelCasa={!timeCasa ? descreverOrigem(jogo.origemCasa) : undefined}
labelVisitante={!timeVisitante ? descreverOrigem(jogo.origemVisitante) : undefined}
```

Substituir por:

```tsx
labelCasa={jogo.labelCasa ?? (!timeCasa ? descreverOrigem(jogo.origemCasa) : undefined)}
labelVisitante={jogo.labelVisitante ?? (!timeVisitante ? descreverOrigem(jogo.origemVisitante) : undefined)}
```

Isso garante retrocompatibilidade: se o campo existir no Firestore, usa-o; caso contrário, cai no `descreverOrigem` como fallback (jogos sem o campo ainda funcionam).

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "error" | head -10
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/PalpitesMataMata.tsx
git commit -m "feat: usar jogo.labelCasa/labelVisitante do Firestore no mata-mata"
```

---

## Task 5: Criar página FormatoCopa

**Files:**
- Create: `src/pages/FormatoCopa.tsx`

- [ ] **Step 1: Criar o componente**

Criar `src/pages/FormatoCopa.tsx` com o conteúdo completo:

```tsx
import { Navbar } from '../components/Navbar'

const fase32Jogos = [
  { jogo: 73, casa: '2º Grupo A',  visitante: '2º Grupo B' },
  { jogo: 74, casa: '1º Grupo E',  visitante: '3º dos Grupos A, B, C, D ou F' },
  { jogo: 75, casa: '1º Grupo F',  visitante: '2º Grupo C' },
  { jogo: 76, casa: '1º Grupo C',  visitante: '2º Grupo F' },
  { jogo: 77, casa: '1º Grupo I',  visitante: '3º dos Grupos C, D, F, G ou H' },
  { jogo: 78, casa: '2º Grupo E',  visitante: '2º Grupo I' },
  { jogo: 79, casa: '1º Grupo A',  visitante: '3º dos Grupos C, E, F, H ou I' },
  { jogo: 80, casa: '1º Grupo L',  visitante: '3º dos Grupos E, H, I, J ou K' },
  { jogo: 81, casa: '1º Grupo D',  visitante: '3º dos Grupos B, E, F, I ou J' },
  { jogo: 82, casa: '1º Grupo G',  visitante: '3º dos Grupos A, E, H, I ou J' },
  { jogo: 83, casa: '2º Grupo K',  visitante: '2º Grupo L' },
  { jogo: 84, casa: '1º Grupo H',  visitante: '2º Grupo J' },
  { jogo: 85, casa: '1º Grupo B',  visitante: '3º dos Grupos E, F, G, I ou J' },
  { jogo: 86, casa: '1º Grupo J',  visitante: '2º Grupo H' },
  { jogo: 87, casa: '1º Grupo K',  visitante: '3º dos Grupos D, E, I, J ou L' },
  { jogo: 88, casa: '2º Grupo D',  visitante: '2º Grupo G' },
]

export function FormatoCopa() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Formato da Copa do Mundo FIFA 2026</h1>

        {/* Visão Geral */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Visão Geral</h2>
          <ul className="text-sm space-y-1 list-disc ml-5">
            <li><strong>48 seleções</strong> divididas em <strong>12 grupos</strong> (A a L), com 4 times cada</li>
            <li><strong>104 jogos</strong> no total: 72 na fase de grupos + 32 no mata-mata</li>
            <li>Sede: Estados Unidos, Canadá e México — junho e julho de 2026</li>
          </ul>
        </section>

        {/* Fase de Grupos */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Fase de Grupos</h2>
          <p className="text-sm text-gray-600">Cada grupo joga em formato <em>round-robin</em>: todos contra todos (6 jogos por grupo, cada seleção joga 3).</p>
          <h3 className="font-semibold text-sm mt-3">Classificação dentro do grupo</h3>
          <ol className="text-sm list-decimal ml-5 space-y-0.5">
            <li>Maior número de pontos (vitória = 3, empate = 1, derrota = 0)</li>
            <li>Maior saldo de gols</li>
            <li>Maior número de gols marcados</li>
            <li>Resultado do confronto direto</li>
            <li>Fair play (cartões)</li>
            <li>Sorteio</li>
          </ol>
          <h3 className="font-semibold text-sm mt-3">Quem avança?</h3>
          <ul className="text-sm list-disc ml-5 space-y-0.5">
            <li><strong>1º e 2º colocados</strong> de cada grupo avançam automaticamente (24 times)</li>
            <li><strong>Os 8 melhores 3ºs colocados</strong> entre os 12 grupos também avançam</li>
            <li>Total: <strong>32 times</strong> no mata-mata</li>
          </ul>
        </section>

        {/* Os 495 cenários */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Os 495 Cenários — Como os 3ºs Colocados São Distribuídos</h2>
          <p className="text-sm text-gray-600">
            Dos 12 grupos, exatamente 8 terão seus 3ºs colocados classificados. O número de combinações possíveis é{' '}
            <strong>C(12,8) = 495</strong>.
          </p>
          <p className="text-sm text-gray-600">
            A FIFA pré-definiu o chaveamento do mata-mata para cada uma das 495 combinações, sem necessidade de sorteio adicional após a fase de grupos.
          </p>
          <p className="text-sm text-gray-600">
            Cada slot de 3º colocado no Jogo da Fase 32 tem exatamente <strong>5 grupos elegíveis</strong> (dos 12), garantindo que nenhum terceiro colocado enfrente o 1º ou 2º de seu próprio grupo na primeira rodada.
          </p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Jogo</th>
                  <th className="px-3 py-2 text-left border-b">Campeão do Grupo</th>
                  <th className="px-3 py-2 text-left border-b">Grupos Elegíveis para o 3º</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { jogo: 74,  camp: '1º Grupo E', grupos: 'A, B, C, D ou F' },
                  { jogo: 77,  camp: '1º Grupo I', grupos: 'C, D, F, G ou H' },
                  { jogo: 79,  camp: '1º Grupo A', grupos: 'C, E, F, H ou I' },
                  { jogo: 80,  camp: '1º Grupo L', grupos: 'E, H, I, J ou K' },
                  { jogo: 81,  camp: '1º Grupo D', grupos: 'B, E, F, I ou J' },
                  { jogo: 82,  camp: '1º Grupo G', grupos: 'A, E, H, I ou J' },
                  { jogo: 85,  camp: '1º Grupo B', grupos: 'E, F, G, I ou J' },
                  { jogo: 87,  camp: '1º Grupo K', grupos: 'D, E, I, J ou L' },
                ].map(({ jogo, camp, grupos }) => (
                  <tr key={jogo} className="even:bg-gray-50">
                    <td className="px-3 py-1.5 border-b font-medium">Jogo {jogo}</td>
                    <td className="px-3 py-1.5 border-b">{camp}</td>
                    <td className="px-3 py-1.5 border-b text-blue-700">{grupos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Chaveamento Fase 32 */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Chaveamento da Fase 32 (Jogos 73–88)</h2>
          <p className="text-sm text-gray-500">Conforme regulamento oficial da FIFA 2026.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-center border-b">Jogo</th>
                  <th className="px-3 py-2 text-right border-b">Time A</th>
                  <th className="px-3 py-2 text-center border-b">×</th>
                  <th className="px-3 py-2 text-left border-b">Time B</th>
                </tr>
              </thead>
              <tbody>
                {fase32Jogos.map(({ jogo, casa, visitante }) => (
                  <tr key={jogo} className="even:bg-gray-50">
                    <td className="px-3 py-1.5 border-b text-center font-medium text-gray-500">{jogo}</td>
                    <td className="px-3 py-1.5 border-b text-right font-semibold">{casa}</td>
                    <td className="px-3 py-1.5 border-b text-center text-gray-400">×</td>
                    <td className={`px-3 py-1.5 border-b font-semibold ${visitante.startsWith('3º dos') ? 'text-blue-700' : ''}`}>
                      {visitante}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Regras do Mata-mata */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Regras do Mata-mata</h2>
          <ul className="text-sm list-disc ml-5 space-y-1">
            <li>Eliminatória simples — quem perde está eliminado</li>
            <li>Em caso de empate ao final dos 90 minutos: 30 min de prorrogação, depois disputa de pênaltis se necessário</li>
            <li><strong>Para o bolão:</strong> os resultados apostados valem apenas para os 90 minutos regulamentares. Gols em prorrogação e pênaltis não contam para pontuação</li>
            <li>Quando há empate no mata-mata, o participante indica quem avança (para resolver o chaveamento das fases seguintes). Essa escolha não vale pontuação extra</li>
          </ul>
          <div className="text-xs text-gray-400 mt-2 pt-2 border-t">
            Fonte: FIFA Competition Regulations Canada/Mexico/USA 2026
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
npm run build 2>&1 | grep -E "error" | head -10
```

Esperado: zero erros.

- [ ] **Step 3: Commit**

```bash
git add src/pages/FormatoCopa.tsx
git commit -m "feat: criar página /formato-copa com regras oficiais da FIFA 2026"
```

---

## Task 6: Adicionar rota e link no Navbar

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Navbar.tsx`

- [ ] **Step 1: Adicionar import e rota em `src/App.tsx`**

Após a linha do import de `Regulamento`:

```tsx
const Regulamento = lazy(() => import('./pages/Regulamento').then(m => ({ default: m.Regulamento })))
```

Adicionar:

```tsx
const FormatoCopa = lazy(() => import('./pages/FormatoCopa').then(m => ({ default: m.FormatoCopa })))
```

Dentro de `<Routes>`, após a rota de `/regulamento`:

```tsx
<Route path="/regulamento" element={<ProtectedRoute><Regulamento /></ProtectedRoute>} />
<Route path="/formato-copa" element={<ProtectedRoute><FormatoCopa /></ProtectedRoute>} />
```

- [ ] **Step 2: Adicionar link no array `navLinks` em `src/components/Navbar.tsx`**

Localizar o array `navLinks` (linha ~38). Adicionar entrada de "Formato Copa" após "Regulamento":

```tsx
const navLinks = [
  { to: '/palpites', label: 'Palpites' },
  ...(liberado ? [
    { to: '/todos-palpites', label: 'Geral' },
    { to: '/ranking', label: 'Ranking' },
  ] : []),
  { to: '/regulamento', label: 'Regulamento' },
  { to: '/formato-copa', label: 'Formato Copa' },
  ...(usuario?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
]
```

- [ ] **Step 3: Verificar build**

```bash
npm run build 2>&1 | grep -E "error" | head -10
```

Esperado: zero erros.

- [ ] **Step 4: Verificar no navegador**

```bash
npm run dev
```

Abrir `http://localhost:5173`, verificar:
- Link "Formato Copa" aparece no Navbar
- Clicar leva a `/formato-copa`
- Página exibe as 5 seções corretamente
- Tabela da Fase 32 com os 16 jogos está completa
- 3ºs colocados em azul (`text-blue-700`)

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/Navbar.tsx
git commit -m "feat: adicionar rota e link Navbar para /formato-copa"
```

---

## Task 7: Atualizar Firestore com os novos campos (seed)

> **Nota:** Esta task só é necessária se o banco Firestore já estiver populado com os jogos sem os campos `labelCasa`/`labelVisitante`. Se o ambiente for de desenvolvimento e for refazer o seed do zero, pule esta task.

**Files:**
- Modify: `scripts/seed-jogos.ts` (já modificado na Task 2)
- Create: `scripts/update-labels-jogos.ts` (script de migração pontual)

- [ ] **Step 1: Criar script de migração para atualizar apenas os labels**

Criar `scripts/update-labels-jogos.ts`:

```typescript
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const serviceAccount = require('../service-account.json')
initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

const labels: Record<string, { labelCasa: string; labelVisitante: string }> = {
  // Fase 32
  fase32_1:  { labelCasa: '2º Grupo A',  labelVisitante: '2º Grupo B' },
  fase32_2:  { labelCasa: '1º Grupo E',  labelVisitante: '3º dos Grupos A, B, C, D ou F' },
  fase32_3:  { labelCasa: '1º Grupo F',  labelVisitante: '2º Grupo C' },
  fase32_4:  { labelCasa: '1º Grupo C',  labelVisitante: '2º Grupo F' },
  fase32_5:  { labelCasa: '1º Grupo I',  labelVisitante: '3º dos Grupos C, D, F, G ou H' },
  fase32_6:  { labelCasa: '2º Grupo E',  labelVisitante: '2º Grupo I' },
  fase32_7:  { labelCasa: '1º Grupo A',  labelVisitante: '3º dos Grupos C, E, F, H ou I' },
  fase32_8:  { labelCasa: '1º Grupo L',  labelVisitante: '3º dos Grupos E, H, I, J ou K' },
  fase32_9:  { labelCasa: '1º Grupo D',  labelVisitante: '3º dos Grupos B, E, F, I ou J' },
  fase32_10: { labelCasa: '1º Grupo G',  labelVisitante: '3º dos Grupos A, E, H, I ou J' },
  fase32_11: { labelCasa: '2º Grupo K',  labelVisitante: '2º Grupo L' },
  fase32_12: { labelCasa: '1º Grupo H',  labelVisitante: '2º Grupo J' },
  fase32_13: { labelCasa: '1º Grupo B',  labelVisitante: '3º dos Grupos E, F, G, I ou J' },
  fase32_14: { labelCasa: '1º Grupo J',  labelVisitante: '2º Grupo H' },
  fase32_15: { labelCasa: '1º Grupo K',  labelVisitante: '3º dos Grupos D, E, I, J ou L' },
  fase32_16: { labelCasa: '2º Grupo D',  labelVisitante: '2º Grupo G' },
  // Oitavas
  oitavas_1: { labelCasa: 'Venc. Jogo 74', labelVisitante: 'Venc. Jogo 77' },
  oitavas_2: { labelCasa: 'Venc. Jogo 73', labelVisitante: 'Venc. Jogo 75' },
  oitavas_3: { labelCasa: 'Venc. Jogo 76', labelVisitante: 'Venc. Jogo 78' },
  oitavas_4: { labelCasa: 'Venc. Jogo 79', labelVisitante: 'Venc. Jogo 80' },
  oitavas_5: { labelCasa: 'Venc. Jogo 83', labelVisitante: 'Venc. Jogo 84' },
  oitavas_6: { labelCasa: 'Venc. Jogo 81', labelVisitante: 'Venc. Jogo 82' },
  oitavas_7: { labelCasa: 'Venc. Jogo 86', labelVisitante: 'Venc. Jogo 88' },
  oitavas_8: { labelCasa: 'Venc. Jogo 85', labelVisitante: 'Venc. Jogo 87' },
  // Quartas
  quartas_1: { labelCasa: 'Venc. Jogo 89', labelVisitante: 'Venc. Jogo 90' },
  quartas_2: { labelCasa: 'Venc. Jogo 93', labelVisitante: 'Venc. Jogo 94' },
  quartas_3: { labelCasa: 'Venc. Jogo 91', labelVisitante: 'Venc. Jogo 92' },
  quartas_4: { labelCasa: 'Venc. Jogo 95', labelVisitante: 'Venc. Jogo 96' },
  // Semis
  semi_1:    { labelCasa: 'Venc. Jogo 97', labelVisitante: 'Venc. Jogo 98' },
  semi_2:    { labelCasa: 'Venc. Jogo 99', labelVisitante: 'Venc. Jogo 100' },
  // Terceiro e Final
  terceiro:  { labelCasa: 'Perd. Semi 1', labelVisitante: 'Perd. Semi 2' },
  final:     { labelCasa: 'Venc. Semi 1', labelVisitante: 'Venc. Semi 2' },
}

async function run() {
  const snap = await db.collection('jogos').get()
  const batch = db.batch()
  let updated = 0

  snap.forEach(docSnap => {
    const data = docSnap.data()
    // Jogos do mata-mata têm um campo 'id' que é o ID interno (fase32_1, oitavas_1, etc.)
    const interno = data.id as string
    if (labels[interno]) {
      batch.update(docSnap.ref, labels[interno])
      updated++
    }
  })

  await batch.commit()
  console.log(`Atualizado ${updated} jogos com labelCasa/labelVisitante`)
}

run().catch(console.error)
```

- [ ] **Step 2: Executar o script de migração**

```bash
cd /Users/emersonbernardino/desenvolvimento/projetos/pessoais/BolaoDoBolero
npx ts-node scripts/update-labels-jogos.ts
```

Esperado: `Atualizado 32 jogos com labelCasa/labelVisitante`

- [ ] **Step 3: Commit**

```bash
git add scripts/update-labels-jogos.ts
git commit -m "feat: script de migração para adicionar labels aos jogos do mata-mata no Firestore"
```

---

## Checklist de Verificação Final

Após todos os commits, verificar:

- [ ] `npm run build` sem erros
- [ ] `npm run dev` — abrir `/palpites`, ir para aba "Fase 32": cada jogo mostra o label abaixo do time quando resolvido (ex: "1º Grupo E" abaixo da bandeira da seleção)
- [ ] Quando o time não está resolvido ainda (palpites de grupos não preenchidos), a label aparece como texto de placeholder (comportamento já existente via `timeCasa?.nome ?? labelCasa ?? '?'`)
- [ ] Abrir `/formato-copa`: 5 seções renderizadas, tabela com 16 jogos da Fase 32 correta, 3ºs colocados em azul
- [ ] Link "Formato Copa" aparece no Navbar desktop e mobile
