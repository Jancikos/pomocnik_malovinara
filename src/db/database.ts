import Dexie, { type EntityTable } from 'dexie'
import type {
  AuditEntry,
  Batch,
  Intervention,
  Measurement,
  SyncQueueItem,
  Wine,
} from '@/domain/models'

export interface AppMeta {
  key: string
  value: string
}

export interface ServerReceipt {
  idempotencyKey: string
  syncedAt: string
}

export class WineryDatabase extends Dexie {
  wines!: EntityTable<Wine, 'id'>
  batches!: EntityTable<Batch, 'id'>
  measurements!: EntityTable<Measurement, 'id'>
  interventions!: EntityTable<Intervention, 'id'>
  audits!: EntityTable<AuditEntry, 'id'>
  syncQueue!: EntityTable<SyncQueueItem, 'id'>
  appMeta!: EntityTable<AppMeta, 'key'>
  serverReceipts!: EntityTable<ServerReceipt, 'idempotencyKey'>

  constructor() {
    super('vinarsky-pomocnik')
    this.version(1).stores({
      wines: 'id, code, vintageYear',
      batches: 'id, wineId, status, phase, container.label',
      measurements: 'id, batchId, type, measuredAt, syncStatus, deletedAt',
      interventions: 'id, batchId, type, performedAt, syncStatus, deletedAt',
      audits: 'id, entityType, entityId, changedAt',
      syncQueue: 'id, idempotencyKey, status, createdAt',
      appMeta: 'key',
      serverReceipts: 'idempotencyKey',
    })
    this.version(2)
      .stores({
        batches: 'id, wineId, status, phase, [status+phase], container.label',
      })
      .upgrade(async (transaction) => {
        await transaction.table('appMeta').put({ key: 'schemaVersion', value: '2' })
      })
  }
}

export const db = new WineryDatabase()
