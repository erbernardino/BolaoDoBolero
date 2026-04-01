# Bolão do Bolero — Especificação do Sistema

Bolão entre amigos para a Copa do Mundo FIFA 2026. Bolão único (não é plataforma multi-bolão). Cadastro apenas por convite do administrador.

## Stack Tecnológica

- **Frontend:** PWA (Progressive Web App)
- **Backend:** Firebase Puro (Auth + Firestore + Hosting + Cloud Functions + FCM)
- **Autenticação:** Firebase Auth (email/senha + telefone SMS)

## Modelo de Dados (Firestore)

### /config (documento único)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| pontos.placarExato | number | Pontos por placar exato (padrão: 10) |
| pontos.placarUmTime | number | Pontos por acertar placar de um time (padrão: 5) |
| pontos.vencedor | number | Pontos por acertar o vencedor/empate (padrão: 3) |
| prazoLimitePalpites | timestamp | Data/hora limite para registrar palpites |
| visibilidadePalpites | string | "apos_prazo" \| "apos_jogo" \| "sempre" \| "nunca" |
| regrasPremiacao | string | Texto livre definido pelo admin |

### /times/{timeId}

| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | string | Nome completo (ex: "Brasil") |
| sigla | string | Sigla (ex: "BRA") |
| bandeira | string | URL da imagem da bandeira |
| grupo | string | Grupo na fase inicial (ex: "A") |
| confederacao | string | Confederação (ex: "CONMEBOL") |

### /grupos/{grupoId}

| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | string | Nome do grupo (ex: "Grupo A") |
| times | [timeId] | Referências aos times do grupo |

### /jogos/{jogoId}

| Campo | Tipo | Descrição |
|-------|------|-----------|
| fase | string | "grupos" \| "oitavas" \| "quartas" \| "semi" \| "terceiro" \| "final" |
| grupo | string \| null | Grupo (só na fase de grupos) |
| timeCasa | timeId | Referência ao time da casa (fase de grupos) |
| timeVisitante | timeId | Referência ao time visitante (fase de grupos) |
| origemCasa | object \| null | Origem do time casa no mata-mata |
| origemVisitante | object \| null | Origem do time visitante no mata-mata |
| dataHora | timestamp | Data e hora do jogo |
| resultado | object \| null | { golsCasa: number, golsVisitante: number, classificado: timeId \| null } |
| encerrado | boolean | Se o jogo já foi encerrado |

**Estrutura de origem (mata-mata):**

```json
// Vindo de grupo
{ "tipo": "grupo", "grupo": "A", "posicao": 1 }

// Vindo de jogo anterior
{ "tipo": "jogo", "jogoId": "xxx", "resultado": "vencedor" }
```

### /palpites/{uid}_{jogoId}

| Campo | Tipo | Descrição |
|-------|------|-----------|
| uid | string | ID do usuário |
| jogoId | string | ID do jogo |
| timeCasa | timeId | Time da casa (derivado dos palpites para mata-mata) |
| timeVisitante | timeId | Time visitante (derivado dos palpites para mata-mata) |
| golsCasa | number | Palpite de gols do time da casa |
| golsVisitante | number | Palpite de gols do visitante |
| classificado | timeId \| null | Time que avança (obrigatório no mata-mata quando placar é empate) |
| criadoEm | timestamp | Data de criação |

### /ranking/{uid}

| Campo | Tipo | Descrição |
|-------|------|-----------|
| pontosTotal | number | Soma total de pontos |
| placaresExatos | number | Quantidade de placares exatos acertados |
| placaresUmTime | number | Quantidade de placares de um time acertados |
| vencedoresAcertados | number | Quantidade de vencedores/empates acertados |

### /usuarios/{uid}

| Campo | Tipo | Descrição |
|-------|------|-----------|
| nome | string | Nome completo |
| apelido | string | Apelido no bolão |
| email | string | Email |
| telefone | string | Telefone |
| role | string | "admin" \| "participante" |
| conviteId | string | ID do convite usado |
| criadoEm | timestamp | Data de cadastro |

### /convites/{conviteId}

| Campo | Tipo | Descrição |
|-------|------|-----------|
| criadoPor | uid | Admin que criou |
| usado | boolean | Se já foi utilizado |
| usadoPor | uid \| null | Quem usou |
| criadoEm | timestamp | Data de criação |

## Regras de Pontuação

**Não cumulativo** — o maior ponto conquistado no jogo é o que vale.

