---
title: Frontend MOC
tags:
  - moc
  - frontend
status: documentado
related:
  - "[[Início]]"
  - "[[Rotas e Guards]]"
  - "[[Inicialização Firebase]]"
---

# 💻 Frontend — MOC

App **React 18 + TypeScript + Vite + Tailwind**, servido como **PWA**. A [[Inicialização Firebase]] conecta tudo ao backend; [[useAuth]] provê a sessão; [[Rotas e Guards]] orquestra o acesso.

## 🚪 Acesso e navegação

- [[Rotas e Guards]] — tabela de rotas e os guards `Protected`/`Admin`/`Liberado`.
- [[useAuth]] — contexto de autenticação.
- [[Liberação do participante]] — quando o participante ganha acesso pleno.
- [[Navbar]] — navegação condicional por papel/liberação.

## 📄 Páginas do participante

- [[Página Home]] — dashboard de entrada.
- [[Autenticação Login e Cadastro]] — entrada e onboarding.
- [[Página Palpites]] — hub de abas por fase.
- [[Página Ranking]] — classificação do bolão.
- [[Página Resultados]] — resultados reais e projeções.
- [[Impressão de palpites]] — versão para impressão.

## 🔌 Infra de cliente

- [[Inicialização Firebase]] — bootstrap do SDK.
- [[Hooks e PWA]] — versão, offline, remote config, service worker.
- [[Banners de estado]] — offline, ambiente de teste, liberação, nova versão.
- [[Observabilidade]] — Sentry + Firebase Analytics.
- [[Processamento de imagem]] — recorte/compressão da foto de perfil.

> [!info] Dois consumidores do mesmo domínio
> A [[Página Resultados]] e a [[Página Palpites]] usam as mesmas libs de [[Domínio MOC|domínio]] — uma com resultados reais ([[Bracket oficial]]), outra com palpites ([[Bracket personalizado do usuário]]).

## Notas nesta área

```dataview
LIST FROM "Frontend" WHERE file.name != "Frontend MOC" SORT file.name ASC
```
