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
        <div className="bg-white p-6 rounded shadow space-y-6">
          {/* Considerações Gerais */}
          <section>
            <h2 className="font-bold text-lg mb-2">Considerações Gerais</h2>
            <p className="text-sm text-gray-600 italic mb-3">
              Este bolão foi idealizado por nosso amigo Duda (Bolero), que desde 1994 manteve a tradição e nos proporcionou muita diversão acompanhando todos os jogos das copas. Em sua homenagem, manteremos a tradição do "Bolão do Bolero".
            </p>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>Este bolão envolve todos os jogos da Copa do Mundo de 2026 mais os palpites sobre os 4 primeiros colocados e a seleção defendida pelo artilheiro.</li>
              <li>Os concorrentes somarão pontos ao longo da competição e os 3 primeiros colocados, mais o antepenúltimo, dividirão o prêmio de acordo com o item "Premiação".</li>
              <li>Todos os participantes poderão acompanhar os palpites, pontuação e classificação pelo sistema, sendo aceitas reclamações quanto à pontuação recebida em até 24h após o término de cada rodada.</li>
            </ul>
          </section>

          {/* Inscrição */}
          <section>
            <h2 className="font-bold text-lg mb-2">Inscrição</h2>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>A inscrição será feita mediante preenchimento dos palpites no sistema e pagamento da taxa de inscrição de <strong>R$ {config?.premiacao?.taxaInscricao ?? 250},00</strong>.</li>
              <li>Todos os palpites devem ser registrados antes do início da Copa.</li>
              {config?.prazoLimitePalpites && (
                <li><strong>Prazo limite: {config.prazoLimitePalpites.toDate().toLocaleString('pt-BR')}</strong></li>
              )}
            </ul>
          </section>

          {/* Pontuação */}
          <section>
            <h2 className="font-bold text-lg mb-2">Pontuação</h2>
            <p className="text-sm mb-3">A cada partida o concorrente poderá fazer 0, {config?.pontos.totalGols ?? 1}, {config?.pontos.colunaCerta ?? 3} ou {config?.pontos.placarExato ?? 5} pontos, de acordo com o resultado real do jogo em comparação à sua aposta:</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center border-b">Pontos</th>
                    <th className="px-3 py-2 text-center border-b">Coluna Apostada</th>
                    <th className="px-3 py-2 text-center border-b">Nº de Gols no Jogo</th>
                    <th className="px-3 py-2 text-center border-b">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-1.5 text-center border-b font-bold">0</td>
                    <td className="px-3 py-1.5 text-center border-b text-red-600">Errada</td>
                    <td className="px-3 py-1.5 text-center border-b text-red-600">Errado</td>
                    <td className="px-3 py-1.5 text-center border-b text-red-600">Errado</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-1.5 text-center border-b font-bold">{config?.pontos.totalGols ?? 1}</td>
                    <td className="px-3 py-1.5 text-center border-b text-red-600">Errada</td>
                    <td className="px-3 py-1.5 text-center border-b text-green-600">Certo</td>
                    <td className="px-3 py-1.5 text-center border-b text-gray-400">Indiferente</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 text-center border-b font-bold">{config?.pontos.colunaCerta ?? 3}</td>
                    <td className="px-3 py-1.5 text-center border-b text-green-600">Certa</td>
                    <td className="px-3 py-1.5 text-center border-b text-gray-400">Indiferente</td>
                    <td className="px-3 py-1.5 text-center border-b text-red-600">Errado</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-1.5 text-center font-bold">{config?.pontos.placarExato ?? 5}</td>
                    <td className="px-3 py-1.5 text-center text-green-600">Certa</td>
                    <td className="px-3 py-1.5 text-center text-green-600">Certo</td>
                    <td className="px-3 py-1.5 text-center text-green-600">Certo</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              <strong>Exemplo:</strong> supondo que o jogo Brasil x Suíça termine 2x2:
            </p>
            <div className="overflow-x-auto mt-2">
              <table className="w-full text-sm border border-gray-200 rounded">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-center border-b">Aposta</th>
                    <th className="px-3 py-2 text-center border-b">Pontos</th>
                    <th className="px-3 py-2 text-center border-b">Veredicto</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-3 py-1.5 text-center border-b">BRA 2 x 0 SUI</td>
                    <td className="px-3 py-1.5 text-center border-b font-bold">0</td>
                    <td className="px-3 py-1.5 text-center border-b text-sm">Erro na coluna e no nº de gols</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-1.5 text-center border-b">BRA 3 x 1 SUI</td>
                    <td className="px-3 py-1.5 text-center border-b font-bold">{config?.pontos.totalGols ?? 1}</td>
                    <td className="px-3 py-1.5 text-center border-b text-sm">Erro na coluna, acerto no nº de gols</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 text-center border-b">BRA 1 x 1 SUI</td>
                    <td className="px-3 py-1.5 text-center border-b font-bold">{config?.pontos.colunaCerta ?? 3}</td>
                    <td className="px-3 py-1.5 text-center border-b text-sm">Acerto na coluna, erro no resultado</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-3 py-1.5 text-center">BRA 2 x 2 SUI</td>
                    <td className="px-3 py-1.5 text-center font-bold">{config?.pontos.placarExato ?? 5}</td>
                    <td className="px-3 py-1.5 text-center text-sm">Acerto na coluna e no resultado</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-gray-600 mt-3">Os resultados apostados valem para os 90 minutos regulamentares. Gols marcados na prorrogação e/ou pênaltis não são computados.</p>
          </section>

          {/* Palpites Especiais */}
          <section>
            <h2 className="font-bold text-lg mb-2">Palpites Especiais</h2>
            <p className="text-sm mb-2">Cada acerto vale <strong>{config?.pontos.palpiteEspecial ?? 10} pontos</strong>:</p>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li>Campeão</li>
              <li>Vice-campeão</li>
              <li>3º colocado</li>
              <li>4º colocado</li>
              <li>País defendido pelo artilheiro da competição</li>
            </ul>
            <div className="mt-3 text-sm text-gray-600 space-y-1">
              <p><strong>Obs 1:</strong> Não pode haver repetição de países nas colocações. Havendo repetição, os palpites repetidos serão invalidados.</p>
              <p><strong>Obs 2:</strong> Se houver 2 ou mais artilheiros, seus respectivos países serão considerados certos no espaço "país do artilheiro".</p>
            </div>
          </section>

          {/* Mata-mata */}
          <section>
            <h2 className="font-bold text-lg mb-2">Mata-mata</h2>
            <p className="text-sm">Os times do mata-mata são definidos pelos seus próprios palpites da fase de grupos. Cada participante tem um chaveamento personalizado.</p>
            <p className="text-sm text-gray-600 mt-1">Em caso de empate no mata-mata, indique quem avança (pênaltis). Esta escolha serve apenas para definir os times das próximas fases e não vale pontuação.</p>
          </section>

          {/* Premiação */}
          <section>
            <h2 className="font-bold text-lg mb-2">Premiação</h2>
            <p className="text-sm mb-2">O total arrecadado será dividido com a seguinte proporção:</p>
            <ul className="list-disc ml-5 space-y-1 text-sm">
              <li><strong>{config?.premiacao?.primeiro ?? 50}%</strong> — 1º colocado</li>
              <li><strong>{config?.premiacao?.segundo ?? 25}%</strong> — 2º colocado</li>
              <li><strong>{config?.premiacao?.terceiro ?? 10}%</strong> — 3º colocado</li>
              <li><strong>{config?.premiacao?.antepenultimo ?? 5}%</strong> — Antepenúltimo colocado</li>
              <li><strong>{config?.premiacao?.doacao ?? 10}%</strong> — Doação à Campanha End Polio Now, do Rotary International (comprovante será disponibilizado aos participantes)</li>
            </ul>
            <p className="text-sm text-gray-600 mt-2">A premiação estará disponível em até 24h a partir do término da partida final (tempo para que qualquer questionamento seja feito e analisado).</p>
          </section>

          {/* Desempate */}
          <section>
            <h2 className="font-bold text-lg mb-2">Desempate</h2>
            <p className="text-sm mb-2">Em caso de empate entre 2 ou mais participantes, os critérios de desempate serão:</p>
            <ol className="list-decimal ml-5 space-y-1 text-sm">
              <li>Maior número de acertos secos nos jogos (placares exatos de {config?.pontos.placarExato ?? 5} pontos)</li>
              <li>Maior número de pontos obtidos em jogos (sem contar palpites especiais)</li>
              <li>Maior número de pontos na primeira fase</li>
              <li>Maior número de pontos nos jogos do Brasil</li>
              <li>Divisão do prêmio</li>
            </ol>
          </section>

          <p className="text-xs text-gray-400 text-center pt-2 border-t">Os casos omissos neste regulamento serão decididos pela comissão organizadora.</p>
        </div>
      </div>
    </div>
  )
}
