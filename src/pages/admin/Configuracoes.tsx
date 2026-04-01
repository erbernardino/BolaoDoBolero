import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Config } from '../../types'

type VisibilidadeOption = Config['visibilidadePalpites']

interface FormState {
  placarExato: number
  placarUmTime: number
  vencedor: number
  prazoLimitePalpites: string
  visibilidadePalpites: VisibilidadeOption
  regrasPremiacao: string
}

const DEFAULTS: FormState = {
  placarExato: 10,
  placarUmTime: 5,
  vencedor: 3,
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

  useEffect(() => {
    async function carregar() {
      const snap = await getDoc(doc(db, 'config', 'geral'))
      if (snap.exists()) {
        const data = snap.data() as Config
        setForm({
          placarExato: data.pontos?.placarExato ?? DEFAULTS.placarExato,
          placarUmTime: data.pontos?.placarUmTime ?? DEFAULTS.placarUmTime,
          vencedor: data.pontos?.vencedor ?? DEFAULTS.vencedor,
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
        placarUmTime: form.placarUmTime,
        vencedor: form.vencedor,
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
              <label className="text-sm font-medium text-gray-700">Placar Um Time</label>
              <input
                type="number"
                min={0}
                value={form.placarUmTime}
                onChange={(e) => setForm({ ...form, placarUmTime: Number(e.target.value) })}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Vencedor</label>
              <input
                type="number"
                min={0}
                value={form.vencedor}
                onChange={(e) => setForm({ ...form, vencedor: Number(e.target.value) })}
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
    </div>
  )
}
