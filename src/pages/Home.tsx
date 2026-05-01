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
const FONT_SERIF = "'Newsreader', Georgia, 'Times New Roman', serif"
const FONT_BODY = "'Manrope', system-ui, -apple-system, sans-serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace"

const BG = '#fbf8f3'
const SURFACE = '#ffffff'
const SURFACE_2 = '#f3ede2'
const INK = '#0d1620'
const INK_2 = '#2c3540'
const MUTED = '#5d6573'
const RULE = '#dcd4c4'
const PITCH = '#0d7c4f'
const PITCH_LIGHT = '#15a368'
const GOLD = '#a16207'
const RED = '#b91c1c'

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
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: '2.75rem', letterSpacing: '0.02em', color: PITCH }}>
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
    { valor: dias, label: 'dias' },
    { valor: horas, label: 'horas' },
    { valor: minutos, label: 'min' },
    { valor: segundos, label: 'seg' },
  ]

  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {cells.map(({ valor, label }) => (
        <div
          key={label}
          className="text-center py-5 px-1 rounded-md"
          style={{
            background: SURFACE,
            border: `1px solid ${RULE}`,
          }}
        >
          <div
            style={{
              fontFamily: FONT_MONO,
              fontWeight: 700,
              fontSize: 'clamp(2.5rem, 10vw, 4rem)',
              lineHeight: 1,
              color: INK,
              letterSpacing: '-0.02em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {String(valor).padStart(2, '0')}
          </div>
          <div
            className="mt-3"
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 600,
              fontSize: '0.95rem',
              color: MUTED,
              letterSpacing: '0.02em',
            }}
          >
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

function Eyebrow({ children, color = MUTED }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      style={{
        fontFamily: FONT_BODY,
        fontWeight: 700,
        fontSize: '0.85rem',
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color,
      }}
    >
      {children}
    </span>
  )
}

function formatHojeBR(d: Date) {
  const semanas = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return `${semanas[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`
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
  const apelido = usuario?.apelido ?? 'Participante'
  const hoje = formatHojeBR(new Date())

  const navItems = [
    { num: '01', to: '/palpites', titulo: 'Palpites', sub: 'Registre suas previsões para os jogos da Copa.', show: true },
    { num: '02', to: '/ranking', titulo: 'Ranking', sub: 'Veja a classificação de todos os participantes.', show: !!liberado },
    { num: '03', to: '/regulamento', titulo: 'Regulamento', sub: 'Pontuação, mata-mata e regras do bolão.', show: true },
    { num: '04', to: '/admin', titulo: 'Admin', sub: 'Gerenciar jogos, times e convites.', show: usuario?.role === 'admin', tone: 'danger' as const },
  ].filter(i => i.show)

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{
        background: BG,
        color: INK,
        fontFamily: FONT_BODY,
        fontSize: '17px',
      }}
    >
      {/* Soft pitch tint at top — subtle, doesn't reduce contrast */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[120vw] h-[36vh] opacity-40"
        style={{
          background: `radial-gradient(ellipse at center, ${PITCH_LIGHT}22 0%, transparent 65%)`,
        }}
      />

      <Navbar />

      <main className="relative max-w-3xl mx-auto px-5 sm:px-8 pt-6 pb-20">
        {/* MASTHEAD */}
        <header className="mb-10">
          <div className="flex items-center gap-2.5 mb-5">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: PITCH, boxShadow: `0 0 0 4px ${PITCH}22` }}
            />
            <Eyebrow color={PITCH}>Hoje · {hoje}</Eyebrow>
          </div>
          <h1
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: 'clamp(2.6rem, 9vw, 4.5rem)',
              lineHeight: 0.92,
              letterSpacing: '-0.01em',
              color: INK,
            }}
          >
            BOA NOITE,
            <br />
            <span style={{ color: PITCH }}>{apelido.toUpperCase()}</span>
            <span style={{ color: PITCH }}>.</span>
          </h1>
          <p
            className="mt-5 max-w-md"
            style={{
              fontFamily: FONT_SERIF,
              fontSize: '1.15rem',
              lineHeight: 1.55,
              color: INK_2,
            }}
          >
            Bolão da Copa do Mundo entre amigos. Aqui você acompanha
            seus palpites, sua pontuação e os próximos jogos.
          </p>
          <div
            className="mt-7 h-px"
            style={{
              background: `linear-gradient(90deg, ${PITCH} 0, ${PITCH} 80px, ${RULE} 80px, ${RULE} 100%)`,
            }}
          />
        </header>

        {homeEnriched && usuario && (
          <div className="mb-8">
            <AoVivo uid={usuario.uid} />
          </div>
        )}

        {perfilIncompleto && (
          <Link to="/perfil" className="block mb-8 group">
            <div
              className="flex items-center gap-4 p-5 rounded-md transition-transform group-hover:translate-x-1"
              style={{
                background: '#fff7e6',
                border: `1px solid ${GOLD}66`,
                borderLeft: `4px solid ${GOLD}`,
              }}
            >
              <Eyebrow color={GOLD}>Atenção</Eyebrow>
              <p
                style={{
                  fontFamily: FONT_SERIF,
                  fontSize: '1.05rem',
                  color: INK,
                  lineHeight: 1.45,
                }}
              >
                Seu perfil está incompleto.{' '}
                <span style={{ color: GOLD, fontWeight: 600, textDecoration: 'underline' }}>
                  Complete seu nome e apelido.
                </span>
              </p>
            </div>
          </Link>
        )}

        {/* SCOREBOARD — countdown */}
        {homeEnriched && dataCopa.getTime() > Date.now() && (
          <section className="mb-12">
            <div className="flex items-baseline justify-between mb-4">
              <Eyebrow>Faltam para o início</Eyebrow>
              <span
                style={{
                  fontFamily: FONT_MONO,
                  fontSize: '0.95rem',
                  color: INK_2,
                  fontWeight: 500,
                }}
              >
                11 / Jun / 2026
              </span>
            </div>
            <ContagemRegressiva dataAlvo={dataCopa} />
          </section>
        )}

        {/* STATS — large editorial numbers */}
        {homeEnriched && liberado && (
          <section className="mb-14">
            <Eyebrow>Sua participação</Eyebrow>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:gap-6">
              {[
                {
                  label: 'Posição',
                  big: posicaoRanking !== null ? String(posicaoRanking) : '—',
                  small: totalParticipantes ? `de ${totalParticipantes}` : null,
                  accent: PITCH,
                },
                {
                  label: 'Pontos',
                  big: String(pontosUsuario),
                  small: null,
                  accent: INK,
                },
                {
                  label: 'Palpites',
                  big: String(totalPalpites),
                  small: totalJogos ? `de ${totalJogos}` : null,
                  accent: GOLD,
                },
              ].map(({ label, big, small, accent }) => (
                <div
                  key={label}
                  className="p-4 sm:p-5 rounded-md"
                  style={{ background: SURFACE, border: `1px solid ${RULE}` }}
                >
                  <div
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontSize: 'clamp(2.75rem, 11vw, 4.5rem)',
                      lineHeight: 0.95,
                      color: accent,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {big}
                  </div>
                  {small && (
                    <div
                      className="mt-1"
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: '0.95rem',
                        color: MUTED,
                        fontWeight: 500,
                      }}
                    >
                      {small}
                    </div>
                  )}
                  <div className="mt-3 h-0.5 w-10" style={{ background: accent }} />
                  <div
                    className="mt-2"
                    style={{
                      fontFamily: FONT_BODY,
                      fontWeight: 600,
                      fontSize: '1rem',
                      color: INK_2,
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PRÓXIMOS JOGOS */}
        {homeEnriched && proximosJogos.length > 0 && (
          <section className="mb-14">
            <Eyebrow>Próximos jogos</Eyebrow>
            <ul className="mt-4">
              {proximosJogos.map((jogo, i) => (
                <li
                  key={jogo.id}
                  className="grid grid-cols-[auto_1fr_auto_1fr] sm:grid-cols-[5.5rem_1fr_auto_1fr] items-center gap-3 sm:gap-5 py-5"
                  style={{
                    borderTop: i === 0 ? `1px solid ${RULE}` : 'none',
                    borderBottom: `1px solid ${RULE}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      color: INK_2,
                      letterSpacing: '0.02em',
                    }}
                  >
                    {jogo.dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-3 min-w-0">
                    {jogo.timeCasaObj?.bandeira && (
                      <img
                        src={jogo.timeCasaObj.bandeira}
                        alt=""
                        className="w-8 h-5.5 object-cover rounded-sm shadow-sm flex-shrink-0"
                        style={{ width: '32px', height: '22px' }}
                      />
                    )}
                    <span
                      className="truncate"
                      style={{
                        fontFamily: FONT_SERIF,
                        fontWeight: 500,
                        fontSize: '1.15rem',
                        color: INK,
                      }}
                    >
                      {jogo.timeCasaObj?.nome ?? 'A definir'}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: FONT_BODY,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: PITCH,
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                    }}
                  >
                    vs
                  </span>
                  <div className="flex items-center gap-3 justify-end min-w-0">
                    <span
                      className="truncate text-right"
                      style={{
                        fontFamily: FONT_SERIF,
                        fontWeight: 500,
                        fontSize: '1.15rem',
                        color: INK,
                      }}
                    >
                      {jogo.timeVisitanteObj?.nome ?? 'A definir'}
                    </span>
                    {jogo.timeVisitanteObj?.bandeira && (
                      <img
                        src={jogo.timeVisitanteObj.bandeira}
                        alt=""
                        className="object-cover rounded-sm shadow-sm flex-shrink-0"
                        style={{ width: '32px', height: '22px' }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* NAV CARDS */}
        <section>
          <Eyebrow>Acessar</Eyebrow>
          <div
            className="mt-4 grid gap-px sm:grid-cols-2 rounded-md overflow-hidden"
            style={{ background: RULE, border: `1px solid ${RULE}` }}
          >
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
                    fontSize: '0.85rem',
                    color: MUTED,
                    fontWeight: 500,
                    letterSpacing: '0.05em',
                  }}
                >
                  {num}
                </span>
                <h2
                  className="mt-3"
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: '1.85rem',
                    letterSpacing: '0.01em',
                    color: tone === 'danger' ? RED : INK,
                  }}
                >
                  {titulo.toUpperCase()}
                </h2>
                <p
                  className="mt-2 pr-10"
                  style={{
                    fontFamily: FONT_SERIF,
                    fontSize: '1.05rem',
                    color: INK_2,
                    lineHeight: 1.45,
                  }}
                >
                  {sub}
                </p>
                <span
                  aria-hidden
                  className="absolute right-5 top-1/2 -translate-y-1/2 transition-transform group-hover:translate-x-1.5"
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: '1.5rem',
                    color: tone === 'danger' ? RED : PITCH,
                  }}
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-16 flex items-center justify-between">
          <span
            style={{
              fontFamily: FONT_SERIF,
              fontSize: '0.95rem',
              fontStyle: 'italic',
              color: MUTED,
            }}
          >
            Bolão do Bolero · Copa do Mundo 2026
          </span>
          <button
            onClick={() => signOut(auth)}
            className="transition-colors"
            style={{
              fontFamily: FONT_BODY,
              fontWeight: 600,
              fontSize: '1rem',
              color: INK_2,
              padding: '8px 18px',
              borderRadius: '6px',
              background: SURFACE_2,
              border: `1px solid ${RULE}`,
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = SURFACE }}
            onMouseOut={(e) => { e.currentTarget.style.background = SURFACE_2 }}
          >
            Sair
          </button>
        </div>
      </main>
    </div>
  )
}
