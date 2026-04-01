import { NavLink, Routes, Route, Navigate } from 'react-router-dom'
import { Navbar } from '../../components/Navbar'
import { GerenciarTimes } from './GerenciarTimes'
import { GerenciarConvites } from './GerenciarConvites'
import { Configuracoes } from './Configuracoes'

const NAV_LINKS = [
  { to: '/admin/times', label: 'Times' },
  { to: '/admin/jogos', label: 'Jogos' },
  { to: '/admin/resultados', label: 'Resultados' },
  { to: '/admin/convites', label: 'Convites' },
  { to: '/admin/config', label: 'Configurações' },
]

export function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <nav className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-blue-700 text-blue-700'
                    : 'border-transparent text-gray-600 hover:text-blue-700'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main>
        <Routes>
          <Route index element={<Navigate to="times" replace />} />
          <Route path="times" element={<GerenciarTimes />} />
          <Route path="jogos" element={<div>Em breve</div>} />
          <Route path="resultados" element={<div>Em breve</div>} />
          <Route path="convites" element={<GerenciarConvites />} />
          <Route path="config" element={<Configuracoes />} />
        </Routes>
      </main>
    </div>
  )
}
