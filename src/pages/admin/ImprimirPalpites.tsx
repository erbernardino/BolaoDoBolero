import { useState, useEffect } from 'react'
import { collection, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Jogo, Time, Palpite, Usuario, PalpiteEspecial, ResultadoEspecial } from '../../types'

const FASE_LABELS: Record<string, string> = {
  grupos: 'Grupos',
  fase32: '2ª Fase',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semi: 'Semis',
  terceiro: '3º Lugar',
  final: 'Final',
}

const ESPECIAIS_COLS: { key: keyof Pick<PalpiteEspecial, 'campeao' | 'vice' | 'terceiro' | 'quarto' | 'paisArtilheiro'>; label: string }[] = [
  { key: 'campeao', label: '🏆 Campeão' },
  { key: 'vice', label: '🥈 Vice' },
  { key: 'terceiro', label: '🥉 3º Lugar' },
  { key: 'quarto', label: '4️⃣ 4º Lugar' },
  { key: 'paisArtilheiro', label: '⚽ País Artilheiro' },
]

export function ImprimirPalpites() {
  const [loading, setLoading] = useState(true)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Palpite[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [palpitesEspeciais, setPalpitesEspeciais] = useState<Map<string, PalpiteEspecial>>(new Map())
  const [resultadoEspecial, setResultadoEspecial] = useState<ResultadoEspecial | null>(null)

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, palpitesSnap, usuariosSnap, especiaisSnap, resEspSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'palpites')),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'palpites_especiais')),
        getDoc(doc(db, 'config', 'resultado_especial')),
      ])

      const jogosData = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Jogo))
      jogosData.sort((a, b) => a.numero - b.numero)
      setJogos(jogosData)

      const tMap = new Map<string, Time>()
      timesSnap.docs.forEach(d => tMap.set(d.id, { id: d.id, ...d.data() } as Time))
      setTimes(tMap)

      setPalpites(palpitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Palpite)))

      const usrs = usuariosSnap.docs
        .map(d => ({ uid: d.id, ...d.data() } as Usuario))
        .sort((a, b) => (a.apelido || a.nome || '').localeCompare(b.apelido || b.nome || ''))
      setUsuarios(usrs)

      const eMap = new Map<string, PalpiteEspecial>()
      especiaisSnap.docs.forEach(d => eMap.set(d.id, { uid: d.id, ...d.data() } as PalpiteEspecial))
      setPalpitesEspeciais(eMap)

      if (resEspSnap.exists()) setResultadoEspecial(resEspSnap.data() as ResultadoEspecial)

      setLoading(false)
    }
    load()
  }, [])

  // Mapa jogoId -> uid -> palpite
  const palpiteMap = new Map<string, Map<string, Palpite>>()
  for (const p of palpites) {
    if (!palpiteMap.has(p.jogoId)) palpiteMap.set(p.jogoId, new Map())
    palpiteMap.get(p.jogoId)!.set(p.uid, p)
  }

  function sigla(id: string) { return times.get(id)?.sigla ?? '?' }
  function nomeTm(id: string) { return times.get(id)?.nome ?? id }

  function corPalpite(p: Palpite, jogo: Jogo): string {
    if (!jogo.encerrado || !jogo.resultado) return ''
    const r = jogo.resultado
    const placarExato = p.golsCasa === r.golsCasa && p.golsVisitante === r.golsVisitante
    const vP = Math.sign(p.golsCasa - p.golsVisitante)
    const vR = Math.sign(r.golsCasa - r.golsVisitante)
    const colunaCerta = vP === vR
    const totalGolsCerto = (p.golsCasa + p.golsVisitante) === (r.golsCasa + r.golsVisitante)
    if (placarExato) return '#bbf7d0'   // verde
    if (colunaCerta) return '#fef08a'    // amarelo
    if (totalGolsCerto) return '#bfdbfe' // azul
    return '#fecaca'                     // vermelho
  }

  function acertoEspecial(col: keyof Pick<PalpiteEspecial, 'campeao' | 'vice' | 'terceiro' | 'quarto' | 'paisArtilheiro'>, timeId: string): boolean | null {
    if (!resultadoEspecial) return null
    if (col === 'paisArtilheiro') return (resultadoEspecial.paisesArtilheiros ?? []).includes(timeId)
    return resultadoEspecial[col] === timeId
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando dados para impressão...</p>
      </div>
    )
  }

  // Agrupar jogos por fase para exibição
  const jogosPorFase = new Map<string, Jogo[]>()
  for (const j of jogos) {
    if (!jogosPorFase.has(j.fase)) jogosPorFase.set(j.fase, [])
    jogosPorFase.get(j.fase)!.push(j)
  }
  const fasesOrdem = ['grupos', 'fase32', 'oitavas', 'quartas', 'semi', 'terceiro', 'final']

  return (
    <>
      {/* Barra de ação — oculta na impressão */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Impressão de Palpites</h1>
          <p className="text-xs text-gray-500">{usuarios.length} participantes · {jogos.length} jogos</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Voltar
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium"
          >
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Conteúdo imprimível */}
      <div className="p-4 print:p-0 bg-white">
        {usuarios.map((u, uIdx) => {
          const pe = palpitesEspeciais.get(u.uid)
          const nomeUsuario = u.apelido || u.nome || 'Sem nome'

          return (
            <div
              key={u.uid}
              style={{ pageBreakAfter: uIdx < usuarios.length - 1 ? 'always' : 'auto' }}
              className="mb-12 print:mb-0"
            >
              {/* Cabeçalho do usuário */}
              <div className="mb-4 pb-2 border-b-2 border-gray-800 flex items-baseline justify-between">
                <h2 className="text-xl font-black text-gray-900">{nomeUsuario}</h2>
                {u.apelido && u.nome && u.apelido !== u.nome && (
                  <span className="text-sm text-gray-500">{u.nome}</span>
                )}
                <span className="text-xs text-gray-400">Bolão do Bolero — Copa 2026</span>
              </div>

              {/* Jogos por fase */}
              {fasesOrdem.map(fase => {
                const jogsFase = jogosPorFase.get(fase) ?? []
                if (jogsFase.length === 0) return null

                return (
                  <div key={fase} className="mb-5">
                    <h3
                      className="text-xs font-bold uppercase tracking-widest text-white px-2 py-1 mb-1 rounded"
                      style={{ backgroundColor: '#1d4ed8' }}
                    >
                      {FASE_LABELS[fase] ?? fase}
                    </h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr style={{ backgroundColor: '#f3f4f6' }}>
                          <th className="border border-gray-300 px-1 py-1 text-center w-8">#</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">Time Casa</th>
                          <th className="border border-gray-300 px-2 py-1 text-center w-16">Palpite</th>
                          <th className="border border-gray-300 px-2 py-1 text-center w-16">Resultado</th>
                          <th className="border border-gray-300 px-2 py-1 text-left">Time Visitante</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jogsFase.map(jogo => {
                          const p = palpiteMap.get(jogo.id)?.get(u.uid)
                          const bg = p ? corPalpite(p, jogo) : ''
                          const resultado = jogo.encerrado && jogo.resultado
                            ? `${jogo.resultado.golsCasa}x${jogo.resultado.golsVisitante}`
                            : '–'

                          return (
                            <tr key={jogo.id} style={{ backgroundColor: bg || 'transparent' }}>
                              <td className="border border-gray-300 px-1 py-1 text-center text-gray-500 font-mono">
                                {jogo.numero}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                {jogo.timeCasa ? (
                                  <span className="font-medium">{sigla(jogo.timeCasa)} <span className="text-gray-500 font-normal">{nomeTm(jogo.timeCasa)}</span></span>
                                ) : (
                                  <span className="text-gray-400 italic">A definir</span>
                                )}
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-center font-mono font-bold">
                                {p ? `${p.golsCasa}x${p.golsVisitante}` : <span className="text-gray-300">–</span>}
                              </td>
                              <td className="border border-gray-300 px-2 py-1 text-center font-mono text-gray-600">
                                {resultado}
                              </td>
                              <td className="border border-gray-300 px-2 py-1">
                                {jogo.timeVisitante ? (
                                  <span className="font-medium">{sigla(jogo.timeVisitante)} <span className="text-gray-500 font-normal">{nomeTm(jogo.timeVisitante)}</span></span>
                                ) : (
                                  <span className="text-gray-400 italic">A definir</span>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}

              {/* Palpites Especiais */}
              <div className="mt-4">
                <h3
                  className="text-xs font-bold uppercase tracking-widest text-white px-2 py-1 mb-1 rounded"
                  style={{ backgroundColor: '#d97706' }}
                >
                  Palpites Especiais
                </h3>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                      <th className="border border-gray-300 px-2 py-1 text-left w-36">Campo</th>
                      <th className="border border-gray-300 px-2 py-1 text-left">Palpite</th>
                      <th className="border border-gray-300 px-2 py-1 text-left w-28">Resultado</th>
                      <th className="border border-gray-300 px-2 py-1 text-center w-16">Acerto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ESPECIAIS_COLS.map(col => {
                      const timeId = pe?.[col.key]
                      const acerto = timeId ? acertoEspecial(col.key, timeId) : null
                      const bgEsp = acerto === true ? '#bbf7d0' : acerto === false ? '#fecaca' : 'transparent'

                      const resultadoEspTxt = (() => {
                        if (!resultadoEspecial) return '–'
                        if (col.key === 'paisArtilheiro') {
                          const paises = resultadoEspecial.paisesArtilheiros ?? []
                          return paises.length > 0 ? paises.map(id => sigla(id)).join(', ') : '–'
                        }
                        const id = resultadoEspecial[col.key]
                        return id ? `${sigla(id)} ${nomeTm(id)}` : '–'
                      })()

                      return (
                        <tr key={col.key} style={{ backgroundColor: bgEsp }}>
                          <td className="border border-gray-300 px-2 py-1 font-medium">{col.label}</td>
                          <td className="border border-gray-300 px-2 py-1">
                            {timeId ? `${sigla(timeId)} ${nomeTm(timeId)}` : <span className="text-gray-300">Não preenchido</span>}
                          </td>
                          <td className="border border-gray-300 px-2 py-1 text-gray-600">{resultadoEspTxt}</td>
                          <td className="border border-gray-300 px-2 py-1 text-center font-bold">
                            {acerto === true ? '✓' : acerto === false ? '✗' : '–'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legenda */}
              <div className="mt-3 flex gap-4 text-[10px] text-gray-500">
                <span style={{ backgroundColor: '#bbf7d0', padding: '0 4px' }}>Placar exato</span>
                <span style={{ backgroundColor: '#fef08a', padding: '0 4px' }}>Coluna certa</span>
                <span style={{ backgroundColor: '#bfdbfe', padding: '0 4px' }}>Total gols certo</span>
                <span style={{ backgroundColor: '#fecaca', padding: '0 4px' }}>Errou</span>
              </div>
            </div>
          )
        })}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          body { font-size: 11px; }
        }
      `}</style>
    </>
  )
}
