import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { BatchStatus, InterventionType } from '../../shared/domain'
import type { Database } from '../database/client'
import { interventions } from '../database/schema'
import { findBatch } from '../repositories/batch.repository'
import { DomainError, notFound } from '../utils/errors'

export async function createIntervention(db: Database, cellarId: string, batchId: string, body: Record<string, unknown>) {
  const batch = await findBatch(db, cellarId, batchId)
  if (!batch) notFound('Šarža sa nenašla.')
  if (batch.status !== BatchStatus.ACTIVE) throw new DomainError('Do uzavretej šarže nemožno zapisovať zásahy.', 409)
  if (!Object.values(InterventionType).includes(body.type as InterventionType)) {
    throw new DomainError('Typ zásahu nie je platný.')
  }

  const performedAt = body.performedAt ? new Date(String(body.performedAt)) : new Date()
  if (Number.isNaN(performedAt.getTime())) throw new DomainError('Dátum zásahu nie je platný.')

  const id = randomUUID()
  db.insert(interventions).values({
    id,
    batchId,
    type: body.type as InterventionType,
    performedAt,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
  }).run()
  return db.select().from(interventions).where(eq(interventions.id, id)).get()
}
