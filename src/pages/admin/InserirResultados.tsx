import { useState, useEffect } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Jogo, Time } from '../../types'

interface ResultadoForm {
  golsCasa: string
  golsVisitante: string
  classificado: string
}

export function InserirResultados() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Time[]>([])
  const [resultados, setResultados] = useState<Record<string, ResultadoForm>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})

  async function carregarDados() {
    const [jogosSnap, timesSnap] = await Promise.all([
      getDocs(collection(db, 'jogos')),
      getDocs(collection(db, 'times')),
    ])
    const listaJogos = jogosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Jogo))
    setJogos(listaJogos)
    setTimes(timesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Time)))

    const forms: Record<string, ResultadoForm> = {}
    for (const jogo of listaJogos) {
      forms[jogo.id] = {
        golsCasa: jogo.resultado ? String(jogo.resultado.golsCasa) : '',
        golsVisitante: jogo.resultado ? String(jogo.resultado.golsVisitante) : '',
        classificado: jogo.resultado?.classificado ?? '',
      }
    }
    setResultados(forms)
  }

  useEffect(() => {
    carregarDados()
  }, [])

  function nomeTime(id: string) {
    return times.find((t) => t.id === id)?.nome ?? id
  }

  function jogoLabel(jogo: Jogo) {
    if (jogo.fase === 'grupos') {
      return `${nomeTime(jogo.timeCasa)} x ${nomeTime(jogo.timeVisitante)}`
    }
    const faseLabels: Record<string, string> = {
      oitavas: 'Oitavas de Final',
      quartas: 'Quartas de Final',
      semi: 'Semifinal',
      terceiro: 'Disputa pelo 3º Lugar',
      final: 'Final',
    }
    return `Jogo ${faseLabels[jogo.fase] ?? jogo.fase}`
  }

  function setResultado(jogoId: string, field: keyof ResultadoForm, value: string) {
    setResultados((prev) => ({
      ...prev,
      [jogoId]: { ...prev[jogoId], [field]: value },
    }))
  }

  async function handleSalvar(jogo: Jogo) {
    const form = resultados[jogo.id]
    if (form.golsCasa === '' || form.golsVisitante === '') {
      alert('Informe os gols dos dois times.')
      return
    }
    const golsCasa = Number(form.golsCasa)
    const golsVisitante = Number(form.golsVisitante)

    const isMataMata = jogo.fase !== 'grupos'
    const empate = golsCasa === golsVisitante

    if (isMataMata && empate && !form.classificado) {
      alert('Em caso de empate no mata-mata, selecione o classificado.')
      return
    }

    setSalvando((prev) => ({ ...prev, [jogo.id]: true }))
    await updateDoc(doc(db, 'jogos', jogo.id), {
      resultado: {
        golsCasa,
        golsVisitante,
        classificado: isMataMata && empate ? form.classificado : null,
      },
      encerrado: true,
    })
    await carregarDados()
    setSalvando((prev) => ({ ...prev, [jogo.id]: false }))
  }

  const jogosAbertos = jogos.filter((j) => !j.encerrado)
  const jogosEncerrados = jogos.filter((j) => j.encerrado)

  function renderJogoCard(jogo: Jogo, editable: boolean) {
    const form = resultados[jogo.id] ?? { golsCasa: '', golsVisitante: '', classificado: '' }
    const isMataMata = jogo.fase !== 'grupos'
    const golsCasaNum = Number(form.golsCasa)
    const golsVisitanteNum = Number(form.golsVisitante)
    const empate = form.golsCasa !== '' && form.golsVisitante !== '' && golsCasaNum === golsVisitanteNum

    const timeCasaNome = jogo.fase === 'grupos' ? nomeTime(jogo.timeCasa) : 'Time A'
    const timeVisitanteNome = jogo.fase === 'grupos' ? nomeTime(jogo.timeVisitante) : 'Time B'

    return (
      <li key={jogo.id} className="px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <div className="font-medium text-gray-900">{jogoLabel(jogo)}</div>
            <div className="text-xs text-gray-500 mt-0.5">
              {jogo.dataHora.toDate().toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          {editable ? (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 truncate max-w-[80px]">{timeCasaNome}</span>
                <input
                  type="number"
                  min={0}
                  value={form.golsCasa}
                  onChange={(e) => setResultado(jogo.id, 'golsCasa', e.target.value)}
                  className="border rounded px-2 py-1 w-16 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <span className="font-bold text-gray-400">x</span>
              <div className="flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 truncate max-w-[80px]">{timeVisitanteNome}</span>
                <input
                  type="number"
                  min={0}
                  value={form.golsVisitante}
                  onChange={(e) => setResultado(jogo.id, 'golsVisitante', e.target.value)}
                  className="border rounded px-2 py-1 w-16 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>

              {isMataMata && empate && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-gray-500">Classificado (pênaltis)</span>
                  <select
                    value={form.classificado}
                    onChange={(e) => setResultado(jogo.id, 'classificado', e.target.value)}
                    className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Selecione...</option>
                    {jogo.fase === 'grupos' ? (
                      <>
                        <option value={jogo.timeCasa}>{timeCasaNome}</option>
                        <option value={jogo.timeVisitante}>{timeVisitanteNome}</option>
                      </>
                    ) : (
                      <>
                        <option value="casa">{timeCasaNome}</option>
                        <option value="visitante">{timeVisitanteNome}</option>
                      </>
                    )}
                  </select>
                </div>
              )}

              <button
                onClick={() => handleSalvar(jogo)}
                disabled={salvando[jogo.id]}
                className="bg-blue-700 text-white px-4 py-1.5 rounded hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm"
              >
                {salvando[jogo.id] ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono bg-gray-100 px-3 py-1 rounded text-lg font-bold">
                {jogo.resultado?.golsCasa ?? '-'} x {jogo.resultado?.golsVisitante ?? '-'}
              </span>
              {jogo.resultado?.classificado && (
                <span className="text-xs text-gray-500">
                  Classificado:{' '}
                  <span className="font-medium text-gray-700">
                    {jogo.resultado.classificado === 'casa'
                      ? timeCasaNome
                      : jogo.resultado.classificado === 'visitante'
                      ? timeVisitanteNome
                      : nomeTime(jogo.resultado.classificado)}
                  </span>
                </span>
              )}
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                Encerrado
              </span>
            </div>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Inserir Resultados</h1>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
        <div className="bg-blue-700 text-white px-4 py-2 font-semibold">
          Jogos Pendentes ({jogosAbertos.length})
        </div>
        {jogosAbertos.length === 0 ? (
          <p className="px-4 py-3 text-gray-500 text-sm">Nenhum jogo pendente.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {jogosAbertos.map((jogo) => renderJogoCard(jogo, true))}
          </ul>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-gray-700 text-white px-4 py-2 font-semibold">
          Jogos Encerrados ({jogosEncerrados.length})
        </div>
        {jogosEncerrados.length === 0 ? (
          <p className="px-4 py-3 text-gray-500 text-sm">Nenhum jogo encerrado.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {jogosEncerrados.map((jogo) => renderJogoCard(jogo, false))}
          </ul>
        )}
      </div>
    </div>
  )
}
