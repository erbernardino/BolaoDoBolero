import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { NotificacoesBell } from './NotificacoesBell'
import { BannerLiberacao } from './BannerLiberacao'

function Avatar({ src, nome, size = 'sm' }: { src?: string | null; nome?: string; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  const inicial = (nome || '?')[0].toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={nome || 'Perfil'}
        className={`${dim} rounded-full object-cover ring-2 ring-white/30`}
        referrerPolicy="no-referrer"
      />
    )
  }

  return (
    <div className={`${dim} rounded-full bg-white/20 ring-2 ring-white/30 flex items-center justify-center font-bold text-white`}>
      {inicial}
    </div>
  )
}

export function Navbar() {
  const { firebaseUser, usuario } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const isActive = (path: string) => location.pathname === path

  const liberado = usuario?.liberado !== false

  const navLinks = [
    { to: '/palpites', label: 'Palpites' },
    ...(liberado ? [
      { to: '/todos-palpites', label: 'Geral' },
      { to: '/ranking', label: 'Ranking' },
    ] : []),
    { to: '/regulamento', label: 'Regulamento' },
    { to: '/formato-copa', label: 'Formato Copa' },
    ...(usuario?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  const displayName = usuario?.apelido || usuario?.nome || firebaseUser?.displayName || 'Perfil'
  const photoURL = firebaseUser?.photoURL

  return (
    <>
    <nav className="bg-gradient-to-r from-blue-900 to-blue-700 text-white shadow-lg relative z-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14">
        <Link to="/" className="font-black text-lg tracking-tight hover:text-blue-200 transition-colors">
          Bolão do Bolero (Duda)
        </Link>

        {/* Desktop links + avatar */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                isActive(link.to)
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {firebaseUser && <NotificacoesBell />}
          {firebaseUser && (
            <Link
              to="/perfil"
              className={`ml-2 flex items-center gap-2 px-2 py-1 rounded-full transition-all ${
                isActive('/perfil')
                  ? 'bg-white/20'
                  : 'hover:bg-white/10'
              }`}
            >
              <Avatar src={photoURL} nome={displayName} size="sm" />
              <span className="text-sm font-medium max-w-24 truncate">{displayName}</span>
            </Link>
          )}
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="md:hidden flex items-center gap-1">
          {firebaseUser && <NotificacoesBell />}
          {firebaseUser && (
            <Link to="/perfil" onClick={() => setMenuOpen(false)}>
              <Avatar src={photoURL} nome={displayName} size="sm" />
            </Link>
          )}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Menu"
          >
            <div className="w-5 flex flex-col gap-1.5">
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block h-0.5 bg-white rounded transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-3 pb-3 pt-1 flex flex-col gap-1 border-t border-white/10">
          {/* User info row */}
          {firebaseUser && (
            <Link
              to="/perfil"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 mb-1 rounded-lg hover:bg-white/10 transition-all"
            >
              <Avatar src={photoURL} nome={displayName} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs text-blue-200 truncate">{usuario?.email || firebaseUser.phoneNumber || ''}</p>
              </div>
            </Link>
          )}

          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive(link.to)
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
    <BannerLiberacao />
    </>
  )
}
