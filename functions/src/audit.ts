import * as admin from 'firebase-admin'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'

// audit_log centraliza eventos sensiveis em /audit_log/{autoId}.
// Schema: {
//   eventType: string,
//   targetUid: string | null,
//   targetPath: string,
//   before: object | null,
//   after: object | null,
//   changedFields: string[],
//   at: Timestamp
// }
//
// Leitura via firestore.rules so para admin. Escrita so via Admin SDK.

interface AuditDoc {
  eventType: string
  targetUid: string | null
  targetPath: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  changedFields: string[]
  at: admin.firestore.Timestamp
}

function diffKeys(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): string[] {
  const keys = new Set<string>([
    ...(before ? Object.keys(before) : []),
    ...(after ? Object.keys(after) : []),
  ])
  const changed: string[] = []
  for (const k of keys) {
    const a = before?.[k]
    const b = after?.[k]
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(k)
  }
  return changed
}

async function gravar(doc: AuditDoc) {
  await admin.firestore().collection('audit_log').add(doc)
}

// Palpites — captura create / update / delete
export const auditPalpites = onDocumentWritten('palpites/{palpiteId}', async (event) => {
  const before = event.data?.before.data() as Record<string, unknown> | undefined
  const after = event.data?.after.data() as Record<string, unknown> | undefined

  const eventType =
    !before && after ? 'palpite_create'
      : before && !after ? 'palpite_delete'
        : 'palpite_update'

  await gravar({
    eventType,
    targetUid: ((after?.uid ?? before?.uid) as string | undefined) ?? null,
    targetPath: `palpites/${event.params.palpiteId}`,
    before: before ?? null,
    after: after ?? null,
    changedFields: diffKeys(before ?? null, after ?? null),
    at: admin.firestore.Timestamp.now(),
  })
})

// Palpites especiais
export const auditPalpitesEspeciais = onDocumentWritten('palpites_especiais/{uid}', async (event) => {
  const before = event.data?.before.data() as Record<string, unknown> | undefined
  const after = event.data?.after.data() as Record<string, unknown> | undefined

  const eventType =
    !before && after ? 'palpite_especial_create'
      : before && !after ? 'palpite_especial_delete'
        : 'palpite_especial_update'

  await gravar({
    eventType,
    targetUid: event.params.uid,
    targetPath: `palpites_especiais/${event.params.uid}`,
    before: before ?? null,
    after: after ?? null,
    changedFields: diffKeys(before ?? null, after ?? null),
    at: admin.firestore.Timestamp.now(),
  })
})

// Usuarios — captura mudancas em campos sensiveis (liberado, role) ou criacao/exclusao
const CAMPOS_SENSIVEIS_USUARIO = new Set(['liberado', 'role', 'fotoURL', 'apelido', 'nome', 'email', 'telefone'])

export const auditUsuarios = onDocumentWritten('usuarios/{uid}', async (event) => {
  const before = event.data?.before.data() as Record<string, unknown> | undefined
  const after = event.data?.after.data() as Record<string, unknown> | undefined

  const eventType =
    !before && after ? 'usuario_create'
      : before && !after ? 'usuario_delete'
        : 'usuario_update'

  const changedFields = diffKeys(before ?? null, after ?? null)
  const houveSensivel = changedFields.some(f => CAMPOS_SENSIVEIS_USUARIO.has(f))

  // Skip writes triviais (ex.: fcmToken refresh) para nao poluir o log
  if (eventType === 'usuario_update' && !houveSensivel) return

  await gravar({
    eventType,
    targetUid: event.params.uid,
    targetPath: `usuarios/${event.params.uid}`,
    before: before ?? null,
    after: after ?? null,
    changedFields,
    at: admin.firestore.Timestamp.now(),
  })
})
