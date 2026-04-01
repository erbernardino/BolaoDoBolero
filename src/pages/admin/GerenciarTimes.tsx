import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Time } from '../../types'

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const CONFEDERACOES = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC']

interface FormState {
  nome: string
  sigla: string
  bandeira: string
  grupo: string
  confederacao: string
}

const FORM_INITIAL: FormState = {
  nome: '',
  sigla: '',
  bandeira: '',
  grupo: 'A',
  confederacao: 'UEFA',
}

export function GerenciarTimes() {
  const [times, setTimes] = useState<Time[]>([])
  const [form, setForm] = useState<FormState>(FORM_INITIAL)
  const [loading, setLoading] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(FORM_INITIAL)

  async function carregarTimes() {
    const snap = await getDocs(collection(db, 'times'))
    const lista = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Time))
    setTimes(lista)
  }

  useEffect(() => {
    carregarTimes()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.sigla.length !== 3) {
      alert('A sigla deve ter exatamente 3 caracteres.')
      return
    }
    setLoading(true)
    await addDoc(collection(db, 'times'), {
      nome: form.nome,
      sigla: form.sigla.toUpperCase(),
      bandeira: form.bandeira,
      grupo: form.grupo,
      confederacao: form.confederacao,
    })
    setForm(FORM_INITIAL)
    await carregarTimes()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja remover este time?')) return
    await deleteDoc(doc(db, 'times', id))
    await carregarTimes()
  }

  function handleEditar(time: Time) {
    setEditando(time.id)
    setEditForm({
      nome: time.nome,
      sigla: time.sigla,
      bandeira: time.bandeira,
      grupo: time.grupo,
      confederacao: time.confederacao,
    })
  }

  async function handleSalvarEdicao() {
    if (!editando) return
    if (editForm.sigla.length !== 3) {
      alert('A sigla deve ter exatamente 3 caracteres.')
      return
    }
    setLoading(true)
    await updateDoc(doc(db, 'times', editando), {
      nome: editForm.nome,
      sigla: editForm.sigla.toUpperCase(),
      bandeira: editForm.bandeira,
      grupo: editForm.grupo,
      confederacao: editForm.confederacao,
    })
    setEditando(null)
    await carregarTimes()
    setLoading(false)
  }

  function handleCancelarEdicao() {
    setEditando(null)
  }

  const timesPorGrupo = GRUPOS.reduce<Record<string, Time[]>>((acc, g) => {
    acc[g] = times.filter((t) => t.grupo === g)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciar Times</h1>

      <div className="mb-2 text-sm text-gray-600">
        Total: <span className="font-semibold">{times.length}</span> / 48
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded-lg p-6 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 text-lg font-semibold">Adicionar Time</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Nome</label>
          <input
            type="text"
            required
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Sigla (3 chars)</label>
          <input
            type="text"
            required
            maxLength={3}
            value={form.sigla}
            onChange={(e) => setForm({ ...form, sigla: e.target.value })}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
          />
        </div>

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm font-medium text-gray-700">Bandeira (URL)</label>
          <input
            type="url"
            required
            value={form.bandeira}
            onChange={(e) => setForm({ ...form, bandeira: e.target.value })}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Grupo</label>
          <select
            value={form.grupo}
            onChange={(e) => setForm({ ...form, grupo: e.target.value })}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {GRUPOS.map((g) => (
              <option key={g} value={g}>
                Grupo {g}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Confederação</label>
          <select
            value={form.confederacao}
            onChange={(e) => setForm({ ...form, confederacao: e.target.value })}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CONFEDERACOES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Salvando...' : 'Adicionar Time'}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        {GRUPOS.map((g) => (
          <div key={g} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-blue-700 text-white px-4 py-2 font-semibold">
              Grupo {g} ({timesPorGrupo[g].length})
            </div>
            {timesPorGrupo[g].length === 0 ? (
              <p className="px-4 py-3 text-gray-500 text-sm">Nenhum time neste grupo.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {timesPorGrupo[g].map((time) => (
                  <li key={time.id} className="px-4 py-3">
                    {editando === time.id ? (
                      <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={editForm.nome}
                            onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                            placeholder="Nome"
                            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            type="text"
                            maxLength={3}
                            value={editForm.sigla}
                            onChange={(e) => setEditForm({ ...editForm, sigla: e.target.value })}
                            placeholder="Sigla"
                            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                          />
                          <input
                            type="url"
                            value={editForm.bandeira}
                            onChange={(e) => setEditForm({ ...editForm, bandeira: e.target.value })}
                            placeholder="Bandeira (URL)"
                            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:col-span-2"
                          />
                          <select
                            value={editForm.grupo}
                            onChange={(e) => setEditForm({ ...editForm, grupo: e.target.value })}
                            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {GRUPOS.map((gr) => (
                              <option key={gr} value={gr}>
                                Grupo {gr}
                              </option>
                            ))}
                          </select>
                          <select
                            value={editForm.confederacao}
                            onChange={(e) => setEditForm({ ...editForm, confederacao: e.target.value })}
                            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {CONFEDERACOES.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={handleSalvarEdicao}
                            disabled={loading}
                            className="text-sm text-green-600 hover:text-green-800 font-medium"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={handleCancelarEdicao}
                            className="text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <img
                          src={time.bandeira}
                          alt={time.nome}
                          className="w-8 h-6 object-cover rounded"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                        <span className="font-mono text-sm bg-gray-100 px-1 rounded">
                          {time.sigla}
                        </span>
                        <span className="flex-1">{time.nome}</span>
                        <span className="text-xs text-gray-500">{time.confederacao}</span>
                        <button
                          onClick={() => handleEditar(time)}
                          className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(time.id)}
                          className="text-red-600 hover:text-red-800 text-sm transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
