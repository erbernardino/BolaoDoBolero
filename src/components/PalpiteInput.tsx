import { useState, useEffect } from 'react'
import type { Timestamp } from 'firebase/firestore'
import type { Time, Resultado } from '../types'

interface PalpiteInputProps {
  numero?: number
  timeCasa: Time | null
  timeVisitante: Time | null
  golsCasa: number | null
  golsVisitante: number | null
  classificado: string | null
  dataHora?: Timestamp | null
  resultado?: Resultado | null
  encerrado?: boolean
  realTimeCasa?: Time | null
  realTimeVisitante?: Time | null
  labelCasa?: string
  labelVisitante?: string
  ehMataMata: boolean
  disabled: boolean
  alerta?: string
  onChange: (golsCasa: number, golsVisitante: number, classificado: string | null) => void
}

export function PalpiteInput({
  numero,
  timeCasa,
  timeVisitante,
  golsCasa: golsCasaProp,
  golsVisitante: golsVisitanteProp,
  classificado: classificadoProp,
  dataHora,
  resultado,
  encerrado,
  realTimeCasa,
  realTimeVisitante,
  labelCasa,
  labelVisitante,
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

  const dataFormatada = dataHora
    ? dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className={`rounded-lg bg-white p-4 ${borderClass}`}>
      {(numero || dataFormatada) && (
        <p className="text-xs text-gray-400 text-center mb-2">
          {numero != null && <span className="font-semibold text-gray-500">Jogo {numero}</span>}
          {numero != null && dataFormatada && <span> — </span>}
          {dataFormatada}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        {/* Time Casa */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className={`font-semibold text-sm ${timeCasa ? 'text-gray-700' : 'text-gray-400 italic'}`}>
            {timeCasa?.nome ?? labelCasa ?? '?'}
          </span>
          {timeCasa?.bandeira ? (
            <img src={timeCasa.bandeira} alt={timeCasa.nome ?? timeCasa.sigla} className="w-8 h-6 object-cover rounded" />
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
            <img src={timeVisitante.bandeira} alt={timeVisitante.nome ?? timeVisitante.sigla} className="w-8 h-6 object-cover rounded" />
          ) : (
            <div className="w-8 h-6 bg-gray-200 rounded" />
          )}
          <span className={`font-semibold text-sm ${timeVisitante ? 'text-gray-700' : 'text-gray-400 italic'}`}>
            {timeVisitante?.nome ?? labelVisitante ?? '?'}
          </span>
        </div>
      </div>

      {/* Times reais do mata-mata (quando disponíveis e diferentes do palpite) */}
      {realTimeCasa && realTimeVisitante && (
        <div className="mt-2 flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
            <span className="text-xs text-emerald-600">Real:</span>
            {realTimeCasa.bandeira && <img src={realTimeCasa.bandeira} alt="" className="w-5 h-3.5 object-cover rounded" title={realTimeCasa.nome} />}
            <span className="text-xs font-bold text-emerald-700">{realTimeCasa.nome}</span>
            <span className="text-xs text-emerald-400">vs</span>
            <span className="text-xs font-bold text-emerald-700">{realTimeVisitante.nome}</span>
            {realTimeVisitante.bandeira && <img src={realTimeVisitante.bandeira} alt="" className="w-5 h-3.5 object-cover rounded" title={realTimeVisitante.nome} />}
          </div>
        </div>
      )}

      {/* Resultado real */}
      {encerrado && resultado && (
        <div className="mt-2 text-center">
          <div className="inline-flex items-center gap-2 bg-gray-100 rounded-full px-3 py-1">
            <span className="text-xs text-gray-500">Resultado:</span>
            <span className="text-sm font-bold text-gray-700">
              {resultado.golsCasa} x {resultado.golsVisitante}
            </span>
          </div>
        </div>
      )}

      {/* Desempate pênaltis */}
      {empate && (
        <div className="mt-3">
          <label className="block text-sm text-gray-600 mb-1">Quem avança (pênaltis)?</label>
          <p className="text-xs text-gray-400 mb-1">Apenas para definir os times das próximas fases. Não vale pontuação.</p>
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
