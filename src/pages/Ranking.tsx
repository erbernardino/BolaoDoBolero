import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Ranking, Usuario } from '../types'
import { Navbar } from '../components/Navbar'
import { RankingTable } from '../components/RankingTable'
import { RankingDestaques } from '../components/RankingDestaques'
import { AoVivo } from '../components/AoVivo'
import { useAuth } from '../hooks/useAuth'

type RankingComUsuario = Ranking & { usuario: Usuario }

function rankingZerado(uid: string): Ranking {
  return {
    uid,
    pontosTotal: 0,
    pontosJogos: 0,
    pontosEspeciais: 0,
    placaresExatos: 0,
    colunasCertas: 0,
    totalGolsAcertados: 0,
    pontosFaseGrupos: 0,
    pontosJogosBrasil: 0,
  }
}

export function Ranking() {
  const { firebaseUser } = useAuth()
  const [ranking, setRanking] = useState<RankingComUsuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [rankingSnap, usuariosSnap] = await Promise.all([
        getDocs(collection(db, 'ranking')),
        getDocs(collection(db, 'usuarios')),
      ])

      const usuariosMap = new Map<string, Usuario>()
      usuariosSnap.forEach((doc) => {
        usuariosMap.set(doc.id, { uid: doc.id, ...doc.data() } as Usuario)
      })

      const rankingMap = new Map<string, Ranking>()
      rankingSnap.forEach((doc) => {
        const r = { uid: doc.id, ...doc.data() } as Ranking
        rankingMap.set(r.uid, r)
      })

      const lista: RankingComUsuario[] = []
      usuariosMap.forEach((usuario, uid) => {
        const r = rankingMap.get(uid) ?? rankingZerado(uid)
        lista.push({ ...r, usuario })
      })

      // Desempate conforme regras originais:
      // 1. Maior nº de placares exatos (5 pts)
      // 2. Maior nº de pontos em jogos (sem especiais)
      // 3. Mais pontos na fase de grupos
      // 4. Mais pontos nos jogos do Brasil
      // 5. Divisão do prêmio
      lista.sort((a, b) => {
        if (b.pontosTotal !== a.pontosTotal) return b.pontosTotal - a.pontosTotal
        if ((b.placaresExatos ?? 0) !== (a.placaresExatos ?? 0)) return (b.placaresExatos ?? 0) - (a.placaresExatos ?? 0)
        if ((b.pontosJogos ?? 0) !== (a.pontosJogos ?? 0)) return (b.pontosJogos ?? 0) - (a.pontosJogos ?? 0)
        if ((b.pontosFaseGrupos ?? 0) !== (a.pontosFaseGrupos ?? 0)) return (b.pontosFaseGrupos ?? 0) - (a.pontosFaseGrupos ?? 0)
        if ((b.pontosJogosBrasil ?? 0) !== (a.pontosJogosBrasil ?? 0)) return (b.pontosJogosBrasil ?? 0) - (a.pontosJogosBrasil ?? 0)
        return (a.usuario.apelido || a.usuario.nome || '').localeCompare(b.usuario.apelido || b.usuario.nome || '')
      })

      setRanking(lista)
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        {firebaseUser && <AoVivo uid={firebaseUser.uid} />}

        <h1 className="text-2xl font-bold text-gray-800 mb-6">Ranking</h1>
        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : ranking.length === 0 ? (
          <p className="text-gray-500">Ranking ainda não disponível.</p>
        ) : (
          <>
            <RankingDestaques ranking={ranking} />
            <RankingTable ranking={ranking} />
          </>
        )}
      </main>
    </div>
  )
}
