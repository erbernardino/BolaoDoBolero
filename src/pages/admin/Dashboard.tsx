import { useState, useEffect } from 'react'
import { collection, doc, getDoc, getDocs } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Usuario, Jogo, Palpite, Config } from '../../types'

export function Dashboard() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [totalJogos, setTotalJogos] = useState(0)
  const [jogosEncerrados, setJogosEncerrados] = useState(0)
  const [jogosAoVivo, setJogosAoVivo] = useState(0)
  const [palpitesPorUsuario, setPalpitesPorUsuario] = useState<Map<string, number>>(new Map())
  const [taxaInscricao, setTaxaInscricao] = useState(250)
  const [loading, setLoading] = useState(true)
  const [pendentesVisiveis, setPendentesVisiveis] = useState(5)

  useEffect(() => {
    async function load() {
      const [usuariosSnap, jogosSnap, palpitesSnap, configSnap] = await Promise.all([
        getDocs(collection(db, 'usuarios')),
        getDocs(collection(db, 'jogos')),
        getDocs(collection(db, 'palpites')),
        getDoc(doc(db, 'config', 'geral')),
      ])

      const listaUsuarios = usuariosSnap.docs.map(d => ({ uid: d.id, ...d.data() } as Usuario))
      setUsuarios(listaUsuarios)

      const jogos = jogosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Jogo))
      setTotalJogos(jogos.length)
      setJogosEncerrados(jogos.filter(j => j.encerrado).length)
      setJogosAoVivo(jogos.filter(j => j.aoVivo === true).length)

      const pMap = new Map<string, number>()
      palpitesSnap.docs.forEach(d => {
        const p = d.data() as Palpite
        pMap.set(p.uid, (pMap.get(p.uid) ?? 0) + 1)
      })
      setPalpitesPorUsuario(pMap)

      if (configSnap.exists()) {
        const cfg = configSnap.data() as Config
        const taxaConfigurada = cfg.premiacao?.taxaInscricao
        if (typeof taxaConfigurada === 'number') setTaxaInscricao(taxaConfigurada)
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-8"><p className="text-gray-500">Carregando...</p></div>
  }

  const liberados = usuarios.filter(u => u.liberado === true && u.role !== 'admin')
  const pendentes = usuarios.filter(u => u.role !== 'admin' && u.liberado !== true)
  const totalArrecadado = liberados.length * taxaInscricao

  const semPalpitesCompletos = usuarios
    .filter(u => u.role !== 'admin')
    .map(u => ({
      ...u,
      total: palpitesPorUsuario.get(u.uid) ?? 0,
    }))
    .filter(u => u.total < totalJogos)
    .sort((a, b) => a.total - b.total)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5 text-center">
          <p className="text-3xl font-black text-blue-700">{usuarios.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total usuários</p>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5 text-center">
          <p className="text-3xl font-black text-green-600">{liberados.length}</p>
          <p className="text-xs text-gray-500 mt-1">Liberados (pagos)</p>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5 text-center">
          <p className="text-3xl font-black text-amber-600">{pendentes.length}</p>
          <p className="text-xs text-gray-500 mt-1">Aguardando pagamento</p>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5 text-center">
          <p className="text-3xl font-black text-emerald-700">R$ {totalArrecadado.toLocaleString('pt-BR')}</p>
          <p className="text-xs text-gray-500 mt-1">Total arrecadado</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{totalJogos}</p>
          <p className="text-xs text-gray-500">Total jogos</p>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{jogosEncerrados}</p>
          <p className="text-xs text-gray-500">Encerrados</p>
        </div>
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{jogosAoVivo}</p>
          <p className="text-xs text-gray-500">Ao vivo</p>
        </div>
      </div>

      {semPalpitesCompletos.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5 mb-8">
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            Palpites pendentes ({semPalpitesCompletos.length})
          </h3>
          <div className="space-y-2">
            {semPalpitesCompletos.slice(0, pendentesVisiveis).map(u => {
              const pct = totalJogos > 0 ? Math.round((u.total / totalJogos) * 100) : 0
              return (
                <div key={u.uid} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 w-32 truncate">{u.apelido || u.nome || 'Sem nome'}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{u.total}/{totalJogos}</span>
                </div>
              )
            })}
          </div>
          {pendentesVisiveis < semPalpitesCompletos.length && (
            <button
              type="button"
              onClick={() => setPendentesVisiveis(v => v + 10)}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
            >
              Mostrar mais ({semPalpitesCompletos.length - pendentesVisiveis} restantes)
            </button>
          )}
        </div>
      )}

      {pendentes.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Aguardando pagamento ({pendentes.length})</h3>
          <div className="divide-y divide-gray-50">
            {pendentes.map(u => (
              <div key={u.uid} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{u.nome || u.apelido || 'Sem nome'}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-1 rounded-full">Pendente</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
