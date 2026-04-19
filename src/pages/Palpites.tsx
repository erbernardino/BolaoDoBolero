import { useState, useEffect } from 'react'
import { collection, getDocs, onSnapshot } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { PalpitesGrupos } from './PalpitesGrupos'
import { PalpitesMataMata } from './PalpitesMataMata'
import { PalpitesEspeciais } from './PalpitesEspeciais'
import type { Fase, Palpite } from '../types'

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

  useEffect(() => {
    if (!firebaseUser) return
    getDocs(collection(db, 'jogos')).then(snap => setTotalJogos(snap.size))
    const unsubscribe = onSnapshot(collection(db, 'palpites'), (snap) => {
      setTotalPalpites(snap.docs.filter(d => (d.data() as Palpite).uid === firebaseUser.uid).length)
    })
    return () => unsubscribe()
  }, [firebaseUser])

  const pct = totalJogos > 0 ? Math.round((totalPalpites / totalJogos) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Palpites</h1>
          {totalJogos > 0 && (
            <span className="text-sm text-gray-500">
              <span className="font-bold text-blue-700">{totalPalpites}</span>/{totalJogos} palpites
            </span>
          )}
        </div>

        {/* Barra de progresso */}
        {totalJogos > 0 && (
          <div className="mb-6">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  pct === 100 ? 'bg-green-500' : 'bg-blue-600'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {pct === 100 ? 'Todos os palpites preenchidos!' : `${pct}% preenchido`}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTabAtiva(tab.value)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                tabAtiva === tab.value
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
