import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { calcularClassificacaoGrupo } from '../../lib/classificacao'
import type { Jogo, Time, Grupo, Palpite, ClassificacaoTime, Origem } from '../../types'

interface ResultadoForm {
  golsCasa: string
  golsVisitante: string
  classificado: string
}

function resolverTimeReal(
  origem: Origem | null,
  classReais: Record<string, ClassificacaoTime[]>,
  todosJogos: Jogo[],
): string | null {
  if (!origem) return null

  if (origem.tipo === 'grupo') {
    const classificacao = classReais[origem.grupo]
    if (!classificacao || classificacao.length < origem.posicao) return null
    return classificacao[origem.posicao - 1].timeId
  }

  if (origem.tipo === 'jogo') {
    const jogoRef = todosJogos.find(j => j.id === origem.jogoId)
    if (!jogoRef || !jogoRef.resultado || !jogoRef.encerrado) return null

    const r = jogoRef.resultado
    let vencedor: string | null
    let perdedor: string | null

    if (r.golsCasa > r.golsVisitante) {
      vencedor = jogoRef.timeCasa || null
      perdedor = jogoRef.timeVisitante || null
    } else if (r.golsVisitante > r.golsCasa) {
      vencedor = jogoRef.timeVisitante || null
      perdedor = jogoRef.timeCasa || null
    } else {
      vencedor = r.classificado || null
      perdedor = r.classificado === jogoRef.timeCasa ? (jogoRef.timeVisitante || null) : (jogoRef.timeCasa || null)
    }

    return origem.resultado === 'perdedor' ? perdedor : vencedor
  }

  return null
}

