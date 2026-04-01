import { useEffect, useState } from 'react'
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { PalpiteInput } from '../components/PalpiteInput'
import { calcularClassificacaoGrupo } from '../lib/classificacao'
import { selecionarMelhoresTerceiros } from '../lib/melhoresTerceiros'
import { resolverTimeMataMataPorPalpites } from '../lib/chaveamento'
import type { Jogo, Time, Palpite, Config, ClassificacaoTime, Grupo, Fase } from '../types'

interface Props {
  fase: Fase
}

export function PalpitesMataMata({ fase }: Props) {
  const { firebaseUser } = useAuth()
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Map<string, Palpite>>(new Map())
  const [config, setConfig] = useState<Config | null>(null)
  const [classificacoes, setClassificacoes] = useState<Record<string, ClassificacaoTime[]>>({})
  const [melhoresTerceiros, setMelhoresTerceiros] = useState<ClassificacaoTime[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, gruposSnap, configSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'grupos')),
        getDocs(collection(db, 'config')),
      ])

      const todosJogos: Jogo[] = []
      jogosSnap.forEach((d) => {
        todosJogos.push({ id: d.id, ...d.data() } as Jogo)
      })
      setJogos(todosJogos.filter((j) => j.fase === fase))

      const timesMap = new Map<string, Time>()
      timesSnap.forEach((d) => {
        timesMap.set(d.id, { id: d.id, ...d.data() } as Time)
      })
      setTimes(timesMap)

      if (!configSnap.empty) {
        setConfig(configSnap.docs[0].data() as Config)
      }

      const grupos: Grupo[] = []
      gruposSnap.forEach((d) => {
        grupos.push({ id: d.id, ...d.data() } as Grupo)
      })

      // Load user palpites
      let palpitesMap = new Map<string, Palpite>()
      if (firebaseUser) {
        const palpitesSnap = await getDocs(collection(db, 'palpites'))
        palpitesSnap.forEach((d) => {
          const p = { id: d.id, ...d.data() } as Palpite
          if (p.uid === firebaseUser.uid) {
            palpitesMap.set(p.jogoId, p)
          }
        })
        setPalpites(palpitesMap)
      }

      // Compute group standings from user palpites
      const jogosGrupos = todosJogos.filter((j) => j.fase === 'grupos')
      const classPorGrupo: Record<string, ClassificacaoTime[]> = {}

      for (const grupo of grupos) {
        const jogosDoGrupo = jogosGrupos.filter((j) => j.grupo === grupo.id)
        const palpitesGrupo = jogosDoGrupo
          .map((j) => palpitesMap.get(j.id))
          .filter((p): p is Palpite => p !== undefined)
        classPorGrupo[grupo.id] = calcularClassificacaoGrupo(palpitesGrupo, grupo.times)
      }
      setClassificacoes(classPorGrupo)

      // Select best 3rds
      const terceiros: ClassificacaoTime[] = Object.values(classPorGrupo).map((cl) => cl[2]).filter(Boolean)
      setMelhoresTerceiros(selecionarMelhoresTerceiros(terceiros))

      setLoading(false)
    }

    load()
  }, [firebaseUser, fase])

  async function handleChange(
    jogo: Jogo,
    resolvedCasa: string | null,
    resolvedVisitante: string | null,
    golsCasa: number | null,
    golsVisitante: number | null,
    classificado: string | null,
  ) {
    if (!firebaseUser) return
    if (golsCasa === null || golsVisitante === null) return
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

  const prazoExpirado = config ? config.prazoLimitePalpites.toDate() < new Date() : false

  if (loading) {
    return <p className="text-gray-500">Carregando...</p>
  }

  const palpitesPorJogoId: Record<string, Palpite> = {}
  palpites.forEach((p, jogoId) => {
    palpitesPorJogoId[jogoId] = p
  })

  return (
    <div className="space-y-4">
      {prazoExpirado && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800 text-sm font-medium">
          Prazo encerrado. Nao e mais possivel alterar seus palpites.
        </div>
      )}

      {jogos.length === 0 && (
        <p className="text-gray-500">Nenhum jogo encontrado para esta fase.</p>
      )}

      {jogos.map((jogo) => {
        const resolvedCasaId = jogo.origemCasa
          ? resolverTimeMataMataPorPalpites(jogo.origemCasa, classificacoes, palpitesPorJogoId, melhoresTerceiros)
          : jogo.timeCasa || null

        const resolvedVisitanteId = jogo.origemVisitante
          ? resolverTimeMataMataPorPalpites(jogo.origemVisitante, classificacoes, palpitesPorJogoId, melhoresTerceiros)
          : jogo.timeVisitante || null

        const timeCasa = resolvedCasaId ? (times.get(resolvedCasaId) ?? null) : null
        const timeVisitante = resolvedVisitanteId ? (times.get(resolvedVisitanteId) ?? null) : null

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
            timeCasa={timeCasa}
            timeVisitante={timeVisitante}
            golsCasa={palpite?.golsCasa ?? null}
            golsVisitante={palpite?.golsVisitante ?? null}
            classificado={palpite?.classificado ?? null}
            ehMataMata={true}
            disabled={prazoExpirado || jogo.encerrado}
            alerta={alerta}
            onChange={(gc, gv, cl) =>
              handleChange(jogo, resolvedCasaId, resolvedVisitanteId, gc, gv, cl)
            }
          />
        )
      })}
    </div>
  )
}
