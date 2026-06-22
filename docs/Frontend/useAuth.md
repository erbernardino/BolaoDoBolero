---
title: useAuth
tags:
  - frontend
  - autenticacao
  - hooks
  - estado-global
status: documentado
related:
  - "[[Inicialização Firebase]]"
  - "[[Rotas e Guards]]"
  - "[[Entidade Usuario]]"
  - "[[Frontend MOC]]"
---

`useAuth` é a fonte única de estado de autenticação do app: provê, via React Context, o usuário do Firebase Auth (`firebaseUser`) combinado com o documento `usuarios/{uid}` do Firestore (`usuario`). É consumido por [[Rotas e Guards]], pela [[Navbar]] e por praticamente todas as páginas para decidir o que renderizar.

## Estado exposto (`AuthState`)

| Campo | Tipo | Significado |
| --- | --- | --- |
| `firebaseUser` | `User \| null` | Usuário do Firebase Auth (sessão). `null` quando deslogado |
| `usuario` | `Usuario \| null` | Documento `usuarios/{uid}` do Firestore mesclado como `{ uid, ...data }` ([[Entidade Usuario]]) |
| `loading` | `boolean` | `true` até a primeira resolução do estado de auth + busca do doc |
| `refreshUsuario` | `() => Promise<void>` | Recarrega a sessão e re-busca o doc do usuário |

Definido em `src/hooks/useAuth.ts:8`.

## Como funciona

Há três peças no mesmo arquivo:

- **`AuthContext`** — criado com `createContext` (`src/hooks/useAuth.ts:15`) com valores default (`loading: true`).
- **`useAuth()`** — apenas `useContext(AuthContext)` (`src/hooks/useAuth.ts:22`). É o hook que os componentes consomem.
- **`useAuthProvider()`** — implementa toda a lógica de estado (`src/hooks/useAuth.ts:28`). É montado no `App.tsx`, que provê o `value` do `AuthContext` envolvendo o `BrowserRouter`.

> [!info] Separação provider/consumidor
> Só `App.tsx` chama `useAuthProvider()` (uma instância). Todo o resto chama `useAuth()`, que lê o mesmo Context. Isso garante uma fonte única de verdade de auth para [[Rotas e Guards]], [[Navbar]] e [[Banners de estado]].

### Fluxo de login

No `useEffect`, o hook registra `onAuthStateChanged(auth, ...)` (`src/hooks/useAuth.ts:34`). A cada mudança de sessão:

1. `setFirebaseUser(user)`.
2. Se há `user`: faz `getDoc(doc(db, 'usuarios', user.uid))` ([[Inicialização Firebase]] expõe `db`/`auth`).
   - Doc existe → `usuario = { uid: snap.id, ...snap.data() }`.
   - Doc não existe → `usuario = null`.
   - Erro no `getDoc` → `usuario = null` (catch silencioso).
3. Se não há `user` → `usuario = null`.
4. `setLoading(false)` **ao final**, sempre.

> [!warning] `loading` só fica `false` depois do `getDoc`
> O `setLoading(false)` está dentro do callback do `onAuthStateChanged`, após resolver a busca do documento do usuário (`src/hooks/useAuth.ts:50`). Guards que esperam por `loading` só liberam navegação quando `usuario` já foi resolvido — evita "flash" de tela errada.

### `refreshUsuario()`

Definido em `src/hooks/useAuth.ts:55`. Faz `auth.currentUser.reload()`, atualiza `firebaseUser` e re-busca `usuarios/{uid}`. Usado após mudanças que o `onAuthStateChanged` não percebe sozinho — por exemplo, edição de perfil ([[Gerenciamento de Perfil]]) e fluxo de verificação de vínculo.

> [!note] Assimetria com o fluxo de login
> No `refreshUsuario()`, o `usuario` só é atualizado **se o doc existir** (`snap.exists()`); não há `else` que zere para `null`. Diferente do `onAuthStateChanged`, ele não limpa `usuario` caso o documento tenha sumido — apenas mantém o valor anterior.

## Armadilhas e regras críticas

> [!danger] `usuario` pode ser `null` com `firebaseUser` presente
> Login válido no Firebase Auth **não** garante `usuario` preenchido: se `usuarios/{uid}` não existe (cadastro incompleto) ou o `getDoc` falha, `usuario` fica `null`. As páginas de [[Autenticação Login e Cadastro]] tratam esse caso deslogando o usuário quando `userDoc.exists()` é falso.

> [!warning] Mudanças no Firestore não refletem sozinhas
> Campos como `usuario.liberado` ([[Liberação do participante]]) e `usuario.role` gateiam navegação e [[Banners de estado]]. Como o `usuario` é um snapshot lido uma vez no login (não um listener em tempo real), alterações no Firestore só aparecem após `refreshUsuario()` ou um novo login.

## Relacionados

- [[Inicialização Firebase]] — origem de `auth` e `db` usados aqui
- [[Rotas e Guards]] — principal consumidor de `loading`, `firebaseUser`, `usuario`
- [[Entidade Usuario]] — formato do documento `usuarios/{uid}`
- [[Navbar]] e [[Banners de estado]] — UI dirigida por `role`/`liberado`
- [[Liberação do participante]] — significado de `usuario.liberado`
- [[Autenticação Login e Cadastro]] — fluxo que cria/valida o doc
- [[Frontend MOC]]
