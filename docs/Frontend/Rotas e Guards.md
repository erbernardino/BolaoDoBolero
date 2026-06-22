---
title: Rotas e Guards
tags: [frontend, roteamento, auth, spa]
status: documentado
related:
  - "[[useAuth]]"
  - "[[Liberação do participante]]"
  - "[[Navbar]]"
  - "[[Frontend MOC]]"
---

Mapa de todas as rotas da SPA (React Router via `BrowserRouter`), o componente _lazy_ de cada uma e qual _guard_ a protege. Os três guards — `ProtectedRoute`, `LiberadoRoute` e `AdminRoute` — são wrappers de roteamento que gateiam páginas por autenticação, [[Liberação do participante|liberação de pagamento]] e papel de admin, todos lendo a verdade de [[useAuth]].

## Montagem da árvore

O `main.tsx` apenas monta `<App/>` dentro de `StrictMode` e chama `initSentry()` (ver [[Observabilidade]]); não há roteamento ali. O `App.tsx` envolve toda a árvore com `AuthContext.Provider value={useAuthProvider()}` e, dentro dele, `BrowserRouter` → `AppContent`. Toda configuração de Firebase acontece antes, na [[Inicialização Firebase]].

`AppContent` (`src/App.tsx:27`) chama `useAnalyticsTracking()` para rastreamento de navegação (ver [[Observabilidade]]) e renderiza, acima das rotas e globalmente, os três [[Banners de estado]]: `AmbienteTesteBanner`, `OfflineBanner` e `NovaVersaoBanner`. Abaixo das rotas há um `<footer>` fixo que exibe `v{__APP_VERSION__}` e o crédito "Allogic" (`src/App.tsx:53`).

Todas as páginas são carregadas via `lazy(() => import(...))` dentro de um único `<Suspense fallback="Carregando...">` (`src/App.tsx:34`).

## Tabela de rotas

| Rota | Página (lazy) | Guard |
| --- | --- | --- |
| `/login` | `Login` | — (pública) |
| `/convite/:conviteId` | `Cadastro` | — (pública) |
| `/regulamento-publico` | `Regulamento` (prop `publico`) | — (pública) |
| `/` | `Home` | `ProtectedRoute` |
| `/palpites` | `Palpites` | `ProtectedRoute` |
| `/regulamento` | `Regulamento` | `ProtectedRoute` |
| `/formato-copa` | `FormatoCopa` | `ProtectedRoute` |
| `/chat` | `Chat` | `ProtectedRoute` |
| `/perfil` | `Perfil` | `ProtectedRoute` |
| `/perfil/verificar/:tipo` | `VerificarVinculo` | `ProtectedRoute` |
| `/imprimir-meus-palpites` | `ImprimirMeusPalpites` | `ProtectedRoute` |
| `/resultados` | `Resultados` | `ProtectedRoute` |
| `/ranking` | `Ranking` | `LiberadoRoute` |
| `/todos-palpites` | `PalpitesGeral` | `LiberadoRoute` |
| `/admin/*` | `AdminDashboard` | `AdminRoute` |

As rotas públicas (`/login`, `/convite/:conviteId`, `/regulamento-publico`) são o ponto de entrada da [[Autenticação Login e Cadastro]] e da [[Visão Geral e Regulamento|leitura pública do regulamento]].

> [!info] Páginas protegidas relevantes
> `/` é a [[Página Home]]; `/palpites` é a [[Página Palpites]] (cujas abas de grupos, mata-mata e especiais são internas — ver abaixo); `/resultados` é a [[Página Resultados]]; `/imprimir-meus-palpites` é coberta em [[Impressão de palpites]]; `/ranking` é a [[Página Ranking]]; `/todos-palpites` é a página [[Ver Palpites|de todos os palpites]] (PalpitesGeral). O catch-all `/admin/*` entra no [[Admin MOC|painel admin]].

> [!warning] Não existem rotas `/palpites/grupos`, `/palpites/mata-mata` nem `/palpites/especiais`
> Essas três telas são **abas internas** de `Palpites.tsx`, não rotas do React Router. Só existe `/palpites`.

> [!note] `/chat` não está na [[Navbar]]
> A rota `/chat` ([[Chat Global]]) existe e é `ProtectedRoute`, mas **não** aparece nos links da [[Navbar]]: o acesso se dá apenas por URL direta ou por link dentro de uma mensagem.

## Lógica dos guards

Todos os guards usam `useAuth()` (`useContext` de `AuthContext`) como **única fonte de verdade** e, enquanto `loading === true`, retornam `<div>Carregando...</div>` para evitar _flicker_ e redirect prematuro antes de o estado de auth resolver.

### ProtectedRoute (`src/components/ProtectedRoute.tsx`)
Só exige autenticação. Se `!firebaseUser` → `<Navigate to="/login" replace />`; caso contrário renderiza `children`.

### LiberadoRoute (`src/components/LiberadoRoute.tsx`)
Exige autenticado **e** liberado.
- Se `!firebaseUser` → redirect `/login`.
- Se `usuario && usuario.liberado !== true` → redirect `/`.
- Caso contrário → `children`.

A checagem é estrita: exige `liberado === true`. Veja [[Liberação do participante]] para o significado do campo e onde ele é setado.

### AdminRoute (`src/components/AdminRoute.tsx`)
Exige papel de admin. Se `!usuario || usuario.role !== 'admin'` → `<Navigate to="/" replace />`. Trata `usuario == null` como não-admin (redirect) — comportamento correto, mas dependente de o doc do [[Entidade Usuario|usuário]] já ter carregado.

## Armadilhas

> [!danger] Sub-rotas admin não estão em `App.tsx`
> O catch-all `/admin/*` (`src/App.tsx:50`) delega todo o sub-roteamento ao `AdminDashboard`. As telas de [[Inserir Resultados]], [[Gerenciar Jogos e Times]], [[Gerenciar Usuários e Convites]], [[Configurações do bolão]] etc. são roteadas internamente — não procure por elas no `App.tsx`.

> [!warning] Sem rota catch-all 404
> Não há `<Route path="*">`. URLs desconhecidas casam com nenhuma `<Route>` e renderizam um `Routes` vazio — tela em branco, sem página de erro.

> [!warning] LiberadoRoute pode flashar conteúdo liberado
> Enquanto `usuario == null` (doc ainda não carregado, mas `firebaseUser` presente e `loading === false`), a checagem `usuario && usuario.liberado !== true` é **pulada** e os `children` são renderizados — possível _flash_ de conteúdo liberado antes do doc chegar. Na prática isso é mitigado porque, em `useAuthProvider`, `loading` só vira `false` após o `getDoc` do usuário, de modo que `usuario` normalmente já está preenchido quando o guard avalia. Ver [[useAuth]].

> [!danger] Guards são apenas UX, não segurança
> `usuario.role` e `usuario.liberado` vêm do Firestore e são facilmente contornáveis no cliente. A segurança real depende das [[Regras de segurança do Firestore]], não dos guards. Os guards apenas evitam que o usuário veja telas que não pode usar.

## Relacionados

- [[useAuth]] — fonte de verdade (`firebaseUser`, `usuario`, `loading`) consumida por todos os guards
- [[Liberação do participante]] — semântica do campo `liberado` checado pelo `LiberadoRoute`
- [[Navbar]] — links de navegação (e a omissão deliberada de `/chat`)
- [[Inicialização Firebase]] — bootstrap que antecede o roteamento
- [[Banners de estado]] · [[Observabilidade]] · [[Página Palpites]] · [[Admin MOC]]
- [[Frontend MOC]]
