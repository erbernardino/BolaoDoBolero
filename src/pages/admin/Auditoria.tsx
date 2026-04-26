import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore'
import { db } from '../../config/firebase'
import { Avatar } from '../../components/Avatar'
import type { Usuario } from '../../types'

interface AuditDoc {
  id: string
  eventType: string
  targetUid: string | null
  targetPath: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  changedFields: string[]
  at: Timestamp
  metadata?: Record<string, unknown>
}

const TIPOS_EVENTO = [
  { value: '', label: 'Todos os tipos' },
  { value: 'login', label: 'Login' },
  { value: 'palpite_create', label: 'Palpite criado' },
  { value: 'palpite_update', label: 'Palpite atualizado' },
  { value: 'palpite_delete', label: 'Palpite excluído' },
  { value: 'palpite_especial_create', label: 'Palpite especial criado' },
  { value: 'palpite_especial_update', label: 'Palpite especial atualizado' },
  { value: 'palpite_especial_delete', label: 'Palpite especial excluído' },
  { value: 'usuario_create', label: 'Usuário criado' },
  { value: 'usuario_update', label: 'Usuário atualizado' },
  { value: 'usuario_delete', label: 'Usuário excluído' },
]

const PAGE_SIZE = 100

function formatarTimestamp(t: Timestamp): string {
  return t.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })
}

function formatarValor(v: unknown): string {
  if (v == null) return '—'
  if (v instanceof Timestamp) return v.toDate().toLocaleString('pt-BR')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function CorEvento({ tipo }: { tipo: string }) {
  const map: Record<string, string> = {
    login: 'bg-sky-100 text-sky-700',
    palpite_create: 'bg-green-100 text-green-700',
    palpite_update: 'bg-blue-100 text-blue-700',
    palpite_delete: 'bg-red-100 text-red-700',
    palpite_especial_create: 'bg-emerald-100 text-emerald-700',
    palpite_especial_update: 'bg-cyan-100 text-cyan-700',
    palpite_especial_delete: 'bg-rose-100 text-rose-700',
    usuario_create: 'bg-violet-100 text-violet-700',
    usuario_update: 'bg-amber-100 text-amber-700',
    usuario_delete: 'bg-pink-100 text-pink-700',
  }
  const cls = map[tipo] ?? 'bg-gray-100 text-gray-700'
  return <span className={`text-[11px] font-semibold rounded-full px-2 py-0.5 ${cls}`}>{tipo}</span>
}

function MetadataLogin({ metadata }: { metadata?: Record<string, unknown> }) {
  if (!metadata) return null
  const ip = (metadata.ip as string | undefined) ?? '—'
  const userAgent = (metadata.userAgent as string | undefined) ?? '—'
  const metodo = (metadata.metodo as string | undefined) ?? 'desconhecido'
  return (
    <div className="mt-2 text-xs space-y-0.5">
      <div className="flex flex-wrap gap-1 items-center">
        <span className="font-semibold text-gray-600">Método:</span>
        <span className="text-gray-800">{metodo}</span>
      </div>
      <div className="flex flex-wrap gap-1 items-center">
        <span className="font-semibold text-gray-600">IP:</span>
        <span className="font-mono text-gray-800">{ip}</span>
      </div>
      <div className="flex flex-wrap gap-1 items-baseline">
        <span className="font-semibold text-gray-600">User-Agent:</span>
        <span className="text-gray-800 break-all">{userAgent}</span>
      </div>
    </div>
  )
}

function Diff({ before, after, changedFields }: { before: AuditDoc['before']; after: AuditDoc['after']; changedFields: string[] }) {
  if (changedFields.length === 0) return null
  return (
    <div className="mt-2 text-xs space-y-1">
      {changedFields.map(field => {
        const b = before?.[field]
        const a = after?.[field]
        return (
          <div key={field} className="flex flex-wrap gap-1 items-center">
            <span className="font-semibold text-gray-600">{field}:</span>
            <span className="line-through text-gray-400">{formatarValor(b)}</span>
            <span className="text-gray-400">→</span>
            <span className="text-gray-800">{formatarValor(a)}</span>
          </div>
        )
      })}
    </div>
  )
}

export function Auditoria() {
  const [logs, setLogs] = useState<AuditDoc[]>([])
  const [usuarios, setUsuarios] = useState<Map<string, Usuario>>(new Map())
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroUid, setFiltroUid] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)

      const usuariosSnap = await getDocs(collection(db, 'usuarios'))
      const usMap = new Map<string, Usuario>()
      usuariosSnap.docs.forEach(d => usMap.set(d.id, { uid: d.id, ...d.data() } as Usuario))
      setUsuarios(usMap)

      const constraints = []
      if (filtroTipo) constraints.push(where('eventType', '==', filtroTipo))
      if (filtroUid) constraints.push(where('targetUid', '==', filtroUid))
      constraints.push(orderBy('at', 'desc'))
      constraints.push(limit(PAGE_SIZE))

      const q = query(collection(db, 'audit_log'), ...constraints)
      const snap = await getDocs(q)
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as AuditDoc)))
      setLoading(false)
    }
    load()
  }, [filtroTipo, filtroUid])

  const usuariosOrdenados = useMemo(() => {
    return Array.from(usuarios.values()).sort((a, b) =>
      (a.apelido || a.nome || '').localeCompare(b.apelido || b.nome || ''))
  }, [usuarios])

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Auditoria</h2>

      <div className="bg-white rounded-xl shadow border border-gray-100 p-4 mb-4 grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de evento</label>
          <select
            value={filtroTipo}
            onChange={e => setFiltroTipo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            {TIPOS_EVENTO.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Usuário afetado</label>
          <select
            value={filtroUid}
            onChange={e => setFiltroUid(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos os usuários</option>
            {usuariosOrdenados.map(u => (
              <option key={u.uid} value={u.uid}>{u.apelido || u.nome} ({u.email})</option>
            ))}
          </select>
        </div>
      </div>

      {loading && <p className="text-gray-500 text-sm">Carregando...</p>}

      {!loading && logs.length === 0 && (
        <p className="text-gray-500 text-sm bg-white rounded-xl border border-gray-100 p-6 text-center">
          Nenhum evento encontrado para os filtros aplicados.
        </p>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-100 divide-y divide-gray-100">
          {logs.map(log => {
            const usuario = log.targetUid ? usuarios.get(log.targetUid) : null
            return (
              <div key={log.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 min-w-0">
                    {usuario && (
                      <Avatar
                        src={usuario.fotoURL ?? null}
                        nome={usuario.apelido || usuario.nome}
                        uid={usuario.uid}
                        size="sm"
                        ring={false}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {usuario ? (usuario.apelido || usuario.nome) : (log.targetUid ?? '—')}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">{log.targetPath}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <CorEvento tipo={log.eventType} />
                    <p className="text-[11px] text-gray-500 mt-1">{formatarTimestamp(log.at)}</p>
                  </div>
                </div>
                {log.eventType === 'login'
                  ? <MetadataLogin metadata={log.metadata} />
                  : <Diff before={log.before} after={log.after} changedFields={log.changedFields} />}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-[11px] text-gray-400 mt-3 text-center">
        Mostrando os últimos {PAGE_SIZE} eventos. Para histórico completo, consulte BigQuery ou Firestore Console.
      </p>
    </div>
  )
}
