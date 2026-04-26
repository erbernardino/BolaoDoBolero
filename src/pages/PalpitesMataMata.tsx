import { useEffect, useState } from 'react'
import { collection, getDoc, getDocs, doc, setDoc, Timestamp, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { PalpiteInput } from '../components/PalpiteInput'
import { calcularClassificacaoGrupo } from '../lib/classificacao'
import { selecionarMelhoresTerceiros } from '../lib/melhoresTerceiros'
import {
  montarTerceirosPorSlot,
  resolverTimeMataMataPersonalizado,
  resolverTimePorLabelFifa,
} from '../lib/chaveamento'
import type { Jogo, Time, Palpite, Config, ClassificacaoTime, Grupo, Fase, Origem } from '../types'

interface Props {
  fase: Fase
}

function TimeResumo({ timeId, times }: { timeId: string; times: Map<string, Time> }) {
  const time = times.get(timeId)
  return (
    <span className="inline-flex items-center gap-1.5">
      {time?.bandeira && <img src={time.bandeira} alt="" className="w-5 h-3.5 object-cover rounded-sm" />}
      <span>{time?.nome ?? timeId}</span>
    </span>
  )
}

/**
 * Resolve um time do mata-mata usando resultados REAIS (jogo.resultado).
 * Cria "palpites virtuais" a partir dos resultados reais para reutilizar a lógica de chaveamento.
 */
function resolverTimeReal(
  origem: Origem | null,
  classReaisPorGrupo: Record<string, ClassificacaoTime[]>,
  todosJogos: Jogo[],
  _melhoresTerceirosReais: ClassificacaoTime[],
): string | null {
  if (!origem) return null

  if (origem.tipo === 'grupo') {
    const classificacao = classReaisPorGrupo[origem.grupo]
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

export function PalpitesMataMata({ fase }: Props) {
  const { firebaseUser } = useAuth()
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [todosJogos, setTodosJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Map<string, Palpite>>(new Map())
  const [config, setConfig] = useState<Config | null>(null)
  const [classificacoes, setClassificacoes] = useState<Record<string, ClassificacaoTime[]>>({})
  const [melhoresTerceiros, setMelhoresTerceiros] = useState<ClassificacaoTime[]>([])
  const [classReais, setClassReais] = useState<Record<string, ClassificacaoTime[]>>({})
  const [melhoresTerceirosReais, setMelhoresTerceirosReais] = useState<ClassificacaoTime[]>([])
  const [totalGrupos, setTotalGrupos] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, gruposSnap, configSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'grupos')),
        getDoc(doc(db, 'config', 'geral')),
      ])

      const todos: Jogo[] = []
      jogosSnap.forEach((d) => {
        todos.push({ id: d.id, ...d.data() } as Jogo)
      })
      setTodosJogos(todos)
      setJogos(
        todos
          .filter((j) => j.fase === fase)
          .sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
      )

      const timesMap = new Map<string, Time>()
      timesSnap.forEach((d) => {
        timesMap.set(d.id, { id: d.id, ...d.data() } as Time)
      })
      setTimes(timesMap)

      if (configSnap.exists()) {
        setConfig(configSnap.data() as Config)
      }

      const grupos: Grupo[] = []
      gruposSnap.forEach((d) => {
        grupos.push({ id: d.id, ...d.data() } as Grupo)
      })
      setTotalGrupos(grupos.length)

      // Load user palpites
      const palpitesMap = new Map<string, Palpite>()
      let pontosDisciplinaresCarregados: Record<string, number> = {}
      if (firebaseUser) {
        const palpitesSnap = await getDocs(query(
          collection(db, 'palpites'),
          where('uid', '==', firebaseUser.uid),
        ))
        palpitesSnap.forEach((d) => {
          const p = { id: d.id, ...d.data() } as Palpite
          palpitesMap.set(p.jogoId, p)
        })
        setPalpites(palpitesMap)

        const fairPlaySnap = await getDoc(doc(db, 'desempates_terceiros', firebaseUser.uid))
        pontosDisciplinaresCarregados = (fairPlaySnap.data()?.pontosDisciplinares ?? {}) as Record<string, number>
      }

      const jogosGrupos = todos.filter((j) => j.fase === 'grupos')

      // Classificação baseada nos PALPITES do usuário
      // Só consideramos o grupo classificado quando TODOS os jogos do grupo
      // foram palpitados — caso contrário a ordem seria arbitrária e confundiria
      // com resultado previsto.
      const classPorGrupo: Record<string, ClassificacaoTime[]> = {}
      for (const grupo of grupos) {
        const letra = grupo.nome.replace('Grupo ', '')
        const jogosDoGrupo = jogosGrupos.filter((j) => j.grupo === letra)
        const palpitesGrupo = jogosDoGrupo
          .map((j) => palpitesMap.get(j.id))
          .filter((p): p is Palpite => p !== undefined)
        if (palpitesGrupo.length === jogosDoGrupo.length && jogosDoGrupo.length > 0) {
          classPorGrupo[letra] = calcularClassificacaoGrupo(palpitesGrupo, grupo.times)
        }
      }
      setClassificacoes(classPorGrupo)

      // Melhores terceiros só faz sentido quando TODOS os 12 grupos estao palpitados
      const todosGruposCompletos = grupos.every((g) => {
        const letra = g.nome.replace('Grupo ', '')
        return classPorGrupo[letra] !== undefined
      })
      const terceiros = todosGruposCompletos
        ? Object.entries(classPorGrupo)
          .map(([grupo, cl]) => cl[2] ? { ...cl[2], grupo } : null)
          .filter((item): item is ClassificacaoTime & { grupo: string } => item !== null)
        : []
      setMelhoresTerceiros(selecionarMelhoresTerceiros(terceiros, pontosDisciplinaresCarregados))

      // Classificação baseada nos RESULTADOS REAIS
      const classReaisPorGrupo: Record<string, ClassificacaoTime[]> = {}
      for (const grupo of grupos) {
        const letra = grupo.nome.replace('Grupo ', '')
        const jogosDoGrupo = jogosGrupos.filter((j) => j.grupo === letra)
        // Criar "palpites virtuais" a partir dos resultados reais
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
        // So classificamos com resultados reais quando o grupo inteiro foi encerrado
        if (palpitesReais.length === jogosDoGrupo.length && jogosDoGrupo.length > 0) {
          classReaisPorGrupo[letra] = calcularClassificacaoGrupo(palpitesReais, grupo.times)
        }
      }
      setClassReais(classReaisPorGrupo)

      const todosGruposReaisCompletos = grupos.every((g) => {
        const letra = g.nome.replace('Grupo ', '')
        return classReaisPorGrupo[letra] !== undefined
      })
      const terceirosReais = todosGruposReaisCompletos
        ? Object.entries(classReaisPorGrupo)
          .map(([grupo, cl]) => cl[2] ? { ...cl[2], grupo } : null)
          .filter((item): item is ClassificacaoTime & { grupo: string } => item !== null)
        : []
      setMelhoresTerceirosReais(selecionarMelhoresTerceiros(terceirosReais))

      setLoading(false)
    }

    load()
  }, [firebaseUser, fase])

  async function handleChange(
    jogo: Jogo,
    resolvedCasa: string | null,
    resolvedVisitante: string | null,
    golsCasa: number,
    golsVisitante: number,
    classificado: string | null,
  ) {
    if (!firebaseUser) return
    if (!resolvedCasa || !resolvedVisitante) return

    const id = `${firebaseUser.uid}_${jogo.id}`
    const palpite: Palpite = {
      id,
      uid: firebaseUser.uid,
      jogoId: jogo.id,
      timeCasa: resolvedCasa,
      timeVisitante: resolvedVisitante,
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

  const { usuario } = useAuth()
  const naoLiberado = usuario != null && usuario.liberado !== true
  const prazoExpirado = config ? config.prazoLimitePalpites.toDate() < new Date() : false

  if (loading) {
    return <p className="text-gray-500">Carregando...</p>
  }

  const palpitesPorJogoId: Record<string, Palpite> = {}
  palpites.forEach((p, jogoId) => {
    palpitesPorJogoId[jogoId] = p
  })

  const jogosFase32 = todosJogos.filter(j => j.fase === 'fase32')
  const terceirosPorSlot = montarTerceirosPorSlot(jogosFase32, classificacoes, melhoresTerceiros)

  function descreverOrigem(origem: Jogo['origemCasa']): string {
    if (!origem) return '?'
    if (origem.tipo === 'grupo') {
      const pos = origem.posicao === 1 ? '1o' : origem.posicao === 2 ? '2o' : '3o'
      return `${pos} Grupo ${origem.grupo}`
    }
    return `Venc. ${origem.jogoId.replace('_', ' ')}`
  }

  function resolverTimesDoJogo(jogo: Jogo): { casaId: string | null; visitanteId: string | null } {
    return {
      casaId: resolverTimeMataMataPersonalizado({
        origem: jogo.origemCasa,
        label: jogo.labelCasa,
        slotKey: `${jogo.id}:casa`,
        classificacoesPorGrupo: classificacoes,
        palpitesPorJogoId,
        melhoresTerceiros,
        terceirosPorSlot,
        jogos: todosJogos,
        fallbackTimeId: jogo.timeCasa || undefined,
      }),
      visitanteId: resolverTimeMataMataPersonalizado({
        origem: jogo.origemVisitante,
        label: jogo.labelVisitante,
        slotKey: `${jogo.id}:visitante`,
        classificacoesPorGrupo: classificacoes,
        palpitesPorJogoId,
        melhoresTerceiros,
        terceirosPorSlot,
        jogos: todosJogos,
        fallbackTimeId: jogo.timeVisitante || undefined,
      }),
    }
  }

  function vencedorDoPalpite(palpite: Palpite): string | null {
    if (palpite.golsCasa > palpite.golsVisitante) return palpite.timeCasa
    if (palpite.golsVisitante > palpite.golsCasa) return palpite.timeVisitante
    return palpite.classificado
  }

  const todosJogosDaFasePreenchidos = jogos.length > 0 && jogos.every(j => palpites.has(j.id))
  const classificadosDaFase = todosJogosDaFasePreenchidos
    ? jogos.map(jogo => {
      const palpite = palpites.get(jogo.id)!
      return {
        jogo,
        vencedorId: vencedorDoPalpite(palpite),
        placar: `${palpite.golsCasa}x${palpite.golsVisitante}`,
      }
    })
    : []

  const tituloResumoFase: Record<Fase, string> = {
    grupos: 'Classificacao projetada',
    fase32: 'Classificados para as oitavas',
    oitavas: 'Classificados para as quartas',
    quartas: 'Classificados para as semifinais',
    semi: 'Finalistas projetados',
    terceiro: '3o lugar projetado',
    final: 'Campeao projetado',
  }

  return (
    <div className="space-y-4">
      {prazoExpirado && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800 text-sm font-medium">
          Prazo encerrado. Nao e mais possivel alterar seus palpites.
        </div>
      )}

      {fase !== 'grupos' && totalGrupos > 0 && Object.keys(classificacoes).length < totalGrupos && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
          Preencha os palpites da fase de grupos primeiro. Os times da fase eliminatória serão calculados automaticamente com base nos seus resultados.
        </div>
      )}

      {jogos.length === 0 && (
        <p className="text-gray-500">Nenhum jogo encontrado para esta fase.</p>
      )}

      {jogos.map((jogo) => {
        // Times baseados nos PALPITES do usuário
        const { casaId: resolvedCasaId, visitanteId: resolvedVisitanteId } = resolverTimesDoJogo(jogo)

        const timeCasa = resolvedCasaId ? (times.get(resolvedCasaId) ?? null) : null
        const timeVisitante = resolvedVisitanteId ? (times.get(resolvedVisitanteId) ?? null) : null

        // Times REAIS baseados nos resultados oficiais
        const realCasaId = jogo.origemCasa
          ? resolverTimeReal(jogo.origemCasa, classReais, todosJogos, melhoresTerceirosReais)
          : resolverTimePorLabelFifa(jogo.labelCasa, classReais, {}, todosJogos, {}, `${jogo.id}:casa`)
        const realVisitanteId = jogo.origemVisitante
          ? resolverTimeReal(jogo.origemVisitante, classReais, todosJogos, melhoresTerceirosReais)
          : resolverTimePorLabelFifa(jogo.labelVisitante, classReais, {}, todosJogos, {}, `${jogo.id}:visitante`)

        const realTimeCasa = realCasaId ? (times.get(realCasaId) ?? null) : null
        const realTimeVisitante = realVisitanteId ? (times.get(realVisitanteId) ?? null) : null

        const palpite = palpites.get(jogo.id)

        // Alert when teams changed since last save
        let alerta: string | undefined
        if (palpite) {
          const casaMudou = resolvedCasaId && palpite.timeCasa !== resolvedCasaId
          const visitanteMudou = resolvedVisitanteId && palpite.timeVisitante !== resolvedVisitanteId
          if (casaMudou || visitanteMudou) {
            alerta = 'Os times deste jogo mudaram com base nos seus palpites anteriores. Revise seu palpite.'
          }
        }

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
            realTimeCasa={realTimeCasa}
            realTimeVisitante={realTimeVisitante}
            labelCasa={jogo.labelCasa ?? (!timeCasa ? descreverOrigem(jogo.origemCasa) : undefined)}
            labelVisitante={jogo.labelVisitante ?? (!timeVisitante ? descreverOrigem(jogo.origemVisitante) : undefined)}
            ehMataMata={true}
            disabled={prazoExpirado || jogo.encerrado || !timeCasa || !timeVisitante || naoLiberado}
            alerta={alerta}
            onChange={(gc, gv, cl) =>
              handleChange(jogo, resolvedCasaId, resolvedVisitanteId, gc, gv, cl)
            }
          />
        )
      })}

      {todosJogosDaFasePreenchidos && (
        <section className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden mt-8">
          <div className="bg-blue-900 text-white px-4 py-3">
            <h2 className="font-bold">{tituloResumoFase[fase]}</h2>
            <p className="text-xs text-blue-100 mt-0.5">
              Calculado somente a partir dos seus palpites desta fase.
            </p>
          </div>

          <div className="p-4 grid sm:grid-cols-2 gap-3">
            {classificadosDaFase.map(({ jogo, vencedorId, placar }) => (
              <div key={jogo.id} className="border border-gray-100 rounded-lg p-3">
                <p className="text-xs font-bold text-gray-500 mb-1">
                  Jogo {jogo.numero} · {placar}
                </p>
                <p className="text-sm font-semibold text-gray-800">
                  {vencedorId ? <TimeResumo timeId={vencedorId} times={times} /> : 'Classificado indefinido'}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
