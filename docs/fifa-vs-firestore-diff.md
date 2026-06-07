# Diff: Firestore (bolão) vs FIFA oficial

Extraído em: 2026-04-26T02:56:50.669Z

Total FIFA: 104
Sem divergência: 101
Com divergência: 3
Órfãos no Firestore: 0

## Sumário — análise por par de times (só Primeira fase, 72 jogos)

| Situação | Qtde |
|---|---|
| ✅ Tudo correto (times, grupo, data, hora, número) | 69 |
| 🔄 Times e grupo corretos, só o **número oficial FIFA** diverge | 0 |
| ⚠️ Outras divergências (data/hora/inversão casa-visitante/time faltando) | 3 |

## Tabela — Primeira fase por par de times

| FIFA# | Casa | × | Visitante | Grupo | Data | Hora | Firestore# | Nota |
|---|---|---|---|---|---|---|---|---|
| 1 | México | × | África do Sul | A | 2026-06-11 | 12:00 | 1 | ✅ OK |
| 2 | República da Coreia | × | Tchéquia | A | 2026-06-11 | 19:00 | 2 | ✅ OK |
| 3 | Canadá | × | Bósnia e Herzegovina | B | 2026-06-12 | 12:00 | 3 | ✅ OK |
| 4 | EUA | × | Paraguai | D | 2026-06-12 | 18:00 | 4 | ✅ OK |
| 5 | Haiti | × | Escócia | C | 2026-06-13 | 18:00 | 5 | ✅ OK |
| 6 | Austrália | × | Turquia | D | 2026-06-13 | 21:00 | 6 | ✅ OK |
| 7 | Brasil | × | Marrocos | C | 2026-06-13 | 15:00 | 7 | ✅ OK |
| 8 | Catar | × | Suíça | B | 2026-06-13 | 12:00 | 8 | ✅ OK |
| 9 | Costa do Marfim | × | Equador | E | 2026-06-14 | 16:00 | 9 | ✅ OK |
| 10 | Alemanha | × | Curaçau | E | 2026-06-14 | 10:00 | 10 | ✅ OK |
| 11 | Holanda | × | Japão | F | 2026-06-14 | 13:00 | 11 | ✅ OK |
| 12 | Suécia | × | Tunísia | F | 2026-06-14 | 19:00 | 12 | ✅ OK |
| 13 | Arábia Saudita | × | Uruguai | H | 2026-06-15 | 15:00 | 13 | ✅ OK |
| 14 | Espanha | × | Cabo Verde | H | 2026-06-15 | 09:00 | 14 | ✅ OK |
| 15 | RI do Irã | × | Nova Zelândia | G | 2026-06-15 | 18:00 | 15 | ✅ OK |
| 16 | Bélgica | × | Egito | G | 2026-06-15 | 12:00 | 16 | ✅ OK |
| 17 | França | × | Senegal | I | 2026-06-16 | 12:00 | 17 | ✅ OK |
| 18 | Iraque | × | Noruega | I | 2026-06-16 | 15:00 | 18 | ✅ OK |
| 19 | Argentina | × | Argélia | J | 2026-06-16 | 18:00 | 19 | ✅ OK |
| 20 | Áustria | × | Jordânia | J | 2026-06-16 | 21:00 | 20 | ✅ OK |
| 21 | Gana | × | Panamá | L | 2026-06-17 | 16:00 | 21 | ✅ OK |
| 22 | Inglaterra | × | Croácia | L | 2026-06-17 | 13:00 | 22 | ✅ OK |
| 23 | Portugal | × | RD do Congo | K | 2026-06-17 | 10:00 | — | ❌ Times FIFA "Portugal"/"RD do Congo" não encontrados no Firestore |
| 24 | Uzbequistão | × | Colômbia | K | 2026-06-17 | 19:00 | 24 | ✅ OK |
| 25 | Tchéquia | × | África do Sul | A | 2026-06-18 | 09:00 | 25 | ✅ OK |
| 26 | Suíça | × | Bósnia e Herzegovina | B | 2026-06-18 | 12:00 | 26 | ✅ OK |
| 27 | Canadá | × | Catar | B | 2026-06-18 | 15:00 | 27 | ✅ OK |
| 28 | México | × | República da Coreia | A | 2026-06-18 | 18:00 | 28 | ✅ OK |
| 29 | Brasil | × | Haiti | C | 2026-06-19 | 17:30 | 29 | ✅ OK |
| 30 | Escócia | × | Marrocos | C | 2026-06-19 | 15:00 | 30 | ✅ OK |
| 31 | Turquia | × | Paraguai | D | 2026-06-19 | 20:00 | 31 | ✅ OK |
| 32 | EUA | × | Austrália | D | 2026-06-19 | 12:00 | 32 | ✅ OK |
| 33 | Alemanha | × | Costa do Marfim | E | 2026-06-20 | 13:00 | 33 | ✅ OK |
| 34 | Equador | × | Curaçau | E | 2026-06-20 | 17:00 | 34 | ✅ OK |
| 35 | Holanda | × | Suécia | F | 2026-06-20 | 10:00 | 35 | ✅ OK |
| 36 | Tunísia | × | Japão | F | 2026-06-20 | 21:00 | 36 | ✅ OK |
| 37 | Uruguai | × | Cabo Verde | H | 2026-06-21 | 15:00 | 37 | ✅ OK |
| 38 | Espanha | × | Arábia Saudita | H | 2026-06-21 | 09:00 | 38 | ✅ OK |
| 39 | Bélgica | × | RI do Irã | G | 2026-06-21 | 12:00 | 39 | ✅ OK |
| 40 | Nova Zelândia | × | Egito | G | 2026-06-21 | 18:00 | 40 | ✅ OK |
| 41 | Noruega | × | Senegal | I | 2026-06-22 | 17:00 | 41 | ✅ OK |
| 42 | França | × | Iraque | I | 2026-06-22 | 14:00 | 42 | ✅ OK |
| 43 | Argentina | × | Áustria | J | 2026-06-22 | 10:00 | 43 | ✅ OK |
| 44 | Jordânia | × | Argélia | J | 2026-06-22 | 20:00 | 44 | ✅ OK |
| 45 | Inglaterra | × | Gana | L | 2026-06-23 | 13:00 | 45 | ✅ OK |
| 46 | Panamá | × | Croácia | L | 2026-06-23 | 16:00 | 46 | ✅ OK |
| 47 | Portugal | × | Uzbequistão | K | 2026-06-23 | 10:00 | 47 | ✅ OK |
| 48 | Colômbia | × | RD do Congo | K | 2026-06-23 | 19:00 | — | ❌ Times FIFA "Colômbia"/"RD do Congo" não encontrados no Firestore |
| 49 | Escócia | × | Brasil | C | 2026-06-24 | 15:00 | 49 | ✅ OK |
| 50 | Marrocos | × | Haiti | C | 2026-06-24 | 15:00 | 50 | ✅ OK |
| 51 | Suíça | × | Canadá | B | 2026-06-24 | 12:00 | 51 | ✅ OK |
| 52 | Bósnia e Herzegovina | × | Catar | B | 2026-06-24 | 12:00 | 52 | ✅ OK |
| 53 | Tchéquia | × | México | A | 2026-06-24 | 18:00 | 53 | ✅ OK |
| 54 | África do Sul | × | República da Coreia | A | 2026-06-24 | 18:00 | 54 | ✅ OK |
| 55 | Curaçau | × | Costa do Marfim | E | 2026-06-25 | 13:00 | 55 | ✅ OK |
| 56 | Equador | × | Alemanha | E | 2026-06-25 | 13:00 | 56 | ✅ OK |
| 57 | Japão | × | Suécia | F | 2026-06-25 | 16:00 | 57 | ✅ OK |
| 58 | Tunísia | × | Holanda | F | 2026-06-25 | 16:00 | 58 | ✅ OK |
| 59 | Turquia | × | EUA | D | 2026-06-25 | 19:00 | 59 | ✅ OK |
| 60 | Paraguai | × | Austrália | D | 2026-06-25 | 19:00 | 60 | ✅ OK |
| 61 | Noruega | × | França | I | 2026-06-26 | 12:00 | 61 | ✅ OK |
| 62 | Senegal | × | Iraque | I | 2026-06-26 | 12:00 | 62 | ✅ OK |
| 63 | Egito | × | RI do Irã | G | 2026-06-26 | 20:00 | 63 | ✅ OK |
| 64 | Nova Zelândia | × | Bélgica | G | 2026-06-26 | 20:00 | 64 | ✅ OK |
| 65 | Cabo Verde | × | Arábia Saudita | H | 2026-06-26 | 17:00 | 65 | ✅ OK |
| 66 | Uruguai | × | Espanha | H | 2026-06-26 | 17:00 | 66 | ✅ OK |
| 67 | Panamá | × | Inglaterra | L | 2026-06-27 | 14:00 | 67 | ✅ OK |
| 68 | Croácia | × | Gana | L | 2026-06-27 | 14:00 | 68 | ✅ OK |
| 69 | Argélia | × | Áustria | J | 2026-06-27 | 19:00 | 69 | ✅ OK |
| 70 | Jordânia | × | Argentina | J | 2026-06-27 | 19:00 | 70 | ✅ OK |
| 71 | Colômbia | × | Portugal | K | 2026-06-27 | 16:30 | 71 | ✅ OK |
| 72 | RD do Congo | × | Uzbequistão | K | 2026-06-27 | 16:30 | — | ❌ Times FIFA "RD do Congo"/"Uzbequistão" não encontrados no Firestore |

