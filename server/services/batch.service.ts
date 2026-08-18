import { and, count, eq } from 'drizzle-orm'
import { BatchPhase, BatchStatus } from '../../shared/domain'
import { parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { batches, interventions, measurements, transferDestinations, transfers, vessels, wines } from '../database/schema'
import { findBatch, findBatchRow, listBatchChildren, listBatchInterventions, listBatchMeasurements, listBatchRows } from '../repositories/batch.repository'
import { latestMeasurementsByType } from '../repositories/measurement.repository'
import { DomainError, notFound } from '../utils/errors'
import { nextBatchIds } from './batch-id'
import { batchDetailDto, batchSummaryDto, measurementDto } from './dto'

export async function getBatches(db: Database, cellarId: string, status?: BatchStatus) {
  const rows = await listBatchRows(db, cellarId)
  const selected = status ? rows.filter((row) => row.batch.status === status) : rows
  const latest = await latestMeasurementsByType(db, selected.map((row) => row.batch.id))
  return selected.map((row) => batchSummaryDto(row, latest.get(row.batch.id)))
}

export async function getBatch(db: Database, cellarId: string, id: string) {
  const row = await findBatchRow(db, cellarId, id)
  if (!row) notFound('Šarža sa nenašla.')
  const [measurementRows, interventionRows, children, latest] = await Promise.all([
    listBatchMeasurements(db, id),
    listBatchInterventions(db, id),
    listBatchChildren(db, id),
    latestMeasurementsByType(db, [id]),
  ])
  return batchDetailDto(
    batchSummaryDto(row, latest.get(id)),
    measurementRows.map(measurementDto),
    interventionRows,
    children,
  )
}

export function createBatch(db: Database, cellarId: string, body: Record<string, unknown>) {
  const wineId = String(body.wineId || '')
  const vesselId = String(body.vesselId || '')
  const volume = parseDecimal(body.volume, 'Objem')
  if (volume <= 0) throw new DomainError('Objem musí byť kladný.')
  const openedAt = body.openedAt ? new Date(String(body.openedAt)) : new Date()
  if (Number.isNaN(openedAt.getTime())) throw new DomainError('Dátum otvorenia nie je platný.')

  let id = ''
  db.transaction((tx) => {
    const wine = tx.select().from(wines).where(and(eq(wines.id, wineId), eq(wines.cellarId, cellarId))).get()
    if (!wine) notFound('Víno sa nenašlo.')
    const vessel = tx.select().from(vessels).where(and(eq(vessels.id, vesselId), eq(vessels.cellarId, cellarId))).get()
    if (!vessel) notFound('Nádoba sa nenašla.')
    if (volume > vessel.capacity) throw new DomainError('Objem prekračuje kapacitu nádoby.')
    const occupied = tx.select({ id: batches.id }).from(batches).where(and(eq(batches.vesselId, vesselId), eq(batches.status, BatchStatus.ACTIVE))).get()
    if (occupied) throw new DomainError('Nádoba už obsahuje aktívnu šaržu.', 409)
    id = nextBatchIds(tx as unknown as Database, { cellarId, year: wine.vintageYear, wineCode: wine.code, phase: BatchPhase.MUST })[0]!
    tx.insert(batches).values({ id, cellarId, wineId, vesselId, phase: BatchPhase.MUST, volume, status: BatchStatus.ACTIVE, openedAt }).run()
  })
  return getBatch(db, cellarId, id)
}

export async function closeBatch(db: Database, cellarId: string, id: string) {
  const batch = await findBatch(db, cellarId, id)
  if (!batch) notFound('Šarža sa nenašla.')
  if (batch.status !== BatchStatus.ACTIVE) throw new DomainError('Šarža je už uzavretá.', 409)
  db.update(batches).set({ status: BatchStatus.CLOSED, closedAt: new Date(), updatedAt: new Date() }).where(eq(batches.id, id)).run()
  return getBatch(db, cellarId, id)
}

export async function forceDeleteBatch(db: Database, cellarId: string, id: string, confirmation: unknown) {
  if (confirmation !== 'FORCE DELETE') throw new DomainError('Pre vymazanie zadajte presne FORCE DELETE.')
  const batch = await findBatch(db, cellarId, id)
  if (!batch) notFound('Šarža sa nenašla.')
  const linked = [
    db.select({ value: count() }).from(batches).where(eq(batches.parentBatchId, id)).get()?.value ?? 0,
    db.select({ value: count() }).from(measurements).where(eq(measurements.batchId, id)).get()?.value ?? 0,
    db.select({ value: count() }).from(interventions).where(eq(interventions.batchId, id)).get()?.value ?? 0,
    db.select({ value: count() }).from(transfers).where(eq(transfers.sourceBatchId, id)).get()?.value ?? 0,
    db.select({ value: count() }).from(transferDestinations).where(eq(transferDestinations.createdBatchId, id)).get()?.value ?? 0,
  ].reduce((sum, value) => sum + value, 0)
  if (linked > 0) throw new DomainError('Šaržu nemožno vymazať, pretože má históriu alebo následníkov.', 409)
  db.delete(batches).where(eq(batches.id, id)).run()
  return { deleted: true }
}