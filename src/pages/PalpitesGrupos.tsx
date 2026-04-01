import { useEffect, useState } from 'react'
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { PalpiteInput } from '../components/PalpiteInput'
import type { Jogo, Time, Palpite, Config } from '../types'

type JogoPorGrupo = Record<string, Jogo[]>

export function PalpitesGrupos() {
  const { firebaseUser } = useAuth()
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Map<string, Palpite>>(new Map())
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, configSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'config')),
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

      if (!configSnap.empty) {
        const first = configSnap.docs[0]
        setConfig(first.data() as Config)
      }

      if (firebaseUser) {
        const palpitesSnap = await getDocs(collection(db, 'palpites'))
        const palpitesMap = new Map<string, Palpite>()
        palpitesSnap.forEach((d) => {
          const p = { id: d.id, ...d.data() } as Palpite
          if (p.uid === firebaseUser.uid) {
            palpitesMap.set(p.jogoId, p)
          }
        })
        setPalpites(palpitesMap)
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

  const prazoExpirado = config ? config.prazoLimitePalpites.toDate() < new Date() : false

  if (loading) {
    return <p className="text-gray-500">Carregando...</p>
  }

  // Agrupa jogos por grupo
  const porGrupo: JogoPorGrupo = {}
  for (const jogo of jogos) {
    const g = jogo.grupo ?? 'Sem Grupo'
    if (!porGrupo[g]) porGrupo[g] = []
    porGrupo[g].push(jogo)
  }

  const gruposOrdenados = Object.keys(porGrupo).sort()

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
                  timeCasa={timeCasa}
                  timeVisitante={timeVisitante}
                  golsCasa={palpite?.golsCasa ?? null}
                  golsVisitante={palpite?.golsVisitante ?? null}
                  classificado={palpite?.classificado ?? null}
                  dataHora={jogo.dataHora}
                  resultado={jogo.resultado}
                  encerrado={jogo.encerrado}
                  ehMataMata={false}
                  disabled={prazoExpirado || jogo.encerrado}
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
    </div>
  )
}
