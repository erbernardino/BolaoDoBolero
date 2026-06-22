---
title: Banners de estado
tags: [frontend, ui, componentes, conectividade]
status: documentado
related:
  - "[[Liberação do participante]]"
  - "[[Hooks e PWA]]"
  - "[[Navbar]]"
  - "[[Frontend MOC]]"
---

Conjunto de componentes de UI transversais que reagem a **conectividade**, à **flag de ambiente de teste** e ao **status de liberação** do usuário, além de cards puros de destaque do pódio/antepenúltimo do ranking. São montados globalmente (ou em pontos fixos da árvore) e ditam avisos visuais sem lógica de domínio própria.

## Visão geral

| Componente | Arquivo | Onde monta | Fonte de dado | Visual |
|---|---|---|---|---|
| `OfflineBanner` | `src/components/OfflineBanner.tsx` | `App.tsx` | hook `useOffline` | Faixa amarela (offline) |
| `AmbienteTesteBanner` | `src/components/AmbienteTesteBanner.tsx` | `App.tsx` | `getDoc(_system/teste)` | Faixa vermelha sticky |
| `NovaVersaoBanner` | `src/components/NovaVersaoBanner.tsx` | `App.tsx` | hook `useAppVersion` | Card azul fixo (rodapé) |
| `BannerLiberacao` | `src/components/BannerLiberacao.tsx` | dentro da [[Navbar]] | [[useAuth]] | Faixa âmbar sticky |
| `RankingDestaques` | `src/components/RankingDestaques.tsx` | [[Página Ranking]] | props (`ranking`) | Cards pódio + vermelho |

No `App.tsx` (`src/App.tsx:31-33`), `AmbienteTesteBanner`, `OfflineBanner` e `NovaVersaoBanner` são montados nessa ordem, **acima** do `<Suspense>`/`<Routes>`, garantindo que apareçam em qualquer rota.

## OfflineBanner

Lê o estado de conexão pelo hook `useOffline` (`src/hooks/useOffline.ts`), parte da nota [[Hooks e PWA]]. O hook inicializa com `!navigator.onLine` e escuta os eventos `window` `'online'` e `'offline'`, atualizando o estado em tempo real. Quando offline, o banner renderiza uma faixa amarela (`bg-yellow-500`) com o aviso "Sem conexão com a internet…"; quando online, retorna `null` (`src/components/OfflineBanner.tsx:6`).

## AmbienteTesteBanner

Faz uma leitura única `getDoc(doc(db, '_system', 'teste'))` (ver [[Coleção _system]]) e, se `snap.exists()` e `snap.data().isteste === true`, ativa uma faixa vermelha sticky `⚠️ AMBIENTE DE TESTES` (`src/components/AmbienteTesteBanner.tsx:9-11`). Erros de leitura são silenciados (`.catch(() => {})`).

> [!warning] Leitura única, sem reatividade
> O `AmbienteTesteBanner` usa `getDoc` (não `onSnapshot`). Mudar `isteste` no Firestore **só reflete após recarregar a página** — não há atualização ao vivo.

## BannerLiberacao

Consome [[useAuth]] e retorna `null` se não há usuário, se `usuario.liberado === true` ou se `usuario.role === 'admin'` (`src/components/BannerLiberacao.tsx:6`). Caso contrário, exibe uma faixa âmbar sticky pedindo o comprovante de PIX para o celular **(11) 97177-0713** (chave PIX e WhatsApp). É o aviso visível da [[Liberação do participante]] enquanto o acesso está pendente.

> [!danger] Renderizado na Navbar, não no App
> O `BannerLiberacao` é montado **dentro da [[Navbar]]** (`src/components/Navbar.tsx:130`), e não em `App.tsx`. Páginas que não renderizam a Navbar (ex.: login/cadastro) **não exibem** este banner.

> [!warning] `liberado` é o gate central de acesso
> A flag `liberado` (ver [[Liberação do participante]] e [[Entidade Usuario]]) controla simultaneamente: este banner, os links de Navbar (Geral/Ranking via guard) e as [[Regras de segurança do Firestore]] de escrita de palpites. Alterar uma sem as outras gera inconsistência entre UI e backend.

## NovaVersaoBanner

Usa o hook `useAppVersion` (ver [[Hooks e PWA]]). Quando `hasUpdate` é verdadeiro e a aba está em background (`document.visibilityState !== 'visible'`), recarrega silenciosamente; com a aba visível, mostra um card azul fixo no rodapé com contagem regressiva de 5s e botão "Atualizar agora", recarregando ao fim (`src/components/NovaVersaoBanner.tsx:14-30`).

## RankingDestaques

Componente de apresentação puro da [[Página Ranking]]. Recebe a lista `ranking` por props e **só renderiza se `ranking.length >= 3`** (`src/components/RankingDestaques.tsx:22`). Monta três cards de pódio — 1º (ouro/`yellow`), 2º (prata/`gray`) e 3º (bronze/`amber`).

O card do **antepenúltimo** (índice `ranking.length - 3`) só aparece quando `antepenultimoIdx > 2`, ou seja, quando o antepenúltimo já não está no pódio (`src/components/RankingDestaques.tsx:24-26`); usa card vermelho (`bg-red-50`/`border-red-300`).

> [!info] Componentes puros de apresentação
> Tanto `RankingDestaques` quanto `BannerLiberacao` não acessam Firestore nem Cloud Functions diretamente: recebem dados via props (`ranking`) ou via [[useAuth]]. Toda a fonte de verdade vem de cima.

## Relacionados

- [[Liberação do participante]] — flag `liberado` que governa o `BannerLiberacao` e o acesso.
- [[Hooks e PWA]] — `useOffline` e `useAppVersion`, fontes de `OfflineBanner` e `NovaVersaoBanner`.
- [[Navbar]] — host real do `BannerLiberacao`.
- [[Página Ranking]] — consumidora de `RankingDestaques`.
- [[Coleção _system]] — documento `teste` lido pelo `AmbienteTesteBanner`.
- [[Frontend MOC]]
