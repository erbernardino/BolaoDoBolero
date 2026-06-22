---
title: Página Home
tags:
  - frontend
  - pagina
  - dashboard
status: documentado
related:
  - "[[Página Palpites]]"
  - "[[Página Ranking]]"
  - "[[Navbar]]"
  - "[[Frontend MOC]]"
---

A **Página Home** é a tela inicial da rota `/` (componente `Home` em `src/pages/Home.tsx:45`): saúda o participante pelo apelido, exibe uma contagem regressiva para o início da Copa, mostra stats pessoais e oferece os cards de navegação para o resto do app. É um dos primeiros destinos após o login (ver [[Autenticação Login e Cadastro]] e [[Rotas e Guards]]).

## Carregamento de dados

No `useEffect` disparado por `firebaseUser` (`src/pages/Home.tsx:59-105`), um único `Promise.all` busca em paralelo:

| Fonte | Como | Uso |
| --- | --- | --- |
| `ranking` | `getDocs` | posição, total de participantes e pontos do usuário |
| `jogos` | `getDocs` | total de jogos e os próximos jogos |
| `times` | `getDocs` | nomes/bandeiras dos próximos jogos |
| `palpites` (próprios) | `getCountFromServer` com `where('uid','==',uid)` | contagem de palpites do usuário |

> [!info] Contagem barata de palpites
> A contagem usa `getCountFromServer` em vez de baixar documentos (`src/pages/Home.tsx:70-73`). Além de barata, isso respeita as [[Regras de segurança do Firestore]]: o filtro por `uid` garante que só os palpites do próprio usuário sejam contados, já que as regras não permitem ler palpites de outros quando a visibilidade não é `sempre`. Veja também [[Entidades de palpite]].

A posição no [[Página Ranking|ranking]] vem de ordenar os docs de `ranking` por `pontosTotal` desc e achar o índice do `uid` (`src/pages/Home.tsx:77-83`). A regra de [[Pontuação]] alimenta esses totais via [[Recálculo de ranking]].

## Blocos enriquecidos (remote flag)

Os blocos extras são gateados por `useRemoteFlag('feature_home_enriched', true)` (`src/pages/Home.tsx:57`), parte dos [[Hooks e PWA]]. Quando ligado (default `true`):

- **AoVivo** — renderiza o componente `<AoVivo uid={...} />` quando há `usuario` (`src/pages/Home.tsx:118`).
- **Contagem regressiva** — exibida apenas enquanto `dataCopa.getTime() > Date.now()`, com `dataCopa = 2026-06-11T00:00:00Z` (`src/pages/Home.tsx:107,129`). O subcomponente `ContagemRegressiva` atualiza a cada segundo via `setInterval` e mostra "A Copa começou!" quando o prazo passa.
- **Stats pessoais** — grid de Posição / Pontos / Palpites, renderizado só se `liberado === true` (`src/pages/Home.tsx:136`). Ver [[Liberação do participante]].
- **Próximos jogos** — os 3 primeiros jogos filtrados por `!encerrado && !aoVivo`, futuros (`dataHora.toMillis() > agora`) e com `timeCasa` definido, ordenados por data (`src/pages/Home.tsx:91-94`).

> [!warning] Acesso direto a `Timestamp` do Firestore
> A Home assume que `jogo.dataHora` é sempre um `Timestamp` do Firestore e chama `.toMillis()` (`src/pages/Home.tsx:92-93`) e `.toDate()` (`src/pages/Home.tsx:169`) sem guarda. Esse padrão já foi fonte de crash em produção do tipo `Cannot read properties of undefined (reading 'toDate')`: em 2026-04-30, criar um documento inesperado na [[Coleção config]] quebrou leituras que dependiam da estrutura conhecida (ver `CLAUDE.md`). Documentos malformados ou campos faltando em `jogos` reproduziriam a mesma falha aqui.

## Perfil incompleto

Quando `nome` ou `apelido` têm menos de 2 caracteres (após `trim`), um aviso amarelo com link para `/perfil` é exibido (`src/pages/Home.tsx:54-55,120-127`). Ver [[Gerenciamento de Perfil]].

## Cards de navegação

| Card | Rota | Condição |
| --- | --- | --- |
| Palpites | `/palpites` | sempre |
| Ranking | `/ranking` | só se `liberado` |
| Regulamento | `/regulamento` | sempre |
| Admin | `/admin` | só se `usuario.role === 'admin'` |

Ver `src/pages/Home.tsx:177-213`. O botão **Sair** chama `signOut(auth)` do Firebase Auth (`src/pages/Home.tsx:215-220`). O card de [[Página Palpites]] é o único sempre presente; o de [[Página Ranking]] segue a mesma [[Liberação do participante]] que gateia as stats.

## Relacionados

- [[Página Palpites]]
- [[Página Ranking]]
- [[Navbar]]
- [[Liberação do participante]]
- [[Coleção config]]
- [[Frontend MOC]]
