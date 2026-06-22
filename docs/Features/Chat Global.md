---
title: Chat Global
tags: [feature, chat, firestore, frontend, realtime]
status: documentado
related:
  - "[[Entidade Usuario]]"
  - "[[Regras de segurança do Firestore]]"
  - "[[FCM e notificações]]"
  - "[[Features MOC]]"
---

Chat global do bolão: uma sala única em tempo real onde todos os participantes conversam, com menções a outros usuários via `@`. Toda a lógica é client-side direto no Firestore — não há nenhuma [[Cloud Functions MOC|Cloud Function]] envolvida.

## Visão geral

O recurso é composto por um hook (`useChat`), uma página (`Chat`) e três componentes (`ChatInput`, `ChatMessage`, `MentionDropdown`). As mensagens vivem em **uma coleção raiz única** `collection(db, 'chat')`, sem subdocumentos por usuário — ver [[Coleções do Firestore]].

> [!info] Acesso pela rota `/chat`
> A rota é protegida por `ProtectedRoute` (App.tsx:45) e o componente é lazy-loaded. As permissões efetivas dependem das [[Regras de segurança do Firestore]], não do código do hook.

## Hook `useChat` — `src/hooks/useChat.ts`

Gerencia listener em tempo real, paginação reversa, envio e exclusão.

- `PAGE_SIZE = 30` (useChat.ts:14).
- **Listener real-time** (useChat.ts:25-45): `onSnapshot` com `orderBy('criadoEm','desc')` + `limit(30)` carrega as 30 mais recentes; depois faz `msgs.reverse()` para exibir a mais antiga primeiro.
- `oldestDocRef` (`useRef`, useChat.ts:39) guarda `snap.docs[length-1]` (o doc mais antigo da janela desc) como cursor de paginação.
- **`carregarMais()`** (useChat.ts:48-74) usa `getDocs` (NÃO real-time) com `startAfter(oldestDocRef)` + `limit(30)`; seta `hasMore = false` quando `snap.empty || snap.size < PAGE_SIZE`. Faz `older.reverse()` e prepende ao estado.
- **`enviarMensagem(texto, mencoes)`** (useChat.ts:77-86): `addDoc` com `{ uid, texto, mencoes, criadoEm: Timestamp.now() }`. Só envia se `firebaseUser` e `usuario` (do [[useAuth]]) estiverem presentes.
- **`apagarMensagem(messageId)`** (useChat.ts:89-91): `deleteDoc(doc(db,'chat',messageId))` — remoção física.

```ts
interface ChatMessage {
  id: string
  uid: string
  texto: string
  mencoes: string[]
  criadoEm: Timestamp
}
```

> [!danger] Divergência spec × código: campo `nome` não é gravado
> A spec `2026-04-01-chat-global-design.md` previa um campo `nome` como snapshot do autor dentro da mensagem. O `useChat` **não grava `nome`** — o tipo `ChatMessage` não o inclui. A exibição compensa resolvendo o nome em runtime via `getNome()` na página. Registro relacionado: [[Divergências conhecidas]].

> [!warning] Paginação antiga não é reativa
> `carregarMais()` usa `getDocs`, não `onSnapshot`. Mensagens antigas paginadas **não recebem atualizações nem deleções em tempo real** — só a janela das 30 mais recentes é reativa. O `useEffect` do listener tem `deps=[]` e assume montagem única; não há reset de `oldestDocRef` entre re-renders.

## Página `Chat` — `src/pages/Chat.tsx`

Orquestra o hook e cuida de menções, scroll e deep-link.

- **Carrega TODOS os usuários** uma vez via `getDocs(collection(db,'usuarios'))` (Chat.tsx:24-28) para resolver menções e nomes de autores. Ver [[Entidade Usuario]].
- **`getNome(uid)`** (Chat.tsx:87-90) resolve `apelido || nome || 'Anônimo'` a partir dessa lista — compensando a ausência do snapshot `nome` na mensagem.
- **`isAdmin`** derivado de `usuario?.role === 'admin'` (Chat.tsx:85) habilita a exclusão de qualquer mensagem.
- **Deep-link** (Chat.tsx:31-47): lê `searchParams.get('msg')`, dá `scrollIntoView` na mensagem `#msg-{id}`, aplica highlight por 3s (`setTimeout … 3000`) e limpa o param da URL (`setSearchParams({}, { replace: true })`).
- **Auto-scroll** (Chat.tsx:50-55): ao chegar mensagem nova (`mensagens.length > prevCount`) só rola se `isAtBottom` (usuário no fundo).
- **`handleScroll`** (Chat.tsx:58-74): detecta `atBottom` (`scrollHeight - scrollTop - clientHeight < 50`) e dispara `carregarMais` quando `scrollTop < 100`, preservando a posição via `scrollTop = scrollHeight - prevHeight`.
- **`handleDelete`** (Chat.tsx:80-83) usa `confirm()` nativo antes de apagar.
- O `ChatInput` recebe a lista de usuários **filtrada** para excluir o próprio usuário (`usuarios.filter(u => u.uid !== firebaseUser?.uid)`, Chat.tsx:134) — não menciona a si mesmo.

