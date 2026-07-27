import { db } from '@/db/database'
import type {
  AuditEntry,
  Batch,
  Intervention,
  Measurement,
  SyncQueueItem,
  Wine,
} from '@/domain/models'
import winesSeed from '@/data/seed/wines.json'
import batchesSeed from '@/data/seed/batches.json'
import measurementsSeed from '@/data/seed/measurements.json'
import interventionsSeed from '@/data/seed/interventions.json'
import auditsSeed from '@/data/seed/audit-entries.json'

const seedVersion = '1'

function uuid(): string {
  return crypto.randomUUID()
}

function queueItem(
  entityType: string,
  entityId: string,
  operation: SyncQueueItem['operation'],
  payload: Record<string, unknown>,
): SyncQueueItem {
  const now = new Date().toISOString()
  return {
    id: uuid(),
    idempotencyKey: uuid(),
    entityType,
    entityId,
    operation,
    payload,
    dependencyIds: [],
    status: 'pending',
    retryCount: 0,
    createdAt: now,
  }
}

function audit(
  entityType: string,
  entityId: string,
  action: AuditEntry['action'],
  after?: Record<string, unknown>,
  before?: Record<string, unknown>,
): AuditEntry {
  const changedFields = Array.from(
    new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]),
  ).filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))
  return {
    id: uuid(),
    entityType,
    entityId,
    action,
    changedAt: new Date().toISOString(),
    changedFields,
    before,
    after,
    syncStatus: navigator.onLine ? 'synced' : 'pending',
  }
}

export class WineryRepository {
  async initialize(): Promise<void> {
    const seeded = await db.appMeta.get('seedVersion')
    if (seeded?.value === seedVersion) return
    await db.transaction(
      'rw',
      [db.wines, db.batches, db.measurements, db.interventions, db.audits, db.appMeta],
      async () => {
        if ((await db.wines.count()) === 0) await db.wines.bulkAdd(winesSeed as Wine[])
        if ((await db.batches.count()) === 0) await db.batches.bulkAdd(batchesSeed as Batch[])
        if ((await db.measurements.count()) === 0) {
          await db.measurements.bulkAdd(measurementsSeed as Measurement[])
        }
        if ((await db.interventions.count()) === 0) {
          await db.interventions.bulkAdd(interventionsSeed as Intervention[])
        }
        if ((await db.audits.count()) === 0) await db.audits.bulkAdd(auditsSeed as AuditEntry[])
        await db.appMeta.put({ key: 'seedVersion', value: seedVersion })
      },
    )
  }

  async snapshot() {
    const [wines, batches, measurements, interventions, audits, queue] = await Promise.all([
      db.wines.toArray(),
      db.batches.toArray(),
      db.measurements.toArray(),
      db.interventions.toArray(),
      db.audits.toArray(),
      db.syncQueue.orderBy('createdAt').toArray(),
    ])
    return { wines, batches, measurements, interventions, audits, queue }
  }

  async addWineAndBatch(wine: Wine, batch: Batch): Promise<void> {
    const item = queueItem('wine-batch', batch.id, 'transaction', { wine, batch })
    await db.transaction('rw', [db.wines, db.batches, db.audits, db.syncQueue], async () => {
      await db.wines.add(wine)
      await db.batches.add(batch)
      await db.audits.bulkAdd([
        audit('wine', wine.id, 'create', { ...wine }),
        audit('batch', batch.id, 'create', { ...batch }),
      ])
      await db.syncQueue.add(item)
    })
  }

  async addMeasurement(measurement: Measurement): Promise<void> {
    const item = queueItem('measurement', measurement.id, 'create', { ...measurement })
    await db.transaction('rw', [db.measurements, db.audits, db.syncQueue], async () => {
      await db.measurements.add(measurement)
      await db.audits.add(audit('measurement', measurement.id, 'create', { ...measurement }))
      await db.syncQueue.add(item)
    })
  }

  async addIntervention(intervention: Intervention): Promise<void> {
    const item = queueItem('intervention', intervention.id, 'create', { ...intervention })
    await db.transaction('rw', [db.interventions, db.audits, db.syncQueue], async () => {
      await db.interventions.add(intervention)
      await db.audits.add(audit('intervention', intervention.id, 'create', { ...intervention }))
      await db.syncQueue.add(item)
    })
  }

  async transferBatch(source: Batch, target: Batch, intervention: Intervention): Promise<void> {
    const closed: Batch = {
      ...source,
      status: 'closed',
      phase: 'closed',
      currentVolumeLiters: 0,
      closeReason: intervention.type === 'bottling' ? 'bottling' : 'transfer',
      closedAt: intervention.performedAt,
      updatedAt: intervention.performedAt,
    }
    const item = queueItem('batch-operation', intervention.id, 'transaction', {
      source: closed,
      target,
      intervention,
    })
    await db.transaction(
      'rw',
      [db.batches, db.interventions, db.audits, db.syncQueue],
      async () => {
        await db.batches.put(closed)
        await db.batches.add(target)
        await db.interventions.add(intervention)
        await db.audits.bulkAdd([
          audit('batch', source.id, 'update', { ...closed }, { ...source }),
          audit('batch', target.id, 'create', { ...target }),
          audit('intervention', intervention.id, 'create', { ...intervention }),
        ])
        await db.syncQueue.add(item)
      },
    )
  }

