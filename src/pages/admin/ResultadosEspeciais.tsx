import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Time, ResultadoEspecial } from '../../types'

export function ResultadosEspeciais() {
  const [times, setTimes] = useState<Time[]>([])
  const [campeao, setCampeao] = useState('')
  const [vice, setVice] = useState('')
  const [terceiro, setTerceiro] = useState('')
  const [quarto, setQuarto] = useState('')
  const [paisesArtilheiros, setPaisesArtilheiros] = useState<string[]>([])
  const [novoArtilheiro, setNovoArtilheiro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    async function load() {
      const [timesSnap, resultadoSnap] = await Promise.all([
        getDocs(collection(db, 'times')),
        getDoc(doc(db, 'config', 'resultado_especial')),
      ])

      const lista = timesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Time))
      lista.sort((a, b) => a.nome.localeCompare(b.nome))
      setTimes(lista)

      if (resultadoSnap.exists()) {
        const data = resultadoSnap.data() as ResultadoEspecial
        setCampeao(data.campeao || '')
        setVice(data.vice || '')
        setTerceiro(data.terceiro || '')
        setQuarto(data.quarto || '')
        setPaisesArtilheiros(data.paisesArtilheiros || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  function getTime(id: string): Time | null {
    return times.find(t => t.id === id) ?? null
  }

  function adicionarArtilheiro() {
    if (novoArtilheiro && !paisesArtilheiros.includes(novoArtilheiro)) {
      setPaisesArtilheiros([...paisesArtilheiros, novoArtilheiro])
      setNovoArtilheiro('')
    }
  }

  function removerArtilheiro(id: string) {
    setPaisesArtilheiros(paisesArtilheiros.filter(p => p !== id))
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setMensagem(null)
    setSalvando(true)

    try {
      const resultado: ResultadoEspecial = {
        campeao,
        vice,
        terceiro,
        quarto,
        paisesArtilheiros,
      }
      await setDoc(doc(db, 'config', 'resultado_especial'), resultado)
      setMensagem({ tipo: 'sucesso', texto: 'Resultados especiais salvos! Recalcule o ranking para atualizar os pontos.' })
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSalvando(false)
    }
  }

  if (loading) return <p className="text-gray-500 text-center py-8">Carregando...</p>

  const colocacoes = [campeao, vice, terceiro, quarto].filter(Boolean)

  const campos = [
    { label: 'Campeao', value: campeao, setter: setCampeao },
    { label: 'Vice-Campeao', value: vice, setter: setVice },
    { label: '3o Lugar', value: terceiro, setter: setTerceiro },
    { label: '4o Lugar', value: quarto, setter: setQuarto },
  ] as const

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Resultados Especiais</h1>
      <p className="text-sm text-gray-600 mb-6">
        Registre os resultados oficiais da Copa para calcular os pontos dos palpites especiais.
      </p>

      <form onSubmit={handleSalvar} className="bg-white shadow rounded-lg p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">Colocacoes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {campos.map(({ label, value, setter }) => {
              const outros = colocacoes.filter(id => id !== value)
              const opcoes = times.filter(t => !outros.includes(t.id))
              const time = getTime(value)

              return (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <select
                    value={value}
                    onChange={e => setter(e.target.value)}
                    className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {opcoes.map(t => (
                      <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
                    ))}
                  </select>
                  {time && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {time.bandeira && <img src={time.bandeira} alt="" className="w-6 h-4 object-cover rounded" />}
                      <span className="text-sm text-gray-700">{time.nome}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Pais(es) do(s) Artilheiro(s)</h2>
          <p className="text-xs text-gray-500 mb-3">
            Se houver mais de um artilheiro, adicione todos os paises. Todos serao considerados corretos.
          </p>

          <div className="flex gap-2 mb-3">
            <select
              value={novoArtilheiro}
              onChange={e => setNovoArtilheiro(e.target.value)}
              className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione um pais...</option>
              {times.filter(t => !paisesArtilheiros.includes(t.id)).map(t => (
                <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
              ))}
            </select>
            <button
              type="button"
              onClick={adicionarArtilheiro}
              disabled={!novoArtilheiro}
              className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              Adicionar
            </button>
          </div>

          {paisesArtilheiros.length > 0 && (
            <div className="space-y-2">
              {paisesArtilheiros.map(id => {
                const time = getTime(id)
                return (
                  <div key={id} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      {time?.bandeira && <img src={time.bandeira} alt="" className="w-6 h-4 object-cover rounded" />}
                      <span className="text-sm font-medium">{time?.nome ?? id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removerArtilheiro(id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remover
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {mensagem && (
          <p className={`text-sm ${mensagem.tipo === 'sucesso' ? 'text-green-600' : 'text-red-600'}`}>
            {mensagem.texto}
          </p>
        )}

        <button
          type="submit"
          disabled={salvando}
          className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 disabled:opacity-50 transition-colors"
        >
          {salvando ? 'Salvando...' : 'Salvar Resultados Especiais'}
        </button>
      </form>
    </div>
  )
}
