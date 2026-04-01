import { Timestamp } from 'firebase/firestore'

export interface Config {
  pontos: {
    placarExato: number
    placarUmTime: number
    vencedor: number
  }
  prazoLimitePalpites: Timestamp
  visibilidadePalpites: 'apos_prazo' | 'apos_jogo' | 'sempre' | 'nunca'
  regrasPremiacao: string
}

export interface Time {
  id: string
  nome: string
  sigla: string
  bandeira: string
  grupo: string
  confederacao: string
}

export interface Grupo {
  id: string
  nome: string
  times: string[]
}

export type Fase = 'grupos' | 'oitavas' | 'quartas' | 'semi' | 'terceiro' | 'final'

export interface OrigemGrupo {
  tipo: 'grupo'
  grupo: string
  posicao: number
}

export interface OrigemJogo {
  tipo: 'jogo'
  jogoId: string
  resultado: 'vencedor'
}

export type Origem = OrigemGrupo | OrigemJogo

export interface Resultado {
  golsCasa: number
  golsVisitante: number
  classificado: string | null
}

export interface Jogo {
  id: string
  fase: Fase
  grupo: string | null
  timeCasa: string
  timeVisitante: string
  origemCasa: Origem | null
  origemVisitante: Origem | null
  dataHora: Timestamp
  resultado: Resultado | null
  encerrado: boolean
}

export interface Palpite {
  id: string
  uid: string
  jogoId: string
  timeCasa: string
  timeVisitante: string
  golsCasa: number
  golsVisitante: number
  classificado: string | null
  criadoEm: Timestamp
}

export interface Ranking {
  uid: string
  pontosTotal: number
  placaresExatos: number
  placaresUmTime: number
  vencedoresAcertados: number
}

export type Role = 'admin' | 'participante'

export interface Usuario {
  uid: string
  nome: string
  apelido: string
  email: string
  telefone: string
  role: Role
  conviteId: string
  criadoEm: Timestamp
}

export interface Convite {
  id: string
  criadoPor: string
  usado: boolean
  usadoPor: string | null
  criadoEm: Timestamp
}

export interface ClassificacaoTime {
  timeId: string
  pontos: number
  jogos: number
  vitorias: number
  empates: number
  derrotas: number
  golsMarcados: number
  golsSofridos: number
  saldoGols: number
}
