import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Jogo, Time, Palpite, Usuario, Fase } from '../../types'

const FASES: { id: Fase | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'fase32', label: 'Segunda Fase' },
  { id: 'oitavas', label: 'Oitavas' },
  { id: 'quartas', label: 'Quartas' },
  { id: 'semi', label: 'Semis' },
  { id: 'terceiro', label: '3o Lugar' },
  { id: 'final', label: 'Final' },
]

export function VerPalpites() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Palpite[]>([])
  const [usuarios, setUsuarios] = useState<Map<string, Usuario>>(new Map())
  const [loading, setLoading] = useState(true)
  const [faseAtiva, setFaseAtiva] = useState<Fase | 'todos'>('grupos')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, palpitesSnap, usuariosSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'palpites')),
        getDocs(collection(db, 'usuarios')),
      ])

      const jogosData = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Jogo))
      jogosData.sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
      setJogos(jogosData)

      const timesMap = new Map<string, Time>()
      timesSnap.docs.forEach(d => timesMap.set(d.id, { id: d.id, ...d.data() } as Time))
      setTimes(timesMap)

      setPalpites(palpitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Palpite)))

      const usMap = new Map<string, Usuario>()
      usuariosSnap.docs.forEach(d => usMap.set(d.id, { uid: d.id, ...d.data() } as Usuario))
      setUsuarios(usMap)

      setLoading(false)
    }
    load()
  }, [])

  const listaUsuarios = useMemo(() => {
    return Array.from(usuarios.values()).sort((a, b) =>
      (a.apelido || a.nome || '').localeCompare(b.apelido || b.nome || '')
    )
  }, [usuarios])

  const FASE_LABELS: Record<string, string> = {
    grupos: 'Grupos',
    fase32: 'Segunda Fase',
    oitavas: 'Oitavas',
    quartas: 'Quartas',
    semi: 'Semis',
    terceiro: '3o Lugar',
    final: 'Final',
  }

  const jogosFiltrados = useMemo(() => {
    let lista = jogos
    if (faseAtiva !== 'todos') {
      lista = lista.filter(j => j.fase === faseAtiva)
    }
    if (grupoFiltro && faseAtiva === 'grupos') {
      lista = lista.filter(j => j.grupo === grupoFiltro)
    }
    return lista
  }, [jogos, faseAtiva, grupoFiltro])

  const faseSpans = useMemo(() => {
    const spans: { fase: string; label: string; count: number }[] = []
    for (const jogo of jogosFiltrados) {
      const last = spans[spans.length - 1]
      if (last && last.fase === jogo.fase) {
        last.count++
      } else {
        spans.push({ fase: jogo.fase, label: FASE_LABELS[jogo.fase] ?? jogo.fase, count: 1 })
      }
    }
    return spans
  }, [jogosFiltrados])

  const usuariosFiltrados = useMemo(() => {
    if (!usuarioFiltro) return listaUsuarios
    const termo = usuarioFiltro.toLowerCase()
    return listaUsuarios.filter(u =>
      (u.apelido || '').toLowerCase().includes(termo) ||
      (u.nome || '').toLowerCase().includes(termo)
    )
  }, [listaUsuarios, usuarioFiltro])

  // Mapa: jogoId -> uid -> palpite
  const palpiteMap = useMemo(() => {
    const map = new Map<string, Map<string, Palpite>>()
    for (const p of palpites) {
      if (!map.has(p.jogoId)) map.set(p.jogoId, new Map())
      map.get(p.jogoId)!.set(p.uid, p)
    }
    return map
  }, [palpites])

  const gruposDisponiveis = useMemo(() => {
    const grupoSet = new Set<string>()
    jogos.filter(j => j.fase === 'grupos' && j.grupo).forEach(j => grupoSet.add(j.grupo!))
    return Array.from(grupoSet).sort()
  }, [jogos])

  function nome(id: string): string | undefined {
    return times.get(id)?.nome
  }

  function bandeira(id: string): string | undefined {
    return times.get(id)?.bandeira
  }

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-8"><p className="text-gray-500">Carregando...</p></div>
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Palpites dos Participantes</h2>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1 overflow-x-auto">
          {FASES.map(f => (
            <button
              key={f.id}
              onClick={() => { setFaseAtiva(f.id); setGrupoFiltro('') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                faseAtiva === f.id
                  ? 'bg-blue-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {faseAtiva === 'grupos' && (
          <select
            value={grupoFiltro}
            onChange={e => setGrupoFiltro(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">Todos os grupos</option>
            {gruposDisponiveis.map(g => (
              <option key={g} value={g}>Grupo {g}</option>
            ))}
          </select>
        )}
        <input
          type="text"
          placeholder="Filtrar participante..."
          value={usuarioFiltro}
          onChange={e => setUsuarioFiltro(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[180px]"
        />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-auto max-h-[70vh]">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {/* Linha de fases */}
            {faseAtiva === 'todos' && faseSpans.length > 1 && (
              <tr>
                <th className="sticky left-0 bg-gray-50" />
                {faseSpans.map((span, i) => (
                  <th
                    key={`fase-${i}`}
                    colSpan={span.count}
                    className="px-1 py-1 text-center text-[10px] font-bold text-white bg-blue-700 border-l border-blue-600 first:border-l-0"
                  >
                    {span.label}
                  </th>
                ))}
              </tr>
            )}
            {/* Linha de jogos */}
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[120px]">
                Participante
              </th>
              {jogosFiltrados.map(jogo => (
                <th key={jogo.id} className="px-1 py-2 text-center w-[90px] min-w-[90px] max-w-[90px] align-top">
                  <div className="flex flex-col items-center h-full">
                    <span className="text-[9px] font-bold text-blue-500 mb-1">Jogo {jogo.numero}</span>
                    {jogo.timeCasa ? (
                      <div className="flex items-center gap-1 justify-center">
                        {bandeira(jogo.timeCasa) && (
                          <img src={bandeira(jogo.timeCasa)!} alt="" className="w-4 h-3 object-cover rounded shrink-0" />
                        )}
                        <span className="text-[10px] font-medium text-gray-600 truncate max-w-[65px]" title={nome(jogo.timeCasa)}>{nome(jogo.timeCasa)}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-400 italic">A definir</span>
                    )}
                    <span className="text-[9px] text-gray-400 leading-tight">vs</span>
                    {jogo.timeVisitante ? (
                      <div className="flex items-center gap-1 justify-center">
                        {bandeira(jogo.timeVisitante) && (
                          <img src={bandeira(jogo.timeVisitante)!} alt="" className="w-4 h-3 object-cover rounded shrink-0" />
                        )}
                        <span className="text-[10px] font-medium text-gray-600 truncate max-w-[65px]" title={nome(jogo.timeVisitante)}>{nome(jogo.timeVisitante)}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-gray-400 italic">A definir</span>
                    )}
                    {jogo.encerrado && jogo.resultado && (
                      <span className="text-[10px] font-bold text-green-600 mt-0.5">
                        {jogo.resultado.golsCasa}x{jogo.resultado.golsVisitante}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {usuariosFiltrados.map(u => (
              <tr key={u.uid} className="hover:bg-blue-50/50">
                <td className="px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white whitespace-nowrap">
                  {u.apelido || u.nome || 'Sem nome'}
                </td>
                {jogosFiltrados.map(jogo => {
                  const p = palpiteMap.get(jogo.id)?.get(u.uid)
                  if (!p) {
                    return (
                      <td key={jogo.id} className="px-2 py-2 text-center text-gray-300">
                        -
                      </td>
                    )
                  }

                  // Cor por acerto conforme regulamento
                  let corClasse = 'text-gray-700'
                  if (jogo.encerrado && jogo.resultado) {
                    const r = jogo.resultado
                    const placarExato = p.golsCasa === r.golsCasa && p.golsVisitante === r.golsVisitante
                    const vP = Math.sign(p.golsCasa - p.golsVisitante)
                    const vR = Math.sign(r.golsCasa - r.golsVisitante)
                    const colunaCerta = vP === vR
                    const totalGolsCerto = (p.golsCasa + p.golsVisitante) === (r.golsCasa + r.golsVisitante)

                    if (placarExato) {
                      corClasse = 'text-green-700 bg-green-50 font-bold' // 5 pts
                    } else if (colunaCerta) {
                      corClasse = 'text-yellow-700 bg-yellow-50' // 3 pts
                    } else if (totalGolsCerto) {
                      corClasse = 'text-blue-700 bg-blue-50' // 1 pt
                    } else {
                      corClasse = 'text-red-400' // 0 pts
                    }
                  }

                  return (
                    <td key={jogo.id} className={`px-2 py-2 text-center text-xs font-mono rounded ${corClasse}`}>
                      {p.golsCasa}x{p.golsVisitante}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {usuariosFiltrados.length === 0 && (
          <p className="text-center text-gray-400 py-8">Nenhum participante encontrado.</p>
        )}
      </div>

      {/* Legenda */}
      {jogosFiltrados.some(j => j.encerrado) && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> Placar exato (5 pts)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" /> Coluna certa (3 pts)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Total de gols certo (1 pt)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded text-red-400 border border-gray-200" /> Errou (0 pts)</span>
        </div>
      )}
    </div>
  )
}
