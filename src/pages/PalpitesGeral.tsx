import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, doc, getDoc, Timestamp, query, where } from 'firebase/firestore'
import type { QuerySnapshot, DocumentData } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { Avatar } from '../components/Avatar'
import { calcularPontosPalpite } from '../lib/pontuacao'
import { montarResolvedorProvisorio } from '../lib/resolverProvisorio'
import type { GrupoRef } from '../lib/bracketUsuario'
import type { Jogo, Time, Palpite, Usuario, Fase, Config, PalpiteEspecial, ResultadoEspecial } from '../types'

type AbaId = Fase | 'todos' | 'especiais'

const FASES: { id: AbaId; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'grupos', label: 'Grupos' },
  { id: 'fase32', label: 'Segunda Fase' },
  { id: 'oitavas', label: 'Oitavas' },
  { id: 'quartas', label: 'Quartas' },
  { id: 'semi', label: 'Semis' },
  { id: 'terceiro', label: '3o Lugar' },
  { id: 'final', label: 'Final' },
  { id: 'especiais', label: 'Especiais' },
]

export function PalpitesGeral() {
  const { firebaseUser, usuario } = useAuth()
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Palpite[]>([])
  const [palpitesEspeciais, setPalpitesEspeciais] = useState<PalpiteEspecial[]>([])
  const [resultadoEspecial, setResultadoEspecial] = useState<ResultadoEspecial | null>(null)
  const [usuarios, setUsuarios] = useState<Map<string, Usuario>>(new Map())
  const [config, setConfig] = useState<Config | null>(null)
  const [grupos, setGrupos] = useState<GrupoRef[]>([])
  const [loading, setLoading] = useState(true)
  const [faseAtiva, setFaseAtiva] = useState<AbaId>('grupos')
  const [usuarioFiltro, setUsuarioFiltro] = useState('')
  const [grupoFiltro, setGrupoFiltro] = useState('')

  const isAdmin = usuario?.role === 'admin'

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, usuariosSnap, configSnap, resultadoEspecialSnap, gruposSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'usuarios')),
        getDoc(doc(db, 'config', 'geral')),
        getDoc(doc(db, 'config', 'resultado_especial')),
        getDocs(collection(db, 'grupos')),
      ])

      setGrupos(gruposSnap.docs.map(d => {
        const data = d.data() as { nome?: string; times?: string[] }
        return { nome: data.nome ?? `Grupo ${d.id}`, times: data.times ?? [] }
      }))

      if (resultadoEspecialSnap.exists()) {
        setResultadoEspecial(resultadoEspecialSnap.data() as ResultadoEspecial)
      }

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

        // Palpites especiais: regras permitem ler todos quando 'sempre' ou
        // 'apos_prazo' (após prazo). Caso contrário, só o próprio.
        const podeLerTodosEspeciais =
          isAdmin ||
          visibilidadeAtual === 'sempre' ||
          (visibilidadeAtual === 'apos_prazo' && prazoJaExpirou)

        if (podeLerTodosEspeciais) {
          const especiaisSnap = await getDocs(collection(db, 'palpites_especiais'))
          setPalpitesEspeciais(especiaisSnap.docs.map(d => ({ uid: d.id, ...d.data() } as PalpiteEspecial)))
        } else {
          const proprioSnap = await getDoc(doc(db, 'palpites_especiais', firebaseUser.uid))
          if (proprioSnap.exists()) {
            setPalpitesEspeciais([{ uid: firebaseUser.uid, ...proprioSnap.data() } as PalpiteEspecial])
          }
        }
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

  const ptsCfg = useMemo(() => ({
    placarExato: (config as Record<string, number> | null)?.placarExato ?? 5,
    colunaCerta: (config as Record<string, number> | null)?.colunaCerta ?? 3,
    totalGols:   (config as Record<string, number> | null)?.totalGols   ?? 1,
  }), [config])

  function calcPontos(p: Palpite, jogo: Jogo): number | null {
    if (!jogo.encerrado || !jogo.resultado) return null
    return calcularPontosPalpite(p, jogo.resultado, ptsCfg).pontos
  }

  // total de pontos por uid nos jogos atualmente filtrados
  const totaisPorUsuario = useMemo(() => {
    const map = new Map<string, number>()
    for (const u of listaUsuarios) {
      let soma = 0
      for (const jogo of jogosFiltrados) {
        const p = palpiteMap.get(jogo.id)?.get(u.uid)
        if (p && palpiteVisivel(p, jogo)) {
          const pts = calcPontos(p, jogo)
          if (pts !== null) soma += pts
        }
      }
      map.set(u.uid, soma)
    }
    return map
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palpiteMap, jogosFiltrados, ptsCfg])

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

  // Resolve os times do mata-mata a partir dos resultados oficiais (igual à página
  // /resultados). Jogos de grupos usam os times diretos; mata-mata é resolvido.
  const resolverProvisorio = useMemo(
    () => montarResolvedorProvisorio(jogos, grupos),
    [jogos, grupos],
  )
  function ladosDoJogo(jogo: Jogo): { casaId: string | null; visitanteId: string | null } {
    if (jogo.fase === 'grupos') return { casaId: jogo.timeCasa, visitanteId: jogo.timeVisitante }
    const r = resolverProvisorio(jogo)
    return { casaId: r.casa.timeId, visitanteId: r.visitante.timeId }
  }

  const palpiteEspecialMap = useMemo(() => {
    const map = new Map<string, PalpiteEspecial>()
    for (const pe of palpitesEspeciais) map.set(pe.uid, pe)
    return map
  }, [palpitesEspeciais])

  function especialVisivel(uid: string): boolean {
    if (uid === firebaseUser?.uid) return true
    if (isAdmin) return true
    switch (visibilidade) {
      case 'sempre':
        return true
      case 'apos_prazo':
        return prazoExpirado
      case 'apos_jogo':
      case 'nunca':
      default:
        return false
    }
  }

  const COLUNAS_ESPECIAIS: { key: keyof Pick<PalpiteEspecial, 'campeao' | 'vice' | 'terceiro' | 'quarto' | 'paisArtilheiro'>; label: string; icone: string }[] = [
    { key: 'campeao', label: 'Campeão', icone: '🏆' },
    { key: 'vice', label: 'Vice', icone: '🥈' },
    { key: 'terceiro', label: '3º', icone: '🥉' },
    { key: 'quarto', label: '4º', icone: '4' },
    { key: 'paisArtilheiro', label: 'Artilheiro', icone: '⚽' },
  ]

  function timeAcerta(coluna: typeof COLUNAS_ESPECIAIS[number]['key'], timeId: string): boolean {
    if (!resultadoEspecial) return false
    if (coluna === 'paisArtilheiro') {
      return (resultadoEspecial.paisesArtilheiros ?? []).includes(timeId)
    }
    return resultadoEspecial[coluna] === timeId
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

  const tabelaEspeciais = (
    <div className="bg-white rounded-lg shadow overflow-auto max-h-[70vh]">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[140px]">
              Participante
            </th>
            {COLUNAS_ESPECIAIS.map(col => (
              <th key={col.key} className="px-3 py-2 text-center text-xs font-medium text-gray-600 min-w-[120px]">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-base">{col.icone}</span>
                  <span>{col.label}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {usuariosFiltrados.map(u => {
            const ehEu = u.uid === firebaseUser?.uid
            const pe = palpiteEspecialMap.get(u.uid)
            const visivel = especialVisivel(u.uid)
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
                {COLUNAS_ESPECIAIS.map(col => {
                  if (!pe) {
                    return <td key={col.key} className="px-3 py-2 text-center text-gray-300">-</td>
                  }
                  if (!visivel) {
                    return (
                      <td key={col.key} className="px-3 py-2 text-center text-gray-300">
                        <span title="Palpite oculto">***</span>
                      </td>
                    )
                  }
                  const timeId = pe[col.key]
                  if (!timeId) {
                    return <td key={col.key} className="px-3 py-2 text-center text-gray-300">-</td>
                  }
                  const acerto = resultadoEspecial ? timeAcerta(col.key, timeId) : false
                  const corClasse = acerto
                    ? 'text-green-700 bg-green-50 font-bold'
                    : (resultadoEspecial ? 'text-red-400' : 'text-gray-700')
                  return (
                    <td key={col.key} className={`px-3 py-2 text-center text-xs rounded ${corClasse}`}>
                      <div className="flex items-center justify-center gap-1.5">
                        {bandeiraUrl(timeId) && (
                          <img src={bandeiraUrl(timeId)!} alt="" className="w-4 h-3 object-cover rounded" />
                        )}
                        <span className="font-mono">{sigla(timeId)}</span>
                      </div>
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
  )

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

        {/* Tabela de Especiais (na aba Especiais) */}
        {faseAtiva === 'especiais' && tabelaEspeciais}

        {/* Tabela de jogos (todas as abas exceto Especiais) */}
        {faseAtiva !== 'especiais' && (
        <div className="bg-white rounded-lg shadow overflow-auto max-h-[70vh]">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 sticky left-0 bg-gray-50 min-w-[120px]">
                  Participante
                </th>
                <th className="px-2 py-2 text-center text-xs font-medium text-gray-700 bg-gray-100 min-w-[44px] sticky left-0">
                  Pts
                </th>
                {jogosFiltrados.map(jogo => {
                  const { casaId, visitanteId } = ladosDoJogo(jogo)
                  return (
                  <th key={jogo.id} className="px-2 py-2 text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-semibold text-gray-500">Jogo {jogo.numero}</span>
                      <div className="flex items-center gap-1">
                        {casaId && bandeiraUrl(casaId) && (
                          <img src={bandeiraUrl(casaId)!} alt="" className="w-4 h-3 object-cover rounded" />
                        )}
                        <span className="text-xs font-medium text-gray-600">
                          {casaId ? sigla(casaId) : (jogo.labelCasa ?? '?')}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400">vs</span>
                      <div className="flex items-center gap-1">
                        {visitanteId && bandeiraUrl(visitanteId) && (
                          <img src={bandeiraUrl(visitanteId)!} alt="" className="w-4 h-3 object-cover rounded" />
                        )}
                        <span className="text-xs font-medium text-gray-600">
                          {visitanteId ? sigla(visitanteId) : (jogo.labelVisitante ?? '?')}
                        </span>
                      </div>
                      {jogo.encerrado && jogo.resultado && (
                        <span className="text-[10px] font-bold text-green-600 mt-0.5">
                          {jogo.resultado.golsCasa}x{jogo.resultado.golsVisitante}
                        </span>
                      )}
                    </div>
                  </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuariosFiltrados.map(u => {
                const ehEu = u.uid === firebaseUser?.uid
                return (
                  <tr key={u.uid} className={`hover:bg-blue-50/50 ${ehEu ? 'bg-blue-50/30' : ''}`}>
                    <td className={`px-3 py-2 font-medium sticky left-0 z-10 whitespace-nowrap ${ehEu ? 'text-blue-700 bg-blue-50' : 'text-gray-800 bg-white'}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar
                          src={u.fotoURL ?? null}
                          nome={u.apelido || u.nome}
                          uid={u.uid}
                          size="sm"
                          ring={false}
                        />
                        <span className="truncate max-w-[15ch] sm:max-w-none">{u.apelido || u.nome || 'Sem nome'}</span>
                        {ehEu && <span className="text-[10px] text-blue-400">(eu)</span>}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-sm text-blue-700 bg-blue-50/40">
                      {totaisPorUsuario.get(u.uid) ?? 0}
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

                      const pts = calcPontos(p, jogo)

                      // Cor por pontos
                      let corClasse = 'text-gray-700'
                      if (pts === 5) corClasse = 'text-green-700 bg-green-50 font-bold'
                      else if (pts === 3) corClasse = 'text-yellow-700 bg-yellow-50'
                      else if (pts === 1) corClasse = 'text-blue-700 bg-blue-50'
                      else if (pts === 0) corClasse = 'text-red-400'

                      return (
                        <td key={jogo.id} className={`px-2 py-2 text-center text-xs font-mono rounded ${corClasse}`}>
                          <div>{p.golsCasa}x{p.golsVisitante}</div>
                          {pts !== null && (
                            <div className="text-[10px] font-semibold opacity-80">{pts}pt</div>
                          )}
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
        )}

        {/* Especiais ao final da aba Todos */}
        {faseAtiva === 'todos' && (
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Palpites Especiais</h2>
            {tabelaEspeciais}
          </div>
        )}

        {/* Legenda */}
        {faseAtiva !== 'especiais' && jogosFiltrados.some(j => j.encerrado) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-50 border border-green-200" /> 5pt — coluna + placar exato</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" /> 3pt — coluna certa</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> 1pt — total de gols certo</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-red-200" /> 0pt — errou</span>
            <span className="flex items-center gap-1"><span className="text-gray-400">***</span> Palpite oculto</span>
          </div>
        )}
      </div>
    </div>
  )
}
