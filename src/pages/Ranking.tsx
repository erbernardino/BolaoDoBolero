import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import type { Ranking, Usuario } from '../types'
import { Navbar } from '../components/Navbar'
import { RankingTable } from '../components/RankingTable'

type RankingComUsuario = Ranking & { usuario: Usuario }

export function Ranking() {
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

      const lista: RankingComUsuario[] = []
      rankingSnap.forEach((doc) => {
        const r = { uid: doc.id, ...doc.data() } as Ranking
        const usuario = usuariosMap.get(r.uid)
        if (usuario) {
          lista.push({ ...r, usuario })
        }
      })

      lista.sort((a, b) => {
        if (b.pontosTotal !== a.pontosTotal) return b.pontosTotal - a.pontosTotal
        if (b.placaresExatos !== a.placaresExatos) return b.placaresExatos - a.placaresExatos
        if (b.colunasCertas !== a.colunasCertas) return b.colunasCertas - a.colunasCertas
        return b.totalGolsAcertados - a.totalGolsAcertados
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Ranking</h1>
        {loading ? (
          <p className="text-gray-500">Carregando...</p>
        ) : ranking.length === 0 ? (
          <p className="text-gray-500">Ranking ainda não disponível.</p>
        ) : (
          <RankingTable ranking={ranking} />
        )}
      </main>
    </div>
  )
}
