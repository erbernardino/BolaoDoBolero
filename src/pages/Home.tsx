import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { collection, getDocs, getCountFromServer, query, where } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { AoVivo } from '../components/AoVivo'
import { useRemoteFlag } from '../hooks/useRemoteConfig'
import type { Jogo, Time, Ranking as RankingType } from '../types'

const FONT_DISPLAY = "'Anton', 'Arial Narrow', sans-serif"
const FONT_BODY = "'Manrope', system-ui, sans-serif"
const FONT_SERIF = "'Newsreader', Georgia, serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace"

const PITCH = '#34d399'
const PITCH_DIM = '#10b98140'
const INK = '#f5f3ee'
const MUTED = '#8a93ad'
const RULE = '#1e2436'
const SURFACE = '#0f1422'
const BG = '#0a0e1a'

function ContagemRegressiva({ dataAlvo }: { dataAlvo: Date }) {
  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const diff = dataAlvo.getTime() - agora.getTime()
  if (diff <= 0) {
    return (
      <div className="text-center py-6">
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: '2.5rem', letterSpacing: '0.02em', color: PITCH }}>
          A COPA COMEÇOU
        </span>
      </div>
    )
  }

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const segundos = Math.floor((diff % (1000 * 60)) / 1000)

  const cells = [
    { valor: dias, label: 'DIAS' },
    { valor: horas, label: 'HRS' },
    { valor: minutos, label: 'MIN' },
    { valor: segundos, label: 'SEG' },
  ]

  return (
    <div className="grid grid-cols-4 gap-1">
      {cells.map(({ valor, label }, i) => (
        <div key={label} className="text-center relative">
          <div
            className="py-3 px-1 border-y border-l last:border-r"
            style={{
              borderColor: RULE,
              background: 'linear-gradient(180deg, rgba(52,211,153,0.04), rgba(0,0,0,0))',
            }}
          >
            <div
              style={{
                fontFamily: FONT_MONO,
                fontWeight: 700,
                fontSize: 'clamp(2rem, 9vw, 3.5rem)',
                lineHeight: 1,
                color: INK,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(valor).padStart(2, '0')}
            </div>
            <div
              className="mt-2"
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: '0.65rem',
                letterSpacing: '0.35em',
                color: MUTED,
              }}
            >
              {label}
            </div>
          </div>
          {i < 3 && (
            <span
              aria-hidden
              className="absolute top-1/2 -right-1 -translate-y-1/2 hidden"
              style={{ color: PITCH, fontFamily: FONT_MONO }}
            >
              :
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: '0.7rem',
        letterSpacing: '0.4em',
        color: MUTED,
      }}
    >
      {children}
    </span>
  )
}

function formatHojeBR(d: Date) {
  const semana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][d.getDay()]
  const dia = String(d.getDate()).padStart(2, '0')
  const meses = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
  return `${semana} · ${dia} ${meses[d.getMonth()]}`
}

