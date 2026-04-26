import type { Origem, Palpite, ClassificacaoTime } from '../types'

interface JogoReferencia {
  id: string
  numero?: number
}

export type TerceirosPorSlot = Record<string, string | null>

export function resolverTimeMataMataPorPalpites(
  origem: Origem,
  classificacoesPorGrupo: Record<string, ClassificacaoTime[]>,
  palpitesPorJogoId: Record<string, Palpite>,
  _melhoresTerceiros: ClassificacaoTime[],
): string | null {
  if (origem.tipo === 'grupo') {
    const classificacao = classificacoesPorGrupo[origem.grupo]
    if (!classificacao || classificacao.length < origem.posicao) return null
    return classificacao[origem.posicao - 1].timeId
  }
  if (origem.tipo === 'jogo') {
    const palpite = palpitesPorJogoId[origem.jogoId]
    if (!palpite) return null

    let vencedor: string | null
    let perdedor: string | null

    if (palpite.golsCasa > palpite.golsVisitante) {
      vencedor = palpite.timeCasa
      perdedor = palpite.timeVisitante
    } else if (palpite.golsVisitante > palpite.golsCasa) {
      vencedor = palpite.timeVisitante
      perdedor = palpite.timeCasa
    } else {
      // Empate — classificado é o vencedor nos pênaltis
      vencedor = palpite.classificado
      perdedor = palpite.classificado === palpite.timeCasa
        ? palpite.timeVisitante
        : palpite.timeCasa
    }

    return origem.resultado === 'perdedor' ? perdedor : vencedor
  }
  return null
}

function resolverPorPalpiteAnterior(
  palpite: Palpite | undefined,
  resultado: 'vencedor' | 'perdedor',
): string | null {
  if (!palpite) return null

  let vencedor: string | null
  let perdedor: string | null

  if (palpite.golsCasa > palpite.golsVisitante) {
    vencedor = palpite.timeCasa
    perdedor = palpite.timeVisitante
  } else if (palpite.golsVisitante > palpite.golsCasa) {
    vencedor = palpite.timeVisitante
    perdedor = palpite.timeCasa
  } else if (palpite.classificado) {
    vencedor = palpite.classificado
    perdedor = palpite.classificado === palpite.timeCasa
      ? palpite.timeVisitante
      : palpite.timeCasa
  } else {
    return null
  }

  return resultado === 'perdedor' ? perdedor : vencedor
}

export function resolverTimePorLabelFifa(
  label: string | undefined,
  classificacoesPorGrupo: Record<string, ClassificacaoTime[]>,
  palpitesPorJogoId: Record<string, Palpite>,
  jogos: JogoReferencia[],
  terceirosPorSlot: TerceirosPorSlot = {},
  slotKey?: string,
): string | null {
  if (!label) return null
  const clean = label.trim().toUpperCase().replace(/\s+/g, '')

  const grupoMatch = clean.match(/^([123])([A-L]+)$/)
  if (grupoMatch) {
    const posicao = Number(grupoMatch[1])
    const grupos = grupoMatch[2].split('')

    if (posicao === 3 && grupos.length > 1) {
      return slotKey ? terceirosPorSlot[slotKey] ?? null : null
    }

    const grupo = grupos[0]
    const classificacao = classificacoesPorGrupo[grupo]
    if (!classificacao || classificacao.length < posicao) return null
    const timeId = classificacao[posicao - 1].timeId

    if (posicao === 3 && slotKey && slotKey in terceirosPorSlot && terceirosPorSlot[slotKey] !== timeId) return null
    return timeId
  }

  const jogoMatch = clean.match(/^(W|L|RU)(\d+)$/)
  if (jogoMatch) {
    const resultado = jogoMatch[1] === 'W' ? 'vencedor' : 'perdedor'
    const numero = Number(jogoMatch[2])
    const jogoRef = jogos.find(j => j.numero === numero)
    if (!jogoRef) return null
    return resolverPorPalpiteAnterior(palpitesPorJogoId[jogoRef.id], resultado)
  }

  return null
}