## Jogos com divergência (alinhados por número FIFA × número Firestore)

### Jogo 23 — Portugal × RD do Congo

- **FIFA**: 2026-06-17 10:00 (Primeira fase — Grupo K) · Estádio de Houston (Houston)
- **Firestore**: 2026-06-17 10:00 local (= 2026-06-17T15:00:00Z UTC, offset -5h) · Portugal × RD Congo · fase=grupos grupo=K

**Divergências:**
- visitante: FS="RD Congo" ≠ FIFA="RD do Congo" (normalizado "RD do Congo")

[FIFA match page](https://www.fifa.com/pt/match-centre/match/17/285023/289273/400021502)

### Jogo 48 — Colômbia × RD do Congo

- **FIFA**: 2026-06-23 19:00 (Primeira fase — Grupo K) · Estádio de Guadalajara (Guadalajara)
- **Firestore**: 2026-06-23 19:00 local (= 2026-06-24T01:00:00Z UTC, offset -6h) · Colômbia × RD Congo · fase=grupos grupo=K

**Divergências:**
- visitante: FS="RD Congo" ≠ FIFA="RD do Congo" (normalizado "RD do Congo")

[FIFA match page](https://www.fifa.com/pt/match-centre/match/17/285023/289273/400021501)

### Jogo 72 — RD do Congo × Uzbequistão

- **FIFA**: 2026-06-27 16:30 (Primeira fase — Grupo K) · Estádio de Atlanta (Atlanta)
- **Firestore**: 2026-06-27 16:30 local (= 2026-06-27T20:30:00Z UTC, offset -4h) · RD Congo × Uzbequistão · fase=grupos grupo=K

**Divergências:**
- casa: FS="RD Congo" ≠ FIFA="RD do Congo" (normalizado "RD do Congo")

[FIFA match page](https://www.fifa.com/pt/match-centre/match/17/285023/289273/400021500)
