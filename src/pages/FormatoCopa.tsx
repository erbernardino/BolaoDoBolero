import { Navbar } from '../components/Navbar'

const fase32Jogos = [
  { jogo: 73, casa: '2º Grupo A',  visitante: '2º Grupo B' },
  { jogo: 74, casa: '1º Grupo E',  visitante: '3º dos Grupos A, B, C, D ou F' },
  { jogo: 75, casa: '1º Grupo F',  visitante: '2º Grupo C' },
  { jogo: 76, casa: '1º Grupo C',  visitante: '2º Grupo F' },
  { jogo: 77, casa: '1º Grupo I',  visitante: '3º dos Grupos C, D, F, G ou H' },
  { jogo: 78, casa: '2º Grupo E',  visitante: '2º Grupo I' },
  { jogo: 79, casa: '1º Grupo A',  visitante: '3º dos Grupos C, E, F, H ou I' },
  { jogo: 80, casa: '1º Grupo L',  visitante: '3º dos Grupos E, H, I, J ou K' },
  { jogo: 81, casa: '1º Grupo D',  visitante: '3º dos Grupos B, E, F, I ou J' },
  { jogo: 82, casa: '1º Grupo G',  visitante: '3º dos Grupos A, E, H, I ou J' },
  { jogo: 83, casa: '2º Grupo K',  visitante: '2º Grupo L' },
  { jogo: 84, casa: '1º Grupo H',  visitante: '2º Grupo J' },
  { jogo: 85, casa: '1º Grupo B',  visitante: '3º dos Grupos E, F, G, I ou J' },
  { jogo: 86, casa: '1º Grupo J',  visitante: '2º Grupo H' },
  { jogo: 87, casa: '1º Grupo K',  visitante: '3º dos Grupos D, E, I, J ou L' },
  { jogo: 88, casa: '2º Grupo D',  visitante: '2º Grupo G' },
]