export function montarTerceirosPorSlot(
  jogosFase32: Array<JogoReferencia & { labelCasa?: string; labelVisitante?: string }>,
  classificacoesPorGrupo: Record<string, ClassificacaoTime[]>,
  melhoresTerceiros: ClassificacaoTime[],
): TerceirosPorSlot {
  const melhoresIds = new Set(melhoresTerceiros.map(t => t.timeId))
  const terceirosPorSlot: TerceirosPorSlot = {}
  const rankingMelhores = new Map(melhoresTerceiros.map((t, index) => [t.timeId, index]))

  const terceirosPorGrupo = new Map<string, ClassificacaoTime>()
  for (const [grupo, classificacao] of Object.entries(classificacoesPorGrupo)) {
    const terceiro = classificacao[2]
    if (terceiro && melhoresIds.has(terceiro.timeId)) {
      terceirosPorGrupo.set(grupo, terceiro)
    }
  }

  const slots: Array<{ slotKey: string; candidatos: ClassificacaoTime[] }> = []
  const jogosOrdenados = [...jogosFase32].sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
  for (const jogo of jogosOrdenados) {
    for (const lado of ['casa', 'visitante'] as const) {
      const label = lado === 'casa' ? jogo.labelCasa : jogo.labelVisitante
      const clean = label?.trim().toUpperCase().replace(/\s+/g, '')
      const match = clean?.match(/^3([A-L]+)$/)
      if (!match) continue

      const slotKey = `${jogo.id}:${lado}`
      const candidatos = match[1]
        .split('')
        .map(grupo => terceirosPorGrupo.get(grupo))
        .filter((t): t is ClassificacaoTime => t != null)

      candidatos.sort((a, b) => {
        return (rankingMelhores.get(a.timeId) ?? 999) - (rankingMelhores.get(b.timeId) ?? 999)
      })

      slots.push({ slotKey, candidatos })
    }
  }

  const usados = new Set<string>()
  const resolverSlot = (index: number): boolean => {
    if (index >= slots.length) return true
    const slot = slots[index]

    for (const candidato of slot.candidatos) {
      if (usados.has(candidato.timeId)) continue
      terceirosPorSlot[slot.slotKey] = candidato.timeId
      usados.add(candidato.timeId)
      if (resolverSlot(index + 1)) return true
      usados.delete(candidato.timeId)
      delete terceirosPorSlot[slot.slotKey]
    }

    terceirosPorSlot[slot.slotKey] = null
    return false
  }

  resolverSlot(0)
  for (const slot of slots) {
    if (!(slot.slotKey in terceirosPorSlot)) terceirosPorSlot[slot.slotKey] = null
  }

  return terceirosPorSlot
}

export function resolverTimeMataMataPersonalizado(params: {
  origem: Origem | null
  label: string | undefined
  slotKey: string
  classificacoesPorGrupo: Record<string, ClassificacaoTime[]>
  palpitesPorJogoId: Record<string, Palpite>
  melhoresTerceiros: ClassificacaoTime[]
  terceirosPorSlot: TerceirosPorSlot
  jogos: JogoReferencia[]
  fallbackTimeId?: string
}): string | null {
  const {
    origem,
    label,
    slotKey,
    classificacoesPorGrupo,
    palpitesPorJogoId,
    melhoresTerceiros,
    terceirosPorSlot,
    jogos,
    fallbackTimeId,
  } = params

  if (origem) {
    return resolverTimeMataMataPorPalpites(
      origem,
      classificacoesPorGrupo,
      palpitesPorJogoId,
      melhoresTerceiros,
    )
  }

  return resolverTimePorLabelFifa(
    label,
    classificacoesPorGrupo,
    palpitesPorJogoId,
    jogos,
    terceirosPorSlot,
    slotKey,
  ) ?? fallbackTimeId ?? null
}
