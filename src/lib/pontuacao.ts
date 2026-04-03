interface Placar {
  golsCasa: number
  golsVisitante: number
}

interface ConfigPontos {
  placarExato: number
  colunaCerta: number
  totalGols: number
}

type TipoAcerto = 'placarExato' | 'colunaCerta' | 'totalGols' | null

interface ResultadoPontuacao {
  pontos: number
  tipo: TipoAcerto
}

export function calcularPontosPalpite(
  palpite: Placar,
  resultado: Placar,
  config: ConfigPontos,
): ResultadoPontuacao {
  // Coluna = vencedor ou empate
  const vPalpite = Math.sign(palpite.golsCasa - palpite.golsVisitante)
  const vResultado = Math.sign(resultado.golsCasa - resultado.golsVisitante)
  const colunaCerta = vPalpite === vResultado

  // Resultado = placar exato
  const resultadoCerto =
    palpite.golsCasa === resultado.golsCasa && palpite.golsVisitante === resultado.golsVisitante

  // Total de gols
  const totalPalpite = palpite.golsCasa + palpite.golsVisitante
  const totalResultado = resultado.golsCasa + resultado.golsVisitante
  const totalGolsCerto = totalPalpite === totalResultado

  // 5 pts: coluna certa + resultado certo (placar exato)
  if (colunaCerta && resultadoCerto) {
    return { pontos: config.placarExato, tipo: 'placarExato' }
  }
  // 3 pts: coluna certa + resultado errado
  if (colunaCerta) {
    return { pontos: config.colunaCerta, tipo: 'colunaCerta' }
  }
  // 1 pt: coluna errada + total de gols certo
  if (totalGolsCerto) {
    return { pontos: config.totalGols, tipo: 'totalGols' }
  }
  // 0 pts: errou tudo
  return { pontos: 0, tipo: null }
}
