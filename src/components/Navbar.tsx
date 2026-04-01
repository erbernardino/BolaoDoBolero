import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function Navbar() {
  const { usuario } = useAuth()

  return (
    <nav className="bg-blue-800 text-white px-6 py-4 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold hover:text-blue-200 transition-colors">
        Bolão do Bolero
      </Link>
      <div className="flex items-center gap-6">
        <Link to="/palpites" className="hover:text-blue-200 transition-colors">
          Palpites
        </Link>
        <Link to="/ranking" className="hover:text-blue-200 transition-colors">
          Ranking
        </Link>
        <Link to="/regulamento" className="hover:text-blue-200 transition-colors">
          Regulamento
        </Link>
        {usuario?.role === 'admin' && (
          <Link to="/admin" className="hover:text-blue-200 transition-colors font-semibold">
            Admin
          </Link>
        )}
      </div>
    </nav>
  )
}
