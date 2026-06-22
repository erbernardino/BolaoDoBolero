import { useMemo } from 'react'
import type { Jogo, Time, ClassificacaoTime, Fase } from '../../types'
import type { ResolverBracket } from '../../lib/bracketUsuario'
import type { ClinchTime } from '../../lib/clinchGrupo'
import { GrupoTabela } from './GrupoTabela'

export interface BracketViewProps {
  jogos: Jogo[]
  times: Map<string, Time>
  grupos: { nome: string; times: string[] }[]
  classificacoes: Record<string, ClassificacaoTime[]>
  clinchPorGrupo: Record<string, Record<string, ClinchTime>>
  resolver: ResolverBracket
}

const COLUNAS: { fase: Fase; label: string }[] = [
  { fase: 'fase32', label: '2ª Fase' },
  { fase: 'oitavas', label: 'Oitavas' },
  { fase: 'quartas', label: 'Quartas' },
  { fase: 'semi', label: 'Semis' },
  { fase: 'final', label: 'Final' },
]

export function BracketView({ jogos, times, grupos, classificacoes, clinchPorGrupo, resolver }: BracketViewProps) {
  function nome(id: string | null) {
    if (!id) return null
    return times.get(id)?.sigla ?? times.get(id)?.nome ?? id
  }
  function bandeira(id: string | null) {
    return id ? times.get(id)?.bandeira : undefined
  }

  const porFase = useMemo(() => {
    const map: Record<string, Jogo[]> = {}
    for (const col of COLUNAS) {
      map[col.fase] = jogos
        .filter(j => j.fase === col.fase)
        .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    }
    return map
  }, [jogos])

  // Times já classificados (clinch) por grupo, para exibir no cabeçalho dos grupos.
  function classificadosDoGrupo(letra: string): string[] {
    const clinch = clinchPorGrupo[letra] ?? {}
    return Object.values(clinch).filter(c => c.classificadoTop2).map(c => c.timeId)
  }

  function CardConfronto({ jogo }: { jogo: Jogo }) {
    const { casaId, visitanteId } = resolver(jogo)
    const r = jogo.resultado
    const linha = (id: string | null, label: string | undefined, gols: number | undefined) => (
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 min-w-0">
          {bandeira(id) && <img src={bandeira(id)} alt="" className="w-4 h-3 object-cover rounded-sm" />}
          <span className="truncate">{nome(id) ?? label ?? '—'}</span>
        </div>
        <span className="font-bold tabular-nums">{gols ?? ''}</span>
      </div>
    )
    return (
      <div className="rounded border border-gray-200 bg-white px-2 py-1.5 w-40 space-y-1">
        {linha(casaId, jogo.labelCasa, r?.golsCasa)}
        {linha(visitanteId, jogo.labelVisitante, r?.golsVisitante)}
        {r?.classificado && (
          <div className="text-[10px] text-gray-400 text-center">pen: {nome(r.classificado)}</div>
        )}
      </div>
    )
  }

  const jogoTerceiro = jogos.find(j => j.fase === 'terceiro')

  return (
    <div className="space-y-8">
      {/* GRUPOS */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Fase de grupos</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {grupos.map(g => {
            const letra = g.nome.replace('Grupo ', '')
            const classificados = classificadosDoGrupo(letra)
            return (
              <div key={letra} className="space-y-1">
                <GrupoTabela
                  letra={letra}
                  classificacao={classificacoes[letra] ?? g.times.map(t => ({
                    timeId: t, pontos: 0, jogos: 0, vitorias: 0, empates: 0,
                    derrotas: 0, golsMarcados: 0, golsSofridos: 0, saldoGols: 0,
                  }))}
                  clinch={clinchPorGrupo[letra] ?? {}}
                  times={times}
                />
                {classificados.length > 0 && (
                  <div className="text-[11px] text-green-700">
                    ✓ Classificados: {classificados.map(id => nome(id)).join(', ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* MATA-MATA EM COLUNAS */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-2">Mata-mata</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {COLUNAS.map(col => (
            <div key={col.fase} className="flex flex-col gap-2 shrink-0">
              <div className="text-xs font-semibold text-gray-500">{col.label}</div>
              {porFase[col.fase].map(j => <CardConfronto key={j.id} jogo={j} />)}
              {porFase[col.fase].length === 0 && (
                <div className="text-[11px] text-gray-300 w-40">—</div>
              )}
            </div>
          ))}
        </div>
        {jogoTerceiro && (
          <div className="mt-4">
            <div className="text-xs font-semibold text-gray-500 mb-1">Disputa de 3º lugar</div>
            <CardConfronto jogo={jogoTerceiro} />
          </div>
        )}
      </section>
    </div>
  )
}
