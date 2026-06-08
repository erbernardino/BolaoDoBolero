import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs, getDoc, doc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { montarResolvedorBracket, type ResolverBracket } from '../../lib/bracketUsuario'
import type { Jogo, Time, Palpite, Usuario, PalpiteEspecial, ResultadoEspecial, Grupo } from '../../types'

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
  return <img src={url} alt={alt ?? ''} style={{ width: 16, height: 11, objectFit: 'cover', borderRadius: 1, display: 'inline', verticalAlign: 'middle', marginRight: 2 }} />
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
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [desempatesPorUid, setDesempatesPorUid] = useState<Map<string, Record<string, number>>>(new Map())

  useEffect(() => {
    async function load() {
      const [jogosSnap, timesSnap, palpitesSnap, usuariosSnap, especiaisSnap, resEspSnap, gruposSnap, desempatesSnap] = await Promise.all([
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getDocs(collection(db, 'palpites')),
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'palpites_especiais')),
        getDoc(doc(db, 'config', 'resultado_especial')),
        getDocs(collection(db, 'grupos')),
        getDocs(collection(db, 'desempates_terceiros')),
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

      setGrupos(gruposSnap.docs.map(d => ({ id: d.id, ...d.data() } as Grupo)))
      const dMap = new Map<string, Record<string, number>>()
      desempatesSnap.docs.forEach(d => dMap.set(d.id, (d.data().pontosDisciplinares ?? {}) as Record<string, number>))
      setDesempatesPorUid(dMap)

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

  // Resolvedor do bracket AO VIVO por usuário (mesma lógica da tela de palpites),
  // para que os times do mata-mata reflitam o bracket atual de cada um — e não os
  // IDs congelados no palpite. Memoizado: 60 usuários × bracket é cálculo em memória.
  const resolversPorUid = useMemo(() => {
    const palpitesPorUid = new Map<string, Record<string, Palpite>>()
    for (const p of palpites) {
      let rec = palpitesPorUid.get(p.uid)
      if (!rec) { rec = {}; palpitesPorUid.set(p.uid, rec) }
      rec[p.jogoId] = p
    }
    const map = new Map<string, ResolverBracket>()
    for (const u of usuarios) {
      map.set(u.uid, montarResolvedorBracket({
        jogos,
        grupos,
        palpitesPorJogoId: palpitesPorUid.get(u.uid) ?? {},
        pontosDisciplinares: desempatesPorUid.get(u.uid) ?? {},
      }))
    }
    return map
  }, [jogos, grupos, palpites, usuarios, desempatesPorUid])

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

  // ── Estilos compartilhados ────────────────────────────────────────────────
  const tdBase: React.CSSProperties = {
    border: '1px solid #d1d5db',
    padding: '1px 3px',
    fontSize: 9,
    verticalAlign: 'middle',
    lineHeight: 1.15, textAlign: 'center' as const,
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
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '1px 5px',
    marginBottom: 2,
    marginTop: 5,
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
    <div style={{ display: 'flex', gap: 8, fontSize: 9, color: '#6b7280', marginTop: 4 }}>
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

  // ── Card minúsculo de jogo (Visão Por Usuário) ────────────────────────────
  const CardJogo = ({ jogo, uid }: { jogo: Jogo; uid: string }) => {
    const p = palpiteMap.get(jogo.id)?.get(uid)
    const cor = p ? bgAcerto(p, jogo) : ''
    const resultado = jogo.encerrado && jogo.resultado
      ? `${jogo.resultado.golsCasa}–${jogo.resultado.golsVisitante}`
      : null
    // Para mata-mata, usa os times gravados no palpite (resolvidos no momento do save)
    const { casaId, visitanteId } = resolversPorUid.get(uid)?.(jogo) ?? { casaId: null, visitanteId: null }

    const dataHoraStr = jogo.dataHora
      ? `${jogo.dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })} ${jogo.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`
      : ''

    return (
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderLeft: cor ? `3px solid ${cor}` : '3px solid #e5e7eb',
          borderRadius: 2,
          padding: '1px 3px',
          backgroundColor: '#fff',
          pageBreakInside: 'avoid',
          overflow: 'hidden',
        }}
      >
        {/* Linha 1: #N - DD/MM HH:MM */}
        <div style={{ fontSize: 8, lineHeight: 1.2, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, color: '#374151' }}>#{jogo.numero}</span>
          {dataHoraStr && <span> - {dataHoraStr}</span>}
        </div>
        {/* Linha 2: Nome [flag] gols–gols [flag] Nome — centralizado, sem sigla */}
        <div style={{ fontSize: 8, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
          {casaId ? <Flag url={bandeira(casaId)} /> : null}
          <span style={{ fontWeight: 600, color: '#111827' }}>{casaId ? sigla(casaId) : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>TBD</span>}</span>
          {p
            ? <span style={{ fontWeight: 700, fontFamily: 'monospace', color: '#111827' }}>{p.golsCasa}–{p.golsVisitante}</span>
            : <span style={{ color: '#9ca3af' }}>×</span>
          }
          <span style={{ fontWeight: 600, color: '#111827' }}>{visitanteId ? sigla(visitanteId) : <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>TBD</span>}</span>
          {visitanteId ? <Flag url={bandeira(visitanteId)} /> : null}
        </div>
        {/* Linha 3: Resultado real (se encerrado) */}
        {resultado && (
          <div style={{ fontSize: 8, fontFamily: 'monospace', lineHeight: 1.1, color: '#6b7280' }}>
            R: {resultado}
          </div>
        )}
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // VISÃO POR USUÁRIO — cards ultra-compactos
  // ════════════════════════════════════════════════════════════════════════════
  const VisaoPorUsuario = () => (
    <>
      {usuarios.map((u, uIdx) => {
        const pe = palpitesEspeciais.get(u.uid)
        const nomeExib = u.apelido || u.nome || 'Sem nome'

        return (
          <div key={u.uid} style={{ pageBreakBefore: uIdx > 0 ? 'always' : 'auto', marginBottom: 16 }}>
            {/* Cabeçalho do usuário */}
            <div style={{ borderBottom: '2px solid #111827', display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'baseline', marginBottom: 3, paddingBottom: 1 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#111827' }}>{nomeExib}</span>
              {u.apelido && u.nome && u.apelido !== u.nome && (
                <span style={{ fontSize: 9, color: '#6b7280' }}>{u.nome}</span>
              )}
              <span style={{ fontSize: 10, color: '#9ca3af' }}>Bolão do Bolero — Copa 2026</span>
            </div>

            {/* Jogos por fase — grids de cards (4 colunas em todas as fases) */}
            {FASES_ORDEM.filter(f => f !== 'terceiro' && f !== 'final').map(fase => {
              const jogsFase = jogosPorFase.get(fase) ?? []
              if (!jogsFase.length) return null
              return (
                <div key={fase}>
                  <span style={faseBg}>{FASE_LABELS[fase] ?? fase}</span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
                    {jogsFase.map(jogo => (
                      <CardJogo key={jogo.id} jogo={jogo} uid={u.uid} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* 3º Lugar + Final — mesma linha */}
            {(() => {
              const jogsT = jogosPorFase.get('terceiro') ?? []
              const jogsF = jogosPorFase.get('final') ?? []
              if (!jogsT.length && !jogsF.length) return null
              return (
                <div>
                  <div style={{ display: 'inline-flex', gap: 4, marginBottom: 2 }}>
                    {jogsT.length > 0 && <span style={faseBg}>{FASE_LABELS['terceiro']}</span>}
                    {jogsF.length > 0 && <span style={{ ...faseBg, backgroundColor: '#7c3aed' }}>{FASE_LABELS['final']}</span>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3 }}>
                    {jogsT.map(jogo => <CardJogo key={jogo.id} jogo={jogo} uid={u.uid} />)}
                    {jogsF.map(jogo => <CardJogo key={jogo.id} jogo={jogo} uid={u.uid} />)}
                  </div>
                </div>
              )
            })()}

            {/* Especiais — 5 cards inline em 1 linha */}
            <span style={especiaisBg}>Palpites Especiais</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
              {ESPECIAIS_COLS.map(col => {
                const timeId = pe?.[col.key]
                const acerto = timeId ? acertoEspecial(col.key, timeId) : null
                const cor = acerto === true ? '#bbf7d0' : acerto === false ? '#fecaca' : ''
                return (
                  <div
                    key={col.key}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderLeft: cor ? `3px solid ${cor}` : '3px solid #e5e7eb',
                      borderRadius: 2,
                      padding: '1px 2px',
                      backgroundColor: '#fff',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 600, lineHeight: 1.1 }}>{col.label}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.1, display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                      {timeId
                        ? <><Flag url={bandeira(timeId)} />{sigla(timeId)}</>
                        : <span style={{ color: '#d1d5db', fontWeight: 400 }}>–</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <Legenda />
          </div>
        )
      })}
    </>
  )

  // ════════════════════════════════════════════════════════════════════════════
  // VISÃO POR JOGO — cabeçalho + grid de chips denso
  // ════════════════════════════════════════════════════════════════════════════
  const VisaoPorJogo = () => (
    <>
      {FASES_ORDEM.map(fase => {
        const jogsFase = jogosPorFase.get(fase) ?? []
        if (!jogsFase.length) return null
        return (
          <div key={fase} style={{ marginBottom: 10 }}>
            <span style={faseBg}>{FASE_LABELS[fase] ?? fase}</span>

            {jogsFase.map(jogo => {
              const mapa = palpiteMap.get(jogo.id)
              const resultado = jogo.encerrado && jogo.resultado
                ? `${jogo.resultado.golsCasa}–${jogo.resultado.golsVisitante}`
                : null

              return (
                <div key={jogo.id} style={{ marginBottom: 4, pageBreakInside: 'avoid' }}>
                  {/* Cabeçalho do jogo */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#f3f4f6', padding: '1px 4px', borderRadius: 2, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#374151', minWidth: 24 }}>#{jogo.numero}</span>
                    {jogo.dataHora && (
                      <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {jogo.dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })}{' '}
                        {jogo.dataHora.toDate().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
                      </span>
                    )}
                    <span style={{ fontSize: 9, display: 'flex', alignItems: 'center' }}>
                      {jogo.timeCasa
                        ? <><Flag url={bandeira(jogo.timeCasa)} /><strong>{sigla(jogo.timeCasa)}</strong></>
                        : <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>TBD</span>}
                    </span>
                    <span style={{ fontSize: 10, color: '#9ca3af' }}>vs</span>
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

                  {/* Grid de chips por usuário — 6 colunas */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1px 3px' }}>
                    {usuarios.map(u => {
                      const p = mapa?.get(u.uid)
                      const bg = p ? bgAcerto(p, jogo) || '#f3f4f6' : '#f9fafb'
                      const nomeExib = u.apelido || u.nome || '?'
                      return (
                        <div
                          key={u.uid}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center', flexDirection: 'column',
                            backgroundColor: bg,
                            padding: '1px 3px',
                            borderRadius: 2,
                            fontSize: 9,
                          }}
                        >
                          <span style={{ color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nomeExib}</span>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', marginLeft: 3, flexShrink: 0 }}>
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

      {/* Especiais por jogo — seção final (tabela mantida) */}
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

      <div style={{ padding: '10px 12px', backgroundColor: '#fff' }} className="print:p-1">
        {visao === 'usuario' ? <VisaoPorUsuario /> : <VisaoPorJogo />}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 6mm; }
          body { font-size: 9px; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </>
  )
}
