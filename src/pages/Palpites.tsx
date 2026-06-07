import { useState, useEffect } from 'react'
import { collection, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { PalpitesGrupos } from './PalpitesGrupos'
import { PalpitesMataMata } from './PalpitesMataMata'
import { PalpitesEspeciais } from './PalpitesEspeciais'
import type { Fase, Jogo } from '../types'

type Tab = Fase | 'especiais'

const TABS: { label: string; value: Tab }[] = [
  { label: 'Grupos', value: 'grupos' },
  { label: 'Segunda Fase', value: 'fase32' },
  { label: 'Oitavas', value: 'oitavas' },
  { label: 'Quartas', value: 'quartas' },
  { label: 'Semis', value: 'semi' },
  { label: '3o Lugar', value: 'terceiro' },
  { label: 'Final', value: 'final' },
  { label: 'Especiais', value: 'especiais' },
]

export function Palpites() {
  const { firebaseUser } = useAuth()
  const [tabAtiva, setTabAtiva] = useState<Tab>('grupos')
  const [totalJogos, setTotalJogos] = useState(0)
  const [totalPalpites, setTotalPalpites] = useState(0)
  const [totalEspeciais, setTotalEspeciais] = useState(0)
  const [jogosPorFase, setJogosPorFase] = useState<Map<string, number>>(new Map())
  const [palpitesPorFase, setPalpitesPorFase] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!firebaseUser) return

    let unsubPalpites: (() => void) | undefined

    getDocs(collection(db, 'jogos')).then(snap => {
      const porFase = new Map<string, number>()
      const faseMap = new Map<string, string>()
      snap.docs.forEach(d => {
        const j = d.data() as Jogo
        porFase.set(j.fase, (porFase.get(j.fase) ?? 0) + 1)
        faseMap.set(d.id, j.fase)
      })
      setJogosPorFase(porFase)
      setTotalJogos(snap.size)

      const q = query(collection(db, 'palpites'), where('uid', '==', firebaseUser.uid))
      unsubPalpites = onSnapshot(q, (pSnap) => {
        setTotalPalpites(pSnap.size)
        const pFase = new Map<string, number>()
        pSnap.docs.forEach(d => {
          const fase = faseMap.get(d.data().jogoId as string)
          if (fase) pFase.set(fase, (pFase.get(fase) ?? 0) + 1)
        })
        setPalpitesPorFase(pFase)
      })
    })

    const unsubEspeciais = onSnapshot(doc(db, 'palpites_especiais', firebaseUser.uid), (snap) => {
      if (!snap.exists()) { setTotalEspeciais(0); return }
      const d = snap.data()
      const count = ['campeao', 'vice', 'terceiro', 'quarto', 'paisArtilheiro'].filter(k => d[k]).length
      setTotalEspeciais(count)
    })

    return () => { unsubPalpites?.(); unsubEspeciais() }
  }, [firebaseUser])

  const pct = totalJogos > 0 ? Math.round((totalPalpites / totalJogos) * 100) : 0
  const pctEspeciais = Math.round((totalEspeciais / 5) * 100)

  function statusFase(fase: string): 'vazio' | 'parcial' | 'completo' {
    if (fase === 'especiais') {
      if (totalEspeciais === 0) return 'vazio'
      if (totalEspeciais === 5) return 'completo'
      return 'parcial'
    }
    const total = jogosPorFase.get(fase) ?? 0
    const feitos = palpitesPorFase.get(fase) ?? 0
    if (total === 0 || feitos === 0) return 'vazio'
    if (feitos >= total) return 'completo'
    return 'parcial'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Palpites</h1>
          <button
            onClick={() => window.open('/imprimir-meus-palpites', '_blank')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
          >
            🖨️ Imprimir
          </button>
        </div>

        {/* Barras de progresso (sticky) */}
        {totalJogos > 0 && (
          <div className="sticky top-0 z-30 -mx-6 px-6 py-2 mb-4 bg-gray-50/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/80 border-b border-gray-200 space-y-2">
            {/* Jogos */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-gray-500 font-medium">Jogos</span>
                <span className="text-[11px] text-gray-500">
                  <span className={`font-bold ${pct === 100 ? 'text-green-600' : 'text-blue-600'}`}>{totalPalpites}</span>/{totalJogos}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${pct === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            {/* Especiais */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-gray-500 font-medium">Especiais</span>
                <span className="text-[11px] text-gray-500">
                  <span className={`font-bold ${pctEspeciais === 100 ? 'text-green-600' : 'text-amber-600'}`}>{totalEspeciais}</span>/5
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${pctEspeciais === 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${pctEspeciais}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => {
            const status = statusFase(tab.value)
            return (
              <button
                key={tab.value}
                onClick={() => setTabAtiva(tab.value)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  tabAtiva === tab.value
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    status === 'completo' ? 'bg-green-500' :
                    status === 'parcial'  ? 'bg-amber-400' :
                                           'bg-red-400'
                  }`}
                />
                {tab.label}
              </button>
            )
          })}
        </div>

        {tabAtiva === 'grupos' ? (
          <PalpitesGrupos />
        ) : tabAtiva === 'especiais' ? (
          <PalpitesEspeciais />
        ) : (
          <PalpitesMataMata fase={tabAtiva} />
        )}
      </main>
    </div>
  )
}
