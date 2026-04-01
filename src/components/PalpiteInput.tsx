import type { Time } from '../types'

interface PalpiteInputProps {
  timeCasa: Time | null
  timeVisitante: Time | null
  golsCasa: number | null
  golsVisitante: number | null
  classificado: string | null
  ehMataMata: boolean
  disabled: boolean
  alerta?: string
  onChange: (golsCasa: number | null, golsVisitante: number | null, classificado: string | null) => void
}

export function PalpiteInput({
  timeCasa,
  timeVisitante,
  golsCasa,
  golsVisitante,
  classificado,
  ehMataMata,
  disabled,
  alerta,
  onChange,
}: PalpiteInputProps) {
  const empate = ehMataMata && golsCasa !== null && golsVisitante !== null && golsCasa === golsVisitante
  const borderClass = alerta ? 'border-yellow-400 border-2' : 'border border-gray-200'

  function handleGolsCasa(value: string) {
    const n = value === '' ? null : parseInt(value, 10)
    onChange(isNaN(n as number) ? null : n, golsVisitante, classificado)
  }

  function handleGolsVisitante(value: string) {
    const n = value === '' ? null : parseInt(value, 10)
    onChange(golsCasa, isNaN(n as number) ? null : n, classificado)
  }

  function handleClassificado(value: string) {
    onChange(golsCasa, golsVisitante, value || null)
  }

  return (
    <div className={`rounded-lg bg-white p-4 ${borderClass}`}>
      <div className="flex items-center justify-between gap-3">
        {/* Time Casa */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-semibold text-gray-700 text-sm">{timeCasa?.sigla ?? '?'}</span>
          {timeCasa?.bandeira ? (
            <img src={timeCasa.bandeira} alt={timeCasa.sigla} className="w-8 h-6 object-cover rounded" />
          ) : (
            <div className="w-8 h-6 bg-gray-200 rounded" />
          )}
        </div>

        {/* Placar */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={99}
            value={golsCasa ?? ''}
            disabled={disabled}
            onChange={(e) => handleGolsCasa(e.target.value)}
            className="w-12 text-center border border-gray-300 rounded p-1 text-lg font-bold disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-gray-400 font-bold">x</span>
          <input
            type="number"
            min={0}
            max={99}
            value={golsVisitante ?? ''}
            disabled={disabled}
            onChange={(e) => handleGolsVisitante(e.target.value)}
            className="w-12 text-center border border-gray-300 rounded p-1 text-lg font-bold disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Time Visitante */}
        <div className="flex items-center gap-2 flex-1">
          {timeVisitante?.bandeira ? (
            <img src={timeVisitante.bandeira} alt={timeVisitante.sigla} className="w-8 h-6 object-cover rounded" />
          ) : (
            <div className="w-8 h-6 bg-gray-200 rounded" />
          )}
          <span className="font-semibold text-gray-700 text-sm">{timeVisitante?.sigla ?? '?'}</span>
        </div>
      </div>

      {/* Desempate pênaltis */}
      {empate && (
        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">Quem avanca (penaltis)?</label>
          <select
            value={classificado ?? ''}
            disabled={disabled}
            onChange={(e) => handleClassificado(e.target.value)}
            className="w-full border border-gray-300 rounded p-1.5 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Selecione...</option>
            {timeCasa && <option value={timeCasa.id}>{timeCasa.nome} ({timeCasa.sigla})</option>}
            {timeVisitante && <option value={timeVisitante.id}>{timeVisitante.nome} ({timeVisitante.sigla})</option>}
          </select>
        </div>
      )}

      {/* Alerta */}
      {alerta && (
        <p className="mt-2 text-yellow-700 text-xs font-medium">{alerta}</p>
      )}
    </div>
  )
}
