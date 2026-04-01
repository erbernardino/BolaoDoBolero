import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'

export function Home() {
  const { usuario } = useAuth()

  const perfilIncompleto = usuario &&
    ((usuario.nome?.trim()?.length ?? 0) < 2 || (usuario.apelido?.trim()?.length ?? 0) < 2)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Bem-vindo, {usuario?.apelido ?? 'participante'}!
        </h1>
        <p className="text-gray-500 mb-8">O que você quer fazer hoje?</p>

        {perfilIncompleto && (
          <Link
            to="/perfil"
            className="block mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-xl text-yellow-800 text-sm"
          >
            Seu perfil está incompleto. <span className="font-semibold underline">Clique aqui para preencher seu nome e apelido.</span>
          </Link>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/palpites"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-100 transition-shadow"
          >
            <h2 className="text-lg font-semibold text-blue-700 mb-1">Palpites</h2>
            <p className="text-sm text-gray-500">Registre seus palpites para os jogos.</p>
          </Link>

          <Link
            to="/ranking"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-100 transition-shadow"
          >
            <h2 className="text-lg font-semibold text-blue-700 mb-1">Ranking</h2>
            <p className="text-sm text-gray-500">Veja a classificação dos participantes.</p>
          </Link>

          <Link
            to="/regulamento"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-100 transition-shadow"
          >
            <h2 className="text-lg font-semibold text-blue-700 mb-1">Regulamento</h2>
            <p className="text-sm text-gray-500">Confira as regras do bolão.</p>
          </Link>

          {usuario?.role === 'admin' && (
            <Link
              to="/admin"
              className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-100 transition-shadow"
            >
              <h2 className="text-lg font-semibold text-red-600 mb-1">Admin</h2>
              <p className="text-sm text-gray-500">Gerencie jogos, times e convites.</p>
            </Link>
          )}
        </div>

        <button
          onClick={() => signOut(auth)}
          className="mt-10 px-5 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors text-sm"
        >
          Sair
        </button>
      </main>
    </div>
  )
}
