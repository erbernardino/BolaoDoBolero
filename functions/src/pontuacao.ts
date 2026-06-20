import * as admin from 'firebase-admin'

interface ConfigPontos {
  placarExato: number
  colunaCerta: number
  totalGols: number
  palpiteEspecial?: number
}

interface ResultadoPontuacao {
  pontos: number
  tipo: 'placarExato' | 'colunaCerta' | 'totalGols' | null
}

interface ResultadoJogo {
  golsCasa: number
  golsVisitante: number
  classificado?: string | null
}

interface JogoRanking {
  id: string
  fase?: string
  timeCasa?: string
  timeVisitante?: string
  resultado?: ResultadoJogo | null
}

interface PalpiteRanking {
  uid: string
  jogoId: string
  golsCasa: number
  golsVisitante: number
}

export function calcularPontos(
  palpite: { golsCasa: number; golsVisitante: number },
  resultado: { golsCasa: number; golsVisitante: number },
  config: ConfigPontos,
): ResultadoPontuacao {
  const vPalpite = Math.sign(palpite.golsCasa - palpite.golsVisitante)
  const vResultado = Math.sign(resultado.golsCasa - resultado.golsVisitante)
  const colunaCerta = vPalpite === vResultado

  const resultadoCerto =
    palpite.golsCasa === resultado.golsCasa && palpite.golsVisitante === resultado.golsVisitante

  const totalPalpite = palpite.golsCasa + palpite.golsVisitante
  const totalResultado = resultado.golsCasa + resultado.golsVisitante
  const totalGolsCerto = totalPalpite === totalResultado

  if (colunaCerta && resultadoCerto) {
    return { pontos: config.placarExato, tipo: 'placarExato' }
  }
  if (colunaCerta) {
    return { pontos: config.colunaCerta, tipo: 'colunaCerta' }
  }
  if (totalGolsCerto) {
    return { pontos: config.totalGols, tipo: 'totalGols' }
  }
  return { pontos: 0, tipo: null }
}

export async function processarResultadoJogo(jogoId: string) {
  const db = admin.firestore()
  const jogoSnap = await db.doc(`jogos/${jogoId}`).get()
  const jogo = jogoSnap.data()
  if (!jogo || !jogo.resultado || !jogo.encerrado) return

  const configSnap = await db.doc('config/geral').get()
  const config = configSnap.data()
  if (!config) return

  const palpitesSnap = await db.collection('palpites').where('jogoId', '==', jogoId).get()
  const batch = db.batch()

  for (const palpiteDoc of palpitesSnap.docs) {
    const palpite = palpiteDoc.data() as { golsCasa: number; golsVisitante: number; uid: string }
    const resultado = calcularPontos(palpite, jogo.resultado as { golsCasa: number; golsVisitante: number }, config.pontos as ConfigPontos)
    const rankingRef = db.doc(`ranking/${palpite.uid}`)
    const rankingSnap = await rankingRef.get()

    if (rankingSnap.exists) {
      const ranking = rankingSnap.data()!
      batch.update(rankingRef, {
        pontosTotal: ranking.pontosTotal + resultado.pontos,
        pontosJogos: (ranking.pontosJogos ?? 0) + resultado.pontos,
        placaresExatos: ranking.placaresExatos + (resultado.tipo === 'placarExato' ? 1 : 0),
        colunasCertas: ranking.colunasCertas + (resultado.tipo === 'colunaCerta' ? 1 : 0),
        totalGolsAcertados: ranking.totalGolsAcertados + (resultado.tipo === 'totalGols' ? 1 : 0),
      })
    } else {
      batch.set(rankingRef, {
        pontosTotal: resultado.pontos,
        pontosJogos: resultado.pontos,
        pontosEspeciais: 0,
        placaresExatos: resultado.tipo === 'placarExato' ? 1 : 0,
        colunasCertas: resultado.tipo === 'colunaCerta' ? 1 : 0,
        totalGolsAcertados: resultado.tipo === 'totalGols' ? 1 : 0,
        pontosFaseGrupos: 0,
        pontosJogosBrasil: 0,
      })
    }
  }
  await batch.commit()
}

interface RankingData {
  pontosTotal: number
  pontosJogos: number
  pontosEspeciais: number
  placaresExatos: number
  colunasCertas: number
  totalGolsAcertados: number
  pontosFaseGrupos: number
  pontosJogosBrasil: number
}

function emptyRanking(): RankingData {
  return {
    pontosTotal: 0,
    pontosJogos: 0,
    pontosEspeciais: 0,
    placaresExatos: 0,
    colunasCertas: 0,
    totalGolsAcertados: 0,
    pontosFaseGrupos: 0,
    pontosJogosBrasil: 0,
  }
}

/**
 * Recalcula o ranking inteiro do zero, considerando todos os jogos que têm resultado
 * e os palpites especiais. Usado a cada salvamento de resultado.
 */
