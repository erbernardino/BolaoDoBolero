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
    listaJogos.sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
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
    const encerrar = !jogo.aoVivo
    await updateDoc(doc(db, 'jogos', jogo.id), {
      resultado: {
        golsCasa,
        golsVisitante,
        classificado: isMataMata && empate ? form.classificado : null,
      },
      ...(encerrar ? { encerrado: true, aoVivo: false } : {}),
    })
    await carregarDados()
    setSalvando((prev) => ({ ...prev, [jogo.id]: false }))
  }

  async function handleRemoverResultado(jogoId: string) {
    if (!confirm('Tem certeza que deseja remover o resultado deste jogo?')) return
    setSalvando((prev) => ({ ...prev, [jogoId]: true }))
    await updateDoc(doc(db, 'jogos', jogoId), {
      resultado: null,
      encerrado: false,
    })
    await carregarDados()
    setSalvando((prev) => ({ ...prev, [jogoId]: false }))
  }

  async function handleToggleAoVivo(jogo: Jogo) {
    const novoValor = !jogo.aoVivo
    setSalvando((prev) => ({ ...prev, [jogo.id]: true }))
    const update: Record<string, unknown> = { aoVivo: novoValor }
    if (novoValor && !jogo.resultado) {
      update.resultado = { golsCasa: 0, golsVisitante: 0, classificado: null }
    }
    await updateDoc(doc(db, 'jogos', jogo.id), update)
    await carregarDados()
    setSalvando((prev) => ({ ...prev, [jogo.id]: false }))
  }

  const jogosAoVivo = jogos.filter((j) => j.aoVivo === true && !j.encerrado)
  const jogosAbertos = jogos.filter((j) => !j.encerrado && !j.aoVivo)
  const jogosEncerrados = jogos.filter((j) => j.encerrado)

  function renderTimeDisplay(time: Time | null, label: string) {
    if (time) {
      return (
        <div className="flex items-center gap-1.5">
          {time.bandeira && <img src={time.bandeira} alt={time.nome} className="w-6 h-4 object-cover rounded" />}
          <span className="font-medium text-gray-800 text-sm">{time.nome}</span>
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
      fase32: 'Segunda Fase',
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

        {/* Botões salvar / ao vivo / remover resultado */}
        {editable && (timeCasa || !isMataMata) && (
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => handleSalvar(jogo)}
              disabled={salvando[jogo.id] || (isMataMata && (!casaId || !visitanteId))}
              className="bg-blue-700 text-white px-6 py-1.5 rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {salvando[jogo.id] ? 'Salvando...' : 'Salvar Resultado'}
            </button>
            <button
              onClick={() => handleToggleAoVivo(jogo)}
              disabled={salvando[jogo.id]}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                jogo.aoVivo
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {jogo.aoVivo ? '🔴 Ao Vivo — Desativar' : 'Marcar Ao Vivo'}
            </button>
            {jogo.encerrado && (
              <button
                onClick={() => handleRemoverResultado(jogo.id)}
                disabled={salvando[jogo.id]}
                className="bg-red-600 text-white px-6 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm font-medium"
              >
                Remover Resultado
              </button>
            )}
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
      <h1 className="text-2xl font-bold mb-2">Inserir Resultados</h1>
      <p className="text-sm text-gray-500 mb-6">
        Placar dos 90 minutos regulamentares. Gols na prorrogacao e penaltis nao sao computados.
        Em caso de empate no mata-mata, selecione quem avanca (penaltis).
      </p>

      {/* Jogos Ao Vivo */}
      {jogosAoVivo.length > 0 && (
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8 border-2 border-red-400">
          <div className="bg-red-600 text-white px-4 py-2 font-semibold flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
            </span>
            Ao Vivo ({jogosAoVivo.length})
          </div>
          <ul className="divide-y divide-red-100 bg-red-50/30">
            {jogosAoVivo.map((jogo) => renderJogoCard(jogo, true))}
          </ul>
        </div>
      )}

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
            {jogosEncerrados.map((jogo) => renderJogoCard(jogo, true))}
          </ul>
        )}
      </div>
    </div>
  )
}