> [!warning] Sem link na Navbar e leitura full da coleção
> Não há item "Chat" na [[Navbar]] (a spec previa um link entre Palpites e Geral); a rota só é acessível por URL direta ou deep-link. Além disso, a página recarrega a coleção `usuarios` **inteira** a cada montagem.

## Input e menções

### `ChatInput` — `src/components/ChatInput.tsx`

- **`handleChange`** (ChatInput.tsx:18-40) detecta `@` no texto antes do cursor: só abre o dropdown se o char antes do `@` for espaço, quebra de linha ou início, e o filtro não contiver espaço.
- **`handleSelectMention`** (ChatInput.tsx:42-51) insere `@{apelido||nome} ` na posição `mentionStart`.
- **`Esc`** fecha o dropdown (`handleKeyDown`, ChatInput.tsx:82-86).
- **No submit** (ChatInput.tsx:53-80): `mentionRegex = /@(\S+)/g` extrai todos os `@nomes`; resolve cada um comparando case-insensitive com `apelido` OU `nome`; descarta não-encontrados (`filter(Boolean)`); remove duplicados com `new Set`.

### `MentionDropdown` — `src/components/MentionDropdown.tsx`

- Filtra por `apelido`/`nome` (`includes`, case-insensitive) e limita a 8 resultados (`.slice(0, 8)`).
- Posicionado acima do input (`bottom-full`); mostra inicial colorida + apelido/nome.
- Retorna `null` se nenhum usuário corresponder ao filtro.

> [!warning] Menção é resolvida por texto, não por seleção robusta
> A resolução é puramente textual: se dois usuários têm apelidos iguais, o `find` pega o primeiro; se o apelido tem espaço, a regex `\S+` captura só o primeiro token. O array `mencoes` não é validado em formato nem tamanho pelas regras.

## Balão de mensagem — `src/components/ChatMessage.tsx`

Renderiza um balão estilo WhatsApp.

- **`formatarTextoComMencoes`** (ChatMessage.tsx:15-27) faz `split(/(@\S+)/g)` e estiliza tokens `@` em `font-semibold` azul (`text-blue-600`, ou `text-blue-200 underline` quando `isMine`).
- `isMine` alinha à direita com `bg-blue-600` + texto branco; outros à esquerda com `bg-white border`.
- Mostra o nome do autor (vindo de `getNome`) **apenas quando `!isMine`**.
- Hora formatada de `criadoEm.toDate()` em pt-BR `HH:mm`.
- `id` do DOM = `msg-{id}`, usado pelo deep-link de highlight.
- `highlighted` aplica `ring` amarelo + `bg-yellow-50` + `scale 1.02`.
- Botão **"apagar"** aparece só no hover (`opacity-0 group-hover`) quando `canDelete = isMine || isAdmin`.

> [!note] Destaque de menção é só visual
> O highlight de `@nome` no balão vem da regex sobre o texto — **não** usa o array `mencoes` da mensagem para decidir o que destacar.

## Regras de segurança da coleção `chat`

Definidas em `firestore.rules:181-186` — ver [[Regras de segurança do Firestore]]:

| Operação | Condição |
| --- | --- |
| `read` | `isAuthenticated()` |
| `create` | `isAuthenticated() && request.resource.data.uid == request.auth.uid` (impede forjar autor) |
| `delete` | `isOwner(resource.data.uid) || isAdmin()` |
| `update` | `if false` (mensagens são imutáveis) |

As regras não validam formato/tamanho do `texto` nem do array `mencoes` — qualquer payload com `uid` correto é aceito.

## Limitações conhecidas

> [!warning] Sem notificações de menção
> Mencionados **não recebem nenhuma notificação** (in-app ou push) — funcionalidade prevista na spec e não implementada. Não há integração com [[FCM e notificações]] neste fluxo.

## Relacionados

- [[Entidade Usuario]] — fonte de `apelido`/`nome`/`role` usados em menções, autoria e permissão de admin.
- [[Regras de segurança do Firestore]] — controla leitura, criação, exclusão e imutabilidade das mensagens.
- [[FCM e notificações]] — infraestrutura de push; ainda não usada para menções no chat.
- [[Coleções do Firestore]] — onde vive a coleção raiz `chat`.
- [[useAuth]] — fornece `firebaseUser` e `usuario` ao hook e à página.
- [[Navbar]] — sem link para `/chat` (divergência da spec).
- [[Divergências conhecidas]] · [[Features MOC]]
