import { desc, eq } from 'drizzle-orm'
import type { MeasurementType } from '../../shared/domain'
import type { Database } from '../database/client'
import { measurements } from '../database/schema'

export async function listMeasurements(db: Database, batchId: string) {
  return db.select().from(measurements).where(eq(measurements.batchId, batchId)).orderBy(desc(measurements.measuredAt)).all()
}

export async function latestMeasurementsByType(db: Database, batchIds: string[]) {
  if (batchIds.length === 0) return new Map<string, Partial<Record<MeasurementType, typeof measurements.$inferSelect>>>()
  const rows = db.select().from(measurements).orderBy(desc(measurements.measuredAt)).all()
  const requested = new Set(batchIds)
  const result = new Map<string, Partial<Record<MeasurementType, typeof measurements.$inferSelect>>>()
  for (const row of rows) {
    if (!requested.has(row.batchId)) continue
    const byType = result.get(row.batchId) ?? {}
    if (!byType[row.type]) byType[row.type] = row
    result.set(row.batchId, byType)
  }
  return result
}