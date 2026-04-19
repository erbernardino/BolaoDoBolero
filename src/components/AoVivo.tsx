import { useState, useEffect } from 'react'
import { collection, getDocs, onSnapshot, doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { calcularPontosPalpite } from '../lib/pontuacao'
import type { Jogo, Time, Palpite, Config } from '../types'

interface JogoAoVivo {
  jogo: Jogo
  timeCasa: Time | null
  timeVisitante: Time | null
  palpite: Palpite | null
  pontos: number
  tipoAcerto: string | null
}

const TIPO_LABEL: Record<string, string> = {
  placarExato: 'Placar exato',
  colunaCerta: 'Coluna certa',
  totalGols: 'Total de gols',
}

export function AoVivo({ uid }: { uid: string }) {
  const [jogosAoVivo, setJogosAoVivo] = useState<JogoAoVivo[]>([])

  useEffect(() => {
    if (!uid) return

    // Listener em tempo real nos jogos
    const unsubscribe = onSnapshot(collection(db, 'jogos'), async (jogosSnap) => {
      const jogosLive = jogosSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Jogo))
        .filter(j => j.aoVivo === true)

      if (jogosLive.length === 0) {
        setJogosAoVivo([])
        return
      }

      // Buscar times, palpites do usuário e config em paralelo
      const [timesSnap, palpitesSnap, configSnap] = await Promise.all([
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'palpites')),
        getDoc(doc(db, 'config', 'geral')),
      ])

      const timesMap = new Map<string, Time>()
      timesSnap.docs.forEach(d => timesMap.set(d.id, { id: d.id, ...d.data() } as Time))

      const meusPalpites = new Map<string, Palpite>()
      palpitesSnap.docs.forEach(d => {
        const p = { id: d.id, ...d.data() } as Palpite
        if (p.uid === uid) meusPalpites.set(p.jogoId, p)
      })

      const config = configSnap.exists() ? (configSnap.data() as Config) : null
      const pontosCfg = config?.pontos ?? { placarExato: 10, colunaCerta: 3, totalGols: 1 }

      const lista: JogoAoVivo[] = jogosLive.map(jogo => {
        const palpite = meusPalpites.get(jogo.id) ?? null
        let pontos = 0
        let tipoAcerto: string | null = null

        if (palpite && jogo.resultado) {
          const res = calcularPontosPalpite(
            { golsCasa: palpite.golsCasa, golsVisitante: palpite.golsVisitante },
            { golsCasa: jogo.resultado.golsCasa, golsVisitante: jogo.resultado.golsVisitante },
            pontosCfg,
          )
          pontos = res.pontos
          tipoAcerto = res.tipo
        }

        return {
          jogo,
          timeCasa: timesMap.get(jogo.timeCasa) ?? null,
          timeVisitante: timesMap.get(jogo.timeVisitante) ?? null,
          palpite,
          pontos,
          tipoAcerto,
        }
      })

      lista.sort((a, b) => a.jogo.dataHora.toMillis() - b.jogo.dataHora.toMillis())
      setJogosAoVivo(lista)
    })

    return () => unsubscribe()
  }, [uid])

  if (jogosAoVivo.length === 0) return null

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
        </span>
        <span className="text-sm font-bold text-red-600 uppercase tracking-wide">Ao Vivo</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {jogosAoVivo.map(({ jogo, timeCasa, timeVisitante, palpite, pontos, tipoAcerto }) => (
          <div
            key={jogo.id}
            className="flex-1 min-w-[260px] max-w-md bg-white border border-red-200 rounded-lg p-3 shadow-sm"
          >
            {/* Placar real */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1.5">
                {timeCasa?.bandeira && (
                  <img src={timeCasa.bandeira} alt={timeCasa.nome} className="w-6 h-4 object-cover rounded" />
                )}
                <span className="font-bold text-sm text-gray-800">{timeCasa?.nome ?? '?'}</span>
              </div>

              <div className="flex items-center gap-1.5 bg-gray-900 text-white rounded px-3 py-1">
                <span className="text-lg font-black">{jogo.resultado?.golsCasa ?? '-'}</span>
                <span className="text-xs text-gray-400">x</span>
                <span className="text-lg font-black">{jogo.resultado?.golsVisitante ?? '-'}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-gray-800">{timeVisitante?.nome ?? '?'}</span>
                {timeVisitante?.bandeira && (
                  <img src={timeVisitante.bandeira} alt={timeVisitante.nome} className="w-6 h-4 object-cover rounded" />
                )}
              </div>
            </div>

            {/* Palpite + pontos */}
            <div className="mt-2 flex items-center justify-between text-xs">
              {palpite ? (
                <>
                  <span className="text-gray-500">
                    Seu palpite: <span className="font-semibold text-gray-700">{palpite.golsCasa} x {palpite.golsVisitante}</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded-full ${
                    pontos > 0
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {pontos > 0 ? `+${pontos} pts` : '0 pts'}
                    {tipoAcerto && ` (${TIPO_LABEL[tipoAcerto]})`}
                  </span>
                </>
              ) : (
                <span className="text-gray-400 italic">Sem palpite</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
