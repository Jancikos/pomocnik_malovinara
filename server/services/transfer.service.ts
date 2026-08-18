import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { allowedTargetPhase, BatchStatus, InterventionType, type BatchPhase, validateVolumeBalance } from '../../shared/domain'
import { parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { batches, interventions, transferDestinations, transfers, vessels, wines } from '../database/schema'
import { DomainError, notFound } from '../utils/errors'
import { nextBatchIds } from './batch-id'

interface Destination { vesselId: string; volume: number }

export function transferBatch(
  db: Database,
  context: { cellarId: string; userId: string },
  body: Record<string, unknown>,
) {
  const sourceBatchId = String(body.sourceBatchId || '')
  const targetPhase = body.targetPhase as BatchPhase
  const rawDestinations = Array.isArray(body.destinations) ? body.destinations as Array<Record<string, unknown>> : []
  const destinations: Destination[] = rawDestinations.map((item) => ({
    vesselId: String(item.vesselId || ''),
    volume: parseDecimal(item.volume, 'Cieľový objem'),
  }))
  const lossVolume = parseDecimal(body.lossVolume ?? 0, 'Strata')
  const performedAt = body.performedAt ? new Date(String(body.performedAt)) : new Date()
  if (Number.isNaN(performedAt.getTime())) throw new DomainError('Dátum presunu nie je platný.')
  if (new Set(destinations.map((item) => item.vesselId)).size !== destinations.length) {
    throw new DomainError('Každá cieľová nádoba môže byť uvedená iba raz.')
  }

  const createdBatchIds: string[] = []
  const transferId = randomUUID()
  db.transaction((tx) => {
    const source = tx.select().from(batches).where(and(eq(batches.id, sourceBatchId), eq(batches.cellarId, context.cellarId))).get()
    if (!source) notFound('Zdrojová šarža sa nenašla.')
    if (source.status !== BatchStatus.ACTIVE) throw new DomainError('Zdrojová šarža nie je aktívna.', 409)
    if (destinations.some((item) => item.vesselId === source.vesselId)) throw new DomainError('Cieľová nádoba musí byť odlišná od zdrojovej.')
    const expectedPhase = allowedTargetPhase(source.phase, targetPhase === 'CLARIFICATION' ? InterventionType.CLARIFICATION : InterventionType.RACKING)
    if (!expectedPhase || expectedPhase !== targetPhase) throw new DomainError('Tento fázový prechod nie je povolený.')
    validateVolumeBalance(source.volume, destinations, lossVolume)

    const wine = tx.select().from(wines).where(and(eq(wines.id, source.wineId), eq(wines.cellarId, context.cellarId))).get()
    if (!wine) notFound('Víno sa nenašlo.')
    const targetVessels = destinations.map((destination) => {
      const vessel = tx.select().from(vessels).where(and(eq(vessels.id, destination.vesselId), eq(vessels.cellarId, context.cellarId))).get()
      if (!vessel) notFound('Jedna z cieľových nádob sa nenašla.')
      if (destination.volume > vessel.capacity) throw new DomainError(`Objem prekračuje kapacitu nádoby ${vessel.name}.`)
      const occupied = tx.select({ id: batches.id }).from(batches).where(and(eq(batches.vesselId, vessel.id), eq(batches.status, BatchStatus.ACTIVE))).get()
      if (occupied) throw new DomainError(`Nádoba ${vessel.name} už obsahuje aktívnu šaržu.`, 409)
      return vessel
    })
    const ids = nextBatchIds(tx as unknown as Database, {
      cellarId: context.cellarId,
      year: wine.vintageYear,
      wineCode: wine.code,
      phase: targetPhase,
      count: destinations.length,
    })
    tx.update(batches).set({ status: BatchStatus.CLOSED, closedAt: performedAt, updatedAt: new Date() }).where(eq(batches.id, source.id)).run()
    tx.insert(transfers).values({ id: transferId, cellarId: context.cellarId, sourceBatchId: source.id, lossVolume, targetPhase, performedAt, createdBy: context.userId, notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null }).run()
    tx.insert(interventions).values({
      id: randomUUID(),
      batchId: source.id,
      type: targetPhase === 'CLARIFICATION' ? InterventionType.CLARIFICATION : InterventionType.RACKING,
      performedAt,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    }).run()
    destinations.forEach((destination, index) => {
      const id = ids[index]!
      createdBatchIds.push(id)
      tx.insert(batches).values({
        id,
        cellarId: context.cellarId,
        wineId: source.wineId,
        phase: targetPhase,
        vesselId: targetVessels[index]!.id,
        parentBatchId: source.id,
        volume: destination.volume,
        status: BatchStatus.ACTIVE,
        openedAt: performedAt,
      }).run()
      tx.insert(transferDestinations).values({ id: randomUUID(), transferId, vesselId: destination.vesselId, volume: destination.volume, createdBatchId: id }).run()
    })
  })
  return { id: transferId, sourceBatchId, createdBatchIds, lossVolume, targetPhase }
}