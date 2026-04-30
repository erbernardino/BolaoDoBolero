# Bolao do Bolero

Bolao entre amigos para a Copa do Mundo FIFA 2026.

## A Historia

O Bolao do Bolero nasceu em homenagem ao nosso amigo **Bolero**, companheiro de infancia que desde a Copa de 1994 organizava um bolao entre amigos para cada Copa do Mundo. Ele fazia tudo na unha: imprimia planilhas, mandava pra todo mundo, acompanhava cada jogo e mantinha a galera unida durante o torneio inteiro.

Na Copa de 2018, o Bolero ficou mal de saude e nao conseguiu acompanhar o bolao ate o final. Pouco depois da Copa, ele faleceu.

Na Copa de 2022, com a ajuda do Tugues, mantivemos a tradicao viva usando planilhas no Excel. O nome **Bolao do Bolero** foi mantido em sua homenagem. Parte da arrecadacao foi destinada a Fundacao Rotary em nome dele, ja que o Bolero era rotariano. O valor que ele costumava cobrar para cobrir custos de impressao foi redirecionado para essa causa, uma vez que tudo passou a ser digital.

Agora, para 2026, o bolao ganhou sua propria plataforma. A tradicao continua.

## Como Funciona

Cada participante faz seus palpites para **todos os jogos da Copa** antes do inicio do torneio. A pontuacao funciona assim:

- **Placar exato** (ex: palpitou 2x1 e deu 2x1) — 10 pontos
- **Acertou o placar de um time** (ex: palpitou 2x0 e deu 2x1) — 5 pontos
- **Acertou o vencedor** (ex: palpitou 3x0 e deu 1x0) — 3 pontos

Os valores sao configuraveis pelo administrador. No mata-mata, em caso de empate, o participante deve indicar quem avanca nos penaltis.

O bolao tambem tem palpites especiais: campeao, vice e artilheiro.

Premiacao para 1º, 2º, 3º lugar e o antipenultimo — porque como o Bolero dizia: *"ficar em ultimo e facil, quero ver ficar em antipenultimo"*.

## Cadastro

O cadastro e feito apenas por **convite do administrador**. Nao e uma plataforma aberta — e um bolao entre amigos.

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS (PWA)
- **Backend:** Firebase (Auth + Firestore + Cloud Functions + Hosting + FCM)
- **Autenticacao:** Email/senha, telefone (SMS), Google
- **Testes:** Vitest

## Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de producao
npm test             # rodar testes
cd functions && npm run build  # compilar Cloud Functions
firebase deploy      # deploy completo
```

## Em Memoria

Dedicado ao Bolero, que por mais de 20 anos reuniu amigos ao redor do futebol. A tradicao continua.
