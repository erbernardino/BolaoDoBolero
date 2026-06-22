import type { ClassificacaoTime, Time } from '../../types'
import type { ClinchTime } from '../../lib/clinchGrupo'

export interface GrupoTabelaProps {
  letra: string
  classificacao: ClassificacaoTime[]
  clinch: Record<string, ClinchTime>
  times: Map<string, Time>
}

export function GrupoTabela({ letra, classificacao, clinch, times }: GrupoTabelaProps) {
  function nome(id: string) {
    return times.get(id)?.sigla ?? times.get(id)?.nome ?? id
  }
  function bandeira(id: string) {
    return times.get(id)?.bandeira
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="bg-blue-900 text-white px-3 py-1.5 text-sm font-semibold">
        Grupo {letra}
      </div>
      <table className="w-full text-xs">
        <thead className="text-gray-500">
          <tr className="border-b border-gray-100">
            <th className="text-left font-medium px-2 py-1">Time</th>
            <th className="font-medium px-1 py-1" title="Pontos">P</th>
            <th className="font-medium px-1 py-1" title="Jogos">J</th>
            <th className="font-medium px-1 py-1" title="Saldo">SG</th>
            <th className="px-1 py-1"></th>
          </tr>
        </thead>
        <tbody>
          {classificacao.map((ct, idx) => {
            const c = clinch[ct.timeId]
            const classificado = c?.classificadoTop2
            const eliminado = c?.eliminado
            return (
              <tr
                key={ct.timeId}
                className={
                  'border-b border-gray-50 ' +
                  (classificado ? 'bg-green-50 ' : '') +
                  (eliminado ? 'text-gray-400 ' : '')
                }
              >
                <td className="px-2 py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400 w-3">{idx + 1}</span>
                    {bandeira(ct.timeId) && (
                      <img src={bandeira(ct.timeId)} alt="" className="w-4 h-3 object-cover rounded-sm" />
                    )}
                    <span className="font-medium">{nome(ct.timeId)}</span>
                  </div>
                </td>
                <td className="text-center px-1 py-1 font-semibold">{ct.pontos}</td>
                <td className="text-center px-1 py-1">{ct.jogos}</td>
                <td className="text-center px-1 py-1">{ct.saldoGols > 0 ? `+${ct.saldoGols}` : ct.saldoGols}</td>
                <td className="text-center px-1 py-1">
                  {classificado && (
                    <span className="inline-block rounded bg-green-600 text-white text-[10px] px-1 py-0.5" title="Classificado">
                      ✓
                    </span>
                  )}
                  {!classificado && eliminado && (
                    <span className="text-[10px] text-gray-400" title="Eliminado">✕</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
