import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { BannerLiberacao } from './BannerLiberacao'
import { Avatar } from './Avatar'

const FONT_DISPLAY = "'Anton', 'Arial Narrow', sans-serif"
const FONT_SERIF = "'Newsreader', Georgia, serif"
const FONT_BODY = "'Manrope', system-ui, -apple-system, sans-serif"
const FONT_MONO = "'JetBrains Mono', ui-monospace, monospace"

const BG_TIER1 = '#fbf8f3'
const BG_TIER2 = '#ffffff'
const RULE = '#dcd4c4'
const INK = '#0d1620'
const INK_2 = '#2c3540'
const MUTED = '#5d6573'
const PITCH = '#0d7c4f'
const PITCH_BG = '#0d7c4f10'
const HOVER = '#f3ede2'
const RED = '#b91c1c'

type IconProps = { className?: string }

const Icons = {
  palpites: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  geral: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ranking: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2" />
      <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2" />
      <path d="M6 3h12v6a6 6 0 0 1-12 0V3z" />
      <path d="M9 21h6" />
      <path d="M12 17v4" />
    </svg>
  ),
  regulamento: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h6" />
    </svg>
  ),
  formato: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 6h4l3 6-3 6H3" />
      <path d="M14 6h4l3 6-3 6h-4" />
      <path d="M10 12h4" />
    </svg>
  ),
  admin: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
}

type NavLinkItem = { to: string; label: string; icon: (p: IconProps) => React.JSX.Element; danger?: boolean }

export function Navbar() {
  const { firebaseUser, usuario } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path
  const liberado = usuario?.liberado === true

  const navLinks: NavLinkItem[] = [
    { to: '/palpites', label: 'Palpites', icon: Icons.palpites },
    ...(liberado ? [
      { to: '/todos-palpites', label: 'Geral', icon: Icons.geral },
      { to: '/ranking', label: 'Ranking', icon: Icons.ranking },
    ] : []),
    { to: '/regulamento', label: 'Regulamento', icon: Icons.regulamento },
    { to: '/formato-copa', label: 'Formato Copa', icon: Icons.formato },
    ...(usuario?.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: Icons.admin, danger: true }] : []),
  ]

  const displayName = usuario?.apelido || usuario?.nome || firebaseUser?.displayName || 'Perfil'
  const photoURL = usuario?.fotoURL ?? firebaseUser?.photoURL ?? null

  return (
    <>
    <header className="sticky top-0 z-50" style={{ fontFamily: FONT_BODY }}>
      {/* TIER 1 — Identidade + perfil + sair */}
      <div style={{ background: BG_TIER1, borderBottom: `1px solid ${RULE}` }}>
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-12 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-baseline gap-2 min-w-0 hover:opacity-80 transition-opacity">
            <span
              style={{
                fontFamily: FONT_DISPLAY,
                fontSize: '1.45rem',
                letterSpacing: '0.02em',
                color: INK,
                lineHeight: 1,
              }}
            >
              BOLERO
            </span>
            <span
              style={{
                fontFamily: FONT_MONO,
                fontSize: '0.7rem',
                color: PITCH,
                fontWeight: 700,
                letterSpacing: '0.05em',
              }}
            >
              2026
            </span>
            <span
              className="hidden sm:inline truncate"
              style={{
                fontFamily: FONT_SERIF,
                fontStyle: 'italic',
                fontSize: '0.95rem',
                color: MUTED,
              }}
            >
              · Bolão da Copa
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {firebaseUser && (
              <Link
                to="/perfil"
                className="flex items-center gap-2 px-2 py-1 rounded-md transition-colors"
                style={{
                  background: isActive('/perfil') ? PITCH_BG : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive('/perfil')) e.currentTarget.style.background = HOVER
                }}
                onMouseLeave={(e) => {
                  if (!isActive('/perfil')) e.currentTarget.style.background = 'transparent'
                }}
              >
                <Avatar src={photoURL} nome={displayName} uid={firebaseUser.uid} size="sm" />
                <span
                  className="hidden sm:inline max-w-32 truncate"
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: INK_2,
                  }}
                >
                  {displayName}
                </span>
              </Link>
            )}
            <button
              onClick={() => signOut(auth)}
              className="transition-colors"
              style={{
                fontSize: '0.9rem',
                fontWeight: 600,
                color: INK_2,
                padding: '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${RULE}`,
                background: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = HOVER }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              aria-label="Sair"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* TIER 2 — Links de navegacao (scrollavel horizontal no mobile) */}
      <nav
        className="navbar-tier2 overflow-x-auto"
        style={{
          background: BG_TIER2,
          borderBottom: `1px solid ${RULE}`,
          scrollbarWidth: 'none',
        }}
      >
        <style>{`.navbar-tier2::-webkit-scrollbar{display:none}`}</style>
        <div className="max-w-3xl mx-auto px-2 sm:px-6 flex items-stretch">
          {navLinks.map((link) => {
            const active = isActive(link.to)
            const Icon = link.icon
            const accent = link.danger ? RED : PITCH
            return (
              <Link
                key={link.to}
                to={link.to}
                className="relative flex items-center gap-2 px-4 sm:px-5 py-3 whitespace-nowrap transition-colors"
                style={{
                  fontSize: '1rem',
                  fontWeight: active ? 700 : 500,
                  color: active ? accent : INK_2,
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f8f4ec' }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{link.label}</span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-2 right-2 bottom-0"
                    style={{ height: '3px', background: accent, borderRadius: '2px 2px 0 0' }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
    <BannerLiberacao />
    </>
  )
}
