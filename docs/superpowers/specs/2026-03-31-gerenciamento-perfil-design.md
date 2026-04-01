# Gerenciamento de Perfil do Usuário

## Resumo

Página de perfil (`/perfil`) com duas seções: "Dados Pessoais" e "Métodos de Login". Permite editar nome/apelido e vincular/desvincular métodos de autenticação (email/senha, telefone SMS, Google). Verificação de email e telefone acontece em página separada (`/perfil/verificar/:tipo`).

## Seção 1: Dados Pessoais

- Formulário com campos **Nome** e **Apelido**, pré-preenchidos com valores atuais do Firestore
- Botão "Salvar" atualiza o documento `usuarios/{uid}` no Firestore
- Validação: ambos obrigatórios, mínimo 2 caracteres
- Feedback visual (mensagem inline) de sucesso ou erro
- Atualização apenas no Firestore (não afeta Firebase Auth)

## Seção 2: Métodos de Login

Lista dos 3 providers com estado atual:

### Email/Senha
- **Vinculado:** mostra email atual + botão "Desvincular"
- **Não vinculado:** botão "Vincular Email" → redireciona para `/perfil/verificar/email`

### Telefone (SMS)
- **Vinculado:** mostra telefone atual + botão "Desvincular"
- **Não vinculado:** botão "Vincular Telefone" → redireciona para `/perfil/verificar/telefone`

### Google
- **Vinculado:** mostra "Google conectado" + botão "Desvincular"
- **Não vinculado:** botão "Vincular Google" → popup OAuth via `linkWithPopup`

### Regras
- Não pode desvincular se for o **único** método de login restante (botão desabilitado com tooltip)
- Ao vincular email/telefone, atualiza o campo correspondente no documento Firestore do usuário
- Ao desvincular, limpa o campo no Firestore

## Seção 3: Página de Verificação (`/perfil/verificar/:tipo`)

### tipo=email
- Campos: email + senha
- Ação: `linkWithCredential(EmailAuthProvider.credential(email, senha))`
- Sucesso: atualiza Firestore (`email`) + redireciona para `/perfil` com mensagem de sucesso
- Erros tratados: email já em uso, senha fraca

### tipo=telefone
- Passo 1: campo de telefone + reCAPTCHA invisível → envia código SMS via `linkWithPhoneNumber`
- Passo 2: campo para código SMS de 6 dígitos
- Sucesso: atualiza Firestore (`telefone`) + redireciona para `/perfil` com mensagem de sucesso
- Erros tratados: código inválido, telefone já em uso

### Navegação
- Botão "Voltar" para retornar ao `/perfil`
- Rota protegida (requer autenticação)

## Integração no App

- Nova rota `/perfil` (protegida via `ProtectedRoute`)
- Nova rota `/perfil/verificar/:tipo` (protegida via `ProtectedRoute`)
- Link "Meu Perfil" adicionado ao Navbar
- Arquivos novos:
  - `src/pages/Perfil.tsx` — página principal do perfil
  - `src/pages/VerificarVinculo.tsx` — página de verificação para vincular email/telefone
