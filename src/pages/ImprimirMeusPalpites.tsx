import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { montarResolvedorBracket, type ResolverBracket } from '../lib/bracketUsuario'
import type { Jogo, Time, Palpite, PalpiteEspecial, ResultadoEspecial, Grupo } from '../types'

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

function bgAcerto(p: Palpite, jogo: Jogo): string {
  if (!jogo.encerrado || !jogo.resultado) return ''
  const r = jogo.resultado
  if (p.golsCasa === r.golsCasa && p.golsVisitante === r.golsVisitante) return '#bbf7d0'
  if (Math.sign(p.golsCasa - p.golsVisitante) === Math.sign(r.golsCasa - r.golsVisitante)) return '#fef08a'
  if ((p.golsCasa + p.golsVisitante) === (r.golsCasa + r.golsVisitante)) return '#bfdbfe'
  return '#fecaca'
}

function Flag({ url }: { url?: string }) {
  if (!url) return null
  return <img src={url} alt="" style={{ width: 16, height: 11, objectFit: 'cover', borderRadius: 1, display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
}

export function ImprimirMeusPalpites() {
  const { firebaseUser, usuario } = useAuth()
  const [loading, setLoading] = useState(true)
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Map<string, Time>>(new Map())
  const [palpites, setPalpites] = useState<Map<string, Palpite>>(new Map())
  const [palpiteEspecial, setPalpiteEspecial] = useState<PalpiteEspecial | null>(null)
  const [resultadoEspecial, setResultadoEspecial] = useState<ResultadoEspecial | null>(null)
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [pontosDisciplinares, setPontosDisciplinares] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!firebaseUser) return
    async function load() {
      const [jogosSnap, timesSnap, palpitesSnap, espSnap, resEspSnap, gruposSnap, desempateSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(query(collection(db, 'palpites'), where('uid', '==', firebaseUser!.uid))),
        getDoc(doc(db, 'palpites_especiais', firebaseUser!.uid)),
        getDoc(doc(db, 'config', 'resultado_especial')),
        getDocs(collection(db, 'grupos')),
        getDoc(doc(db, 'desempates_terceiros', firebaseUser!.uid)),
      ])

      const jList = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Jogo))
      jList.sort((a, b) => a.numero - b.numero)
      setJogos(jList)

      const tMap = new Map<string, Time>()
      timesSnap.docs.forEach(d => tMap.set(d.id, { id: d.id, ...d.data() } as Time))
      setTimes(tMap)

      const pMap = new Map<string, Palpite>()
      palpitesSnap.docs.forEach(d => {
        const p = { id: d.id, ...d.data() } as Palpite
        pMap.set(p.jogoId, p)
      })
      setPalpites(pMap)

      if (espSnap.exists()) setPalpiteEspecial({ uid: firebaseUser!.uid, ...espSnap.data() } as PalpiteEspecial)
      if (resEspSnap.exists()) setResultadoEspecial(resEspSnap.data() as ResultadoEspecial)

      setGrupos(gruposSnap.docs.map(d => ({ id: d.id, ...d.data() } as Grupo)))
      setPontosDisciplinares((desempateSnap.data()?.pontosDisciplinares ?? {}) as Record<string, number>)

      setLoading(false)
    }
    load()
  }, [firebaseUser])

  const t = (id: string) => times.get(id)
  const sigla = (id: string) => t(id)?.sigla ?? '?'
  const bandeira = (id: string) => t(id)?.bandeira

  // Resolve os times do mata-mata pelo bracket AO VIVO do usuário (mesma lógica
  // da tela de palpites), em vez dos IDs congelados no documento de palpite.
  const resolverBracket: ResolverBracket = useMemo(
    () => montarResolvedorBracket({
      jogos,
      grupos,
      palpitesPorJogoId: Object.fromEntries(palpites),
      pontosDisciplinares,
    }),
    [jogos, grupos, palpites, pontosDisciplinares],
  )

  const jogosPorFase = new Map<string, Jogo[]>()
  for (const j of jogos) {
    if (!jogosPorFase.has(j.fase)) jogosPorFase.set(j.fase, [])
    jogosPorFase.get(j.fase)!.push(j)
  }

  function acertoEspecial(col: typeof ESPECIAIS_COLS[number]['key'], timeId: string): boolean | null {
    if (!resultadoEspecial) return null
    if (col === 'paisArtilheiro') return (resultadoEspecial.paisesArtilheiros ?? []).includes(timeId)
    return resultadoEspecial[col] === timeId
  }

  const faseBg: React.CSSProperties = {
    backgroundColor: '#1d4ed8', color: '#fff', fontWeight: 700, fontSize: 10,
    textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1px 5px',
    marginBottom: 2, display: 'inline-block', borderRadius: 2,
  }
  const especiaisBg: React.CSSProperties = { ...faseBg, backgroundColor: '#d97706' }

  const nomeExib = usuario?.apelido || usuario?.nome || 'Meus Palpites'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Carregando...</p>
      </div>
    )
  }

  return (
    <>
      {/* Barra de ações — oculta no print */}
      <div className="print:hidden flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-10">
        <span className="text-sm font-semibold text-gray-700">{nomeExib} — Bolão do Bolero 2026</span>
        <div className="flex gap-2">
          <button onClick={() => window.history.back()} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            ← Voltar
          </button>
          <button onClick={() => window.print()} className="px-4 py-1.5 text-sm bg-blue-700 text-white rounded-lg hover:bg-blue-800 font-medium">
            🖨️ Imprimir / PDF
          </button>
        </div>
      </div>

      <div style={{ padding: '10px 12px', backgroundColor: '#fff' }} className="print:p-1">
        {/* Cabeçalho do usuário */}
        <div style={{ borderBottom: '2px solid #111827', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'baseline', marginBottom: 3, paddingBottom: 1 }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: '#111827' }}>{nomeExib}</span>
          {usuario?.apelido && usuario?.nome && usuario.apelido !== usuario.nome && (
            <span style={{ fontSize: 9, color: '#6b7280' }}>{usuario.nome}</span>
          )}
          <span style={{ fontSize: 10, color: '#9ca3af' }}>Bolão do Bolero — Copa 2026</span>
        </div>

        {/* Jogos por fase */}
        {FASES_ORDEM.map(fase => {
          const jogsFase = jogosPorFase.get(fase) ?? []
          if (!jogsFase.length) return null
          const cols = fase === 'grupos' ? 4 : 3
          return (
            <div key={fase}>
              <span style={faseBg}>{FASE_LABELS[fase] ?? fase}</span>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 3, marginBottom: 6 }}>
                {jogsFase.map(jogo => {
                  const p = palpites.get(jogo.id)
                  const cor = p ? bgAcerto(p, jogo) : ''
                  const resultado = jogo.encerrado && jogo.resultado
                    ? `${jogo.resultado.golsCasa}–${jogo.resultado.golsVisitante}`
                    : null
                  const { casaId, visitanteId } = resolverBracket(jogo)

                  return (
                    <div
                      key={jogo.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderLeft: cor ? `3px solid ${cor}` : '3px solid #e5e7eb',
                        borderRadius: 2, padding: '1px 2px', backgroundColor: '#fff',
                        pageBreakInside: 'avoid', overflow: 'hidden',
                      }}
                    >
                      {/* Número + data/hora */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, fontSize: 9, lineHeight: 1.1, whiteSpace: 'nowrap', color: '#6b7280' }}>
                        <span style={{ fontWeight: 700, color: '#374151' }}>#{jogo.numero}</span>
                        {jogo.dataHora && (
                          <span>
                            {jogo.dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}
                            {' '}
                            {jogo.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                          </span>
                        )}
                      </div>
                      {/* Confronto */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 9, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                        {casaId
                          ? <span style={{ display: 'inline-flex', alignItems: 'center' }}><Flag url={bandeira(casaId)} />{sigla(casaId)}</span>
                          : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>TBD</span>}
                        <span style={{ color: '#9ca3af' }}>×</span>
                        {visitanteId
                          ? <span style={{ display: 'inline-flex', alignItems: 'center' }}><Flag url={bandeira(visitanteId)} />{sigla(visitanteId)}</span>
                          : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>TBD</span>}
                      </div>
                      {/* Palpite com nomes */}
                      <div style={{ fontSize: 9, lineHeight: 1.2, color: '#111827', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p ? (
                          <>
                            <span style={{ fontSize: 8, color: '#6b7280' }}>{casaId ? (t(casaId)?.nome ?? sigla(casaId)) : ''} </span>
                            <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 10 }}>{p.golsCasa}–{p.golsVisitante}</span>
                            <span style={{ fontSize: 8, color: '#6b7280' }}> {visitanteId ? (t(visitanteId)?.nome ?? sigla(visitanteId)) : ''}</span>
                          </>
                        ) : <span style={{ color: '#d1d5db' }}>–</span>}
                      </div>
                      {/* Resultado real (se encerrado) */}
                      {resultado && (
                        <div style={{ fontSize: 9, fontFamily: 'monospace', lineHeight: 1.1, color: '#6b7280', textAlign: 'center' }}>
                          R: {resultado}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {/* Palpites Especiais */}
        <span style={especiaisBg}>Palpites Especiais</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3, marginTop: 2 }}>
          {ESPECIAIS_COLS.map(col => {
            const timeId = palpiteEspecial?.[col.key]
            const acerto = timeId ? acertoEspecial(col.key, timeId) : null
            const cor = acerto === true ? '#bbf7d0' : acerto === false ? '#fecaca' : ''
            return (
              <div
                key={col.key}
                style={{
                  border: '1px solid #e5e7eb',
                  borderLeft: cor ? `3px solid ${cor}` : '3px solid #e5e7eb',
                  borderRadius: 2, padding: '2px 3px', backgroundColor: '#fff',
                }}
              >
                <div style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center' }}>{col.label}</div>
                {timeId ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Flag url={bandeira(timeId)} />
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, textAlign: 'center' }}>{t(timeId)?.nome ?? sigla(timeId)}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 9, color: '#d1d5db', textAlign: 'center' }}>–</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 6mm; }
          body { font-size: 9px; }
          .print\\:hidden { display: none !important; }
          .print\\:p-1 { padding: 4px !important; }
        }
      `}</style>
    </>
  )
}