  async splitBatch(source: Batch, targets: Batch[], intervention: Intervention): Promise<void> {
    const closed: Batch = {
      ...source,
      status: 'closed',
      phase: 'closed',
      currentVolumeLiters: 0,
      closeReason: 'split',
      closedAt: intervention.performedAt,
      updatedAt: intervention.performedAt,
    }
    const item = queueItem('batch-operation', intervention.id, 'transaction', {
      source: closed,
      targets,
      intervention,
    })
    await db.transaction(
      'rw',
      [db.batches, db.interventions, db.audits, db.syncQueue],
      async () => {
        await db.batches.put(closed)
        await db.batches.bulkAdd(targets)
        await db.interventions.add(intervention)
        await db.audits.bulkAdd([
          audit('batch', source.id, 'update', { ...closed }, { ...source }),
          ...targets.map((target) => audit('batch', target.id, 'create', { ...target })),
          audit('intervention', intervention.id, 'create', { ...intervention }),
        ])
        await db.syncQueue.add(item)
      },
    )
  }

  async mergeBatches(sources: Batch[], target: Batch, intervention: Intervention): Promise<void> {
    const closed = sources.map<Batch>((source) => ({
      ...source,
      status: 'closed',
      phase: 'closed',
      currentVolumeLiters: 0,
      closeReason: 'merge',
      closedAt: intervention.performedAt,
      updatedAt: intervention.performedAt,
    }))
    const item = queueItem('batch-operation', intervention.id, 'transaction', {
      sources: closed,
      target,
      intervention,
    })
    await db.transaction(
      'rw',
      [db.batches, db.interventions, db.audits, db.syncQueue],
      async () => {
        await db.batches.bulkPut(closed)
        await db.batches.add(target)
        await db.interventions.add(intervention)
        await db.audits.bulkAdd([
          ...sources.map((source, index) =>
            audit('batch', source.id, 'update', { ...closed[index] }, { ...source }),
          ),
          audit('batch', target.id, 'create', { ...target }),
          audit('intervention', intervention.id, 'create', { ...intervention }),
        ])
        await db.syncQueue.add(item)
      },
    )
  }

  async updatePendingEvent(
    kind: 'measurement' | 'intervention',
    id: string,
    changes: Record<string, unknown>,
  ): Promise<void> {
    const existing =
      kind === 'measurement' ? await db.measurements.get(id) : await db.interventions.get(id)
    if (!existing || existing.syncStatus !== 'pending') {
      throw new Error('Upravovať možno iba čakajúci offline záznam.')
    }
    const after = { ...existing, ...changes, updatedAt: new Date().toISOString() }
    await db.transaction(
      'rw',
      [db.measurements, db.interventions, db.audits, db.syncQueue],
      async () => {
        if (kind === 'measurement') {
          await db.measurements.put(after as Measurement)
        } else {
          await db.interventions.put(after as Intervention)
        }
        await db.audits.add(audit(kind, id, 'update', after, { ...existing }))
        const queued = await db.syncQueue.where('entityId').equals(id).first()
        if (queued) await db.syncQueue.update(queued.id, { operation: 'update', payload: after })
      },
    )
  }

  async deletePendingEvent(kind: 'measurement' | 'intervention', id: string): Promise<void> {
    const existing =
      kind === 'measurement' ? await db.measurements.get(id) : await db.interventions.get(id)
    if (!existing || existing.syncStatus !== 'pending') {
      throw new Error('Odstrániť možno iba čakajúci offline záznam.')
    }
    const now = new Date().toISOString()
    const after = { ...existing, deletedAt: now, updatedAt: now }
    await db.transaction(
      'rw',
      [db.measurements, db.interventions, db.audits, db.syncQueue],
      async () => {
        if (kind === 'measurement') {
          await db.measurements.put(after as Measurement)
        } else {
          await db.interventions.put(after as Intervention)
        }
        await db.audits.add(audit(kind, id, 'delete', after, { ...existing }))
        const queued = await db.syncQueue.where('entityId').equals(id).first()
        if (queued) await db.syncQueue.update(queued.id, { operation: 'delete', payload: after })
      },
    )
  }

  async sync(fail = false): Promise<void> {
    const pending = await db.syncQueue
      .where('status')
      .anyOf(['pending', 'failed'])
      .sortBy('createdAt')
    for (const item of pending) {
      const receipt = await db.serverReceipts.get(item.idempotencyKey)
      if (receipt) {
        await this.markSynced(item, receipt.syncedAt)
        continue
      }
      await db.syncQueue.update(item.id, {
        status: 'syncing',
        lastAttemptAt: new Date().toISOString(),
      })
      await new Promise((resolve) => window.setTimeout(resolve, 180))
      if (fail) {
        await db.syncQueue.update(item.id, {
          status: 'failed',
          retryCount: item.retryCount + 1,
          lastError: 'Simulované spojenie so serverom zlyhalo.',
        })
        continue
      }
      const syncedAt = new Date().toISOString()
      await db.serverReceipts.put({ idempotencyKey: item.idempotencyKey, syncedAt })
      await this.markSynced(item, syncedAt)
    }
  }

  private async markSynced(item: SyncQueueItem, syncedAt: string): Promise<void> {
    await db.transaction(
      'rw',
      [db.syncQueue, db.measurements, db.interventions, db.audits],
      async () => {
        await db.syncQueue.update(item.id, { status: 'synced', syncedAt, lastError: undefined })
        if (item.entityType === 'measurement') {
          await db.measurements.update(item.entityId, { syncStatus: 'synced' })
        }
        if (item.entityType === 'intervention') {
          await db.interventions.update(item.entityId, { syncStatus: 'synced' })
        }
      },
    )
  }

  async reset(): Promise<void> {
    await db.delete()
    await db.open()
    await this.initialize()
  }
}

export const wineryRepository = new WineryRepository()
