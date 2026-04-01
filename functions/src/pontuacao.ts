import * as admin from 'firebase-admin'

interface ConfigPontos {
  placarExato: number
  placarUmTime: number
  vencedor: number
}

interface ResultadoPontuacao {
  pontos: number
  tipo: 'placarExato' | 'placarUmTime' | 'vencedor' | null
}

export function calcularPontos(
  palpite: { golsCasa: number; golsVisitante: number },
  resultado: { golsCasa: number; golsVisitante: number },
  config: ConfigPontos,
): ResultadoPontuacao {
  if (palpite.golsCasa === resultado.golsCasa && palpite.golsVisitante === resultado.golsVisitante) {
    return { pontos: config.placarExato, tipo: 'placarExato' }
  }
  const casaMatch = palpite.golsCasa === resultado.golsCasa && palpite.golsCasa > 0
  const visitanteMatch = palpite.golsVisitante === resultado.golsVisitante && palpite.golsVisitante > 0
  if (casaMatch || visitanteMatch) {
    return { pontos: config.placarUmTime, tipo: 'placarUmTime' }
  }
  const vPalpite = Math.sign(palpite.golsCasa - palpite.golsVisitante)
  const vResultado = Math.sign(resultado.golsCasa - resultado.golsVisitante)
  if (vPalpite === vResultado) {
    return { pontos: config.vencedor, tipo: 'vencedor' }
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
        placaresUmTime: ranking.placaresUmTime + (resultado.tipo === 'placarUmTime' ? 1 : 0),
        vencedoresAcertados: ranking.vencedoresAcertados + (resultado.tipo === 'vencedor' ? 1 : 0),
      })
    } else {
      batch.set(rankingRef, {
        pontosTotal: resultado.pontos,
        placaresExatos: resultado.tipo === 'placarExato' ? 1 : 0,
        placaresUmTime: resultado.tipo === 'placarUmTime' ? 1 : 0,
        vencedoresAcertados: resultado.tipo === 'vencedor' ? 1 : 0,
      })
    }
  }
  await batch.commit()
}
