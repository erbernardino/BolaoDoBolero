// Tipos de CÁLCULO — livres de qualquer dependência de Timestamp (firebase).
//
// Estes tipos são compartilhados entre o frontend (Vite, client SDK) e as Cloud
// Functions (admin SDK), que usam toolchains diferentes. Por isso NÃO podem
// importar `firebase/firestore`. As libs puras de cálculo em `src/lib/` usam
// exclusivamente estes tipos (campos de resultado/estrutura), nunca `dataHora`.
//
// `src/types/index.ts` re-exporta estes tipos e estende `JogoCalc`/`PalpiteCalc`
// com os campos `Timestamp` que só o frontend usa — assim os chamadores do
// frontend continuam passando `Jogo`/`Palpite` sem nenhuma alteração.

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

/** Jogo sem `dataHora` (Timestamp) — tudo que as libs de cálculo precisam. */
export interface JogoCalc {
  id: string
  numero: number
  fase: Fase
  grupo: string | null
  timeCasa: string
  timeVisitante: string
  origemCasa: Origem | null
  origemVisitante: Origem | null
  resultado: Resultado | null
  encerrado: boolean
  aoVivo?: boolean
  labelCasa?: string
  labelVisitante?: string
}

/** Palpite sem `criadoEm` (Timestamp) — tudo que as libs de cálculo precisam. */
export interface PalpiteCalc {
  id: string
  uid: string
  jogoId: string
  timeCasa: string
  timeVisitante: string
  golsCasa: number
  golsVisitante: number
  classificado: string | null
}

export interface ClassificacaoTime {
  timeId: string
  grupo?: string
  pontos: number
  jogos: number
  vitorias: number
  empates: number
  derrotas: number
  golsMarcados: number
  golsSofridos: number
  saldoGols: number
  fairPlayPontos?: number
}
