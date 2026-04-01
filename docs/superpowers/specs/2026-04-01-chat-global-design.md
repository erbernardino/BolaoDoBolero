# Chat Global — Especificação

Chat único global para todos os participantes do Bolão do Bolero, com menções de usuários via @.

## Modelo de Dados

### /chat/{messageId}

| Campo | Tipo | Descrição |
|-------|------|-----------|
| uid | string | ID do autor |
| nome | string | Apelido do autor (snapshot no momento do envio) |
| texto | string | Texto da mensagem |
| mencoes | string[] | UIDs dos usuários mencionados |
| criadoEm | Timestamp | Data/hora de criação |

Collection única na raiz do Firestore. O `nome` é salvo como snapshot para evitar joins na exibição.

## Menções com @

### Fluxo de digitação
1. Usuário digita `@` no campo de texto
2. Abre dropdown acima do input com a lista de participantes
3. Lista filtra conforme o usuário continua digitando (ex: `@Eme` → filtra para "Emerson")
4. Selecionar um participante insere `@Apelido` no texto e fecha o dropdown
5. Pressionar Esc ou apagar o `@` fecha o dropdown

### Envio
- No envio, o frontend extrai os `@Apelido` do texto
- Resolve cada apelido para o uid correspondente
- Salva os uids no campo `mencoes[]`

### Exibição
- `@Apelido` aparece em azul bold no texto da mensagem
- Mencionados recebem notificação in-app (sininho) com título "Você foi mencionado" e corpo com trecho da mensagem

### Notificação
- Apenas in-app (salvar em `notificacoes_usuario/{uid}/items`)
- Sem push notification
- Título: "Menção no chat"
- Corpo: "@{autor} mencionou você: {trecho}"

## Paginação

- Carrega as últimas 30 mensagens inicialmente via `onSnapshot` (tempo real)
- Scroll para cima carrega mais 30 mensagens (`startAfter` do documento mais antigo visível)
- Mensagens antigas carregadas via `getDocs` (não real-time)
- Auto-scroll para novas mensagens quando o usuário está no fundo da conversa

## Exclusão de Mensagens

- Cada usuário pode apagar suas próprias mensagens
- Admin pode apagar qualquer mensagem
- Mensagem apagada é removida do Firestore (`deleteDoc`)

## Firestore Rules

```
match /chat/{messageId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && request.resource.data.uid == request.auth.uid;
  allow delete: if isOwner(resource.data.uid) || isAdmin();
  allow update: if false;
}
```

## UI / UX

### Rota e navegação
- Rota: `/chat`
- Link "Chat" na navbar (entre Palpites e Geral)

### Layout
- Estilo WhatsApp:
  - Mensagens do usuário logado alinhadas à direita (fundo azul)
  - Mensagens de outros à esquerda (fundo branco/cinza)
  - Nome do autor + hora acima de cada mensagem
  - Balões arredondados

### Input
- Campo de texto fixo no rodapé da página
- Botão enviar à direita
- Dropdown de menções aparece acima do input ao digitar @

### Responsividade
- Mobile: input ocupa toda a largura, mensagens com padding lateral menor
- Desktop: largura máxima centralizada (max-w-2xl)

## Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/pages/Chat.tsx` | Página principal do chat |
| `src/components/ChatMessage.tsx` | Componente de mensagem individual |
| `src/components/ChatInput.tsx` | Input com suporte a menções @ |
| `src/components/MentionDropdown.tsx` | Dropdown de seleção de usuários |
| `src/hooks/useChat.ts` | Hook para carregar mensagens, enviar, apagar, paginar |
