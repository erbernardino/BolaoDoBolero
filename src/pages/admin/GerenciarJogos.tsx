import { useState, useEffect } from 'react'
import { collection, addDoc, getDocs, deleteDoc, updateDoc, doc, Timestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import type { Jogo, Time, Fase } from '../../types'

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']
const FASES: Fase[] = ['grupos', 'oitavas', 'quartas', 'semi', 'terceiro', 'final']
const FASE_LABELS: Record<Fase, string> = {
  grupos: 'Fase de Grupos',
  oitavas: 'Oitavas de Final',
  quartas: 'Quartas de Final',
  semi: 'Semifinal',
  terceiro: 'Disputa pelo 3º Lugar',
  final: 'Final',
}

interface FormState {
  fase: Fase
  grupo: string
  timeCasa: string
  timeVisitante: string
  dataHora: string
}

const FORM_INITIAL: FormState = {
  fase: 'grupos',
  grupo: 'A',
  timeCasa: '',
  timeVisitante: '',
  dataHora: '',
}

export function GerenciarJogos() {
  const [jogos, setJogos] = useState<Jogo[]>([])
  const [times, setTimes] = useState<Time[]>([])
  const [form, setForm] = useState<FormState>(FORM_INITIAL)
  const [loading, setLoading] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(FORM_INITIAL)

  async function carregarDados() {
    const [jogosSnap, timesSnap] = await Promise.all([
      getDocs(collection(db, 'jogos')),
      getDocs(collection(db, 'times')),
    ])
    setJogos(jogosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Jogo)))
    setTimes(timesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Time)))
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const isGrupos = form.fase === 'grupos'
  const timesDoGrupo = times.filter((t) => t.grupo === form.grupo)
  const timesDisponiveis = isGrupos ? timesDoGrupo : times

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'fase' && value !== 'grupos') {
        next.grupo = ''
        next.timeCasa = ''
        next.timeVisitante = ''
      }
      if (key === 'grupo') {
        next.timeCasa = ''
        next.timeVisitante = ''
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.dataHora) {
      alert('Informe a data e hora do jogo.')
      return
    }
    if (isGrupos && (!form.timeCasa || !form.timeVisitante)) {
      alert('Selecione os dois times.')
      return
    }
    if (isGrupos && form.timeCasa === form.timeVisitante) {
      alert('Time da casa e visitante não podem ser iguais.')
      return
    }

    setLoading(true)
    await addDoc(collection(db, 'jogos'), {
      fase: form.fase,
      grupo: isGrupos ? form.grupo : null,
      timeCasa: isGrupos ? form.timeCasa : '',
      timeVisitante: isGrupos ? form.timeVisitante : '',
      origemCasa: null,
      origemVisitante: null,
      dataHora: Timestamp.fromDate(new Date(form.dataHora)),
      resultado: null,
      encerrado: false,
    })
    setForm(FORM_INITIAL)
    await carregarDados()
    setLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja remover este jogo?')) return
    await deleteDoc(doc(db, 'jogos', id))
    await carregarDados()
  }

  const isEditGrupos = editForm.fase === 'grupos'
  const timesDoGrupoEdit = times.filter((t) => t.grupo === editForm.grupo)
  const timesDisponiveisEdit = isEditGrupos ? timesDoGrupoEdit : times

  function setEditField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setEditForm((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'fase' && value !== 'grupos') {
        next.grupo = ''
        next.timeCasa = ''
        next.timeVisitante = ''
      }
      if (key === 'grupo') {
        next.timeCasa = ''
        next.timeVisitante = ''
      }
      return next
    })
  }

  function handleEditar(jogo: Jogo) {
    setEditando(jogo.id)
    const date = jogo.dataHora.toDate()
    const dataHora = date.toISOString().slice(0, 16)
    setEditForm({
      fase: jogo.fase,
      grupo: jogo.grupo ?? 'A',
      timeCasa: jogo.timeCasa,
      timeVisitante: jogo.timeVisitante,
      dataHora,
    })
  }

  async function handleSalvarEdicao() {
    if (!editando) return
    if (!editForm.dataHora) {
      alert('Informe a data e hora do jogo.')
      return
    }
    if (isEditGrupos && (!editForm.timeCasa || !editForm.timeVisitante)) {
      alert('Selecione os dois times.')
      return
    }
    if (isEditGrupos && editForm.timeCasa === editForm.timeVisitante) {
      alert('Time da casa e visitante não podem ser iguais.')
      return
    }

    setLoading(true)
    await updateDoc(doc(db, 'jogos', editando), {
      fase: editForm.fase,
      grupo: isEditGrupos ? editForm.grupo : null,
      timeCasa: isEditGrupos ? editForm.timeCasa : '',
      timeVisitante: isEditGrupos ? editForm.timeVisitante : '',
      dataHora: Timestamp.fromDate(new Date(editForm.dataHora)),
    })
    setEditando(null)
    await carregarDados()
    setLoading(false)
  }

  function handleCancelarEdicao() {
    setEditando(null)
  }

  function nomeTime(id: string) {
    return times.find((t) => t.id === id)?.nome ?? id
  }

  function jogoLabel(jogo: Jogo) {
    if (jogo.fase === 'grupos') {
      return `${nomeTime(jogo.timeCasa)} x ${nomeTime(jogo.timeVisitante)}`
    }
    return `Jogo ${FASE_LABELS[jogo.fase]}`
  }

  const jogosPorFase = FASES.reduce<Record<Fase, Jogo[]>>((acc, fase) => {
    acc[fase] = jogos.filter((j) => j.fase === fase)
    return acc
  }, {} as Record<Fase, Jogo[]>)

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Gerenciar Jogos</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow rounded-lg p-6 mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <h2 className="sm:col-span-2 text-lg font-semibold">Adicionar Jogo</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Fase</label>
          <select
            value={form.fase}
            onChange={(e) => setField('fase', e.target.value as Fase)}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FASES.map((f) => (
              <option key={f} value={f}>
                {FASE_LABELS[f]}
              </option>
            ))}
          </select>
        </div>

        {isGrupos && (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Grupo</label>
            <select
              value={form.grupo}
              onChange={(e) => setField('grupo', e.target.value)}
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {GRUPOS.map((g) => (
                <option key={g} value={g}>
                  Grupo {g}
                </option>
              ))}
            </select>
          </div>
        )}

        {isGrupos && (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Time da Casa</label>
              <select
                value={form.timeCasa}
                onChange={(e) => setField('timeCasa', e.target.value)}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione...</option>
                {timesDisponiveis.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">Time Visitante</label>
              <select
                value={form.timeVisitante}
                onChange={(e) => setField('timeVisitante', e.target.value)}
                className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione...</option>
                {timesDisponiveis
                  .filter((t) => t.id !== form.timeCasa)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}

        {!isGrupos && (
          <div className="sm:col-span-2 text-sm text-gray-500 italic">
            Para jogos mata-mata, os times serão determinados automaticamente pela origem (vencedor/classificado de jogos anteriores).
          </div>
        )}

        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-sm font-medium text-gray-700">Data e Hora</label>
          <input
            type="datetime-local"
            required
            value={form.dataHora}
            onChange={(e) => setField('dataHora', e.target.value)}
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-700 text-white px-5 py-2 rounded hover:bg-blue-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Salvando...' : 'Adicionar Jogo'}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        {FASES.map((fase) => (
          <div key={fase} className="bg-white shadow rounded-lg overflow-hidden">
            <div className="bg-blue-700 text-white px-4 py-2 font-semibold">
              {FASE_LABELS[fase]} ({jogosPorFase[fase].length})
            </div>
            {jogosPorFase[fase].length === 0 ? (
              <p className="px-4 py-3 text-gray-500 text-sm">Nenhum jogo nesta fase.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {jogosPorFase[fase].map((jogo) => (
                  <li key={jogo.id} className="px-4 py-3">
                    {editando === jogo.id ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          value={editForm.fase}
                          onChange={(e) => setEditField('fase', e.target.value as Fase)}
                          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {FASES.map((f) => (
                            <option key={f} value={f}>
                              {FASE_LABELS[f]}
                            </option>
                          ))}
                        </select>

                        {isEditGrupos && (
                          <select
                            value={editForm.grupo}
                            onChange={(e) => setEditField('grupo', e.target.value)}
                            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {GRUPOS.map((g) => (
                              <option key={g} value={g}>
                                Grupo {g}
                              </option>
                            ))}
                          </select>
                        )}

                        {isEditGrupos && (
                          <select
                            value={editForm.timeCasa}
                            onChange={(e) => setEditField('timeCasa', e.target.value)}
                            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Selecione...</option>
                            {timesDisponiveisEdit.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.nome}
                              </option>
                            ))}
                          </select>
                        )}

                        {isEditGrupos && (
                          <select
                            value={editForm.timeVisitante}
                            onChange={(e) => setEditField('timeVisitante', e.target.value)}
                            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Selecione...</option>
                            {timesDisponiveisEdit
                              .filter((t) => t.id !== editForm.timeCasa)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.nome}
                                </option>
                              ))}
                          </select>
                        )}

                        <input
                          type="datetime-local"
                          value={editForm.dataHora}
                          onChange={(e) => setEditField('dataHora', e.target.value)}
                          className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

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
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="flex-1 font-medium">{jogoLabel(jogo)}</span>
                        <span className="text-sm text-gray-500">
                          {jogo.dataHora.toDate().toLocaleString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {jogo.encerrado && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            Encerrado
                          </span>
                        )}
                        <button
                          onClick={() => handleEditar(jogo)}
                          className="text-blue-600 hover:text-blue-800 text-sm transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(jogo.id)}
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
