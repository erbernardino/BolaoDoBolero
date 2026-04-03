import * as admin from 'firebase-admin'

interface ConfigPontos {
  placarExato: number
  colunaCerta: number
  totalGols: number
}

interface ResultadoPontuacao {
  pontos: number
  tipo: 'placarExato' | 'colunaCerta' | 'totalGols' | null
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
        placaresExatos: ranking.placaresExatos + (resultado.tipo === 'placarExato' ? 1 : 0),
        colunasCertas: ranking.colunasCertas + (resultado.tipo === 'colunaCerta' ? 1 : 0),
        totalGolsAcertados: ranking.totalGolsAcertados + (resultado.tipo === 'totalGols' ? 1 : 0),
      })
    } else {
      batch.set(rankingRef, {
        pontosTotal: resultado.pontos,
        placaresExatos: resultado.tipo === 'placarExato' ? 1 : 0,
        colunasCertas: resultado.tipo === 'colunaCerta' ? 1 : 0,
        totalGolsAcertados: resultado.tipo === 'totalGols' ? 1 : 0,
      })
    }
  }
  await batch.commit()
}
