import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { db } from '../../config/firebase'
import type { Config } from '../../types'

const functions = getFunctions()

type VisibilidadeOption = Config['visibilidadePalpites']

interface FormState {
  placarExato: number
  colunaCerta: number
  totalGols: number
  palpiteEspecial: number
  premiacaoPrimeiro: number
  premiacaoSegundo: number
  premiacaoTerceiro: number
  premiacaoAntepenultimo: number
  premiacaoDoacao: number
  taxaInscricao: number
  prazoLimitePalpites: string
  visibilidadePalpites: VisibilidadeOption
  regrasPremiacao: string
}

const DEFAULTS: FormState = {
  placarExato: 5,
  colunaCerta: 3,
  totalGols: 1,
  palpiteEspecial: 10,
  premiacaoPrimeiro: 50,
  premiacaoSegundo: 25,
  premiacaoTerceiro: 10,
  premiacaoAntepenultimo: 5,
  premiacaoDoacao: 10,
  taxaInscricao: 250,
  prazoLimitePalpites: '',
  visibilidadePalpites: 'apos_prazo',
  regrasPremiacao: '',
}

function timestampToDatetimeLocal(ts: Timestamp): string {
  const date = ts.toDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

function datetimeLocalToTimestamp(value: string): Timestamp {
  return Timestamp.fromDate(new Date(value))
}

export function Configuracoes() {
  const [form, setForm] = useState<FormState>(DEFAULTS)
  const [loading, setLoading] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [recalculando, setRecalculando] = useState(false)
  const [rankingMsg, setRankingMsg] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)
  const [resolvendoMataMata, setResolvendoMataMata] = useState(false)
  const [mataMataMsg, setMataMataMsg] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; texto: string } | null>(null)

  useEffect(() => {
    async function carregar() {
      const snap = await getDoc(doc(db, 'config', 'geral'))
      if (snap.exists()) {
        const data = snap.data() as Config
        setForm({
          placarExato: data.pontos?.placarExato ?? DEFAULTS.placarExato,
          colunaCerta: data.pontos?.colunaCerta ?? DEFAULTS.colunaCerta,
          totalGols: data.pontos?.totalGols ?? DEFAULTS.totalGols,
          palpiteEspecial: data.pontos?.palpiteEspecial ?? DEFAULTS.palpiteEspecial,
          premiacaoPrimeiro: data.premiacao?.primeiro ?? DEFAULTS.premiacaoPrimeiro,
          premiacaoSegundo: data.premiacao?.segundo ?? DEFAULTS.premiacaoSegundo,
          premiacaoTerceiro: data.premiacao?.terceiro ?? DEFAULTS.premiacaoTerceiro,
          premiacaoAntepenultimo: data.premiacao?.antepenultimo ?? DEFAULTS.premiacaoAntepenultimo,
          premiacaoDoacao: data.premiacao?.doacao ?? DEFAULTS.premiacaoDoacao,
          taxaInscricao: data.premiacao?.taxaInscricao ?? DEFAULTS.taxaInscricao,
          prazoLimitePalpites: data.prazoLimitePalpites
            ? timestampToDatetimeLocal(data.prazoLimitePalpites)
            : '',
          visibilidadePalpites: data.visibilidadePalpites ?? DEFAULTS.visibilidadePalpites,
          regrasPremiacao: data.regrasPremiacao ?? '',
        })
      }
    }
    carregar()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const config: Config = {
      pontos: {
        placarExato: form.placarExato,
        colunaCerta: form.colunaCerta,
        totalGols: form.totalGols,
        palpiteEspecial: form.palpiteEspecial,
      },
      premiacao: {
        primeiro: form.premiacaoPrimeiro,
        segundo: form.premiacaoSegundo,
        terceiro: form.premiacaoTerceiro,
        antepenultimo: form.premiacaoAntepenultimo,
        doacao: form.premiacaoDoacao,
        taxaInscricao: form.taxaInscricao,
      },
      prazoLimitePalpites: form.prazoLimitePalpites
        ? datetimeLocalToTimestamp(form.prazoLimitePalpites)
        : Timestamp.now(),
      visibilidadePalpites: form.visibilidadePalpites,
      regrasPremiacao: form.regrasPremiacao,
    }

    await setDoc(doc(db, 'config', 'geral'), config)
    setLoading(false)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 3000)
  }

  async function handleResolverMataMata() {
    if (!confirm('Resolver mata-mata: vai preencher os times dos jogos do mata-mata baseado nos resultados reais. Idempotente — pode rodar mais de uma vez.')) return
    setMataMataMsg(null)
    setResolvendoMataMata(true)
    try {
      const fn = httpsCallable<unknown, { ok: boolean; motivo?: string; atualizados?: number; pendentes?: number; gruposEncerrados?: number; gruposTotal?: number }>(functions, 'resolverMataMata')
      const result = await fn({})
      const r = result.data
      if (!r.ok && r.motivo === 'fase_grupos_incompleta') {
        setMataMataMsg({ tipo: 'aviso', texto: `Fase de grupos ainda nao terminou (${r.gruposEncerrados}/${r.gruposTotal} jogos com resultado).` })
      } else if (r.ok) {
        setMataMataMsg({ tipo: 'sucesso', texto: `Mata-mata resolvido. ${r.atualizados} jogo(s) atualizado(s). ${r.pendentes} ainda dependem de jogos posteriores.` })
      } else {
        setMataMataMsg({ tipo: 'erro', texto: 'Falha ao resolver mata-mata.' })
      }
    } catch {
      setMataMataMsg({ tipo: 'erro', texto: 'Erro ao chamar a funcao. Veja logs.' })
    } finally {
      setResolvendoMataMata(false)
    }
  }

  async function handleRecalcularRanking() {
    if (!confirm('Tem certeza? Isso vai zerar e recalcular todo o ranking do zero.')) return
    setRankingMsg(null)
    setRecalculando(true)
    try {
      const fn = httpsCallable<unknown, { recalculados: number }>(functions, 'recalcularRanking')
      const result = await fn({})
      setRankingMsg({
        tipo: 'sucesso',
        texto: `Ranking recalculado com sucesso! ${result.data.recalculados} jogo(s) processado(s).`,
      })
    } catch {
      setRankingMsg({ tipo: 'erro', texto: 'Erro ao recalcular ranking. Tente novamente.' })
    } finally {
      setRecalculando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-4">Pontuação</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 group relative cursor-help">
                Placar Exato
                <span className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 w-56 rounded bg-gray-800 px-3 py-2 text-xs font-normal text-white shadow-lg">
                  Acertou a coluna (vencedor/empate) e o resultado exato do jogo.
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={form.placarExato}
                onChange={(e) => setForm({ ...form, placarExato: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 group relative cursor-help">
                Coluna Certa
                <span className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 w-56 rounded bg-gray-800 px-3 py-2 text-xs font-normal text-white shadow-lg">
                  Acertou quem venceu ou se empatou, mas errou o placar.
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={form.colunaCerta}
                onChange={(e) => setForm({ ...form, colunaCerta: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 group relative cursor-help">
                Total de Gols
                <span className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 w-56 rounded bg-gray-800 px-3 py-2 text-xs font-normal text-white shadow-lg">
                  Errou a coluna, mas acertou o total de gols do jogo. Ex: apostou 3x1, resultado 2x2 (total 4).
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={form.totalGols}
                onChange={(e) => setForm({ ...form, totalGols: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700 group relative cursor-help">
                Palpite Especial
                <span className="invisible group-hover:visible absolute left-0 top-full mt-1 z-10 w-56 rounded bg-gray-800 px-3 py-2 text-xs font-normal text-white shadow-lg">
                  Pontos por cada acerto nos palpites especiais (campeao, vice, 3o, 4o, pais do artilheiro).
                </span>
              </label>
              <input
                type="number"
                min={0}
                value={form.palpiteEspecial}
                onChange={(e) => setForm({ ...form, palpiteEspecial: Number(e.target.value) })}
                className="border rounded px-3 py-2 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Premiacao</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Taxa de Inscricao (R$)</label>
              <input
                type="number"
                min={0}
                value={form.taxaInscricao}
                onChange={(e) => setForm({ ...form, taxaInscricao: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">1o lugar (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.premiacaoPrimeiro}
                onChange={(e) => setForm({ ...form, premiacaoPrimeiro: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">2o lugar (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.premiacaoSegundo}
                onChange={(e) => setForm({ ...form, premiacaoSegundo: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">3o lugar (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.premiacaoTerceiro}
                onChange={(e) => setForm({ ...form, premiacaoTerceiro: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Antepenultimo (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.premiacaoAntepenultimo}
                onChange={(e) => setForm({ ...form, premiacaoAntepenultimo: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Doacao (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.premiacaoDoacao}
                onChange={(e) => setForm({ ...form, premiacaoDoacao: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Palpites</h2>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Prazo Limite para Palpites</label>
              <input
                type="datetime-local"
                value={form.prazoLimitePalpites}
                onChange={(e) => setForm({ ...form, prazoLimitePalpites: e.target.value })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Visibilidade dos Palpites</label>
              <select
                value={form.visibilidadePalpites}
                onChange={(e) =>
                  setForm({
                    ...form,
                    visibilidadePalpites: e.target.value as VisibilidadeOption,
                  })
                }
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="apos_prazo">Após o prazo</option>
                <option value="apos_jogo">Após o jogo</option>
                <option value="sempre">Sempre</option>
                <option value="nunca">Nunca</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Regras de Premiação</h2>
          <textarea
            value={form.regrasPremiacao}
            onChange={(e) => setForm({ ...form, regrasPremiacao: e.target.value })}
            rows={6}
            className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Descreva as regras de premiação..."
          />
        </section>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
          {salvo && <span className="text-green-600 font-medium">Salvo!</span>}
        </div>
      </form>
      {/* Recalcular Ranking */}
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold mb-2">Recalcular Ranking</h2>
        <p className="text-sm text-gray-600 mb-4">
          Zera todo o ranking e recalcula a pontuacao de todos os jogos encerrados. Use caso tenha alterado os pontos ou corrigido algum resultado.
        </p>

        {rankingMsg && (
          <p className={`text-sm mb-4 ${rankingMsg.tipo === 'sucesso' ? 'text-green-600' : 'text-red-600'}`}>
            {rankingMsg.texto}
          </p>
        )}

        <button
          type="button"
          onClick={handleRecalcularRanking}
          disabled={recalculando}
          className="bg-amber-600 text-white px-5 py-2 rounded hover:bg-amber-700 disabled:opacity-50 transition-colors"
        >
          {recalculando ? 'Recalculando...' : 'Recalcular Ranking'}
        </button>
      </div>

      {/* Resolver Mata-mata */}
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold mb-2">Resolver Mata-mata</h2>
        <p className="text-sm text-gray-600 mb-4">
          Apos o termino da fase de grupos (e a cada nova fase encerrada), preenche os times dos jogos do mata-mata
          (1A, 2B, 3o melhor, vencedor de jogo X, etc.) baseado nos resultados reais. Idempotente.
        </p>

        {mataMataMsg && (
          <p className={`text-sm mb-4 ${mataMataMsg.tipo === 'sucesso' ? 'text-green-600' : mataMataMsg.tipo === 'aviso' ? 'text-amber-600' : 'text-red-600'}`}>
            {mataMataMsg.texto}
          </p>
        )}

        <button
          type="button"
          onClick={handleResolverMataMata}
          disabled={resolvendoMataMata}
          className="bg-purple-600 text-white px-5 py-2 rounded hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {resolvendoMataMata ? 'Resolvendo...' : 'Resolver Mata-mata'}
        </button>
      </div>
    </div>
  )
}
