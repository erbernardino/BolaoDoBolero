import { useState, useEffect } from 'react'
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
  onChange: (golsCasa: number, golsVisitante: number, classificado: string | null) => void
}

export function PalpiteInput({
  timeCasa,
  timeVisitante,
  golsCasa: golsCasaProp,
  golsVisitante: golsVisitanteProp,
  classificado: classificadoProp,
  ehMataMata,
  disabled,
  alerta,
  onChange,
}: PalpiteInputProps) {
  const [casa, setCasa] = useState(golsCasaProp?.toString() ?? '')
  const [visitante, setVisitante] = useState(golsVisitanteProp?.toString() ?? '')
  const [classificado, setClassificado] = useState(classificadoProp ?? '')

  // Sync from parent when props change (e.g. after reload)
  useEffect(() => {
    setCasa(golsCasaProp?.toString() ?? '')
  }, [golsCasaProp])

  useEffect(() => {
    setVisitante(golsVisitanteProp?.toString() ?? '')
  }, [golsVisitanteProp])

  useEffect(() => {
    setClassificado(classificadoProp ?? '')
  }, [classificadoProp])

  function trySubmit(newCasa: string, newVisitante: string, newClassificado: string) {
    const gc = parseInt(newCasa, 10)
    const gv = parseInt(newVisitante, 10)
    if (!isNaN(gc) && !isNaN(gv)) {
      onChange(gc, gv, newClassificado || null)
    }
  }

  function handleCasaChange(value: string) {
    setCasa(value)
    trySubmit(value, visitante, classificado)
  }

  function handleVisitanteChange(value: string) {
    setVisitante(value)
    trySubmit(casa, value, classificado)
  }

  function handleClassificadoChange(value: string) {
    setClassificado(value)
    trySubmit(casa, visitante, value)
  }

  const gc = parseInt(casa, 10)
  const gv = parseInt(visitante, 10)
  const empate = ehMataMata && !isNaN(gc) && !isNaN(gv) && gc === gv
  const borderClass = alerta ? 'border-yellow-400 border-2' : 'border border-gray-200'

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
            value={casa}
            disabled={disabled}
            onChange={(e) => handleCasaChange(e.target.value)}
            className="w-12 text-center border border-gray-300 rounded p-1 text-lg font-bold disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <span className="text-gray-400 font-bold">x</span>
          <input
            type="number"
            min={0}
            max={99}
            value={visitante}
            disabled={disabled}
            onChange={(e) => handleVisitanteChange(e.target.value)}
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
          <label className="block text-sm text-gray-600 mb-1">Quem avança (pênaltis)?</label>
          <select
            value={classificado}
            disabled={disabled}
            onChange={(e) => handleClassificadoChange(e.target.value)}
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
