import { Timestamp } from 'firebase/firestore'

export interface Config {
  pontos: {
    placarExato: number
    colunaCerta: number
    totalGols: number
    palpiteEspecial: number
  }
  premiacao: {
    primeiro: number
    segundo: number
    terceiro: number
    antepenultimo: number
    doacao: number
    taxaInscricao: number
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

export type Fase = 'grupos' | 'fase32' | 'oitavas' | 'quartas' | 'semi' | 'terceiro' | 'final'

export interface OrigemGrupo {
  tipo: 'grupo'
  grupo: string
  posicao: number
}

export interface OrigemJogo {
  tipo: 'jogo'
  jogoId: string
  resultado: 'vencedor' | 'perdedor'
}

export type Origem = OrigemGrupo | OrigemJogo

export interface Resultado {
  golsCasa: number
  golsVisitante: number
  classificado: string | null
}

export interface Jogo {
  id: string
  numero: number
  fase: Fase
  grupo: string | null
  timeCasa: string
  timeVisitante: string
  origemCasa: Origem | null
  origemVisitante: Origem | null
  dataHora: Timestamp
  resultado: Resultado | null
  encerrado: boolean
  aoVivo?: boolean
  labelCasa?: string
  labelVisitante?: string
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
  pontosJogos: number
  pontosEspeciais: number
  placaresExatos: number
  colunasCertas: number
  totalGolsAcertados: number
  pontosFaseGrupos: number
  pontosJogosBrasil: number
}

export type Role = 'admin' | 'participante'

export interface Usuario {
  uid: string
  nome: string
  apelido: string
  email: string
  telefone: string
  role: Role
  liberado: boolean
  conviteId: string
  criadoEm: Timestamp
}

export type TipoConvite = 'unico' | 'multiplo'

export interface Convite {
  id: string
  criadoPor: string
  tipo: TipoConvite
  usado: boolean
  usadoPor: string | null
  criadoEm: Timestamp
}

export interface Notificacao {
  id: string
  titulo: string
  corpo: string
  lida: boolean
  link?: string
  criadoEm: Timestamp
}

export interface PalpiteEspecial {
  uid: string
  campeao: string          // timeId
  vice: string             // timeId
  terceiro: string         // timeId
  quarto: string           // timeId
  paisArtilheiro: string   // timeId
  criadoEm: Timestamp
}

export interface ResultadoEspecial {
  campeao: string            // timeId
  vice: string               // timeId
  terceiro: string           // timeId
  quarto: string             // timeId
  paisesArtilheiros: string[] // timeIds (pode ter mais de um artilheiro)
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
