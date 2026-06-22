import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { montarSnapshotResultados } from './_shared/lib/snapshotResultados'
import type { GrupoRef } from './_shared/lib/bracketUsuario'
import type { JogoCalc } from './_shared/types/calc'

/**
 * Recalcula o snapshot de Resultados/Projeções a partir de TODOS os jogos e grava
 * em `_system/resultados`. Reusa a MESMA lógica do frontend (src/lib, espelhada em
 * _shared) — fonte única, sem divergência. Idempotente: recomputa do zero e
 * sobrescreve o doc, então disparos concorrentes convergem (last-write-wins).
 */
export async function recalcularSnapshotResultados(): Promise<void> {
  const db = getFirestore()
  const [jogosSnap, gruposSnap] = await Promise.all([
    db.collection('jogos').get(),
    db.collection('grupos').get(),
  ])
  const jogos = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() }) as JogoCalc)
  const grupos: GrupoRef[] = gruposSnap.docs.map(d => {
    const data = d.data() as { nome?: string; times?: string[] }
    return { nome: data.nome ?? `Grupo ${d.id}`, times: data.times ?? [] }
  })

  const snapshot = montarSnapshotResultados(jogos, grupos)
  await db.doc('_system/resultados').set({
    ...snapshot,
    atualizadoEm: FieldValue.serverTimestamp(),
  })
}

/**
 * Trigger: sempre que um resultado é gravado/alterado em jogos/{id}, recalcula o
 * snapshot. Dispara em jogos (não em _system) para não criar loop.
 */
export const onResultadoParaSnapshot = onDocumentWritten('jogos/{jogoId}', async (event) => {
  const antes = event.data?.before.data()
  const depois = event.data?.after.data()
  const resultadoMudou =
    JSON.stringify(antes?.resultado ?? null) !== JSON.stringify(depois?.resultado ?? null)
  const encerradoMudou = (antes?.encerrado ?? false) !== (depois?.encerrado ?? false)
  if (resultadoMudou || encerradoMudou) {
    await recalcularSnapshotResultados()
  }
})
