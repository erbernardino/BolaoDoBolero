import type { ClassificacaoTime } from '../types'

export function selecionarMelhoresTerceiros(terceiros: ClassificacaoTime[]): ClassificacaoTime[] {
  const ordenados = [...terceiros].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    if (b.saldoGols !== a.saldoGols) return b.saldoGols - a.saldoGols
    if (b.golsMarcados !== a.golsMarcados) return b.golsMarcados - a.golsMarcados
    return 0
  })
  return ordenados.slice(0, 8)
}