| Acerto | Pontos (padrão) | Exemplo (jogo: 2x1) |
|--------|-----------------|----------------------|
| Placar exato | 10 | Palpitou 2x1 |
| Placar de um dos times | 5 | Palpitou 2x0 (acertou 2 gols do time casa) |
| Acertou o vencedor/empate | 3 | Palpitou 3x0 (acertou que o time casa vence) |

**Ordem de avaliação:** placar exato → placar de um time → vencedor. Primeiro acerto encontrado define a pontuação.

**Empate:** Mesma lógica. Palpite 1x1 em jogo 1x1 = placar exato (10). Palpite 2x2 em jogo 1x1 = acertou empate (3).

**Mata-mata:** Palpite sobre placar final incluindo prorrogação. Pênaltis não entram no placar. Se o palpite do mata-mata for empate (ex: 2x2), o usuário deve indicar qual time avança (vencedor nos pênaltis), para que o sistema monte a fase seguinte corretamente.

**Valores configuráveis** no documento `/config`.

## Ranking e Desempate

1. Maior soma total de pontos
2. Mais placares exatos acertados
3. Mais placares de um time acertados
4. Mais vencedores acertados

## Autenticação e Convites

### Métodos de Login
- Email e senha
- Telefone via SMS (Firebase Auth)

### Fluxo de Convite
1. Admin gera link de convite: `app.com/convite/{conviteId}`
2. Usuário acessa o link → tela de cadastro
3. Sistema valida que o `conviteId` existe e não foi usado
4. Marca convite como usado e vincula ao `uid` do novo usuário
5. Sem convite válido, não há cadastro

### Roles
- **Admin:** cadastra jogos, insere resultados, gera convites, configura pontuação/prazo/visibilidade/premiação
- **Participante:** registra palpites, visualiza ranking e jogos

## Palpites e Prazos

### Prazo
Todos os palpites (grupos + mata-mata) devem ser registrados antes do início da Copa. Data limite configurável no `/config`.

### Fluxo de Palpites
1. **Fase de grupos:** Usuário palpita o placar de todos os jogos dos 12 grupos
2. **Classificação automática:** Sistema calcula classificação de cada grupo com base nos palpites do usuário, seguindo critérios FIFA:
   - Pontos (vitória=3, empate=1, derrota=0)
   - Saldo de gols
   - Gols marcados
   - Confronto direto
3. **Mata-mata personalizado:** Sistema preenche os times das oitavas para cada usuário com base na classificação derivada dos seus palpites
4. **Usuário palpita as oitavas** → resultado define os times das quartas (do ponto de vista dele)
5. Repete para quartas → semi → terceiro lugar → final

### Regras
- Palpite só pode ser criado/editado antes do prazo limite
- Após o prazo, palpites ficam travados
- Preenchimento na ordem: grupos → oitavas → quartas → semi → final (cada fase depende da anterior)
- **Alteração em palpite de grupo:** Se mudar a classificação, os times do mata-mata são recalculados automaticamente. Os palpites de placar do mata-mata permanecem, mas o sistema exibe um aviso nos jogos afetados para que o usuário revise e confirme, já que os times mudaram.

## Visibilidade dos Palpites

Configurável pelo admin no `/config`:

| Opção | Comportamento |
|-------|---------------|
| `apos_prazo` | Palpites visíveis após o prazo limite |
| `apos_jogo` | Palpites de cada jogo visíveis após o jogo ser encerrado |
| `sempre` | Todos veem todos os palpites a qualquer momento |
| `nunca` | Cada usuário só vê os próprios palpites |

Independente da configuração, o usuário sempre vê os seus próprios palpites.

## Notificações (Push via FCM)

| Evento | Descrição |
|--------|-----------|
| Lembrete de prazo | X dias/horas antes do prazo limite (configurável) |
| Palpites incompletos | Lembrete se o usuário não preencheu todos os palpites |
| Resultado registrado | Quando o admin insere o resultado de um jogo |
| Ranking atualizado | Após o cálculo de pontos de um jogo encerrado |
| Times alterados | Quando mudança em palpite de grupo afeta jogos do mata-mata |

Implementação via Firebase Cloud Messaging (FCM) com Service Worker na PWA.

## Formato da Copa do Mundo FIFA 2026

- 48 seleções
- 12 grupos de 4 times
- Classificam: 2 primeiros de cada grupo + 8 melhores terceiros colocados
- Mata-mata de 32 times: oitavas → quartas → semifinais → terceiro lugar → final
