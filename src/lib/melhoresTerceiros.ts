import type { ClassificacaoTime } from '../types'

export function normalizarPontosDisciplinares(valor?: number): number {
  if (!Number.isFinite(valor)) return 0
  return Math.min(0, Math.trunc(valor ?? 0))
}

export function compararTerceirosFifa(
  a: ClassificacaoTime,
  b: ClassificacaoTime,
  pontosDisciplinaresPorTime: Record<string, number> = {},
): number {
  if (b.pontos !== a.pontos) return b.pontos - a.pontos
  if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols
  if (b.golsMarcados !== a.golsMarcados) return b.golsMarcados - a.golsMarcados
  const disciplina = normalizarPontosDisciplinares(pontosDisciplinaresPorTime[b.timeId]) -
    normalizarPontosDisciplinares(pontosDisciplinaresPorTime[a.timeId])
  if (disciplina !== 0) return disciplina

  // Se ainda houver empate total, a FIFA resolveria por sorteio. No app usamos
  // um desempate deterministico para a tabela e o chaveamento nunca divergirem.
  const grupoA = a.grupo ?? ''
  const grupoB = b.grupo ?? ''
  if (grupoA !== grupoB) return grupoA.localeCompare(grupoB)
  return a.timeId.localeCompare(b.timeId)
}

export function selecionarMelhoresTerceiros(
  terceiros: ClassificacaoTime[],
  pontosDisciplinaresPorTime: Record<string, number> = {},
): ClassificacaoTime[] {
  const ordenados = [...terceiros].sort((a, b) => {
    return compararTerceirosFifa(a, b, pontosDisciplinaresPorTime)
  })
  return ordenados.slice(0, 8)
}
