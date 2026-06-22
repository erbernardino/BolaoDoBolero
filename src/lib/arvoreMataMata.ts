import type { Fase } from '../types/calc'

/** Campos mínimos para montar a árvore do mata-mata. */
interface JogoBracket {
  numero: number
  fase: Fase
  labelCasa?: string
  labelVisitante?: string
}

export interface ColunasBracket<T> {
  /** Colunas do lado esquerdo, da folha à raiz: [2ª fase, oitavas, quartas, semi]. */
  esquerda: T[][]
  /** Jogo da final (centro). */
  final: T | null
  /** Disputa de 3º lugar. */
  terceiro: T | null
  /** Colunas do lado direito, espelhadas (da raiz à folha): [semi, quartas, oitavas, 2ª fase]. */
  direita: T[][]
}

/** Extrai o número do jogo referenciado por labels como "W101", "RU101", "L101". */
function parseRef(label?: string): number | null {
  if (!label) return null
  const m = label.match(/^(?:W|RU|L)(\d+)$/i)
  return m ? Number(m[1]) : null
}

/**
 * Coleta um lado da chave a partir do número do jogo-raiz (uma semifinal),
 * descendo pelos jogos que o alimentam (labels W##). Retorna as colunas da
 * folha (2ª fase) até a raiz (semi).
 */
function coletarLado<T extends JogoBracket>(raizNum: number, porNum: Map<number, T>): T[][] {
  const niveis: T[][] = []
  const raiz = porNum.get(raizNum)
  let atual: T[] = raiz ? [raiz] : []
  // Inclui a raiz para evitar loop caso um jogo referencie de volta o jogo-raiz.
  const visitados = new Set<number>([raizNum])
  while (atual.length > 0) {
    niveis.push(atual)
    const prox: T[] = []
    for (const j of atual) {
      for (const lbl of [j.labelCasa, j.labelVisitante]) {
        const ref = parseRef(lbl)
        if (ref != null && !visitados.has(ref)) {
          visitados.add(ref)
          const filho = porNum.get(ref)
          if (filho) prox.push(filho)
        }
      }
    }
    atual = prox
  }
  // niveis[0] = [semi], …, niveis[última] = [2ª fase]. Inverter → folha primeiro.
  return niveis.reverse()
}

/**
 * Organiza os jogos do mata-mata como um bracket espelhado: lado esquerdo
 * convergindo para a Final no centro, e lado direito espelhado. Deriva a árvore
 * das labels W##. Se não houver final/estrutura, retorna lados vazios (o
 * componente deve cair para um layout linear de fallback).
 */
export function montarColunasBracket<T extends JogoBracket>(jogos: T[]): ColunasBracket<T> {
  const porNum = new Map<number, T>()
  for (const j of jogos) porNum.set(j.numero, j)

  const final = jogos.find(j => j.fase === 'final') ?? null
  const terceiro = jogos.find(j => j.fase === 'terceiro') ?? null
  if (!final) return { esquerda: [], final: null, terceiro, direita: [] }

  const semiEsq = parseRef(final.labelCasa)
  const semiDir = parseRef(final.labelVisitante)
  const esquerda = semiEsq != null ? coletarLado(semiEsq, porNum) : []
  // Lado direito espelhado: raiz (semi) primeiro, folhas (2ª fase) por último.
  const direita = semiDir != null ? coletarLado(semiDir, porNum).reverse() : []

  return { esquerda, final, terceiro, direita }
}
