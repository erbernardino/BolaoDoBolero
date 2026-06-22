---
title: Resultados Especiais
tags:
  - admin
  - firestore
  - pontuacao
  - palpites-especiais
status: documentado
related:
  - "[[Coleção config]]"
  - "[[Entidades de palpite]]"
  - "[[Configurações do bolão]]"
  - "[[Admin MOC]]"
---

Tela administrativa que registra os **resultados oficiais especiais** da Copa — campeão, vice, 3º lugar, 4º lugar e o(s) país(es) do(s) artilheiro(s). Esses valores são a referência oficial usada para pontuar os palpites especiais que cada participante fez (ver [[Entidades de palpite]]). A tela vive em `src/pages/admin/ResultadosEspeciais.tsx`.

## O que a tela faz

No carregamento (`src/pages/admin/ResultadosEspeciais.tsx:18`), faz duas leituras em paralelo: a collection `times` (para popular os selects, ordenados por nome) e o doc `config/resultado_especial` (para pré-preencher o formulário se já existir). Ao salvar, grava o documento inteiro via `setDoc` em `config/resultado_especial` (`src/pages/admin/ResultadosEspeciais.tsx:71`).

> [!info] Origem dos dados
> Todas as posições e artilheiros são escolhidos a partir da collection `times`, exibindo nome, sigla e bandeira de cada seleção. Não há digitação livre de texto — só IDs de times válidos.

## Campos do documento `config/resultado_especial`

| Campo | Tipo | Regra |
| --- | --- | --- |
| `campeao` | ID de time | único entre as 4 colocações |
| `vice` | ID de time | único entre as 4 colocações |
| `terceiro` | ID de time | único entre as 4 colocações |
| `quarto` | ID de time | único entre as 4 colocações |
| `paisesArtilheiros` | array de IDs | múltiplos permitidos |

### Colocações (campeão a 4º)

Os quatro selects de colocação filtram suas opções para **impedir o mesmo time em duas posições**: cada select remove da lista as seleções já escolhidas nas outras três posições (`src/pages/admin/ResultadosEspeciais.tsx:103`). O time selecionado aparece com bandeira logo abaixo do select como confirmação visual.

### País(es) do(s) artilheiro(s)

`paisesArtilheiros` é um **array** porque pode haver mais de um artilheiro (empate na artilharia). O admin adiciona países um a um por um select + botão "Adicionar"; o select já oculta países que estão na lista (`src/pages/admin/ResultadosEspeciais.tsx:145`). Cada item pode ser removido individualmente. A própria UI avisa: "Se houver mais de um artilheiro, adicione todos os países. Todos serão considerados corretos."

## Não recalcula o ranking automaticamente

> [!danger] Salvar aqui NÃO dispara recálculo
> A gravação em `config/resultado_especial` não recalcula o ranking. A mensagem de sucesso é explícita: *"Resultados especiais salvos! Recalcule o ranking para atualizar os pontos."* (`src/pages/admin/ResultadosEspeciais.tsx:72`). Os pontos dos palpites especiais só entram no ranking depois de o admin ir em [[Configurações do bolão]] e acionar o **Recalcular Ranking** manualmente (ver [[Recálculo de ranking]]).

> [!warning] `config/resultado_especial` é documento permitido na coleção config
> A coleção [[Coleção config]] só pode conter os documentos `geral` e `resultado_especial`. `resultado_especial` é o ÚNICO outro documento permitido além de `geral`. Criar qualquer terceiro documento em `config` quebra leituras que dependem da estrutura conhecida — em 2026-04-30 um `config/app_version` indevido derrubou a página de palpites em produção. Para dados de sistema, usar uma coleção separada (ver [[Coleção _system]]).

## Fluxo típico do admin

1. Cadastrar/conferir as seleções em [[Gerenciar Jogos e Times]] (a tela lê `times`).
2. Após o término da Copa, preencher campeão, vice, 3º, 4º e o(s) país(es) do(s) artilheiro(s).
3. Salvar — grava `config/resultado_especial`.
4. Ir em [[Configurações do bolão]] e acionar **Recalcular Ranking** para os pontos especiais entrarem no ranking.

## Relacionados

- [[Coleção config]]
- [[Entidades de palpite]]
- [[Configurações do bolão]]
- [[Recálculo de ranking]]
- [[Coleção _system]]
- [[Gerenciar Jogos e Times]]
- [[Inserir Resultados]]
- [[Admin MOC]]
