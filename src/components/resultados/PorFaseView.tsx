import { useMemo, useState } from 'react'
import type { Jogo, Time, Fase } from '../../types'
import type { ResolverBracket } from '../../lib/bracketUsuario'

export interface PorFaseViewProps {
  jogos: Jogo[]
  times: Map<string, Time>
  resolver: ResolverBracket
}

const ABAS: { id: Fase; label: string }[] = [
  { id: 'grupos', label: 'Grupos' },
  { id: 'fase32', label: '2ª Fase' },
  { id: 'oitavas', label: 'Oitavas' },
  { id: 'quartas', label: 'Quartas' },
  { id: 'semi', label: 'Semis' },
  { id: 'terceiro', label: '3º Lugar' },
  { id: 'final', label: 'Final' },
]

export function PorFaseView({ jogos, times, resolver }: PorFaseViewProps) {
  const [fase, setFase] = useState<Fase>('grupos')

  const lista = useMemo(
    () => jogos.filter(j => j.fase === fase).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)),
    [jogos, fase],
  )

  function nome(id: string | null) {
    if (!id) return null
    return times.get(id)?.sigla ?? times.get(id)?.nome ?? id
  }
  function bandeira(id: string | null) {
    return id ? times.get(id)?.bandeira : undefined
  }

  function ladosDoJogo(j: Jogo): { casaId: string | null; visitanteId: string | null } {
    if (j.fase === 'grupos') return { casaId: j.timeCasa, visitanteId: j.timeVisitante }
    return resolver(j)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-4">
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setFase(a.id)}
            className={
              'px-3 py-1 rounded text-sm ' +
              (fase === a.id ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-700')
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map(j => {
          const { casaId, visitanteId } = ladosDoJogo(j)
          const r = j.resultado
          return (
            <div key={j.id} className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 flex-1">
                  {bandeira(casaId) && <img src={bandeira(casaId)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
                  <span className="font-medium">{nome(casaId) ?? j.labelCasa ?? '—'}</span>
                </div>
                <div className="px-2 font-bold tabular-nums">
                  {r ? `${r.golsCasa} × ${r.golsVisitante}` : 'vs'}
                </div>
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <span className="font-medium">{nome(visitanteId) ?? j.labelVisitante ?? '—'}</span>
                  {bandeira(visitanteId) && <img src={bandeira(visitanteId)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
                </div>
              </div>
              {r?.classificado && (
                <div className="text-[11px] text-gray-500 text-center mt-1">
                  Avançou nos pênaltis: {nome(r.classificado)}
                </div>
              )}
            </div>
          )
        })}
        {lista.length === 0 && (
          <p className="text-sm text-gray-500 col-span-full">Nenhum jogo nesta fase.</p>
        )}
      </div>
    </div>
  )
}
