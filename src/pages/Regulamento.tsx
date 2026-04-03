import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { Navbar } from '../components/Navbar'
import type { Config } from '../types'

export function Regulamento() {
  const [config, setConfig] = useState<Config | null>(null)

  useEffect(() => {
    async function carregar() {
      const snap = await getDoc(doc(db, 'config', 'geral'))
      if (snap.exists()) setConfig(snap.data() as Config)
    }
    carregar()
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Regulamento</h1>
        <div className="bg-white p-6 rounded shadow space-y-4">
          <section>
            <h2 className="font-bold text-lg mb-2">Pontuação</h2>
            <ul className="list-disc ml-5 space-y-1">
              <li>Placar exato (coluna certa + resultado certo): <strong>{config?.pontos.placarExato ?? 5}</strong> pontos</li>
              <li>Coluna certa (acertou vencedor/empate, errou placar): <strong>{config?.pontos.colunaCerta ?? 3}</strong> pontos</li>
              <li>Total de gols certo (errou coluna, acertou nº de gols): <strong>{config?.pontos.totalGols ?? 1}</strong> ponto</li>
              <li>Errou tudo: <strong>0</strong> pontos</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">Pontuação não cumulativa — vale o maior acerto por jogo.</p>
          </section>
          <section>
            <h2 className="font-bold text-lg mb-2">Prazo</h2>
            <p>Todos os palpites devem ser registrados antes do início da Copa.</p>
            {config?.prazoLimitePalpites && (
              <p className="font-bold">Limite: {config.prazoLimitePalpites.toDate().toLocaleString('pt-BR')}</p>
            )}
          </section>
          <section>
            <h2 className="font-bold text-lg mb-2">Desempate</h2>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Maior número de placares exatos ({config?.pontos.placarExato ?? 5} pontos)</li>
              <li>Maior número de colunas certas ({config?.pontos.colunaCerta ?? 3} pontos)</li>
              <li>Maior número de totais de gols acertados ({config?.pontos.totalGols ?? 1} ponto)</li>
            </ol>
          </section>
          <section>
            <h2 className="font-bold text-lg mb-2">Mata-mata</h2>
            <p>Os times do mata-mata são definidos pelos seus próprios palpites da fase de grupos. Cada participante tem um chaveamento personalizado.</p>
            <p className="text-sm text-gray-600 mt-1">Em caso de empate no mata-mata, indique quem avança (pênaltis).</p>
          </section>
          {config?.regrasPremiacao && (
            <section>
              <h2 className="font-bold text-lg mb-2">Premiação</h2>
              <p className="whitespace-pre-wrap">{config.regrasPremiacao}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
