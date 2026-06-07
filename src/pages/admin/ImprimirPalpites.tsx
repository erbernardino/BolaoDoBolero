import { useState, useEffect } from 'react'
import { collection, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Jogo, Time, Palpite, Usuario, PalpiteEspecial, ResultadoEspecial } from '../../types'

const FASE_LABELS: Record<string, string> = {
  grupos: 'Grupos',
  fase32: '2ª Fase',
  oitavas: 'Oitavas',
  quartas: 'Quartas',
  semi: 'Semifinais',
  terceiro: '3º Lugar',
  final: 'Final',
}
const FASES_ORDEM = ['grupos', 'fase32', 'oitavas', 'quartas', 'semi', 'terceiro', 'final']

const ESPECIAIS_COLS: { key: keyof Pick<PalpiteEspecial, 'campeao' | 'vice' | 'terceiro' | 'quarto' | 'paisArtilheiro'>; label: string }[] = [
  { key: 'campeao', label: 'Campeão' },
  { key: 'vice', label: 'Vice' },
  { key: 'terceiro', label: '3º Lugar' },
  { key: 'quarto', label: '4º Lugar' },
  { key: 'paisArtilheiro', label: 'Artilheiro' },
]

// Cores por tipo de acerto
function bgAcerto(p: Palpite, jogo: Jogo): string {
  if (!jogo.encerrado || !jogo.resultado) return ''
  const r = jogo.resultado
  if (p.golsCasa === r.golsCasa && p.golsVisitante === r.golsVisitante) return '#bbf7d0'
  if (Math.sign(p.golsCasa - p.golsVisitante) === Math.sign(r.golsCasa - r.golsVisitante)) return '#fef08a'
  if ((p.golsCasa + p.golsVisitante) === (r.golsCasa + r.golsVisitante)) return '#bfdbfe'
  return '#fecaca'
}

