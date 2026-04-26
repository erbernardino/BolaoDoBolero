import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, doc, getDoc, Timestamp, query, where } from 'firebase/firestore'
import type { QuerySnapshot, DocumentData } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { Avatar } from '../components/Avatar'
import type { Jogo, Time, Palpite, Usuario, Fase, Config } from '../types'

const FASES: { id: Fase | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'oitavas', label: 'Oitavas' },
  { id: 'quartas', label: 'Quartas' },
  { id: 'semi', label: 'Semis' },
  { id: 'terceiro', label: '3o Lugar' },
  { id: 'final', label: 'Final' },
]

export function PalpitesGeral() {
  const { firebaseUser, usuario } = useAuth()
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Palpite[]>([])
  const [usuarios, setUsuarios] = useState<Map<string, Usuario>>(new Map())
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [faseAtiva, setFaseAtiva] = useState<Fase | 'todos'>('grupos')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')

  const isAdmin = usuario?.role === 'admin'

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, usuariosSnap, configSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'usuarios')),
        getDoc(doc(db, 'config', 'geral')),
      ])

      const jogosData = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Jogo))
      jogosData.sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
      setJogos(jogosData)

      const timesMap = new Map<string, Time>()
      timesSnap.docs.forEach(d => timesMap.set(d.id, { id: d.id, ...d.data() } as Time))
      setTimes(timesMap)

      const usMap = new Map<string, Usuario>()
      usuariosSnap.docs.forEach(d => usMap.set(d.id, { uid: d.id, ...d.data() } as Usuario))
      setUsuarios(usMap)

      const configData = configSnap.exists() ? configSnap.data() as Config : null
      if (configSnap.exists()) {
        setConfig(configData)
      }

      if (firebaseUser) {
        const visibilidadeAtual = configData?.visibilidadePalpites ?? 'nunca'
        const prazoJaExpirou = configData?.prazoLimitePalpites
          ? Timestamp.now().toMillis() > configData.prazoLimitePalpites.toMillis()
          : false
        const palpitesMap = new Map<string, Palpite>()

        function addPalpitesFromSnap(snap: QuerySnapshot<DocumentData>) {
          snap.docs.forEach(d => {
            palpitesMap.set(d.id, { id: d.id, ...d.data() } as Palpite)
          })
        }

        const ownSnap = await getDocs(query(
          collection(db, 'palpites'),
          where('uid', '==', firebaseUser.uid),
        ))
        addPalpitesFromSnap(ownSnap)

        if (isAdmin || visibilidadeAtual === 'sempre' || (visibilidadeAtual === 'apos_prazo' && prazoJaExpirou)) {
          addPalpitesFromSnap(await getDocs(collection(db, 'palpites')))
        } else if (visibilidadeAtual === 'apos_jogo') {
          // Firestore permite até 30 valores no operador `in`, mas a regra `canReadPalpite`
          // faz `get(jogos/{jogoId})` por palpite e o limite cumulativo de get() em rules é
          // 20 por query (mais 2 entradas fixas: config/geral e usuarios/{uid}). Para ficar
          // dentro do orçamento com folga, usamos chunks de 10 (10 + 2 = 12 < 20).
          const idsEncerrados = jogosData.filter(j => j.encerrado).map(j => j.id)
          const chunks: string[][] = []
          for (let i = 0; i < idsEncerrados.length; i += 10) {
            chunks.push(idsEncerrados.slice(i, i + 10))
          }
          const snapshots = await Promise.all(
            chunks.map(chunk => getDocs(query(
              collection(db, 'palpites'),
              where('jogoId', 'in', chunk),
            ))),
          )
          snapshots.forEach(addPalpitesFromSnap)
        }

        setPalpites(Array.from(palpitesMap.values()))
      }

      setLoading(false)
    }
    load()
  }, [firebaseUser, isAdmin])

  // Determinar se palpites de outros são visíveis
  const visibilidade = config?.visibilidadePalpites ?? 'nunca'
  const prazoExpirado = config?.prazoLimitePalpites
    ? Timestamp.now().toMillis() > config.prazoLimitePalpites.toMillis()
    : false

  function palpiteVisivel(palpite: Palpite, jogo: Jogo): boolean {
    // Sempre vê os próprios
    if (palpite.uid === firebaseUser?.uid) return true
    // Admin vê tudo
    if (isAdmin) return true

    switch (visibilidade) {
      case 'sempre':
        return true
      case 'apos_prazo':
        return prazoExpirado
      case 'apos_jogo':
        return jogo.encerrado
      case 'nunca':
        return false
      default:
        return false
    }
  }

  const listaUsuarios = useMemo(() => {
    return Array.from(usuarios.values()).sort((a, b) =>
      (a.apelido || a.nome || '').localeCompare(b.apelido || b.nome || '')
    )
  }, [usuarios])

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

  const usuariosFiltrados = useMemo(() => {
    if (!usuarioFiltro) return listaUsuarios
    const termo = usuarioFiltro.toLowerCase()
    return listaUsuarios.filter(u =>
      (u.apelido || '').toLowerCase().includes(termo) ||
      (u.nome || '').toLowerCase().includes(termo)
    )
  }, [listaUsuarios, usuarioFiltro])

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

  function sigla(id: string): string {
    return times.get(id)?.sigla ?? '?'
  }

  function bandeiraUrl(id: string): string | undefined {
    return times.get(id)?.bandeira
  }

  // Mensagem sobre visibilidade
  const visibilidadeLabel: Record<string, string> = {
    sempre: 'Todos os palpites estão visíveis.',
    apos_prazo: prazoExpirado
      ? 'Prazo encerrado — todos os palpites estão visíveis.'
      : 'Os palpites dos outros participantes ficarão visíveis após o prazo.',
    apos_jogo: 'Os palpites ficam visíveis após cada jogo ser encerrado.',
    nunca: 'Você só pode ver os seus próprios palpites.',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8"><p className="text-gray-500">Carregando...</p></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Palpites dos Participantes</h1>

        {/* Info de visibilidade */}
        {!isAdmin && (
          <p className="text-sm text-gray-500 mb-4">
            {visibilidadeLabel[visibilidade]}
          </p>
        )}

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
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[120px]">
                  Participante
                </th>
                {jogosFiltrados.map(jogo => (
                  <th key={jogo.id} className="px-2 py-2 text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="flex items-center gap-1">
                        {bandeiraUrl(jogo.timeCasa) && (
                          <img src={bandeiraUrl(jogo.timeCasa)!} alt="" className="w-4 h-3 object-cover rounded" />
                        )}
                        <span className="text-xs font-medium text-gray-600">{sigla(jogo.timeCasa)}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">vs</span>
                      <div className="flex items-center gap-1">
                        {bandeiraUrl(jogo.timeVisitante) && (
                          <img src={bandeiraUrl(jogo.timeVisitante)!} alt="" className="w-4 h-3 object-cover rounded" />
                        )}
                        <span className="text-xs font-medium text-gray-600">{sigla(jogo.timeVisitante)}</span>
                      </div>
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
              {usuariosFiltrados.map(u => {
                const ehEu = u.uid === firebaseUser?.uid
                return (
                  <tr key={u.uid} className={`hover:bg-blue-50/50 ${ehEu ? 'bg-blue-50/30' : ''}`}>
                    <td className={`px-3 py-2 font-medium sticky left-0 whitespace-nowrap ${ehEu ? 'text-blue-700 bg-blue-50/30' : 'text-gray-800 bg-white'}`}>
                      <div className="flex items-center gap-2">
                        <Avatar
                          src={u.fotoURL ?? null}
                          nome={u.apelido || u.nome}
                          uid={u.uid}
                          size="sm"
                          ring={false}
                        />
                        <span>{u.apelido || u.nome || 'Sem nome'}</span>
                        {ehEu && <span className="text-[10px] text-blue-400">(eu)</span>}
                      </div>
                    </td>
                    {jogosFiltrados.map(jogo => {
                      const p = palpiteMap.get(jogo.id)?.get(u.uid)

                      // Sem palpite
                      if (!p) {
                        return (
                          <td key={jogo.id} className="px-2 py-2 text-center text-gray-300">-</td>
                        )
                      }

                      // Palpite não visível
                      if (!palpiteVisivel(p, jogo)) {
                        return (
                          <td key={jogo.id} className="px-2 py-2 text-center text-gray-300">
                            <span title="Palpite oculto">***</span>
                          </td>
                        )
                      }

                      // Cor por acerto
                      let corClasse = 'text-gray-700'
                      if (jogo.encerrado && jogo.resultado) {
                        const r = jogo.resultado
                        if (p.golsCasa === r.golsCasa && p.golsVisitante === r.golsVisitante) {
                          corClasse = 'text-green-700 bg-green-50 font-bold'
                        } else if (p.golsCasa === r.golsCasa || p.golsVisitante === r.golsVisitante) {
                          corClasse = 'text-blue-700 bg-blue-50'
                        } else {
                          const vP = Math.sign(p.golsCasa - p.golsVisitante)
                          const vR = Math.sign(r.golsCasa - r.golsVisitante)
                          if (vP === vR) {
                            corClasse = 'text-yellow-700 bg-yellow-50'
                          } else {
                            corClasse = 'text-red-400'
                          }
                        }
                      }

                      return (
                        <td key={jogo.id} className={`px-2 py-2 text-center text-xs font-mono rounded ${corClasse}`}>
                          {p.golsCasa}x{p.golsVisitante}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {usuariosFiltrados.length === 0 && (
            <p className="text-center text-gray-400 py-8">Nenhum participante encontrado.</p>
          )}
        </div>

        {/* Legenda */}
        {jogosFiltrados.some(j => j.encerrado) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> Placar exato</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> Placar de 1 time</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" /> Acertou vencedor</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-200" /> Errou</span>
            <span className="flex items-center gap-1"><span className="text-gray-400">***</span> Palpite oculto</span>
          </div>
        )}
      </div>
    </div>
  )
}
