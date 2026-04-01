import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import type { Time, Config, PalpiteEspecial } from '../types'

export function PalpitesEspeciais() {
  const { firebaseUser } = useAuth()
  const [times, setTimes] = useState<Time[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [campeao, setCampeao] = useState('')
  const [vice, setVice] = useState('')
  const [artilheiro, setArtilheiro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    async function load() {
      if (!firebaseUser) return

      const [timesSnap, configSnap, palpiteSnap] = await Promise.all([
        getDocs(collection(db, 'times')),
        getDoc(doc(db, 'config', 'geral')),
        getDoc(doc(db, 'palpites_especiais', firebaseUser.uid)),
      ])

      const lista = timesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Time))
      lista.sort((a, b) => a.nome.localeCompare(b.nome))
      setTimes(lista)

      if (configSnap.exists()) {
        setConfig(configSnap.data() as Config)
      }

      if (palpiteSnap.exists()) {
        const data = palpiteSnap.data() as PalpiteEspecial
        setCampeao(data.campeao || '')
        setVice(data.vice || '')
        setArtilheiro(data.artilheiro || '')
      }

      setLoading(false)
    }
    load()
  }, [firebaseUser])

  const prazoExpirado = config?.prazoLimitePalpites
    ? Timestamp.now().toMillis() > config.prazoLimitePalpites.toMillis()
    : false

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (!firebaseUser) return
    setMensagem(null)

    if (!campeao || !vice) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o campeão e o vice.' })
      return
    }
    if (campeao === vice) {
      setMensagem({ tipo: 'erro', texto: 'Campeão e vice devem ser times diferentes.' })
      return
    }
    if (!artilheiro.trim()) {
      setMensagem({ tipo: 'erro', texto: 'Informe o nome do artilheiro.' })
      return
    }

    setSalvando(true)
    try {
      await setDoc(doc(db, 'palpites_especiais', firebaseUser.uid), {
        uid: firebaseUser.uid,
        campeao,
        vice,
        artilheiro: artilheiro.trim(),
        criadoEm: Timestamp.now(),
      })
      setMensagem({ tipo: 'sucesso', texto: 'Palpites especiais salvos!' })
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  function getTime(id: string): Time | null {
    return times.find(t => t.id === id) ?? null
  }

  if (loading) {
    return <p className="text-gray-500 text-center py-8">Carregando...</p>
  }

  const timeCampeao = getTime(campeao)
  const timeVice = getTime(vice)

  return (
    <div className="space-y-6">
      {prazoExpirado && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800 text-sm font-medium">
          Prazo encerrado. Não é mais possível alterar seus palpites especiais.
        </div>
      )}

      <form onSubmit={handleSalvar} className="space-y-6">
        {/* Campeão */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🏆</span>
            <h3 className="text-lg font-bold text-gray-800">Campeão</h3>
          </div>
          <select
            value={campeao}
            onChange={e => setCampeao(e.target.value)}
            disabled={prazoExpirado}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Selecione o campeão...</option>
            {times.map(t => (
              <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
            ))}
          </select>
          {timeCampeao && (
            <div className="mt-2 flex items-center gap-2">
              {timeCampeao.bandeira && <img src={timeCampeao.bandeira} alt="" className="w-8 h-5 object-cover rounded" />}
              <span className="font-semibold text-gray-700">{timeCampeao.nome}</span>
            </div>
          )}
        </div>

        {/* Vice */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">🥈</span>
            <h3 className="text-lg font-bold text-gray-800">Vice-Campeão</h3>
          </div>
          <select
            value={vice}
            onChange={e => setVice(e.target.value)}
            disabled={prazoExpirado}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Selecione o vice...</option>
            {times.filter(t => t.id !== campeao).map(t => (
              <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
            ))}
          </select>
          {timeVice && (
            <div className="mt-2 flex items-center gap-2">
              {timeVice.bandeira && <img src={timeVice.bandeira} alt="" className="w-8 h-5 object-cover rounded" />}
              <span className="font-semibold text-gray-700">{timeVice.nome}</span>
            </div>
          )}
        </div>

        {/* Artilheiro */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">⚽</span>
            <h3 className="text-lg font-bold text-gray-800">Artilheiro</h3>
          </div>
          <input
            type="text"
            value={artilheiro}
            onChange={e => setArtilheiro(e.target.value)}
            disabled={prazoExpirado}
            placeholder="Nome do jogador artilheiro..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
        </div>

        {mensagem && (
          <p className={`text-sm ${mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-red-600'}`}>
            {mensagem.texto}
          </p>
        )}

        {!prazoExpirado && (
          <button
            type="submit"
            disabled={salvando}
            className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar Palpites Especiais'}
          </button>
        )}
      </form>
    </div>
  )
}
