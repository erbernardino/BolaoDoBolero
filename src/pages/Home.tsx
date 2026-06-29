import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { collection, getDocs, getCountFromServer, getDoc, doc, query, where } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import { Navbar } from '../components/Navbar'
import { AoVivo } from '../components/AoVivo'
import { useRemoteFlag } from '../hooks/useRemoteConfig'
import { resolverTimeExibicao, resolverTimeIdExibicao } from '../lib/resolverTimeExibicao'
import type { SnapshotResultados } from '../lib/snapshotResultados'
import type { Jogo, Time, Ranking as RankingType } from '../types'

function ContagemRegressiva({ dataAlvo }: { dataAlvo: Date }) {
  const [agora, setAgora] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const diff = dataAlvo.getTime() - agora.getTime()
  if (diff <= 0) return <span className="text-green-600 font-bold">A Copa começou!</span>

  const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutos = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const segundos = Math.floor((diff % (1000 * 60)) / 1000)

  return (
    <div className="flex gap-3 justify-center">
      {[
        { valor: dias, label: 'dias' },
        { valor: horas, label: 'hrs' },
        { valor: minutos, label: 'min' },
        { valor: segundos, label: 'seg' },
      ].map(({ valor, label }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="text-2xl font-black text-blue-700">{String(valor).padStart(2, '0')}</span>
          <span className="text-[10px] text-gray-500 uppercase">{label}</span>
        </div>
      ))}
    </div>
  )
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

      const [rankingSnap, jogosSnap, timesSnap, meusPalpitesCount, snapResultadosDoc] = await Promise.all([
        getDocs(collection(db, 'ranking')),
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'times')),
        // Conta apenas palpites do proprio usuario (rules nao deixam ler de
        // outros se visibilidadePalpites != 'sempre'; essa contagem e barata
        // e nao baixa documentos).
        getCountFromServer(query(
          collection(db, 'palpites'),
          where('uid', '==', firebaseUser.uid),
        )),
        // Snapshot oficial — resolve times de mata-mata (1A/2B/3XYZ) ainda não
        // materializados no doc do jogo.
        getDoc(doc(db, '_system', 'resultados')),
      ])
      const snapResultados = snapResultadosDoc.exists()
        ? (snapResultadosDoc.data() as SnapshotResultados)
        : null

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
        // Só confrontos com AMBOS os times já conhecidos — direto (grupo) ou
        // resolvido pelo snapshot oficial (mata-mata). Substitui o antigo
        // `&& j.timeCasa`, que descartava todo jogo de mata-mata (timeCasa vazio).
        .filter(j => !j.encerrado && !j.aoVivo && j.dataHora.toMillis() > agora
          && resolverTimeIdExibicao(j, 'casa', snapResultados)
          && resolverTimeIdExibicao(j, 'visitante', snapResultados))
        .sort((a, b) => a.dataHora.toMillis() - b.dataHora.toMillis())
        .slice(0, 3)
        .map(j => ({
          ...j,
          timeCasaObj: resolverTimeExibicao(j, 'casa', timesMap, snapResultados) ?? undefined,
          timeVisitanteObj: resolverTimeExibicao(j, 'visitante', timesMap, snapResultados) ?? undefined,
        }))
      setProximosJogos(proximos)

      setTotalPalpites(meusPalpitesCount.data().count)
    }
    load()
  }, [firebaseUser])

  const dataCopa = new Date('2026-06-11T00:00:00Z')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-1">
          Bem-vindo, {usuario?.apelido ?? 'participante'}!
        </h1>
        <p className="text-gray-500 mb-6">O que você quer fazer hoje?</p>

        {homeEnriched && usuario && <AoVivo uid={usuario.uid} />}

        {perfilIncompleto && (
          <Link
            to="/perfil"
            className="block mb-6 p-4 bg-yellow-50 border border-yellow-300 rounded-xl text-yellow-800 text-sm"
          >
            Seu perfil está incompleto. <span className="font-semibold underline">Clique aqui para preencher seu nome e apelido.</span>
          </Link>
        )}

        {homeEnriched && dataCopa.getTime() > Date.now() && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-6 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Copa do Mundo 2026</p>
            <ContagemRegressiva dataAlvo={dataCopa} />
          </div>
        )}

        {homeEnriched && liberado && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-xl shadow border border-gray-100 p-4 text-center">
              <p className="text-2xl font-black text-blue-700">{posicaoRanking ?? '-'}<span className="text-sm font-normal text-gray-400">/{totalParticipantes || '-'}</span></p>
              <p className="text-[11px] text-gray-500">Posição</p>
            </div>
            <div className="bg-white rounded-xl shadow border border-gray-100 p-4 text-center">
              <p className="text-2xl font-black text-green-600">{pontosUsuario}</p>
              <p className="text-[11px] text-gray-500">Pontos</p>
            </div>
            <div className="bg-white rounded-xl shadow border border-gray-100 p-4 text-center">
              <p className="text-2xl font-black text-amber-600">{totalPalpites}<span className="text-sm font-normal text-gray-400">/{totalJogos}</span></p>
              <p className="text-[11px] text-gray-500">Palpites</p>
            </div>
          </div>
        )}

        {homeEnriched && proximosJogos.length > 0 && (
          <div className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-700 mb-3">Próximos jogos</h2>
            <div className="space-y-2">
              {proximosJogos.map(jogo => (
                <div key={jogo.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 flex-1">
                    {jogo.timeCasaObj?.bandeira && <img src={jogo.timeCasaObj.bandeira} alt="" className="w-5 h-3.5 object-cover rounded" />}
                    <span className="font-medium text-gray-700">{jogo.timeCasaObj?.nome ?? 'A definir'}</span>
                  </div>
                  <span className="text-xs text-gray-400 px-2">vs</span>
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="font-medium text-gray-700">{jogo.timeVisitanteObj?.nome ?? 'A definir'}</span>
                    {jogo.timeVisitanteObj?.bandeira && <img src={jogo.timeVisitanteObj.bandeira} alt="" className="w-5 h-3.5 object-cover rounded" />}
                  </div>
                  <span className="text-[10px] text-gray-400 ml-3 whitespace-nowrap">
                    {jogo.dataHora.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            to="/palpites"
            className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-100 transition-shadow"
          >
            <h2 className="text-lg font-semibold text-blue-700 mb-1">Palpites</h2>
            <p className="text-sm text-gray-500">Registre seus palpites para os jogos.</p>
          </Link>

          {liberado && (
            <Link
              to="/ranking"
              className="block p-6 bg-white rounded-xl shadow hover:shadow-md border border-gray-100 transition-shadow"
            >
              <h2 className="text-lg font-semibold text-blue-700 mb-1">Ranking</h2>
              <p className="text-sm text-gray-500">Veja a classificação dos participantes.</p>
            </Link>
          )}

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
