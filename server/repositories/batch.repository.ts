import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../database/client'
import { batches, interventions, measurements, vessels, wines } from '../database/schema'

export async function findBatch(db: Database, cellarId: string, id: string) {
  return db.select().from(batches).where(and(eq(batches.id, id), eq(batches.cellarId, cellarId))).get()
}

export async function listBatchRows(db: Database, cellarId: string) {
  return db.select({ batch: batches, wine: wines, vessel: vessels })
    .from(batches)
    .innerJoin(wines, eq(batches.wineId, wines.id))
    .innerJoin(vessels, eq(batches.vesselId, vessels.id))
    .where(eq(batches.cellarId, cellarId))
    .orderBy(desc(batches.openedAt)).all()
}

export async function findBatchRow(db: Database, cellarId: string, id: string) {
  return db.select({ batch: batches, wine: wines, vessel: vessels })
    .from(batches)
    .innerJoin(wines, eq(batches.wineId, wines.id))
    .innerJoin(vessels, eq(batches.vesselId, vessels.id))
    .where(and(eq(batches.cellarId, cellarId), eq(batches.id, id))).get()
}

export async function listBatchMeasurements(db: Database, batchId: string) {
  return db.select().from(measurements).where(eq(measurements.batchId, batchId)).orderBy(desc(measurements.measuredAt)).all()
}

export async function listBatchInterventions(db: Database, batchId: string) {
  return db.select().from(interventions).where(eq(interventions.batchId, batchId)).orderBy(desc(interventions.performedAt)).all()
}

export async function listBatchChildren(db: Database, batchId: string) {
  return db.select({ id: batches.id, phase: batches.phase, vesselName: vessels.name, volume: batches.volume })
    .from(batches).innerJoin(vessels, eq(batches.vesselId, vessels.id))
    .where(eq(batches.parentBatchId, batchId)).all()
}