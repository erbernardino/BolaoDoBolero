import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { BannerLiberacao } from './BannerLiberacao'
import { Avatar } from './Avatar'

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
  logout: ({ className }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
}

type NavLinkItem = { to: string; label: string; icon: (p: IconProps) => React.JSX.Element; danger?: boolean }

export function Navbar() {
  const { firebaseUser, usuario } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

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

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
    <nav className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg relative z-50">
      {/* TIER 1 — Identidade + perfil + sair (desktop) | Logo + avatar + hamburger (mobile) */}
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 gap-3">
        <Link to="/" className="flex items-baseline gap-2 min-w-0 hover:text-blue-200 transition-colors" onClick={closeMenu}>
          <span
            style={{
              fontFamily: "'Anton', 'Arial Narrow', sans-serif",
              fontSize: '1.5rem',
              letterSpacing: '0.02em',
              lineHeight: 1,
            }}
          >
            BOLERO
          </span>
          <span
            className="text-yellow-300"
            style={{
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            2026
          </span>
          <span
            className="hidden sm:inline text-blue-200 truncate"
            style={{
              fontFamily: "'Newsreader', Georgia, serif",
              fontStyle: 'italic',
              fontSize: '0.95rem',
            }}
          >
            · Bolão da Copa
          </span>
        </Link>

        {/* Desktop: avatar + sair */}
        <div className="hidden md:flex items-center gap-2">
          {firebaseUser && (
            <Link
              to="/perfil"
              className={`flex items-center gap-2 px-2 py-1 rounded-md transition-colors ${
                isActive('/perfil') ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <Avatar src={photoURL} nome={displayName} uid={firebaseUser.uid} size="sm" />
              <span className="max-w-32 truncate" style={{ fontSize: '0.95rem', fontWeight: 600 }}>
                {displayName}
              </span>
            </Link>
          )}
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/30 hover:bg-white/10 transition-colors"
            style={{ fontSize: '0.9rem', fontWeight: 600 }}
            aria-label="Sair"
          >
            <Icons.logout className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          {firebaseUser && (
            <Link to="/perfil" onClick={closeMenu} className="p-1">
              <Avatar src={photoURL} nome={displayName} uid={firebaseUser.uid} size="sm" />
            </Link>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
          >
            <div className="w-6 flex flex-col gap-1.5">
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* TIER 2 — Links horizontais (desktop apenas) */}
      <div className="hidden md:block bg-blue-800/40 border-t border-white/10">
        <div className="max-w-3xl mx-auto px-2 flex items-stretch">
          {navLinks.map((link) => {
            const active = isActive(link.to)
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`relative flex items-center gap-2 px-4 py-3 transition-colors ${
                  active
                    ? link.danger ? 'text-red-200' : 'text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
                style={{ fontSize: '1rem', fontWeight: active ? 700 : 500 }}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{link.label}</span>
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-2 right-2 bottom-0"
                    style={{
                      height: '3px',
                      background: link.danger ? '#fca5a5' : '#fde047',
                      borderRadius: '2px 2px 0 0',
                    }}
                  />
                )}
              </Link>
            )
          })}
        </div>
      </div>

      {/* MOBILE — menu dropdown (vertical, com icones, fonte maior) */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-white/10 ${
          menuOpen ? 'max-h-[480px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-3 pt-2 flex flex-col gap-1">
          {firebaseUser && (
            <Link
              to="/perfil"
              onClick={closeMenu}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                isActive('/perfil') ? 'bg-white/20' : 'hover:bg-white/10'
              }`}
            >
              <Avatar src={photoURL} nome={displayName} uid={firebaseUser.uid} size="md" />
              <div className="min-w-0">
                <p className="truncate" style={{ fontSize: '1rem', fontWeight: 700 }}>{displayName}</p>
                <p className="text-blue-200 truncate" style={{ fontSize: '0.85rem' }}>
                  {usuario?.email || firebaseUser.phoneNumber || 'Ver meu perfil'}
                </p>
              </div>
            </Link>
          )}

          {navLinks.map((link) => {
            const active = isActive(link.to)
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  active
                    ? 'bg-white/20 text-white'
                    : link.danger
                      ? 'text-red-200 hover:bg-white/10 hover:text-red-100'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
                style={{ fontSize: '1.05rem', fontWeight: active ? 700 : 500 }}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{link.label}</span>
              </Link>
            )
          })}

          <button
            onClick={() => { closeMenu(); signOut(auth) }}
            className="flex items-center gap-3 px-3 py-3 rounded-lg border-t border-white/10 mt-1 pt-3 hover:bg-white/10 transition-colors text-left"
            style={{ fontSize: '1rem', fontWeight: 600 }}
          >
            <Icons.logout className="w-5 h-5 flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </nav>
    <BannerLiberacao />
    </>
  )
}
