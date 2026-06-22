---
title: Impressão de palpites
tags:
  - frontend
  - impressao
  - palpites
  - bracket
status: documentado
related:
  - "[[Bracket personalizado do usuário]]"
  - "[[Ver Palpites]]"
  - "[[Página Palpites]]"
  - "[[Frontend MOC]]"
---

Telas otimizadas para impressão/PDF dos palpites do bolão. São duas páginas distintas: uma **administrativa** com todos os participantes (`src/pages/admin/ImprimirPalpites.tsx`) e uma **individual** com os próprios palpites do usuário logado (`src/pages/ImprimirMeusPalpites.tsx`). Ambas reconstroem o [[Bracket personalizado do usuário]] ao vivo para preencher os times do mata-mata, em vez de confiar nos IDs congelados no documento de palpite.

## As duas telas

### Impressão de todos os palpites (admin)
`src/pages/admin/ImprimirPalpites.tsx` carrega de uma vez (via `getDocs`) as [[Coleções do Firestore]] `jogos`, `times`, `palpites`, `usuarios`, `palpites_especiais`, `grupos` e `desempates_terceiros`, mais o doc `config/resultado_especial` (somente leitura — ver [[Coleção config]]). Oferece **dois modos de visão** (`Visao = 'usuario' | 'jogo'`, alternados na barra de ação):

- **Por Usuário** (`VisaoPorUsuario`) — uma página por participante (`pageBreakBefore: 'always'`), com cards ultracompactos de cada jogo agrupados por fase, mais os [[Entidades de palpite|palpites especiais]] (campeão, vice, 3º, 4º, artilheiro). 3º Lugar e Final ficam na mesma linha (`ImprimirPalpites.tsx:317-333`).
- **Por Jogo** (`VisaoPorJogo`) — cada jogo como cabeçalho seguido de um grid de chips densos (6 colunas) com o palpite de cada usuário; ao final, uma tabela de especiais de todos os participantes com a linha "Resultado oficial" (`ImprimirPalpites.tsx:486-504`).

> [!info] Origem dos participantes
> A lista de usuários é ordenada por `apelido || nome` (`ImprimirPalpites.tsx:78-81`). O cabeçalho de ação mostra a contagem de participantes e de jogos, e some no print via `print:hidden`.

### Impressão dos meus palpites (individual)
`src/pages/ImprimirMeusPalpites.tsx` usa o [[useAuth]] para identificar o usuário e consulta só os próprios dados: `palpites` filtrados por `where('uid', '==', firebaseUser.uid)`, `palpites_especiais/{uid}` e `desempates_terceiros/{uid}`. Renderiza os jogos por fase (4 colunas em grupos, 3 nas demais — `ImprimirMeusPalpites.tsx:165`) com cores de acerto, e o bloco de especiais ao final.

## Resolução do bracket ao vivo

Ambas as telas importam `montarResolvedorBracket` de `lib/bracketUsuario` para reconstruir o [[Bracket personalizado do usuário]] em memória, recebendo `jogos`, `grupos`, `palpitesPorJogoId` e `pontosDisciplinares`.

- Na tela admin é memoizado **por uid** (`resolversPorUid`, `ImprimirPalpites.tsx:109-126`) — cada participante tem seu próprio resolvedor, já que o bracket depende dos palpites individuais da fase de grupos. O comentário no código justifica: "60 usuários × bracket é cálculo em memória".
- Na tela individual há um único `resolverBracket` memoizado (`ImprimirMeusPalpites.tsx:97-105`).

> [!note] Por que não usar os IDs congelados
> O documento de palpite de um jogo de mata-mata guarda os times resolvidos no momento do save. Reresolver ao vivo garante que os confrontos do mata-mata reflitam o bracket atual de cada participante — coerente com a [[Página Palpites]] e com [[Ver Palpites]]. Slots ainda não resolvidos aparecem como `TBD`.

`desempates_terceiros` alimenta `pontosDisciplinares` por uid, usado como critério de desempate na [[Alocação de terceiros por slot]] / [[Melhores terceiros]] dentro do resolvedor.

> [!warning] Dependência de coleção
> O critério disciplinar depende da coleção `desempates_terceiros` existir. Quando ausente, o código cai em `{}` (`ImprimirPalpites.tsx:91`, `ImprimirMeusPalpites.tsx:84`), o que não quebra, mas pode alterar a ordem dos terceiros resolvidos.

## Codificação de cores de acerto

A função `bgAcerto(p, jogo)` é idêntica nas duas telas e à usada em [[Ver Palpites]] — replica a hierarquia da [[Pontuação]] (não cumulativa):

| Cor | Hex | Significado |
| --- | --- | --- |
| Verde | `#bbf7d0` | Placar exato |
| Amarelo | `#fef08a` | Coluna certa (vencedor/empate) |
| Azul | `#bfdbfe` | Total de gols igual |
| Vermelho | `#fecaca` | Errou |

A cor só aparece se `jogo.encerrado && jogo.resultado` (`ImprimirPalpites.tsx:27-34`). Nos especiais, o acerto é verde/vermelho conforme bater com `config/resultado_especial` (ver [[Resultados Especiais]]); `paisArtilheiro` confere contra a lista `paisesArtilheiros`.

## Layout de impressão

- `@page { size: A4; margin: 6mm }` e `body { font-size: 9px }` no bloco `@media print`.
- Cards e linhas usam `pageBreakInside: 'avoid'`; na visão por usuário cada participante força `pageBreakBefore: 'always'`.
- Botões `window.history.back()` (Voltar) e `window.print()` (Imprimir/PDF), ambos na barra `print:hidden`.
- Jogos são sempre ordenados por `jogo.numero` (`ImprimirPalpites.tsx:69`, `ImprimirMeusPalpites.tsx:66`).

> [!warning] Acesso e navegação (tela admin)
> A tela admin de impressão é acessível apenas via botão em [[Ver Palpites]]; a rota não está na navegação principal ([[Navbar]]). Para o contexto de rotas e proteção, ver [[Rotas e Guards]].

## Relacionados

- [[Bracket personalizado do usuário]]
- [[Ver Palpites]]
- [[Página Palpites]]
- [[Pontuação]]
- [[Resultados Especiais]]
- [[Frontend MOC]]