export function InserirResultados() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Time[]>([])
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [resultados, setResultados] = useState<Record<string, ResultadoForm>>({})
  const [salvando, setSalvando] = useState<Record<string, boolean>>({})

  async function carregarDados() {
    const [jogosSnap, timesSnap, gruposSnap] = await Promise.all([
      getDocs(collection(db, 'jogos')),
      getDocs(collection(db, 'times')),
      getDocs(collection(db, 'grupos')),
    ])
    const listaJogos = jogosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Jogo))
    setJogos(listaJogos)
    setTimes(timesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Time)))
    setGrupos(gruposSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Grupo)))

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

  // Classificação real baseada em resultados oficiais
  const classReais = useMemo(() => {
    const jogosGrupos = jogos.filter(j => j.fase === 'grupos')
    const result: Record<string, ClassificacaoTime[]> = {}

    for (const grupo of grupos) {
      const letra = grupo.nome.replace('Grupo ', '')
      const jogosDoGrupo = jogosGrupos.filter(j => j.grupo === letra)
      const palpitesReais: Palpite[] = jogosDoGrupo
        .filter(j => j.encerrado && j.resultado)
        .map(j => ({
          id: `real_${j.id}`,
          uid: 'real',
          jogoId: j.id,
          timeCasa: j.timeCasa,
          timeVisitante: j.timeVisitante,
          golsCasa: j.resultado!.golsCasa,
          golsVisitante: j.resultado!.golsVisitante,
          classificado: j.resultado!.classificado,
          criadoEm: Timestamp.now(),
        }))
      if (palpitesReais.length > 0) {
        result[letra] = calcularClassificacaoGrupo(palpitesReais, grupo.times)
      }
    }
    return result
  }, [jogos, grupos])

  // Resolver times reais para cada jogo de mata-mata
  function getTimesReais(jogo: Jogo): { casaId: string | null; visitanteId: string | null } {
    if (jogo.fase === 'grupos') {
      return { casaId: jogo.timeCasa, visitanteId: jogo.timeVisitante }
    }
    return {
      casaId: resolverTimeReal(jogo.origemCasa, classReais, jogos),
      visitanteId: resolverTimeReal(jogo.origemVisitante, classReais, jogos),
    }
  }

  function getTime(id: string | null): Time | null {
    if (!id) return null
    return times.find(t => t.id === id) ?? null
  }

  function descreverOrigem(origem: Jogo['origemCasa']): string {
    if (!origem) return '?'
    if (origem.tipo === 'grupo') {
      const pos = origem.posicao === 1 ? '1o' : origem.posicao === 2 ? '2o' : '3o'
      return `${pos} Grupo ${origem.grupo}`
    }
    const label = origem.resultado === 'perdedor' ? 'Perd.' : 'Venc.'
    return `${label} ${origem.jogoId.replace('_', ' ')}`
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

  function renderTimeDisplay(time: Time | null, label: string) {
    if (time) {
      return (
        <div className="flex items-center gap-1.5">
          {time.bandeira && <img src={time.bandeira} alt={time.sigla} className="w-6 h-4 object-cover rounded" />}
          <span className="font-medium text-gray-800 text-sm">{time.sigla}</span>
        </div>
      )
    }
    return <span className="text-xs text-gray-400 italic">{label}</span>
  }

  function renderJogoCard(jogo: Jogo, editable: boolean) {
    const form = resultados[jogo.id] ?? { golsCasa: '', golsVisitante: '', classificado: '' }
    const isMataMata = jogo.fase !== 'grupos'
    const golsCasaNum = Number(form.golsCasa)
    const golsVisitanteNum = Number(form.golsVisitante)
    const empate = form.golsCasa !== '' && form.golsVisitante !== '' && golsCasaNum === golsVisitanteNum

    const { casaId, visitanteId } = getTimesReais(jogo)
    const timeCasa = getTime(casaId)
    const timeVisitante = getTime(visitanteId)

    const faseLabels: Record<string, string> = {
      oitavas: 'Oitavas',
      quartas: 'Quartas',
      semi: 'Semi',
      terceiro: '3o Lugar',
      final: 'Final',
    }

    return (
      <li key={jogo.id} className="px-4 py-4">
        {/* Fase + data */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {jogo.fase !== 'grupos' && (
              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {faseLabels[jogo.fase] ?? jogo.fase}
              </span>
            )}
            {jogo.grupo && (
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                Grupo {jogo.grupo}
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {jogo.dataHora.toDate().toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
            })}
          </span>
        </div>

        {/* Placar com times */}
        <div className="flex items-center justify-center gap-3">
          {/* Time Casa */}
          <div className="flex-1 flex justify-end">
            {renderTimeDisplay(
              timeCasa,
              isMataMata ? descreverOrigem(jogo.origemCasa) : '?',
            )}
          </div>

          {/* Inputs de placar */}
          {editable ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                value={form.golsCasa}
                onChange={(e) => setResultado(jogo.id, 'golsCasa', e.target.value)}
                className="border rounded px-2 py-1 w-14 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-"
              />
              <span className="font-bold text-gray-400">x</span>
              <input
                type="number"
                min={0}
                value={form.golsVisitante}
                onChange={(e) => setResultado(jogo.id, 'golsVisitante', e.target.value)}
                className="border rounded px-2 py-1 w-14 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="-"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-mono bg-gray-100 px-3 py-1 rounded text-lg font-bold">
                {jogo.resultado?.golsCasa ?? '-'} x {jogo.resultado?.golsVisitante ?? '-'}
              </span>
            </div>
          )}

          {/* Time Visitante */}
          <div className="flex-1">
            {renderTimeDisplay(
              timeVisitante,
              isMataMata ? descreverOrigem(jogo.origemVisitante) : '?',
            )}
          </div>
        </div>

        {/* Classificado (pênaltis) */}
        {isMataMata && empate && editable && (
          <div className="mt-2 flex justify-center">
            <select
              value={form.classificado}
              onChange={(e) => setResultado(jogo.id, 'classificado', e.target.value)}
              className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Quem avança? (pênaltis)</option>
              {casaId && <option value={casaId}>{timeCasa?.nome ?? 'Casa'} ({timeCasa?.sigla})</option>}
              {visitanteId && <option value={visitanteId}>{timeVisitante?.nome ?? 'Visitante'} ({timeVisitante?.sigla})</option>}
            </select>
          </div>
        )}

        {/* Classificado info (encerrado) */}
        {!editable && jogo.resultado?.classificado && (
          <div className="mt-1 text-center">
            <span className="text-xs text-gray-500">
              Avança: <span className="font-medium text-gray-700">{getTime(jogo.resultado.classificado)?.nome ?? jogo.resultado.classificado}</span>
            </span>
          </div>
        )}

        {/* Botão salvar */}
        {editable && (timeCasa || !isMataMata) && (
          <div className="mt-3 flex justify-center">
            <button
              onClick={() => handleSalvar(jogo)}
              disabled={salvando[jogo.id] || (isMataMata && (!casaId || !visitanteId))}
              className="bg-blue-700 text-white px-6 py-1.5 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {salvando[jogo.id] ? 'Salvando...' : 'Salvar Resultado'}
            </button>
          </div>
        )}

        {/* Badge encerrado */}
        {!editable && (
          <div className="mt-2 flex justify-center">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Encerrado</span>
          </div>
        )}
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
