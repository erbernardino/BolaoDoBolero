import { useMemo } from 'react'
import type { Jogo, Time, ClassificacaoTime, Fase } from '../../types'
import type { ResolverProvisorio } from '../../lib/resolverProvisorio'
import type { ClinchTime } from '../../lib/clinchGrupo'
import { montarColunasBracket } from '../../lib/arvoreMataMata'
import { GrupoTabela } from './GrupoTabela'
import { TimeChip } from './TimeChip'

const LABEL_FASE: Record<string, string> = {
  fase32: '2ª Fase', oitavas: 'Oitavas', quartas: 'Quartas', semi: 'Semis', final: 'Final', terceiro: '3º lugar',
}

export interface BracketViewProps {
  jogos: Jogo[]
  times: Map<string, Time>
  grupos: { nome: string; times: string[] }[]
  classificacoes: Record<string, ClassificacaoTime[]>
  clinchPorGrupo: Record<string, Record<string, ClinchTime>>
  resolver: ResolverProvisorio
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

  const porFase = useMemo(() => {
    const map: Record<string, Jogo[]> = {}
    for (const col of COLUNAS) {
      map[col.fase] = jogos
        .filter(j => j.fase === col.fase)
        .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0))
    }
    return map
  }, [jogos])

  // Bracket espelhado: lados convergindo para a final no centro (derivado das labels W##).
  const cols = useMemo(() => montarColunasBracket(jogos), [jogos])

  // Times já classificados (clinch) por grupo, para reforçar no cabeçalho do grupo.
  function classificadosDoGrupo(letra: string): string[] {
    const clinch = clinchPorGrupo[letra] ?? {}
    return Object.values(clinch).filter(c => c.classificadoMataMata ?? c.classificadoTop2).map(c => c.timeId)
  }

  function CardConfronto({ jogo }: { jogo: Jogo }) {
    const { casa, visitante } = resolver(jogo)
    const r = jogo.resultado
    return (
      <div className="rounded border border-gray-200 bg-white w-44 overflow-hidden shadow-sm">
        <div className="bg-gray-50 border-b border-gray-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400">
          Jogo {jogo.numero}
        </div>
        <div className="px-2 py-1.5 space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <TimeChip slot={casa} label={jogo.labelCasa} times={times} />
            <span className="font-bold tabular-nums shrink-0">{r?.golsCasa ?? ''}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <TimeChip slot={visitante} label={jogo.labelVisitante} times={times} />
            <span className="font-bold tabular-nums shrink-0">{r?.golsVisitante ?? ''}</span>
          </div>
          {r?.classificado && (
            <div className="text-[10px] text-gray-400 text-center border-t border-gray-50 pt-0.5">
              pênaltis: {nome(r.classificado)}
            </div>
          )}
        </div>
      </div>
    )
  }

  function ColunaBracket({ jogos: lista }: { jogos: Jogo[] }) {
    if (lista.length === 0) return null
    return (
      <div className="flex flex-col shrink-0">
        <div className="text-[10px] font-semibold text-gray-500 text-center mb-1 uppercase tracking-wide">
          {LABEL_FASE[lista[0].fase] ?? lista[0].fase}
        </div>
        <div className="flex flex-col justify-around flex-1 gap-2">
          {lista.map(j => <CardConfronto key={j.id} jogo={j} />)}
        </div>
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
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-600">Mata-mata</h2>
          <span className="text-[11px] text-gray-400">
            <span className="text-green-600 font-bold">✓</span> classificado · <span className="italic">itálico</span> = provisório
          </span>
        </div>
        {cols.final ? (
          // Bracket espelhado: esquerda → FINAL (centro) → direita.
          <div className="flex items-stretch gap-2 sm:gap-3 overflow-x-auto pb-4">
            {cols.esquerda.map((col, i) => <ColunaBracket key={`e${i}`} jogos={col} />)}
            <div className="flex flex-col justify-center items-center shrink-0 px-1">
              <div className="text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-1">Final</div>
              <CardConfronto jogo={cols.final} />
              {cols.terceiro && (
                <div className="mt-5 flex flex-col items-center">
                  <div className="text-[10px] text-gray-400 mb-1">3º lugar</div>
                  <CardConfronto jogo={cols.terceiro} />
                </div>
              )}
            </div>
            {cols.direita.map((col, i) => <ColunaBracket key={`d${i}`} jogos={col} />)}
          </div>
        ) : (
          // Fallback (dados sem final definida): colunas lineares.
          <>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {COLUNAS.map(col => (
                <div key={col.fase} className="flex flex-col gap-2 shrink-0">
                  <div className="text-xs font-semibold text-gray-500">{col.label}</div>
                  {porFase[col.fase].map(j => <CardConfronto key={j.id} jogo={j} />)}
                  {porFase[col.fase].length === 0 && (
                    <div className="text-[11px] text-gray-300 w-44">—</div>
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
          </>
        )}
      </section>
    </div>
  )
}
