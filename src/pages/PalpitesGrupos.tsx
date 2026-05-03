import { useEffect, useState } from 'react'
import { collection, getDoc, getDocs, doc, setDoc, Timestamp, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { PalpiteInput } from '../components/PalpiteInput'
import { calcularClassificacaoGrupo } from '../lib/classificacao'
import { normalizarPontosDisciplinares, compararTerceirosFifa, selecionarMelhoresTerceiros } from '../lib/melhoresTerceiros'
import type { Jogo, Time, Palpite, Config, ClassificacaoTime } from '../types'

type JogoPorGrupo = Record<string, Jogo[]>

function TimeResumo({ timeId, times }: { timeId: string; times: Map<string, Time> }) {
  const time = times.get(timeId)
  return (
    <span className="inline-flex items-center gap-1.5">
      {time?.bandeira && <img src={time.bandeira} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
      <span>{time?.nome ?? timeId}</span>
    </span>
  )
}

function StatClassificacao({ item }: { item: ClassificacaoTime }) {
  return (
    <span className="text-[11px] text-gray-500">
      {item.pontos} pts · SG {item.saldoGols} · GM {item.golsMarcados}
    </span>
  )
}

export function PalpitesGrupos() {
  const { firebaseUser } = useAuth()
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Map<string, Palpite>>(new Map())
  const [pontosDisciplinares, setPontosDisciplinares] = useState<Record<string, number>>({})
  const [mostrarAjudaDisciplina, setMostrarAjudaDisciplina] = useState(false)
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, configSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDoc(doc(db, 'config', 'geral')),
      ])

      const jogosGrupo: Jogo[] = []
      jogosSnap.forEach((d) => {
        const j = { id: d.id, ...d.data() } as Jogo
        if (j.fase === 'grupos') jogosGrupo.push(j)
      })
      setJogos(jogosGrupo)

      const timesMap = new Map<string, Time>()
      timesSnap.forEach((d) => {
        timesMap.set(d.id, { id: d.id, ...d.data() } as Time)
      })
      setTimes(timesMap)

      if (configSnap.exists()) {
        setConfig(configSnap.data() as Config)
      }

      if (firebaseUser) {
        const palpitesSnap = await getDocs(query(
          collection(db, 'palpites'),
          where('uid', '==', firebaseUser.uid),
        ))
        const palpitesMap = new Map<string, Palpite>()
        palpitesSnap.forEach((d) => {
          const p = { id: d.id, ...d.data() } as Palpite
          if (p.uid === firebaseUser.uid) {
            palpitesMap.set(p.jogoId, p)
          }
        })
        setPalpites(palpitesMap)

        const fairPlaySnap = await getDoc(doc(db, 'desempates_terceiros', firebaseUser.uid))
        setPontosDisciplinares((fairPlaySnap.data()?.pontosDisciplinares ?? {}) as Record<string, number>)
      }

      setLoading(false)
    }

    load()
  }, [firebaseUser])

  async function handleChange(
    jogo: Jogo,
    golsCasa: number,
    golsVisitante: number,
    classificado: string | null,
  ) {
    if (!firebaseUser) return

    const id = `${firebaseUser.uid}_${jogo.id}`
    const palpite: Palpite = {
      id,
      uid: firebaseUser.uid,
      jogoId: jogo.id,
      timeCasa: jogo.timeCasa,
      timeVisitante: jogo.timeVisitante,
      golsCasa,
      golsVisitante,
      classificado,
      criadoEm: Timestamp.now(),
    }

    await setDoc(doc(db, 'palpites', id), palpite)

    setPalpites((prev) => {
      const next = new Map(prev)
      next.set(jogo.id, palpite)
      return next
    })
  }

  async function handlePontosDisciplinaresChange(timeId: string, novoValor: number) {
    if (!firebaseUser) return
    const numero = normalizarPontosDisciplinares(novoValor)
    const proximo = {
      ...pontosDisciplinares,
      [timeId]: numero,
    }
    setPontosDisciplinares(proximo)
    await setDoc(doc(db, 'desempates_terceiros', firebaseUser.uid), {
      uid: firebaseUser.uid,
      pontosDisciplinares: proximo,
      criadoEm: Timestamp.now(),
    })
  }

  const { usuario } = useAuth()
  const naoLiberado = usuario != null && usuario.liberado !== true
  const prazoExpirado = config ? config.prazoLimitePalpites.toDate() < new Date() : false

  if (loading) {
    return <p className="text-gray-500">Carregando...</p>
  }

  // Agrupa jogos por grupo, ordenados por data/hora
  const jogosOrdenados = [...jogos].sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
  const porGrupo: JogoPorGrupo = {}
  for (const jogo of jogosOrdenados) {
    const g = jogo.grupo ?? 'Sem Grupo'
    if (!porGrupo[g]) porGrupo[g] = []
    porGrupo[g].push(jogo)
  }

  const gruposOrdenados = Object.keys(porGrupo).sort()
  const todosJogosPreenchidos = jogosOrdenados.length > 0 && jogosOrdenados.every(j => palpites.has(j.id))

  const classificacoesPorGrupo: Record<string, ClassificacaoTime[]> = {}
  if (todosJogosPreenchidos) {
    for (const grupo of gruposOrdenados) {
      const palpitesGrupo = porGrupo[grupo]
        .map(j => palpites.get(j.id))
        .filter((p): p is Palpite => p !== undefined)
      classificacoesPorGrupo[grupo] = calcularClassificacaoGrupo(
        palpitesGrupo,
        Array.from(new Set(porGrupo[grupo].flatMap(j => [j.timeCasa, j.timeVisitante]))),
      )
    }
  }

  const terceirosTodos = Object.entries(classificacoesPorGrupo)
    .map(([grupo, cl]) => cl[2] ? { ...cl[2], grupo } : null)
    .filter((item): item is ClassificacaoTime & { grupo: string } => item !== null)
  const terceirosOrdenados = todosJogosPreenchidos
    ? [...terceirosTodos].sort((a, b) => {
      return compararTerceirosFifa(a, b, pontosDisciplinares)
    })
    : []
  const terceirosClassificados = new Set(selecionarMelhoresTerceiros(terceirosTodos, pontosDisciplinares).map(t => t.timeId))
  const terceirosComEmpateFifa = new Set<string>()
  terceirosTodos.forEach((a, index) => {
    terceirosTodos.forEach((b, otherIndex) => {
      if (index === otherIndex) return
      if (a.pontos === b.pontos && a.saldoGols === b.saldoGols && a.golsMarcados === b.golsMarcados) {
        terceirosComEmpateFifa.add(a.timeId)
      }
    })
  })

  return (
    <div className="space-y-8">
      {prazoExpirado && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800 text-sm font-medium">
          Prazo encerrado. Nao e mais possivel alterar seus palpites para a fase de grupos.
        </div>
      )}

      {gruposOrdenados.map((grupo) => (
        <div key={grupo}>
          <h2 className="text-lg font-bold text-gray-700 mb-3">Grupo {grupo}</h2>
          <div className="space-y-3">
            {porGrupo[grupo].map((jogo) => {
              const palpite = palpites.get(jogo.id)
              const timeCasa = times.get(jogo.timeCasa) ?? null
              const timeVisitante = times.get(jogo.timeVisitante) ?? null

              return (
                <PalpiteInput
                  key={jogo.id}
                  numero={jogo.numero}
                  timeCasa={timeCasa}
                  timeVisitante={timeVisitante}
                  golsCasa={palpite?.golsCasa ?? null}
                  golsVisitante={palpite?.golsVisitante ?? null}
                  classificado={palpite?.classificado ?? null}
                  dataHora={jogo.dataHora}
                  resultado={jogo.resultado}
                  encerrado={jogo.encerrado}
                  ehMataMata={false}
                  disabled={prazoExpirado || jogo.encerrado || naoLiberado}
                  onChange={(gc, gv, cl) => handleChange(jogo, gc, gv, cl)}
                />
              )
            })}
          </div>
        </div>
      ))}

      {gruposOrdenados.length === 0 && (
        <p className="text-gray-500">Nenhum jogo da fase de grupos encontrado.</p>
      )}

      {todosJogosPreenchidos && (
        <section className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
          <div className="bg-blue-900 text-white px-4 py-3">
            <h2 className="font-bold">Classificacao projetada da fase de grupos</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Calculada somente a partir dos seus palpites, usando criterios FIFA: pontos, saldo de gols, gols marcados e confronto direto quando aplicavel.
            </p>
          </div>

          <div className="p-4 space-y-5">
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-2">Classificados por grupo</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {gruposOrdenados.map(grupo => {
                  const classificacao = classificacoesPorGrupo[grupo] ?? []
                  return (
                    <div key={grupo} className="border border-gray-100 rounded-lg p-3">
                      <p className="text-xs font-bold text-blue-800 uppercase mb-2">Grupo {grupo}</p>
                      <ol className="space-y-1.5">
                        {classificacao.map((item, index) => (
                          <li key={item.timeId} className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className={`w-6 text-xs font-bold ${index < 2 ? 'text-green-700' : index === 2 && terceirosClassificados.has(item.timeId) ? 'text-amber-700' : 'text-gray-400'}`}>
                                {index + 1}o
                              </span>
                              <TimeResumo timeId={item.timeId} times={times} />
                            </span>
                            <StatClassificacao item={item} />
                          </li>
                        ))}
                      </ol>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <h3 className="text-sm font-bold text-gray-700">3os colocados em ordem FIFA</h3>
                  {terceirosComEmpateFifa.size > 0 && (
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Empate detectado: informe o total disciplinar negativo apenas para posicionar o 3o colocado no jogo correto da proxima fase. Isto nao pontua no bolao.
                    </p>
                  )}
                </div>
                {terceirosComEmpateFifa.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setMostrarAjudaDisciplina(prev => !prev)}
                    className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800"
                    aria-expanded={mostrarAjudaDisciplina}
                    aria-controls="ajuda-disciplina-terceiros"
                  >
                    Como funciona?
                  </button>
                )}
              </div>
              {terceirosComEmpateFifa.size > 0 && mostrarAjudaDisciplina && (
                <div id="ajuda-disciplina-terceiros" className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <p className="font-semibold">Critério disciplinar FIFA para desempatar 3os colocados.</p>
                  <p className="mt-1">Some as penalidades do time: amarelo = -1, segundo amarelo/vermelho indireto = -3, vermelho direto = -4, amarelo + vermelho direto = -5.</p>
                  <p className="mt-1">Use o total negativo no campo. Exemplo: dois amarelos e um vermelho direto = -6.</p>
                  <p className="mt-1 font-semibold">Esse valor só posiciona o 3o colocado no jogo correto da próxima fase. Não vale pontos no bolão.</p>
                </div>
              )}
              <ol className="grid sm:grid-cols-2 gap-2">
                {terceirosOrdenados.map((item, index) => (
                  <li
                    key={item.timeId}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      index < 8 ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <span className="w-6 text-xs font-bold text-gray-500">{index + 1}o</span>
                        <TimeResumo timeId={item.timeId} times={times} />
                      </span>
                      <span className="text-right">
                        <StatClassificacao item={item} />
                        {terceirosComEmpateFifa.has(item.timeId) && (
                          <span className="block text-[11px] text-amber-700">
                            Disciplina: {normalizarPontosDisciplinares(pontosDisciplinares[item.timeId])} pts
                          </span>
                        )}
                      </span>
                    </div>
                    {terceirosComEmpateFifa.has(item.timeId) && (
                      <div className="mt-2">
                        <span className="text-[10px] text-gray-500">Pontos disciplinares</span>
                        <div className="mt-1 flex items-center gap-2">
                          <button
                            type="button"
                            aria-label="Subtrair 1 ponto disciplinar"
                            disabled={prazoExpirado || naoLiberado}
                            onClick={() => handlePontosDisciplinaresChange(item.timeId, normalizarPontosDisciplinares(pontosDisciplinares[item.timeId]) - 1)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-base font-bold text-gray-700 active:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                          >
                            −
                          </button>
                          <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-gray-900">
                            {normalizarPontosDisciplinares(pontosDisciplinares[item.timeId])}
                          </span>
                          {normalizarPontosDisciplinares(pontosDisciplinares[item.timeId]) < 0 && (
                            <button
                              type="button"
                              aria-label="Somar 1 ponto disciplinar"
                              disabled={prazoExpirado || naoLiberado}
                              onClick={() => handlePontosDisciplinaresChange(item.timeId, normalizarPontosDisciplinares(pontosDisciplinares[item.timeId]) + 1)}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-base font-bold text-gray-700 active:bg-gray-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