export async function recalcularTodoRanking(): Promise<number> {
  const db = admin.firestore()

  const configSnap = await db.doc('config/geral').get()
  const config = configSnap.data()
  if (!config) return 0

  const pontos = config.pontos as ConfigPontos
  const ptsEspecial = pontos.palpiteEspecial ?? 10

  // Buscar times para identificar o Brasil
  const timesSnap = await db.collection('times').get()
  const brasilId = timesSnap.docs.find(d => d.data().sigla === 'BRA')?.id ?? null

  // Buscar todos os jogos com resultado
  const jogosSnap = await db.collection('jogos').get()
  const jogosComResultado = jogosSnap.docs
    .map(d => ({ id: d.id, ...d.data() } as JogoRanking))
    .filter((j): j is JogoRanking & { resultado: ResultadoJogo } => j.resultado != null)

  // Buscar todos os palpites de jogos
  const palpitesSnap = await db.collection('palpites').get()
  const palpites = palpitesSnap.docs.map(d => d.data() as PalpiteRanking)

  // Indexar palpites por jogoId para evitar varredura O(N*M) dentro do loop de jogos.
  const palpitesPorJogo = new Map<string, PalpiteRanking[]>()
  for (const p of palpites) {
    const lista = palpitesPorJogo.get(p.jogoId)
    if (lista) lista.push(p)
    else palpitesPorJogo.set(p.jogoId, [p])
  }

  // Calcular ranking por usuário (pontos de jogos)
  const rankingMap = new Map<string, RankingData>()

  // Todo usuário deve aparecer no ranking, mesmo antes de pontuar.
  const usuariosSnap = await db.collection('usuarios').get()
  for (const userDoc of usuariosSnap.docs) {
    rankingMap.set(userDoc.id, emptyRanking())
  }

  for (const jogo of jogosComResultado) {
    const isFaseGrupos = jogo.fase === 'grupos'
    const isJogoBrasil = brasilId != null &&
      (jogo.timeCasa === brasilId || jogo.timeVisitante === brasilId)

    const palpitesDoJogo = palpitesPorJogo.get(jogo.id) ?? []

    for (const p of palpitesDoJogo) {
      const resultado = calcularPontos(
        { golsCasa: p.golsCasa, golsVisitante: p.golsVisitante },
        { golsCasa: jogo.resultado.golsCasa, golsVisitante: jogo.resultado.golsVisitante },
        pontos,
      )

      const atual = rankingMap.get(p.uid) ?? emptyRanking()
      atual.pontosJogos += resultado.pontos
      atual.pontosTotal += resultado.pontos
      if (resultado.tipo === 'placarExato') atual.placaresExatos += 1
      if (resultado.tipo === 'colunaCerta') atual.colunasCertas += 1
      if (resultado.tipo === 'totalGols') atual.totalGolsAcertados += 1
      if (isFaseGrupos) atual.pontosFaseGrupos += resultado.pontos
      if (isJogoBrasil) atual.pontosJogosBrasil += resultado.pontos
      rankingMap.set(p.uid, atual)
    }
  }

  // Palpites especiais
  const resultadoEspecialSnap = await db.doc('config/resultado_especial').get()
  if (resultadoEspecialSnap.exists) {
    const re = resultadoEspecialSnap.data() as {
      campeao?: string
      vice?: string
      terceiro?: string
      quarto?: string
      paisesArtilheiros?: string[]
    }

    const palpitesEspeciaisSnap = await db.collection('palpites_especiais').get()

    for (const peDoc of palpitesEspeciaisSnap.docs) {
      const pe = peDoc.data() as {
        uid: string
        campeao?: string
        vice?: string
        terceiro?: string
        quarto?: string
        paisArtilheiro?: string
      }

      let pontosEsp = 0
      if (re.campeao && pe.campeao === re.campeao) pontosEsp += ptsEspecial
      if (re.vice && pe.vice === re.vice) pontosEsp += ptsEspecial
      if (re.terceiro && pe.terceiro === re.terceiro) pontosEsp += ptsEspecial
      if (re.quarto && pe.quarto === re.quarto) pontosEsp += ptsEspecial
      if (re.paisesArtilheiros && re.paisesArtilheiros.length > 0 && pe.paisArtilheiro) {
        if (re.paisesArtilheiros.includes(pe.paisArtilheiro)) pontosEsp += ptsEspecial
      }

      if (pontosEsp > 0) {
        const atual = rankingMap.get(pe.uid) ?? emptyRanking()
        atual.pontosEspeciais = pontosEsp
        atual.pontosTotal += pontosEsp
        rankingMap.set(pe.uid, atual)
      }
    }
  }

  // Limpar ranking atual
  const rankingAtualSnap = await db.collection('ranking').get()
  if (!rankingAtualSnap.empty) {
    const deleteBatch = db.batch()
    for (const d of rankingAtualSnap.docs) {
      deleteBatch.delete(d.ref)
    }
    await deleteBatch.commit()
  }

  // Gravar novo ranking
  if (rankingMap.size > 0) {
    const batch = db.batch()
    for (const [uid, dados] of rankingMap) {
      batch.set(db.doc(`ranking/${uid}`), dados)
    }
    await batch.commit()
  }

  // Registra quando o ranking foi recalculado (exibido na página de ranking).
  // Coleção separada `_system` — NUNCA usar `config` para metadados de sistema.
  await db.doc('_system/ranking_meta').set({
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  })

  return jogosComResultado.length
}
