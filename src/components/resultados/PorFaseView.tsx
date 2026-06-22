import { useMemo, useState } from 'react'
import type { Jogo, Time, Fase, ClassificacaoTime } from '../../types'
import type { ResolverProvisorio, SlotResolvido } from '../../lib/resolverProvisorio'
import type { ClinchTime } from '../../lib/clinchGrupo'
import { GrupoTabela } from './GrupoTabela'
import { TimeChip, slotDireto } from './TimeChip'

export interface PorFaseViewProps {
  jogos: Jogo[]
  times: Map<string, Time>
  resolver: ResolverProvisorio
  grupos: { nome: string; times: string[] }[]
  classificacoes: Record<string, ClassificacaoTime[]>
  clinchPorGrupo: Record<string, Record<string, ClinchTime>>
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

export function PorFaseView({ jogos, times, resolver, grupos, classificacoes, clinchPorGrupo }: PorFaseViewProps) {
  const [fase, setFase] = useState<Fase>('grupos')

  const lista = useMemo(
    () => jogos.filter(j => j.fase === fase).sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0)),
    [jogos, fase],
  )

  function nome(id: string | null) {
    if (!id) return null
    return times.get(id)?.sigla ?? times.get(id)?.nome ?? id
  }

  function CardJogo({ jogo, casa, visitante }: { jogo: Jogo; casa: SlotResolvido; visitante: SlotResolvido }) {
    const r = jogo.resultado
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Jogo {jogo.numero}</div>
        <div className="flex items-center justify-between text-sm gap-2">
          <div className="flex-1 min-w-0"><TimeChip slot={casa} label={jogo.labelCasa} times={times} /></div>
          <div className="px-2 font-bold tabular-nums shrink-0">
            {r ? `${r.golsCasa} × ${r.golsVisitante}` : 'vs'}
          </div>
          <div className="flex-1 min-w-0 flex justify-end">
            <TimeChip slot={visitante} label={jogo.labelVisitante} times={times} reverse />
          </div>
        </div>
        {r?.classificado && (
          <div className="text-[11px] text-gray-500 text-center mt-1">
            Avançou nos pênaltis: {nome(r.classificado)}
          </div>
        )}
      </div>
    )
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

      {fase === 'grupos' ? (
        <div className="space-y-6">
          {/* Tabelas de classificação com badges de clinch */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {grupos.map(g => {
              const letra = g.nome.replace('Grupo ', '')
              return (
                <GrupoTabela
                  key={letra}
                  letra={letra}
                  classificacao={classificacoes[letra] ?? g.times.map(t => ({
                    timeId: t, pontos: 0, jogos: 0, vitorias: 0, empates: 0,
                    derrotas: 0, golsMarcados: 0, golsSofridos: 0, saldoGols: 0,
                  }))}
                  clinch={clinchPorGrupo[letra] ?? {}}
                  times={times}
                />
              )
            })}
          </div>
          {/* Jogos da fase de grupos */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-2">Jogos</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {lista.map(j => (
                <CardJogo
                  key={j.id}
                  jogo={j}
                  casa={slotDireto(j.timeCasa)}
                  visitante={slotDireto(j.timeVisitante)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map(j => {
            const { casa, visitante } = resolver(j)
            return <CardJogo key={j.id} jogo={j} casa={casa} visitante={visitante} />
          })}
          {lista.length === 0 && (
            <p className="text-sm text-gray-500 col-span-full">Nenhum jogo nesta fase.</p>
          )}
        </div>
      )}
    </div>
  )
}
