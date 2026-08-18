import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { BatchPhase, BatchStatus, InterventionType } from '../../shared/domain'
import type { Database } from '../database/client'
import { interventions } from '../database/schema'
import { findBatch } from '../repositories/batch.repository'
import { DomainError, notFound } from '../utils/errors'

export async function createIntervention(db: Database, cellarId: string, batchId: string, body: Record<string, unknown>) {
  const batch = await findBatch(db, cellarId, batchId)
  if (!batch) notFound('Šarža sa nenašla.')
  if (batch.status !== BatchStatus.ACTIVE) throw new DomainError('Do uzavretej šarže nemožno zapisovať zásahy.', 409)
  if (body.type !== InterventionType.FERMENTATION) throw new DomainError('Odkalenie a stáčanie vytvorte cez transfer.')
  if (batch.phase !== BatchPhase.FERMENTATION) throw new DomainError('Zásah kvasenia je povolený iba vo fáze kvasenia.')
  const performedAt = body.performedAt ? new Date(String(body.performedAt)) : new Date()
  if (Number.isNaN(performedAt.getTime())) throw new DomainError('Dátum zásahu nie je platný.')
  const id = randomUUID()
  db.insert(interventions).values({ id, batchId, type: InterventionType.FERMENTATION, performedAt, notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null }).run()
  return db.select().from(interventions).where(eq(interventions.id, id)).get()
}