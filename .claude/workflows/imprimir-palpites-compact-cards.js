
export const meta = {
  name: 'imprimir-palpites-compact-cards',
  description: 'Rewrite ImprimirPalpites.tsx with ultra-compact card layout for print',
  phases: [
    { title: 'Analisar', detail: 'Ler arquivo atual e entender o que compactar' },
    { title: 'Implementar', detail: 'Reescrever com cards compactos' },
    { title: 'Verificar', detail: 'Build e validação TypeScript' },
  ],
}

phase('Analisar')

const currentCode = await agent(`
Leia o arquivo /Users/emersonbernardino/desenvolvimento/projetos/pessoais/BolaoDoBolero/src/pages/admin/ImprimirPalpites.tsx completo usando o Bash tool (cat ou sed).
Também leia o type Time de /Users/emersonbernardino/desenvolvimento/projetos/pessoais/BolaoDoBolero/src/types/index.ts (grep pelo interface Time).

Retorne:
1. O conteúdo COMPLETO do ImprimirPalpites.tsx
2. A definição do type Time (campos: id, nome, sigla, bandeira, grupo)
3. A definição do type PalpiteEspecial
4. A definição do type ResultadoEspecial
`, { label: 'ler-codigo-atual' })

phase('Implementar')

const newCode = await agent(`
Você é um expert em React/TypeScript/CSS print layout. Precisa reescrever o componente ImprimirPalpites.tsx com um layout de CARDS ultra-compactos para impressão PDF.

CONTEXTO DO PROJETO:
- React 18 + TypeScript + Tailwind CSS
- Firebase Firestore
- Impressão de palpites da Copa do Mundo 2026
- 57 participantes, 104 jogos, 5 palpites especiais por usuário

CÓDIGO ATUAL:
${currentCode}

OBJETIVO: Tornar os quadros/cards MUITO menores e mais densos, ocupando menos espaço na página impressa.

REGRAS DE DESIGN PARA OS CARDS COMPACTOS:

**Visão Por Usuário:**
- Para cada usuário: seção com page-break entre usuários
- Jogos da fase de grupos (72 jogos): grid com 4 colunas de cards
- Fases eliminatórias (32 jogos): grid com 3 colunas de cards  
- Cada card de jogo: card minúsculo (≈80px wide) mostrando:
  * Linha 1: "#N  [flag] SIG vs [flag] SIG"  (fonte 7px)
  * Linha 2: "Palpite: X–Y"  (negrito, fonte 8px)
  * Linha 3: "Result: X–Y"  (se encerrado)
  * Borda colorida lateral esquerda por tipo de acerto (verde/amarelo/azul/vermelho)
- Palpites especiais: 5 cards inline (1 linha), cada um mostrando label + [flag] + sigla

**Visão Por Jogo:**
- Cada jogo: 1 linha de cabeçalho + grid de chips dos palpites dos usuários
- Cabeçalho da linha: "#N [flag]SIG vs [flag]SIG [resultado]"
- Grid de chips (6 colunas): cada chip = "Apelido 0–0" (fonte 7px) com bg colorido
- Muito mais denso do que antes

ESPECIFICAÇÕES TÉCNICAS:
- Usar inline styles (não Tailwind) para garantir que funcione no PDF
- Font-size mínimo: 7px nos cards, 9px nos títulos
- Padding mínimo: 1px 2px nos cards
- Border-left de 3px colorida ao invés de background no card (mais econômico em toner)
- Cores de acerto: border/bg verde=#bbf7d0, amarelo=#fef08a, azul=#bfdbfe, vermelho=#fecaca
- Sem border quando não há resultado ainda (bg branco)
- Flag = <img> 16x11px inline
- Grid de jogos em grupos: 4 cols auto-fit
- @page { size: A4; margin: 6mm; }

IMPORTANTE: 
- Mantenha toda a lógica de carregamento de dados (useEffect, useState, palpiteMap etc.) idêntica ao código atual
- Mantenha o toggle Por Usuário / Por Jogo
- Mantenha a barra de ação (oculta no print)
- Mantenha os palpites especiais na visão por jogo (tabela final)
- NÃO use Tailwind nos elementos que precisam aparecer no print (use inline styles)
- O componente se chama ImprimirPalpites e está em src/pages/admin/ImprimirPalpites.tsx

Escreva o componente TypeScript COMPLETO e VÁLIDO. Retorne APENAS o código TypeScript, sem markdown, sem explicações.
`, { label: 'gerar-novo-codigo', model: 'opus' })

phase('Verificar')

// Escrever o arquivo
const writeResult = await agent(`
Escreva o seguinte conteúdo TypeScript no arquivo:
/Users/emersonbernardino/desenvolvimento/projetos/pessoais/BolaoDoBolero/src/pages/admin/ImprimirPalpites.tsx

Use a ferramenta Write para escrever. O conteúdo começa logo após "CODIGO:".

CODIGO:
${newCode}

Após escrever, execute o build para verificar TypeScript:
  cd /Users/emersonbernardino/desenvolvimento/projetos/pessoais/BolaoDoBolero && npm run build 2>&1 | tail -20

Se houver erros TypeScript, corrija-os diretamente no arquivo usando Edit e rode o build novamente até passar.
Retorne: "BUILD_OK" se passou, ou "BUILD_FAIL: <erros>" se falhou após tentativas de correção.
`, { label: 'escrever-e-verificar' })

log(`Resultado do build: ${writeResult}`)

// Commit e push
const commitResult = await agent(`
No diretório /Users/emersonbernardino/desenvolvimento/projetos/pessoais/BolaoDoBolero:

1. git add src/pages/admin/ImprimirPalpites.tsx
2. git commit -m com a mensagem exata abaixo (use heredoc):
feat(admin/imprimir): cards ultra-compactos para print PDF

Grupos em grid 4 colunas, eliminatórias em 3 colunas. Cada card
com borda lateral colorida por acerto e font 7-8px. Visão por jogo
com chips em 6 colunas. Layout A4 com margem 6mm.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>

3. git push origin dev

Retorne o hash do commit criado.
`, { label: 'commit-push' })

log(`Commit: ${commitResult}`)

return { writeResult, commitResult }
