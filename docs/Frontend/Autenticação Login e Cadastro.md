---
title: Autenticação Login e Cadastro
tags:
  - frontend
  - autenticacao
  - firebase-auth
  - convites
status: documentado
related:
  - "[[useAuth]]"
  - "[[Gerenciar Usuários e Convites]]"
  - "[[Gerenciamento de Perfil]]"
  - "[[Frontend MOC]]"
---

Telas públicas de entrada do bolão: a página de **Login** (`src/pages/Login.tsx`), que oferece três métodos de autenticação, e a página de **Cadastro** (`src/pages/Cadastro.tsx`), que cria a conta a partir de um convite. São as únicas rotas acessíveis sem sessão; o controle de acesso a partir daí é feito por [[Rotas e Guards]] e pelo hook [[useAuth]].

> [!danger] Acesso só por convite
> Não existe cadastro aberto. A criação de conta só acontece pela rota `/convite/:conviteId`, validando um documento em `convites/{id}`. Quem chega ao login sem registro em `usuarios/{uid}` é deslogado imediatamente (ver abaixo). Quem gera os convites é o admin em [[Gerenciar Usuários e Convites]].

## Login — três métodos

A `Login` mantém um estado `mode` (`src/pages/Login.tsx:38`) que alterna entre três fluxos, com um seletor de abas no topo:

| Modo | Mecanismo Firebase | Fluxo |
|------|--------------------|-------|
| `email` | `signInWithEmailAndPassword` | E-mail + senha, com "Esqueci minha senha" via `sendPasswordResetEmail` |
| `emailLink` | `sendSignInLinkToEmail` / `signInWithEmailLink` | Login *passwordless* por link enviado ao e-mail |
| `phone` | `signInWithPhoneNumber` + `RecaptchaVerifier` invisível | SMS em duas etapas (envio do código → confirmação) |

> [!info] reCAPTCHA invisível para SMS
> O modo telefone instancia um `RecaptchaVerifier` com `size: 'invisible'` (`src/pages/Login.tsx:100`) sobre um `<div>` oculto, exigido pelo `signInWithPhoneNumber`. O verifier é limpo (`clear()`) ao trocar de modo, ao desmontar e em caso de erro no envio do SMS.

### Verificação de cadastro após o login

Em **todos** os três fluxos, assim que o Firebase Auth autentica, o código faz `getDoc(doc(db, 'usuarios', uid))`. Se o documento **não existe**, chama `signOut(auth)` e exibe o erro *"Você não tem cadastro no bolão. Solicite um convite ao administrador."* (`src/pages/Login.tsx:115`). Isso garante que ter credenciais no Auth não basta — é preciso existir como [[Entidade Usuario]] no Firestore. A coleção `usuarios` faz parte das [[Coleções do Firestore]].

> [!note] Login bem-sucedido
> Em sucesso, o código dispara `registrarLoginNoServer(metodo)` — uma Cloud Function *callable* `registrarLogin` que registra a [[Auditoria]] de acesso com **falha silenciosa** (`try/catch` vazio, `src/pages/Login.tsx:20`): um erro de auditoria nunca bloqueia o usuário. Em seguida chama `navigate('/')` para a [[Página Home]].

### Login por link de e-mail (passwordless)

O fluxo `emailLink` guarda o e-mail digitado em `localStorage['boleroEmailForSignIn']` ao enviar o link (`src/pages/Login.tsx:33`). Quando o usuário volta clicando no link, um `useEffect` detecta `isSignInWithEmailLink(auth, window.location.href)` e completa o login automaticamente com o e-mail salvo. Se o `localStorage` não tiver o e-mail (ex.: outro dispositivo), a tela pede para o usuário redigitá-lo (`emailLinkStep === 'confirm'`).

### Rodapé do Login

O link "Não tem conta? Acesse com um convite" aponta para `/convite` (sem id), que cai na tela de "Convite inválido" do Cadastro — é um placeholder para quem não tem o link real.

## Cadastro — criação por convite

A `Cadastro` lê `conviteId` da URL (`/convite/:conviteId`). Sem `conviteId`, renderiza diretamente a tela **"Convite inválido"** (`src/pages/Cadastro.tsx:36`).

Com `conviteId`, valida `convites/{id}` em dois momentos:

1. **`useEffect` de entrada** — se o convite está `usado` e `tipo !== 'multiplo'`, redireciona para `/login` (`replace`).
2. **`validateConvite()` no submit** — rejeita convite inexistente ou já usado (exceto `multiplo`), exibindo erro sem prosseguir.

Ao criar a conta com sucesso, `createUsuarioAndMarkConvite` grava o documento `usuarios/{uid}` (`src/pages/Cadastro.tsx:64`) com:

- `role: 'participante'`
- `liberado: false` — o participante **não entra ativo**; depende de [[Liberação do participante]] pelo admin
- `conviteId` e `criadoEm: serverTimestamp()`
- além de `nome`, `apelido`, `email`, `telefone`

Em seguida, **se o convite não for `multiplo`**, marca-o como `{ usado: true, usadoPor: uid }`. Convites do tipo `multiplo` permanecem reutilizáveis. O cadastro também linka, em nova aba, para `/regulamento-publico` (parte da [[Visão Geral e Regulamento]]).

> [!warning] Cadastro só implementa e-mail + senha
> O `handleSubmit` usa exclusivamente `createUserWithEmailAndPassword` (`src/pages/Cadastro.tsx:95`). **Não há cadastro por telefone nem por link de e-mail**, apesar de o formulário renderizar um `PhoneInput`. O telefone é apenas **armazenado** no documento `usuarios/{uid}`; ele **não** é vinculado como provider de autenticação no Firebase Auth. Ou seja: criar conta com telefone X não habilita login por SMS naquele número — o número precisaria ser provisionado/verificado à parte. Esse descompasso já foi objeto de [[tdd-verificacao-cadastro-telefone]].

## PhoneInput

Componente reutilizável (`src/components/PhoneInput.tsx`) usado tanto no modo telefone do Login quanto no campo telefone do Cadastro. Exporta um valor no formato `+<DDI><local>` via `onChange`.

- Seletor de país com **24 DDIs** e busca por nome/DDI/código; Brasil (`+55`) é o default e tem prioridade em DDIs duplicados (`+1` resolve para US, não CA — primeira correspondência na lista).
- Para `BR`, formata progressivamente como `(99) 99999-9999` (11 dígitos); para outros países, mostra só os dígitos (até 15).
- Sincroniza com o valor do pai via `useEffect`, e fecha o dropdown ao clicar fora.

## Tratamento de erros

Ambas as páginas têm um `getErrorMessage` próprio que mapeia códigos `auth/*` do Firebase para mensagens em PT-BR (ex.: `auth/invalid-credential` → "E-mail ou senha incorretos.", `auth/email-already-in-use` → "Este e-mail já está cadastrado."), com fallback genérico.

## Relacionados

- [[useAuth]] — hook que consome a sessão criada por estas telas
- [[Gerenciar Usuários e Convites]] — onde o admin gera os convites consumidos pelo Cadastro
- [[Gerenciamento de Perfil]] — edição posterior dos dados gravados no cadastro
- [[Rotas e Guards]] — proteção das rotas autenticadas
- [[Entidade Usuario]] — documento `usuarios/{uid}` criado no cadastro
- [[Liberação do participante]] — efeito do `liberado: false`
- [[tdd-verificacao-cadastro-telefone]] — divergência do cadastro por telefone
- [[Frontend MOC]]
