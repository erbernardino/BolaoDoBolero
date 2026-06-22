---
title: Visão Geral e Regulamento
tags:
  - operacao
  - regulamento
  - dominio
  - regras-de-negocio
status: documentado
related:
  - "[[Início]]"
  - "[[Pontuação]]"
  - "[[Formato da Copa 2026]]"
  - "[[Operação MOC]]"
---

O **Bolão do Bolero** é um bolão privado entre amigos para a Copa do Mundo FIFA 2026 — bolão único, não uma plataforma multi-bolão — em que o cadastro acontece **apenas por convite do administrador**. Esta nota consolida a origem do bolão e as **regras de negócio autoritativas** (pontuação, premiação, desempate) conforme o regulamento real.

> [!warning] Fonte autoritativa do regulamento
> O regulamento real está em `Considerações Gerais.md` (raiz do repo) e é renderizado na aplicação por `src/pages/Regulamento.tsx`. **Estes dois são a autoridade.** A especificação em `docs/superpowers/specs` e o `README.md` descrevem uma escala de pontuação diferente (10/5/3) — não confie na spec nem no README para regras de negócio. Veja [[Especificação e Design]] e [[Divergências conhecidas]].

## Origem

O bolão é uma tradição que existe **desde 1994**, idealizada pelo amigo **Duda**, apelidado **"Bolero"**, que organizava o bolão entre amigos a cada Copa do Mundo — imprimia as planilhas, distribuía e acompanhava todos os jogos. O nome "Bolão do Bolero" é uma homenagem a ele. Para 2026, a tradição ganhou plataforma própria (este projeto).

## Pontuação por partida

> [!info] Escala oficial: 0, 1, 3 ou 5 pontos (não cumulativa)
> A cada partida o concorrente faz **0, 1, 3 ou 5 pontos**, comparando a aposta ao resultado real. Detalhes de cálculo em [[Pontuação]].

| Pontos | Coluna apostada | Nº de gols no jogo | Resultado |
| :---: | :---: | :---: | :---: |
| 0 | Errada | Errado | Errado |
| 1 | Errada | **Certo** | Indiferente |
| 3 | **Certa** | Indiferente | Errado |
| 5 | **Certa** | **Certo** | **Certo** (placar exato) |

- **5 pontos** — coluna certa (acertou o vencedor/empate) **e** número de gols do jogo certo: placar exato.
- **3 pontos** — coluna certa, mas o resultado (placar) está errado.
- **1 ponto** — coluna errada, mas o total de gols do jogo está certo.
- **0 ponto** — errou tudo.

A pontuação **não é cumulativa**: vale apenas a faixa mais alta atingida. Os resultados apostados valem pelos **90 minutos regulamentares** — gols de prorrogação e pênaltis **não** são computados no placar.

> [!note] Origem dos times do mata-mata
> O regulamento determina que os jogos do mata-mata são definidos pelos próprios palpites da fase de grupos, gerando um chaveamento personalizado por participante (ver [[Bracket personalizado do usuário]] e [[Formato da Copa 2026]]). Em caso de empate no mata-mata, o participante indica quem avança (pênaltis); essa escolha só define os times das fases seguintes e **não vale pontuação**.

## Palpites especiais

Além dos jogos, há 5 espaços de palpite especial, cada acerto valendo **10 pontos**:

- Campeão
- Vice-campeão
- 3º colocado
- 4º colocado
- País defendido pelo artilheiro da competição

> [!warning] Repetição de país invalida o palpite
> Nos espaços de colocação **não pode haver repetição de países**. Havendo repetição, os palpites repetidos são invalidados. Se houver 2 ou mais artilheiros, todos os respectivos países contam como certos no espaço "país do artilheiro".

## Inscrição

- **Taxa de inscrição: R$ 200,00** (o texto do regulamento grafa "duzentos e cinquenta reais" — inconsistência, ver aviso abaixo).
- Pagamento via **PIX** com envio de comprovante para o celular **(11) 97177-0713** (chave PIX e WhatsApp).
- A inscrição se efetiva com os palpites preenchidos no sistema **antes do início da Copa**.
- **Prazo de inscrição: 10/06/2026** (impreterível).

> [!danger] Taxa de inscrição inconsistente na fonte
> `Considerações Gerais.md:11` grafa **"R$ 200,00 (duzentos e cinquenta reais)"** — o valor numérico (200) e o valor por extenso (250) divergem. Já o `config` da aplicação usa `taxaInscricao: 250` (`src/pages/admin/Configuracoes.tsx:37`), e `src/pages/Regulamento.tsx:42` faz fallback `?? 250`. O valor efetivo cobrado depende do que estiver salvo na [[Coleção config]]. Registrado em [[Divergências conhecidas]].

## Premiação

O total arrecadado é dividido em **5 partes**:

| Parte | Destino |
| :---: | --- |
| **50%** | 1º colocado |
| **25%** | 2º colocado |
| **10%** | 3º colocado |
| **5%** | Antepenúltimo colocado |
| **10%** | Doação à campanha **End Polio Now** (Rotary International) |

A premiação fica disponível em até **24h após o término da partida final** (janela para questionamentos). O Bolero era rotariano, o que motiva a doação ao Rotary.

## Desempate

Em caso de empate entre dois ou mais participantes, na ordem:

1. Maior número de **acertos secos** (placares exatos de 5 pontos);
2. Maior número de pontos obtidos **em jogos** (desconsiderando colocações e artilheiro);
3. Maior número de pontos na **1ª fase**;
4. Maior número de pontos nos **jogos do Brasil**;
5. **Divisão do prêmio**.

## Reclamações e prazos

- Reclamações quanto à pontuação são aceitas em até **24h após o término de cada rodada**.
- Premiação liberada em até **24h após a final**.
- Casos omissos são decididos pela comissão organizadora.

## Documentos de requisito

> [!tip] Estado dos documentos-fonte
> - `README.md` — praticamente vazio do ponto de vista de regras (texto de história e stack); a seção "Como Funciona" usa a escala 10/5/3, que **não** é a oficial.
> - `BaseBolaoDoBolero.md` — requisito original curto: foco inicial no cadastro dos palpites antes do início da Copa, e o mata-mata segue a regra da Copa derivada dos palpites da 1ª fase.
> - `Considerações Gerais.md` — **regulamento autoritativo** (escala 0/1/3/5 e 10 nos especiais).

## Relacionados

- [[Início]] — porta de entrada do segundo cérebro.
- [[Operação MOC]] — MOC desta área.
- [[Pontuação]] — implementação do cálculo de pontos por partida.
- [[Formato da Copa 2026]] — estrutura de grupos e mata-mata da competição.
- [[Especificação e Design]] — spec/design (atenção: escala de pontos divergente).
- [[Bracket personalizado do usuário]] — chaveamento derivado dos palpites de grupos.
- [[Divergências conhecidas]] — inconsistências entre regulamento, spec e config.
