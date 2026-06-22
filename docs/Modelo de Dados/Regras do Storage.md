---
title: Regras do Storage
tags:
  - dados
  - storage
  - seguranca
  - firebase
status: documentado
related:
  - "[[Gerenciamento de Perfil]]"
  - "[[Processamento de imagem]]"
  - "[[Regras de segurança do Firestore]]"
  - "[[Modelo de Dados MOC]]"
---

As regras do Firebase Storage definem o **único caminho gravável** do bucket — `fotos_perfil/{uid}/{filename}` — usado pelas fotos de perfil dos participantes. Todo o resto é negado por padrão. A fonte de verdade é `storage.rules` (raiz do repo).

## O único caminho gravável

O match `fotos_perfil/{uid}/{filename}` (`storage.rules:7`) controla as fotos enviadas no [[Gerenciamento de Perfil]] após passarem pelo [[Processamento de imagem]]:

| Operação | Condição |
| --- | --- |
| `read` | `request.auth != null` (qualquer usuário autenticado) |
| `create` / `update` | autenticado **e** `request.auth.uid == uid` **e** `request.resource.size < 5 MiB` **e** `contentType` casa `image/.*` |
| `delete` | `if false` (sempre proibido) |

Ou seja: qualquer participante autenticado pode **ler** a foto de qualquer outro (necessário para exibir avatares no [[Navbar]], [[Página Ranking]] etc.), mas só o **dono do uid** pode gravar arquivos no próprio diretório, respeitando o limite de 5 MiB e o tipo imagem.

> [!info] Limite e tipo
> O teto de 5 MiB (`5 * 1024 * 1024`, `storage.rules:11`) e a checagem de `contentType.matches('image/.*')` (`storage.rules:12`) são validados pela própria regra, no servidor — não dependem só do client. O [[Processamento de imagem]] redimensiona/comprime antes do upload, ficando bem abaixo desse teto.

## Upload acumulativo (sem sobrescrita)

Cada upload usa um **nome novo** baseado em timestamp; os arquivos antigos ficam preservados, porque o `delete` é proibido.

> [!warning] delete proibido — uploads acumulam
> A regra `allow delete: if false` (`storage.rules:13`) bloqueia qualquer exclusão, inclusive pelo próprio dono. Trocar a foto de perfil **cria um novo arquivo**, não substitui o anterior. Com o tempo, o diretório `fotos_perfil/{uid}/` acumula todas as versões já enviadas. Não há limpeza automática.

> [!danger] fotoURL aponta para um arquivo específico
> O campo `fotoURL` em `usuarios/{uid}` (ver [[Entidade Usuario]]) aponta para o arquivo no Storage. Ao trocar a foto, o app grava a nova URL no documento, mas o arquivo antigo continua existindo no bucket — apenas deixa de ser referenciado. Não confie que "a foto antiga sumiu": ela permanece acessível por leitura a qualquer autenticado que tenha a URL.

## Default: nega tudo

O match curinga `/{allPaths=**}` (`storage.rules:17`) define `allow read, write: if false`, negando qualquer caminho fora de `fotos_perfil/`. Não existe nenhum outro diretório gravável no bucket.

> [!note] Postura "deny by default"
> Assim como as [[Regras de segurança do Firestore]], o Storage segue negação por padrão: só o que está explicitamente liberado é permitido. Para adicionar novos caminhos graváveis seria necessário criar novos matches específicos.

## Relacionados

- [[Gerenciamento de Perfil]] — fluxo de troca de foto que usa este caminho
- [[Processamento de imagem]] — redimensiona/comprime antes do upload
- [[Entidade Usuario]] — onde mora o campo `fotoURL`
- [[Regras de segurança do Firestore]] — contraparte de segurança no banco
- [[Modelo de Dados MOC]]
