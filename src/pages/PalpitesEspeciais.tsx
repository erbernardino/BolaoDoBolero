import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../hooks/useAuth'
import type { Time, Config, PalpiteEspecial } from '../types'

export function PalpitesEspeciais() {
  const { firebaseUser, usuario } = useAuth()
  const [times, setTimes] = useState<Time[]>([])
  const [config, setConfig] = useState<Config | null>(null)
  const [campeao, setCampeao] = useState('')
  const [vice, setVice] = useState('')
  const [terceiro, setTerceiro] = useState('')
  const [quarto, setQuarto] = useState('')
  const [paisArtilheiro, setPaisArtilheiro] = useState('')
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
        setTerceiro(data.terceiro || '')
        setQuarto(data.quarto || '')
        setPaisArtilheiro(data.paisArtilheiro || '')
      }

      setLoading(false)
    }
    load()
  }, [firebaseUser])

  const naoLiberado = usuario != null && usuario.liberado !== true
  const prazoExpirado = config?.prazoLimitePalpites
    ? Timestamp.now().toMillis() > config.prazoLimitePalpites.toMillis()
    : false

  // Colocações selecionadas (para filtrar repetições)
  const colocacoesSelecionadas = [campeao, vice, terceiro, quarto].filter(Boolean)

  function timesDisponiveis(excluir: string[]) {
    return times.filter(t => !excluir.includes(t.id))
  }

  async function salvarCampo(campo: string, valor: string) {
    if (!firebaseUser || prazoExpirado || naoLiberado) return
    setMensagem(null)
    setSalvando(true)
    try {
      await setDoc(doc(db, 'palpites_especiais', firebaseUser.uid), {
        uid: firebaseUser.uid,
        campeao:        campo === 'campeao'        ? valor : campeao,
        vice:           campo === 'vice'           ? valor : vice,
        terceiro:       campo === 'terceiro'       ? valor : terceiro,
        quarto:         campo === 'quarto'         ? valor : quarto,
        paisArtilheiro: campo === 'paisArtilheiro' ? valor : paisArtilheiro,
        criadoEm: Timestamp.now(),
      })
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

  const ptsEspecial = config?.pontos?.palpiteEspecial ?? 10

  const campos = [
    { key: 'campeao',  label: 'Campeao',     icone: '\u{1F3C6}', value: campeao,  setter: setCampeao },
    { key: 'vice',     label: 'Vice-Campeao', icone: '\u{1F948}', value: vice,     setter: setVice },
    { key: 'terceiro', label: '3o Lugar',     icone: '\u{1F949}', value: terceiro, setter: setTerceiro },
    { key: 'quarto',   label: '4o Lugar',     icone: '4',         value: quarto,   setter: setQuarto },
  ] as const

  return (
    <div className="space-y-6">
      {prazoExpirado && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 text-yellow-800 text-sm font-medium">
          Prazo encerrado. Nao e mais possivel alterar seus palpites especiais.
        </div>
      )}

      <p className="text-sm text-gray-600">
        Cada acerto vale <strong>{ptsEspecial} pontos</strong>. Nao pode haver repeticao de paises nas colocacoes.
      </p>

      <div className="space-y-6">
        {campos.map(({ key, label, icone, value, setter }) => {
          const outrosColocacoes = colocacoesSelecionadas.filter(id => id !== value)
          const opcoes = timesDisponiveis(outrosColocacoes)
          const timeSelecionado = getTime(value)

          return (
            <div key={label} className="bg-white rounded-lg p-5 border border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{icone}</span>
                <h3 className="text-lg font-bold text-gray-800">{label}</h3>
              </div>
              <select
                value={value}
                onChange={e => { setter(e.target.value); salvarCampo(key, e.target.value) }}
                disabled={prazoExpirado || naoLiberado}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Selecione...</option>
                {opcoes.map(t => (
                  <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
                ))}
              </select>
              {timeSelecionado && (
                <div className="mt-2 flex items-center gap-2">
                  {timeSelecionado.bandeira && <img src={timeSelecionado.bandeira} alt="" className="w-8 h-5 object-cover rounded" />}
                  <span className="font-semibold text-gray-700">{timeSelecionado.nome}</span>
                </div>
              )}
            </div>
          )
        })}

        {/* Pais do Artilheiro */}
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">{'\u26BD'}</span>
            <h3 className="text-lg font-bold text-gray-800">Pais do Artilheiro</h3>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Selecione o pais do artilheiro da Copa. Pode repetir um pais das colocacoes.
          </p>
          <select
            value={paisArtilheiro}
            onChange={e => { setPaisArtilheiro(e.target.value); salvarCampo('paisArtilheiro', e.target.value) }}
            disabled={prazoExpirado || naoLiberado}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">Selecione o pais...</option>
            {times.map(t => (
              <option key={t.id} value={t.id}>{t.nome} ({t.sigla})</option>
            ))}
          </select>
          {getTime(paisArtilheiro) && (
            <div className="mt-2 flex items-center gap-2">
              {getTime(paisArtilheiro)!.bandeira && <img src={getTime(paisArtilheiro)!.bandeira} alt="" className="w-8 h-5 object-cover rounded" />}
              <span className="font-semibold text-gray-700">{getTime(paisArtilheiro)!.nome}</span>
            </div>
          )}
        </div>

        {mensagem && (
          <p className="text-sm text-red-600">{mensagem.texto}</p>
        )}
        {salvando && (
          <p className="text-xs text-gray-400 text-center">Salvando...</p>
        )}
      </div>
    </div>
  )
}
