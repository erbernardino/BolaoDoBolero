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
  prazoLimitePalpites: string
  visibilidadePalpites: VisibilidadeOption
  regrasPremiacao: string
}

const DEFAULTS: FormState = {
  placarExato: 5,
  colunaCerta: 3,
  totalGols: 1,
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

  useEffect(() => {
    async function carregar() {
      const snap = await getDoc(doc(db, 'config', 'geral'))
      if (snap.exists()) {
        const data = snap.data() as Config
        setForm({
          placarExato: data.pontos?.placarExato ?? DEFAULTS.placarExato,
          colunaCerta: data.pontos?.colunaCerta ?? DEFAULTS.colunaCerta,
          totalGols: data.pontos?.totalGols ?? DEFAULTS.totalGols,
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
              <label className="text-sm font-medium text-gray-700">Placar Exato</label>
              <input
                type="number"
                min={0}
                value={form.placarExato}
                onChange={(e) => setForm({ ...form, placarExato: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Coluna Certa</label>
              <input
                type="number"
                min={0}
                value={form.colunaCerta}
                onChange={(e) => setForm({ ...form, colunaCerta: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Total de Gols</label>
              <input
                type="number"
                min={0}
                value={form.totalGols}
                onChange={(e) => setForm({ ...form, totalGols: Number(e.target.value) })}
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
    </div>
  )
}
