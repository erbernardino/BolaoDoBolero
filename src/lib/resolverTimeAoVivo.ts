import type { Time } from '../types'
import type { SnapshotResultados } from './snapshotResultados'

/**
 * Resolve o Time de um lado de um jogo para EXIBIÇÃO ao vivo.
 *
 * Jogos de grupo trazem `timeCasa`/`timeVisitante` preenchidos. Jogos de
 * mata-mata só têm esses campos materializados depois que a Cloud Function
 * `resolverMataMata` roda — antes disso ficam vazios (`""`) e o time é
 * determinado por label (1A, 2B, 3XYZ…). Nesse caso resolvemos pelo snapshot
 * oficial (`_system/resultados`), a mesma fonte usada pela página /resultados.
 *
 * Retorna `null` quando o time ainda não é determinável (ex.: confronto de
 * rodada futura cujo classificado depende de jogo não disputado).
 */
export function resolverTimeAoVivo(
  jogo: { id: string; timeCasa?: string; timeVisitante?: string },
  lado: 'casa' | 'visitante',
  times: Map<string, Time>,
  snapshot: SnapshotResultados | null,
): Time | null {
  const direto = lado === 'casa' ? jogo.timeCasa : jogo.timeVisitante
  // `direto` é "" (vazio) em jogos de mata-mata não materializados → cai no snapshot.
  const id = direto || (snapshot?.bracket?.[jogo.id]?.[lado]?.timeId ?? null)
  return id ? times.get(id) ?? null : null
}
