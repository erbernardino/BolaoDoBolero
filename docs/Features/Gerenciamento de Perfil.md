---
title: Gerenciamento de Perfil
tags:
  - feature
  - frontend
  - auth
  - firestore
status: documentado
related:
  - "[[Entidade Usuario]]"
  - "[[Autenticação Login e Cadastro]]"
  - "[[Processamento de imagem]]"
  - "[[Regras do Storage]]"
---

Conjunto de telas e componentes que permitem ao participante editar seus dados pessoais, gerenciar foto e métodos de login. Centraliza a edição da [[Entidade Usuario]] no Firestore e a manipulação dos *providers* do Firebase Auth, complementando o fluxo de [[Autenticação Login e Cadastro]].

## Página `/perfil` (`src/pages/Perfil.tsx`)

Rota protegida e *lazy-loaded* (registrada em `src/App.tsx:46`), acessível via [[Navbar]] e baseada no hook [[useAuth]].

### Dados pessoais

- Edita **nome** e **apelido**. O estado usa o padrão `nomeEdit`/`apelidoEdit = null` até o usuário digitar; o valor exibido faz *fallback* para o do Firestore (`src/pages/Perfil.tsx:25`).
- `handleSalvarDados` valida ambos `>= 2` caracteres e faz `updateDoc(usuarios/{uid}, { nome, apelido })` seguido de `refreshUsuario()` (`src/pages/Perfil.tsx:85`).

> [!info] Edição de dados NÃO toca o Firebase Auth
> Nome e apelido vivem apenas na [[Entidade Usuario]] (Firestore). Já a edição de métodos de login (abaixo) manipula o Auth.

### Métodos de login

Os *providers* são derivados de `firebaseUser.providerData`, mapeando `providerId`: `'password'` (email) e `'phone'` (telefone) (`src/pages/Perfil.tsx:28`).

| Estado | Comportamento |
|---|---|
| Vinculado | Mostra `email`/`telefone` lidos de `providerData` e botão **Desvincular** |
| Não vinculado | Botão **Vincular Email** / **Vincular Telefone** → navega para `/perfil/verificar/{tipo}` |

- `totalProviders` conta os métodos vinculados; `isOnlyProvider = totalProviders <= 1` desabilita **Desvincular** com *tooltip* explicativo (`src/pages/Perfil.tsx:37`).
- `handleUnlink` chama `unlink(firebaseUser, providerId)`, limpa o campo no Firestore (`email=''` ou `telefone=''`), e chama `refreshUsuario`; bloqueia se for o único método (`src/pages/Perfil.tsx:98`).

> [!danger] Google OAuth da spec NÃO está implementado
> A especificação mencionava login Google, mas a UI da página só expõe **email/senha** e **telefone**. `providerData` só é mapeado para `'password'` e `'phone'`.

> [!warning] Email/telefone exibidos vêm do Auth, não do Firestore
> `emailFromProvider`/`phoneFromProvider` são lidos de `providerData`. Se o doc Firestore estiver desatualizado, os dois podem divergir — o campo Firestore só é gravado **após** o `link`/`unlink` bem-sucedido no Auth. Se o `updateDoc` falhar, o Auth fica (des)vinculado mas o Firestore não reflete.

### Foto e logout

- O componente `Avatar` exibe `usuario.fotoURL ?? firebaseUser.photoURL`; o botão abre o modal `UploadFotoPerfil` (`src/pages/Perfil.tsx:147`).
- **Sair da conta** chama `signOut(auth)` (`src/pages/Perfil.tsx:323`).

## Página `/perfil/verificar/:tipo` (`src/pages/VerificarVinculo.tsx`)

Vincula um novo método de login à conta **atual** via `linkWithCredential` e espelha no Firestore. `tipo` válido apenas `'email'` ou `'telefone'`; outros valores redirecionam para `/perfil` (`src/pages/VerificarVinculo.tsx:34`).

### Email/senha

`linkWithCredential(EmailAuthProvider.credential(email, senha))` → `updateDoc(usuarios/{uid}, { email })` → `refreshUsuario` → volta a `/perfil` (`src/pages/VerificarVinculo.tsx:65`).

### Telefone (SMS, dois passos)

1. **Envio:** `ensureRecaptcha()` cria um `RecaptchaVerifier` *invisible*; `PhoneAuthProvider.verifyPhoneNumber(phone, recaptcha)` guarda o `verificationId` em um *ref* e avança para o passo `confirm` (`src/pages/VerificarVinculo.tsx:83`).
2. **Confirmação:** `PhoneAuthProvider.credential(verificationId, smsCode)` → `linkWithCredential` → `updateDoc(usuarios/{uid}, { telefone: phone })` → `refreshUsuario` → volta a `/perfil` (`src/pages/VerificarVinculo.tsx:103`).

> [!note] reCAPTCHA
> É limpo no *unmount* e re-criado a cada novo envio (`resetRecaptcha` / `ensureRecaptcha`). Usa o componente `PhoneInput` para a entrada do número.

