import type { Timestamp } from 'firebase/firestore'
import type { JogoCalc, PalpiteCalc } from './calc'

// Tipos de cálculo (livres de Timestamp) são definidos em ./calc e reexportados
// aqui para o frontend. Jogo/Palpite estendem-nos com os campos Timestamp.
export type {
  Fase, Origem, OrigemGrupo, OrigemJogo, Resultado, ClassificacaoTime,
  JogoCalc, PalpiteCalc,
} from './calc'

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

export interface Jogo extends JogoCalc {
  dataHora: Timestamp
}

export interface Palpite extends PalpiteCalc {
  criadoEm: Timestamp
}

export interface DesempateTerceiros {
  uid: string
  pontosDisciplinares: Record<string, number>
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
  fotoURL?: string
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

