interface Placar {
  golsCasa: number
  golsVisitante: number
}

interface ConfigPontos {
  placarExato: number
  placarUmTime: number
  vencedor: number
}

type TipoAcerto = 'placarExato' | 'placarUmTime' | 'vencedor' | null

interface ResultadoPontuacao {
  pontos: number
  tipo: TipoAcerto
}

export function calcularPontosPalpite(
  palpite: Placar,
  resultado: Placar,
  config: ConfigPontos,
): ResultadoPontuacao {
  if (palpite.golsCasa === resultado.golsCasa && palpite.golsVisitante === resultado.golsVisitante) {
    return { pontos: config.placarExato, tipo: 'placarExato' }
  }
  if (
    (palpite.golsCasa === resultado.golsCasa && resultado.golsCasa > 0) ||
    (palpite.golsVisitante === resultado.golsVisitante && resultado.golsVisitante > 0)
  ) {
    return { pontos: config.placarUmTime, tipo: 'placarUmTime' }
  }
  const vPalpite = Math.sign(palpite.golsCasa - palpite.golsVisitante)
  const vResultado = Math.sign(resultado.golsCasa - resultado.golsVisitante)
  if (vPalpite === vResultado) {
    return { pontos: config.vencedor, tipo: 'vencedor' }
  }
  return { pontos: 0, tipo: null }
}