export function FormatoCopa() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">Formato da Copa do Mundo FIFA 2026</h1>

        {/* Visão Geral */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Visão Geral</h2>
          <ul className="text-sm space-y-1 list-disc ml-5">
            <li><strong>48 seleções</strong> divididas em <strong>12 grupos</strong> (A a L), com 4 times cada</li>
            <li><strong>104 jogos</strong> no total: 72 na fase de grupos + 32 no mata-mata</li>
            <li>Sede: Estados Unidos, Canadá e México — junho e julho de 2026</li>
          </ul>
        </section>

        {/* Fase de Grupos */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Fase de Grupos</h2>
          <p className="text-sm text-gray-600">Cada grupo joga em formato <em>round-robin</em>: todos contra todos (6 jogos por grupo, cada seleção joga 3).</p>
          <h3 className="font-semibold text-sm mt-3">Classificação dentro do grupo — critérios oficiais FIFA</h3>
          <ol className="text-sm list-decimal ml-5 space-y-0.5">
            <li>Maior número de pontos (vitória = 3, empate = 1, derrota = 0)</li>
            <li>Maior saldo de gols</li>
            <li>Maior número de gols marcados</li>
            <li>Maior número de pontos apenas nos jogos entre os times empatados</li>
            <li>Maior saldo de gols apenas nos jogos entre os times empatados</li>
            <li>Maior número de gols marcados apenas nos jogos entre os times empatados</li>
            <li>Fair play (cartões: amarelo −1, 2º amarelo −3, vermelho direto −4, amarelo + vermelho −5)</li>
            <li>Sorteio pela FIFA</li>
          </ol>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
            <strong>Como o Bolão trata esses critérios:</strong> usamos os critérios 1 a 6 exatamente como a FIFA (pontos → saldo → gols → mini-tabela entre empatados). Os critérios 7 (fair play) e 8 (sorteio) não se aplicam aqui porque o palpite não inclui cartões e o sorteio não é previsível. Em caso de empate total após os 6 primeiros critérios, o Bolão mantém a ordem atual da tabela.
          </p>
          <h3 className="font-semibold text-sm mt-3">Quem avança?</h3>
          <ul className="text-sm list-disc ml-5 space-y-0.5">
            <li><strong>1º e 2º colocados</strong> de cada grupo avançam automaticamente (24 times)</li>
            <li><strong>Os 8 melhores 3ºs colocados</strong> entre os 12 grupos também avançam</li>
            <li>Total: <strong>32 times</strong> no mata-mata</li>
          </ul>
          <h3 className="font-semibold text-sm mt-3">Ranking dos 3ºs colocados — critérios oficiais FIFA</h3>
          <ol className="text-sm list-decimal ml-5 space-y-0.5">
            <li>Maior número de pontos</li>
            <li>Maior saldo de gols</li>
            <li>Maior número de gols marcados</li>
            <li>Fair play</li>
            <li>Sorteio pela FIFA</li>
          </ol>
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mt-2">
            <strong>Como o Bolão trata:</strong> usamos os 3 primeiros critérios. Não há confronto direto entre 3ºs (jogam em grupos diferentes). Se persistir empate, o Bolão mantém a ordem atual.
          </p>
        </section>

        {/* Os 495 cenários */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Os 495 Cenários — Como os 3ºs Colocados São Distribuídos</h2>
          <p className="text-sm text-gray-600">
            Dos 12 grupos, exatamente 8 terão seus 3ºs colocados classificados. O número de combinações possíveis é{' '}
            <strong>C(12,8) = 495</strong>.
          </p>
          <p className="text-sm text-gray-600">
            A FIFA pré-definiu o chaveamento do mata-mata para cada uma das 495 combinações, sem necessidade de sorteio adicional após a fase de grupos.
          </p>
          <p className="text-sm text-gray-600">
            Cada slot de 3º colocado no Jogo da Fase 32 tem exatamente <strong>5 grupos elegíveis</strong> (dos 12), garantindo que nenhum terceiro colocado enfrente o 1º ou 2º de seu próprio grupo na primeira rodada.
          </p>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left border-b">Jogo</th>
                  <th className="px-3 py-2 text-left border-b">Campeão do Grupo</th>
                  <th className="px-3 py-2 text-left border-b">Grupos Elegíveis para o 3º</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { jogo: 74,  camp: '1º Grupo E', grupos: 'A, B, C, D ou F' },
                  { jogo: 77,  camp: '1º Grupo I', grupos: 'C, D, F, G ou H' },
                  { jogo: 79,  camp: '1º Grupo A', grupos: 'C, E, F, H ou I' },
                  { jogo: 80,  camp: '1º Grupo L', grupos: 'E, H, I, J ou K' },
                  { jogo: 81,  camp: '1º Grupo D', grupos: 'B, E, F, I ou J' },
                  { jogo: 82,  camp: '1º Grupo G', grupos: 'A, E, H, I ou J' },
                  { jogo: 85,  camp: '1º Grupo B', grupos: 'E, F, G, I ou J' },
                  { jogo: 87,  camp: '1º Grupo K', grupos: 'D, E, I, J ou L' },
                ].map(({ jogo, camp, grupos }) => (
                  <tr key={jogo} className="even:bg-gray-50">
                    <td className="px-3 py-1.5 border-b font-medium">Jogo {jogo}</td>
                    <td className="px-3 py-1.5 border-b">{camp}</td>
                    <td className="px-3 py-1.5 border-b text-blue-700">{grupos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Chaveamento Fase 32 */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Chaveamento da Fase 32 (Jogos 73–88)</h2>
          <p className="text-sm text-gray-500">Conforme regulamento oficial da FIFA 2026.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-200 rounded">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-center border-b">Jogo</th>
                  <th className="px-3 py-2 text-right border-b">Time A</th>
                  <th className="px-3 py-2 text-center border-b">×</th>
                  <th className="px-3 py-2 text-left border-b">Time B</th>
                </tr>
              </thead>
              <tbody>
                {fase32Jogos.map(({ jogo, casa, visitante }) => (
                  <tr key={jogo} className="even:bg-gray-50">
                    <td className="px-3 py-1.5 border-b text-center font-medium text-gray-500">{jogo}</td>
                    <td className="px-3 py-1.5 border-b text-right font-semibold">{casa}</td>
                    <td className="px-3 py-1.5 border-b text-center text-gray-400">×</td>
                    <td className={`px-3 py-1.5 border-b font-semibold ${visitante.startsWith('3º dos') ? 'text-blue-700' : ''}`}>
                      {visitante}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Regras do Mata-mata */}
        <section className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">Regras do Mata-mata</h2>
          <ul className="text-sm list-disc ml-5 space-y-1">
            <li>Eliminatória simples — quem perde está eliminado</li>
            <li>Em caso de empate ao final dos 90 minutos: 30 min de prorrogação, depois disputa de pênaltis se necessário</li>
            <li><strong>Para o bolão:</strong> os resultados apostados valem apenas para os 90 minutos regulamentares. Gols em prorrogação e pênaltis não contam para pontuação</li>
            <li>Quando há empate no mata-mata, o participante indica quem avança (para resolver o chaveamento das fases seguintes). Essa escolha não vale pontuação extra</li>
          </ul>
          <p className="text-xs text-gray-400 mt-2 pt-2 border-t">
            Fonte: FIFA Competition Regulations Canada/Mexico/USA 2026
          </p>
        </section>
      </div>
    </div>
  )
}