`getErrorMessage` traduz os códigos do Auth: `auth/email-already-in-use`, `auth/weak-password`, `auth/invalid-phone-number`, `auth/invalid-verification-code`, `auth/credential-already-in-use`, `auth/provider-already-linked`, `auth/too-many-requests` (`src/pages/VerificarVinculo.tsx:255`).

## Onboarding — `CompletarPerfil` (`src/components/CompletarPerfil.tsx`)

Tela mostrada quando o usuário autenticado ainda não tem nome/apelido no Firestore (gating no fluxo de [[Autenticação Login e Cadastro]]).

- Pré-preenche **nome** com `firebaseUser.displayName` e **apelido** com o primeiro *token* do `displayName`.
- Valida nome e apelido `>= 2` caracteres.
- Persiste com `setDoc(usuarios/{uid}, { nome, apelido, email, telefone, criadoEm: serverTimestamp() }, { merge: true })`. `email`/`telefone` vêm de `firebaseUser.email`/`phoneNumber` (podem ser vazios). Após salvar, chama `refreshUsuario()`.

> [!warning] `merge:true` sem `role` é intencional
> Comentário explícito no código (`src/components/CompletarPerfil.tsx:33`): o `setDoc` usa `merge:true` e **não** inclui `role`, para não sobrescrever o papel de admin de um usuário pré-existente. Não adicione `role` aqui.

## Modal de upload — `UploadFotoPerfil` (`src/components/UploadFotoPerfil.tsx`)

Crop circular que envia JPEG para o [[Regras do Storage|Storage]] e grava `fotoURL` no Firestore. Usa `react-easy-crop` com `aspect=1` e `cropShape='round'`.

- Valida: arquivo deve ser `image/*` e `<= 10 MB` (`10*1024*1024`).
- `fileToDataUrl` converte o `File` em *data URL* para o preview no `Cropper`.
- `cropAndResizeToJpeg(imageSrc, croppedArea)` gera o *blob* JPEG da área recortada — ver [[Processamento de imagem]].
- Caminho do Storage: `fotos_perfil/{uid}/{Date.now()}.jpg` com `contentType: image/jpeg`.
- Após upload: `getDownloadURL` → `updateDoc(usuarios/{uid}, { fotoURL: url })` → `onConcluido(url)`.

> [!warning] Fotos antigas acumulam
> O nome de arquivo usa `Date.now()`; cada troca grava um arquivo novo e **não deleta** o anterior. As fotos antigas acumulam por usuário no Storage.

## Componente `Avatar` (`src/components/Avatar.tsx`)

Avatar reutilizável: mostra imagem ou *placeholder* colorido derivado de hash.

- **Com `src`:** renderiza `<img>` com `loading="lazy"` e `referrerPolicy="no-referrer"`.
- **Sem `src`:** *placeholder* com a inicial maiúscula do nome e cor estável de uma `PALETA` de 12 cores, via hash `hash*31 + charCode` sobre `uid || nome || '?'`.
- **Tamanhos:** `xs` (w-6), `sm` (w-8), `md` (w-10), `lg` (w-16), `xl` (w-24); padrão `sm`.
- `ring` opcional (`ring-2 ring-white/40`) ativado por padrão.

> [!tip] `referrerPolicy="no-referrer"`
> Necessário para carregar fotos hospedadas no Google sem bloqueio de *referrer*.

## Input de telefone — `PhoneInput` (`src/components/PhoneInput.tsx`)

Entrada com seletor de DDI: **24 países** *hardcoded* com `code`/`ddi`/`flag`/`name`. BR é o padrão e tem prioridade para `+55`.

- `parseValue` separa `value` (`+DDI+local`) em `{ code, local }`, casando o **primeiro** `ddi` que prefixar.
- `formatDisplay` formata BR como `(99) 99999-9999` progressivo; outros países mostram só dígitos.
- `maxDigits`: BR=11, outros=15. `onChange` emite sempre `ddi + local` concatenado.
- Dropdown filtrável por nome/ddi/code, fecha em clique externo, foca a busca ao abrir.

> [!warning] DDIs duplicados e formato persistido
> `+1` (US/CA) sempre resolve para a **primeira** ocorrência na lista (US) — o país real pode divergir. O telefone é persistido no Firestore/Auth como `+DDI` + dígitos, **sem** separadores.

## Relacionados

- [[Entidade Usuario]] — documento `usuarios/{uid}` editado por todas estas telas
- [[Autenticação Login e Cadastro]] — fluxo de auth que precede o onboarding
- [[Processamento de imagem]] — `cropAndResizeToJpeg` e `fileToDataUrl`
- [[Regras do Storage]] — caminho `fotos_perfil/{uid}/`
- [[useAuth]] · [[Navbar]] · [[Rotas e Guards]]
- [[Features MOC]]