export function Home() {
  const { firebaseUser, usuario } = useAuth()
  const [posicaoRanking, setPosicaoRanking] = useState<number | null>(null)
  const [totalParticipantes, setTotalParticipantes] = useState(0)
  const [pontosUsuario, setPontosUsuario] = useState(0)
  const [proximosJogos, setProximosJogos] = useState<(Jogo & { timeCasaObj?: Time; timeVisitanteObj?: Time })[]>([])
  const [totalPalpites, setTotalPalpites] = useState(0)
  const [totalJogos, setTotalJogos] = useState(0)

  const perfilIncompleto = usuario &&
    ((usuario.nome?.trim()?.length ?? 0) < 2 || (usuario.apelido?.trim()?.length ?? 0) < 2)
  const liberado = usuario?.liberado === true
  const homeEnriched = useRemoteFlag('feature_home_enriched', true)

  useEffect(() => {
    async function load() {
      if (!firebaseUser) return

      const [rankingSnap, jogosSnap, timesSnap, meusPalpitesCount] = await Promise.all([
        getDocs(collection(db, 'ranking')),
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        getCountFromServer(query(
          collection(db, 'palpites'),
          where('uid', '==', firebaseUser.uid),
        )),
      ])

      const rankings = rankingSnap.docs.map(d => ({ uid: d.id, ...d.data() } as RankingType))
      rankings.sort((a, b) => b.pontosTotal - a.pontosTotal)
      setTotalParticipantes(rankings.length)
      const idx = rankings.findIndex(r => r.uid === firebaseUser.uid)
      if (idx >= 0) {
        setPosicaoRanking(idx + 1)
        setPontosUsuario(rankings[idx].pontosTotal)
      }

      const timesMap = new Map<string, Time>()
      timesSnap.docs.forEach(d => timesMap.set(d.id, { id: d.id, ...d.data() } as Time))

      const agora = Date.now()
      const jogos = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Jogo))
      setTotalJogos(jogos.length)
      const proximos = jogos
        .filter(j => !j.encerrado && !j.aoVivo && j.dataHora.toMillis() > agora && j.timeCasa)
        .sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
        .slice(0, 3)
        .map(j => ({
          ...j,
          timeCasaObj: timesMap.get(j.timeCasa),
          timeVisitanteObj: timesMap.get(j.timeVisitante),
        }))
      setProximosJogos(proximos)

      setTotalPalpites(meusPalpitesCount.data().count)
    }
    load()
  }, [firebaseUser])

  const dataCopa = new Date('2026-06-11T00:00:00Z')
  const apelido = (usuario?.apelido ?? 'participante').toUpperCase()
  const hoje = formatHojeBR(new Date())

  const navItems = [
    { num: '01', to: '/palpites', titulo: 'Palpites', sub: 'Registre suas previsões para os jogos.', show: true },
    { num: '02', to: '/ranking', titulo: 'Ranking', sub: 'Classificação dos participantes.', show: !!liberado },
    { num: '03', to: '/regulamento', titulo: 'Regulamento', sub: 'Pontuação, mata-mata e regras.', show: true },
    { num: '04', to: '/admin', titulo: 'Admin', sub: 'Gerenciar jogos, times e convites.', show: usuario?.role === 'admin', tone: 'danger' as const },
  ].filter(i => i.show)

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: BG, color: INK, fontFamily: FONT_BODY }}
    >
      {/* Decorative pitch lines (subtle vertical stripes evoking stadium grass) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          background: `repeating-linear-gradient(90deg, transparent 0 56px, ${PITCH} 56px 57px)`,
        }}
      />
      {/* Grain overlay */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='1'/></svg>\")",
        }}
      />
      {/* Soft pitch glow at top */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[120vw] h-[40vh] opacity-30"
        style={{
          background: `radial-gradient(ellipse at center, ${PITCH_DIM} 0%, transparent 60%)`,
        }}
      />

      <Navbar />

      <main className="relative max-w-3xl mx-auto px-5 sm:px-8 pt-6 pb-20">
        {/* MASTHEAD */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: PITCH, boxShadow: `0 0 12px ${PITCH}` }}
            />
            <Eyebrow>MATCHDAY · {hoje}</Eyebrow>
          </div>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(2.6rem, 9vw, 4.75rem)',
              lineHeight: 0.88,
              letterSpacing: '-0.01em',
              color: INK,
            }}
          >
            BOA NOITE,
            <br />
            <span style={{ color: PITCH }}>{apelido}</span>
            <span style={{ color: PITCH }}>.</span>
          </h1>
          <p
            className="mt-5 max-w-md"
            style={{ fontFamily: FONT_SERIF, fontStyle: 'italic', color: MUTED, fontSize: '1.05rem' }}
          >
            Bolão da Copa do Mundo entre amigos. Pontuação, palpites e a contagem que importa.
          </p>
          <div className="mt-7 h-px" style={{ background: `linear-gradient(90deg, ${PITCH} 0, ${PITCH} 60px, ${RULE} 60px, ${RULE} 100%)` }} />
        </header>

        {homeEnriched && usuario && (
          <div className="mb-8">
            <AoVivo uid={usuario.uid} />
          </div>
        )}

        {perfilIncompleto && (
          <Link
            to="/perfil"
            className="block mb-8 group"
          >
            <div
              className="flex items-center gap-4 p-4 transition-transform group-hover:translate-x-1"
              style={{
                background: 'rgba(251, 191, 36, 0.08)',
                borderLeft: '3px solid #fbbf24',
              }}
            >
              <div
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: '0.7rem',
                  letterSpacing: '0.3em',
                  color: '#fbbf24',
                }}
              >
                ALERTA
              </div>
              <p style={{ fontFamily: FONT_SERIF, color: '#fbbf24', fontSize: '0.95rem' }}>
                Perfil incompleto. <span className="underline">Complete nome e apelido.</span>
              </p>
            </div>
          </Link>
        )}

        {/* SCOREBOARD — countdown */}
        {homeEnriched && dataCopa.getTime() > Date.now() && (
          <section className="mb-10">
            <div className="flex items-baseline justify-between mb-3">
              <Eyebrow>KICKOFF</Eyebrow>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: '0.7rem',
                  color: MUTED,
                  letterSpacing: '0.1em',
                }}
              >
                11.JUN.2026
              </span>
            </div>
            <ContagemRegressiva dataAlvo={dataCopa} />
          </section>
        )}

        {/* STATS — editorial */}
        {homeEnriched && liberado && (
          <section className="mb-12">
            <div className="grid grid-cols-3 gap-2 sm:gap-6">
              {[
                {
                  label: 'POSIÇÃO',
                  big: posicaoRanking !== null ? String(posicaoRanking) : '—',
                  small: totalParticipantes ? `/${totalParticipantes}` : null,
                  accent: PITCH,
                },
                {
                  label: 'PONTOS',
                  big: String(pontosUsuario),
                  small: null,
                  accent: INK,
                },
                {
                  label: 'PALPITES',
                  big: String(totalPalpites),
                  small: totalJogos ? `/${totalJogos}` : null,
                  accent: '#fbbf24',
                },
              ].map(({ label, big, small, accent }) => (
                <div key={label} className="relative">
                  <div className="flex items-baseline gap-1">
                    <span
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: 'clamp(2.8rem, 11vw, 4.75rem)',
                        lineHeight: 0.9,
                        color: accent,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {big}
                    </span>
                    {small && (
                      <span
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: '0.85rem',
                          color: MUTED,
                        }}
                      >
                        {small}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 h-px w-8" style={{ background: accent }} />
                  <div
                    className="mt-2"
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: '0.65rem',
                      letterSpacing: '0.35em',
                      color: MUTED,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRÓXIMOS JOGOS — editorial schedule */}
        {homeEnriched && proximosJogos.length > 0 && (
          <section className="mb-12">
            <div className="flex items-baseline justify-between mb-4">
              <Eyebrow>PRÓXIMOS JOGOS</Eyebrow>
              <span style={{ fontFamily: FONT_MONO, fontSize: '0.7rem', color: MUTED }}>
                {String(proximosJogos.length).padStart(2, '0')}
              </span>
            </div>
            <ul>
              {proximosJogos.map((jogo, i) => (
                <li
                  key={jogo.id}
                  className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-3 py-4"
                  style={{ borderTop: i === 0 ? `1px solid ${RULE}` : 'none', borderBottom: `1px solid ${RULE}` }}
                >
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.7rem',
                      color: MUTED,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {jogo.dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-2 min-w-0">
                    {jogo.timeCasaObj?.bandeira && (
                      <img src={jogo.timeCasaObj.bandeira} alt="" className="w-5 h-3.5 object-cover" />
                    )}
                    <span
                      className="truncate"
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: '1.05rem',
                        letterSpacing: '0.04em',
                        color: INK,
                      }}
                    >
                      {(jogo.timeCasaObj?.nome ?? 'A definir').toUpperCase()}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.7rem',
                      color: PITCH,
                      letterSpacing: '0.15em',
                    }}
                  >
                    VS
                  </span>
                  <div className="flex items-center gap-2 justify-end min-w-0">
                    <span
                      className="truncate text-right"
                      style={{
                        fontFamily: FONT_DISPLAY,
                        fontSize: '1.05rem',
                        letterSpacing: '0.04em',
                        color: INK,
                      }}
                    >
                      {(jogo.timeVisitanteObj?.nome ?? 'A definir').toUpperCase()}
                    </span>
                    {jogo.timeVisitanteObj?.bandeira && (
                      <img src={jogo.timeVisitanteObj.bandeira} alt="" className="w-5 h-3.5 object-cover" />
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.65rem',
                      color: MUTED,
                    }}
                  >
                    →
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* NAV CARDS — numbered editorial */}
        <section>
          <Eyebrow>SEÇÕES</Eyebrow>
          <div className="mt-4 grid gap-px sm:grid-cols-2" style={{ background: RULE }}>
            {navItems.map(({ num, to, titulo, sub, tone }) => (
              <Link
                key={to}
                to={to}
                className="group relative block p-6 transition-colors"
                style={{ background: SURFACE }}
              >
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: '0.7rem',
                    color: MUTED,
                    letterSpacing: '0.1em',
                  }}
                >
                  {num}
                </span>
                <h2
                  className="mt-2"
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: '1.65rem',
                    letterSpacing: '0.02em',
                    color: tone === 'danger' ? '#ef4444' : INK,
                  }}
                >
                  {titulo.toUpperCase()}
                </h2>
                <p
                  className="mt-1"
                  style={{
                    fontFamily: FONT_SERIF,
                    fontSize: '0.95rem',
                    fontStyle: 'italic',
                    color: MUTED,
                  }}
                >
                  {sub}
                </p>
                <span
                  className="absolute right-5 top-1/2 -translate-y-1/2 transition-transform group-hover:translate-x-1"
                  style={{
                    fontFamily: FONT_MONO,
                    color: tone === 'danger' ? '#ef4444' : PITCH,
                  }}
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-16 flex items-center justify-between">
          <span style={{ fontFamily: FONT_MONO, fontSize: '0.65rem', color: MUTED, letterSpacing: '0.15em' }}>
            BOLÃO DO BOLERO · 2026
          </span>
          <button
            onClick={() => signOut(auth)}
            className="transition-colors hover:text-white"
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: '0.75rem',
              letterSpacing: '0.3em',
              color: MUTED,
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
            }}
          >
            SAIR
          </button>
        </div>
      </main>
    </div>
  )
}
