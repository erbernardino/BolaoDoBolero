import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { v1 } from '@google-cloud/firestore'

const firestoreAdmin = new v1.FirestoreAdminClient()

// Backup diario do Firestore inteiro para gs://<default-bucket>/firestore-backups/<YYYY-MM-DD>/
// Executa as 00:00 horario de Brasilia.
export const backupFirestoreDiario = onSchedule(
  {
    schedule: '0 0 * * *',
    timeZone: 'America/Sao_Paulo',
    memory: '256MiB',
    timeoutSeconds: 540,
  },
  async () => {
    const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT
    if (!projectId) {
      logger.error('projectId nao disponivel nas envs do runtime')
      throw new Error('projectId ausente')
    }

    const bucket = `${projectId}.firebasestorage.app`
    const dataIso = new Date().toISOString().slice(0, 10)
    const outputUriPrefix = `gs://${bucket}/firestore-backups/${dataIso}`

    const databaseName = firestoreAdmin.databasePath(projectId, '(default)')

    logger.info(`Iniciando export do Firestore para ${outputUriPrefix}`)
    try {
      const [operation] = await firestoreAdmin.exportDocuments({
        name: databaseName,
        outputUriPrefix,
        // collectionIds vazio = todas as colecoes
        collectionIds: [],
      })
      logger.info(`Export iniciado. Nome da operacao: ${operation.name ?? 'desconhecido'}`)
    } catch (err) {
      logger.error('Falha ao iniciar export do Firestore', err)
      throw err
    }
  },
)