function Flag({ url, alt }: { url?: string; alt?: string }) {
  if (!url) return null
  return <img src={url} alt={alt ?? ''} style={{ width: 18, height: 12, objectFit: 'cover', borderRadius: 2, display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
}

type Visao = 'usuario' | 'jogo'

export function ImprimirPalpites() {
  const [loading, setLoading] = useState(true)
  const [visao, setVisao] = useState<Visao>('usuario')
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

      const jList = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Jogo))
      jList.sort((a, b) => a.numero - b.numero)
      setJogos(jList)

      const tMap = new Map<string, Time>()
      timesSnap.docs.forEach(d => tMap.set(d.id, { id: d.id, ...d.data() } as Time))
      setTimes(tMap)

      setPalpites(palpitesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Palpite)))

      const uList = usuariosSnap.docs
        .map(d => ({ uid: d.id, ...d.data() } as Usuario))
        .sort((a, b) => (a.apelido || a.nome || '').localeCompare(b.apelido || b.nome || ''))
      setUsuarios(uList)

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

  const t = (id: string) => times.get(id)
  const sigla = (id: string) => t(id)?.sigla ?? '?'
  const bandeira = (id: string) => t(id)?.bandeira

  function acertoEspecial(col: typeof ESPECIAIS_COLS[number]['key'], timeId: string): boolean | null {
    if (!resultadoEspecial) return null
    if (col === 'paisArtilheiro') return (resultadoEspecial.paisesArtilheiros ?? []).includes(timeId)
    return resultadoEspecial[col] === timeId
  }

  // Jogos por fase
  const jogosPorFase = new Map<string, Jogo[]>()
  for (const j of jogos) {
    if (!jogosPorFase.has(j.fase)) jogosPorFase.set(j.fase, [])
    jogosPorFase.get(j.fase)!.push(j)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando dados para impressão...</p>
      </div>
    )
  }

  // ── Estilos de tabela compacta ────────────────────────────────────────────
  const tdBase: React.CSSProperties = {
    border: '1px solid #d1d5db',
    padding: '2px 4px',
    fontSize: 9,
    verticalAlign: 'middle',
    lineHeight: 1.2,
  }
  const thBase: React.CSSProperties = {
    ...tdBase,
    backgroundColor: '#f3f4f6',
    fontWeight: 700,
    textAlign: 'center',
  }
  const faseBg: React.CSSProperties = {
    backgroundColor: '#1d4ed8',
    color: '#fff',
    fontWeight: 700,
    fontSize: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '2px 6px',
    marginBottom: 2,
    marginTop: 6,
    display: 'block',
    borderRadius: 2,
  }
  const especiaisBg: React.CSSProperties = { ...faseBg, backgroundColor: '#d97706' }

  // ── Cabeçalho de ação (oculto na impressão) ───────────────────────────────
  const ActionBar = () => (
    <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-gray-800">Impressão de Palpites</h1>
        <p className="text-xs text-gray-500">{usuarios.length} participantes · {jogos.length} jogos</p>
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex border border-gray-300 rounded-lg overflow-hidden text-sm">
          <button
            onClick={() => setVisao('usuario')}
            className={`px-3 py-1.5 ${visao === 'usuario' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Por Usuário
          </button>
          <button
            onClick={() => setVisao('jogo')}
            className={`px-3 py-1.5 border-l border-gray-300 ${visao === 'jogo' ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
          >
            Por Jogo
          </button>
        </div>
        <button onClick={() => window.history.back()} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
          ← Voltar
        </button>
        <button onClick={() => window.print()} className="px-4 py-1.5 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">
          🖨️ Imprimir / PDF
        </button>
      </div>
    </div>
  )

  // ── Legenda ───────────────────────────────────────────────────────────────
  const Legenda = () => (
    <div style={{ display: 'flex', gap: 8, fontSize: 8, color: '#6b7280', marginTop: 4 }}>
      {[
        { bg: '#bbf7d0', txt: 'Placar exato' },
        { bg: '#fef08a', txt: 'Coluna certa' },
        { bg: '#bfdbfe', txt: 'Total gols' },
        { bg: '#fecaca', txt: 'Errou' },
      ].map(l => (
        <span key={l.txt} style={{ backgroundColor: l.bg, padding: '0 4px', borderRadius: 2 }}>{l.txt}</span>
      ))}
    </div>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // VISÃO POR USUÁRIO
  // ════════════════════════════════════════════════════════════════════════════
  const VisaoPorUsuario = () => (
    <>
      {usuarios.map((u, uIdx) => {
        const pe = palpitesEspeciais.get(u.uid)
        const nomeExib = u.apelido || u.nome || 'Sem nome'

        return (
          <div key={u.uid} style={{ pageBreakAfter: uIdx < usuarios.length - 1 ? 'always' : 'auto', marginBottom: 24 }}>
            {/* Cabeçalho do usuário */}
            <div style={{ borderBottom: '2px solid #111827', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, paddingBottom: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#111827' }}>{nomeExib}</span>
              {u.apelido && u.nome && u.apelido !== u.nome && (
                <span style={{ fontSize: 9, color: '#6b7280' }}>{u.nome}</span>
              )}
              <span style={{ fontSize: 8, color: '#9ca3af' }}>Bolão do Bolero — Copa 2026</span>
            </div>

            {/* Jogos por fase */}
            {FASES_ORDEM.map(fase => {
              const jogsFase = jogosPorFase.get(fase) ?? []
              if (!jogsFase.length) return null
              return (
                <div key={fase}>
                  <span style={faseBg}>{FASE_LABELS[fase] ?? fase}</span>
                  <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: 22 }} />
                      <col style={{ width: '30%' }} />
                      <col style={{ width: 40 }} />
                      <col style={{ width: 40 }} />
                      <col style={{ width: '30%' }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th style={{ ...thBase, textAlign: 'center' }}>#</th>
                        <th style={{ ...thBase, textAlign: 'left' }}>Casa</th>
                        <th style={{ ...thBase }}>Palpite</th>
                        <th style={{ ...thBase }}>Resultado</th>
                        <th style={{ ...thBase, textAlign: 'left' }}>Visitante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jogsFase.map(jogo => {
                        const p = palpiteMap.get(jogo.id)?.get(u.uid)
                        const bg = p ? bgAcerto(p, jogo) : ''
                        const resultado = jogo.encerrado && jogo.resultado
                          ? `${jogo.resultado.golsCasa}–${jogo.resultado.golsVisitante}`
                          : '–'
                        return (
                          <tr key={jogo.id} style={{ backgroundColor: bg || 'transparent' }}>
                            <td style={{ ...tdBase, textAlign: 'center', color: '#6b7280' }}>{jogo.numero}</td>
                            <td style={tdBase}>
                              {jogo.timeCasa
                                ? <><Flag url={bandeira(jogo.timeCasa)} />{sigla(jogo.timeCasa)}</>
                                : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>TBD</span>}
                            </td>
                            <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700, fontFamily: 'monospace' }}>
                              {p ? `${p.golsCasa}–${p.golsVisitante}` : <span style={{ color: '#d1d5db' }}>–</span>}
                            </td>
                            <td style={{ ...tdBase, textAlign: 'center', fontFamily: 'monospace', color: '#374151' }}>
                              {resultado}
                            </td>
                            <td style={tdBase}>
                              {jogo.timeVisitante
                                ? <><Flag url={bandeira(jogo.timeVisitante)} />{sigla(jogo.timeVisitante)}</>
                                : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>TBD</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}

            {/* Especiais */}
            <span style={especiaisBg}>Palpites Especiais</span>
            <table style={{ width: '60%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thBase, textAlign: 'left', width: 80 }}>Campo</th>
                  <th style={{ ...thBase, textAlign: 'left' }}>Palpite</th>
                  <th style={{ ...thBase, textAlign: 'left' }}>Resultado Oficial</th>
                  <th style={{ ...thBase, width: 24 }}>✓</th>
                </tr>
              </thead>
              <tbody>
                {ESPECIAIS_COLS.map(col => {
                  const timeId = pe?.[col.key]
                  const acerto = timeId ? acertoEspecial(col.key, timeId) : null
                  const bgEsp = acerto === true ? '#bbf7d0' : acerto === false ? '#fecaca' : 'transparent'

                  const resOficial = (() => {
                    if (!resultadoEspecial) return '–'
                    if (col.key === 'paisArtilheiro') {
                      const ids = resultadoEspecial.paisesArtilheiros ?? []
                      return ids.length ? ids.map(id => sigla(id)).join(', ') : '–'
                    }
                    const id = resultadoEspecial[col.key]
                    return id ? sigla(id) : '–'
                  })()

                  const resId = col.key !== 'paisArtilheiro' && resultadoEspecial ? resultadoEspecial[col.key] : null

                  return (
                    <tr key={col.key} style={{ backgroundColor: bgEsp }}>
                      <td style={{ ...tdBase, fontWeight: 600 }}>{col.label}</td>
                      <td style={tdBase}>
                        {timeId
                          ? <><Flag url={bandeira(timeId)} />{sigla(timeId)}</>
                          : <span style={{ color: '#d1d5db' }}>–</span>}
                      </td>
                      <td style={tdBase}>
                        {resId
                          ? <><Flag url={bandeira(resId)} />{resOficial}</>
                          : resOficial}
                      </td>
                      <td style={{ ...tdBase, textAlign: 'center', fontWeight: 700 }}>
                        {acerto === true ? '✓' : acerto === false ? '✗' : '–'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <Legenda />
          </div>
        )
      })}
    </>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // VISÃO POR JOGO
  // ════════════════════════════════════════════════════════════════════════════
  const VisaoPorJogo = () => (
    <>
      {FASES_ORDEM.map(fase => {
        const jogsFase = jogosPorFase.get(fase) ?? []
        if (!jogsFase.length) return null
        return (
          <div key={fase} style={{ marginBottom: 16 }}>
            <span style={faseBg}>{FASE_LABELS[fase] ?? fase}</span>

            {jogsFase.map(jogo => {
              const mapa = palpiteMap.get(jogo.id)
              const resultado = jogo.encerrado && jogo.resultado
                ? `${jogo.resultado.golsCasa}–${jogo.resultado.golsVisitante}`
                : null

              return (
                <div key={jogo.id} style={{ marginBottom: 6, pageBreakInside: 'avoid' }}>
                  {/* Cabeçalho do jogo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#f3f4f6', padding: '2px 4px', borderRadius: 2, marginBottom: 2 }}>
                    <span style={{ fontSize: 8, fontWeight: 700, color: '#6b7280', minWidth: 28 }}>#{jogo.numero}</span>
                    <span style={{ fontSize: 9, display: 'flex', alignItems: 'center' }}>
                      {jogo.timeCasa
                        ? <><Flag url={bandeira(jogo.timeCasa)} /><strong>{sigla(jogo.timeCasa)}</strong></>
                        : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>TBD</span>}
                    </span>
                    <span style={{ fontSize: 8, color: '#9ca3af' }}>vs</span>
                    <span style={{ fontSize: 9, display: 'flex', alignItems: 'center' }}>
                      {jogo.timeVisitante
                        ? <><Flag url={bandeira(jogo.timeVisitante)} /><strong>{sigla(jogo.timeVisitante)}</strong></>
                        : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>TBD</span>}
                    </span>
                    {resultado && (
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#15803d', marginLeft: 4 }}>
                        [{resultado}]
                      </span>
                    )}
                  </div>

                  {/* Grid de palpites por usuário — 4 colunas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px 4px' }}>
                    {usuarios.map(u => {
                      const p = mapa?.get(u.uid)
                      const bg = p ? bgAcerto(p, jogo) : '#f9fafb'
                      const nomeExib = u.apelido || u.nome || '?'
                      return (
                        <div
                          key={u.uid}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: bg,
                            padding: '1px 4px',
                            borderRadius: 2,
                            fontSize: 8,
                          }}
                        >
                          <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{nomeExib}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', marginLeft: 4, flexShrink: 0 }}>
                            {p ? `${p.golsCasa}–${p.golsVisitante}` : <span style={{ color: '#d1d5db' }}>–</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Especiais por jogo — seção final */}
      <div style={{ pageBreakBefore: 'always' }}>
        <span style={especiaisBg}>Palpites Especiais — Todos os Participantes</span>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thBase, textAlign: 'left', width: 100 }}>Participante</th>
              {ESPECIAIS_COLS.map(col => (
                <th key={col.key} style={thBase}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => {
              const pe = palpitesEspeciais.get(u.uid)
              return (
                <tr key={u.uid}>
                  <td style={{ ...tdBase, fontWeight: 600 }}>{u.apelido || u.nome || '?'}</td>
                  {ESPECIAIS_COLS.map(col => {
                    const timeId = pe?.[col.key]
                    const acerto = timeId ? acertoEspecial(col.key, timeId) : null
                    const bgEsp = acerto === true ? '#bbf7d0' : acerto === false ? '#fecaca' : 'transparent'
                    return (
                      <td key={col.key} style={{ ...tdBase, textAlign: 'center', backgroundColor: bgEsp }}>
                        {timeId
                          ? <><Flag url={bandeira(timeId)} />{sigla(timeId)}</>
                          : <span style={{ color: '#d1d5db' }}>–</span>}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {/* Linha de resultado oficial */}
            {resultadoEspecial && (
              <tr style={{ borderTop: '2px solid #374151' }}>
                <td style={{ ...tdBase, fontWeight: 900, color: '#15803d' }}>Resultado oficial</td>
                {ESPECIAIS_COLS.map(col => {
                  let timeId: string | undefined
                  if (col.key === 'paisArtilheiro') {
                    timeId = (resultadoEspecial.paisesArtilheiros ?? [])[0]
                  } else {
                    timeId = resultadoEspecial[col.key]
                  }
                  return (
                    <td key={col.key} style={{ ...tdBase, textAlign: 'center', backgroundColor: '#dcfce7', fontWeight: 700 }}>
                      {timeId ? <><Flag url={bandeira(timeId)} />{sigla(timeId)}</> : '–'}
                    </td>
                  )
                })}
              </tr>
            )}
          </tbody>
        </table>
        <Legenda />
      </div>
    </>
  )

  return (
    <>
      <ActionBar />

      <div style={{ padding: '12px 16px', backgroundColor: '#fff' }} className="print:p-2">
        {visao === 'usuario' ? <VisaoPorUsuario /> : <VisaoPorJogo />}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 8mm 8mm; }
          body { font-size: 8px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
