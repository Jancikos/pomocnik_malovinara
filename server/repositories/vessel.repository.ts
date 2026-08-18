import { and, asc, eq } from 'drizzle-orm'
import { BatchStatus } from '../../shared/domain'
import type { Database } from '../database/client'
import { batches, vessels } from '../database/schema'

export async function listVessels(db: Database, cellarId: string) {
  return db.select().from(vessels).where(eq(vessels.cellarId, cellarId)).orderBy(asc(vessels.name)).all()
}

export async function findVessel(db: Database, cellarId: string, id: string) {
  return db.select().from(vessels).where(and(eq(vessels.id, id), eq(vessels.cellarId, cellarId))).get()
}

export async function activeBatchInVessel(db: Database, cellarId: string, vesselId: string) {
  return db.select().from(batches).where(and(
    eq(batches.cellarId, cellarId),
    eq(batches.vesselId, vesselId),
    eq(batches.status, BatchStatus.ACTIVE),
  )).get()
}