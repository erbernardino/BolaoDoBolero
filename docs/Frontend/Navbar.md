---
title: Navbar
tags:
  - frontend
  - componente
  - navegacao
status: documentado
related:
  - "[[Rotas e Guards]]"
  - "[[Liberação do participante]]"
  - "[[Banners de estado]]"
  - "[[Frontend MOC]]"
---

A **Navbar** é a barra de navegação principal das páginas autenticadas. Monta seus links dinamicamente conforme a [[Liberação do participante]] e o papel (`role`) do usuário, e embute o `BannerLiberacao` logo abaixo. Fonte: `src/components/Navbar.tsx`.

## Montagem dos links

A lista `navLinks` (`src/components/Navbar.tsx:16`) é só UI — a renderização condicional segue os dados do [[useAuth]] (`firebaseUser` e `usuario`):

| Link | Label | Condição |
| --- | --- | --- |
| `/palpites` | Palpites | sempre |
| `/resultados` | Resultados | sempre |
| `/todos-palpites` | Geral | só quando `usuario.liberado === true` |
| `/ranking` | Ranking | só quando `usuario.liberado === true` |
| `/regulamento` | Regulamento | sempre |
| `/formato-copa` | Formato Copa | sempre |
| `/admin` | Admin | só quando `usuario.role === 'admin'` |

A variável `liberado` (`Navbar.tsx:14`) controla a inserção de **Geral** (que leva à [[Página Ranking|/todos-palpites]] de palpites gerais) e **Ranking**. O link **Admin** é condicionado a `role === 'admin'` (`Navbar.tsx:25`). Os destinos correspondem às [[Rotas e Guards]] (LiberadoRoute / AdminRoute).

> [!info] Não há link de Chat
> A Navbar **não** expõe link para `/chat` ([[Chat Global]]); a entrada para o chat, se houver, fica em outro lugar.

## Título, perfil e responsividade

- O título **"Bolão do Bolero (Duda)"** linka para `/` (`Navbar.tsx:36`).
- O bloco avatar + nome linka para `/perfil` ([[Gerenciamento de Perfil]]). O `displayName` resolve como `apelido || nome || firebaseUser.displayName || 'Perfil'` (`Navbar.tsx:28`) e o `photoURL` como `usuario.fotoURL ?? firebaseUser.photoURL ?? null` (`Navbar.tsx:29`), usando o componente `Avatar`.
- Em telas md+ os links e o perfil ficam inline; abaixo disso há um **menu hambúrguer** controlado pelo estado `menuOpen`, que abre/fecha por transição de altura (`max-h`) e repete os mesmos links mais um bloco de perfil (com e-mail ou telefone). No mobile, o avatar fica visível ao lado do botão de menu.

## Banner de liberação embutido

Logo após o `<nav>`, a Navbar renderiza `<BannerLiberacao />` (`Navbar.tsx:130`), parte dos [[Banners de estado]]:

- Retorna `null` se `!usuario`, ou `usuario.liberado === true`, ou `usuario.role === 'admin'` (`BannerLiberacao.tsx:6`).
- Caso contrário, mostra um banner âmbar **sticky** ("Aguardando liberação do administrador") pedindo o comprovante de PIX para o celular **(11) 97177-0713** (chave PIX e WhatsApp). Ver [[Liberação do participante]].

## Armadilhas

> [!warning] Não há layout compartilhado
> A Navbar é **importada e renderizada individualmente por cada página** autenticada — não existe um layout único que a injete. Páginas standalone como [[Autenticação Login e Cadastro|Login e Cadastro]] e o regulamento público **não** a renderizam (telas centralizadas). Ao criar uma página nova, lembre-se de montar a Navbar manualmente se ela precisar da navegação.

> [!danger] Esconder o link não protege o recurso
> A lista de links é puramente cosmética. A segurança real vem das [[Rotas e Guards]] (LiberadoRoute / AdminRoute) e das [[Regras de segurança do Firestore]]. Ocultar **Admin** ou **Ranking** da Navbar não impede acesso por URL direta nem leitura indevida de dados — isso é responsabilidade dos guards e das rules.

## Relacionados

- [[Rotas e Guards]] — guards que de fato protegem os destinos dos links.
- [[Liberação do participante]] — controla os links Geral/Ranking e o banner.
- [[Banners de estado]] — família do `BannerLiberacao` embutido.
- [[useAuth]] — fornece `firebaseUser` e `usuario` que alimentam a montagem.
- [[Frontend MOC]]
