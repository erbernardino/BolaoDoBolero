import { useState } from 'react'
import { Navbar } from '../components/Navbar'
import { PalpitesGrupos } from './PalpitesGrupos'
import { PalpitesMataMata } from './PalpitesMataMata'
import type { Fase } from '../types'

type Tab = Fase

const TABS: { label: string; value: Tab }[] = [
  { label: 'Grupos', value: 'grupos' },
  { label: 'Oitavas', value: 'oitavas' },
  { label: 'Quartas', value: 'quartas' },
  { label: 'Semis', value: 'semi' },
  { label: '3o Lugar', value: 'terceiro' },
  { label: 'Final', value: 'final' },
]

export function Palpites() {
  const [tabAtiva, setTabAtiva] = useState<Tab>('grupos')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Palpites</h1>

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
        ) : (
          <PalpitesMataMata fase={tabAtiva} />
        )}
      </main>
    </div>
  )
}
