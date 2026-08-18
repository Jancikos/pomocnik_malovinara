import { randomUUID } from 'node:crypto'
import { BatchStatus, MeasurementType, measurementUnits } from '../../shared/domain'
import { parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { measurements } from '../database/schema'
import { findBatch } from '../repositories/batch.repository'
import { listMeasurements } from '../repositories/measurement.repository'
import { DomainError, notFound } from '../utils/errors'
import { measurementDto } from './dto'

export async function getMeasurements(db: Database, cellarId: string, batchId: string) {
  const batch = await findBatch(db, cellarId, batchId)
  if (!batch) notFound('Šarža sa nenašla.')
  return (await listMeasurements(db, batchId)).map(measurementDto)
}

export async function createMeasurement(db: Database, cellarId: string, batchId: string, body: Record<string, unknown>) {
  const batch = await findBatch(db, cellarId, batchId)
  if (!batch) notFound('Šarža sa nenašla.')
  if (batch.status !== BatchStatus.ACTIVE) throw new DomainError('Do uzavretej šarže nemožno zapisovať merania.', 409)
  if (!Object.values(MeasurementType).includes(body.type as MeasurementType)) throw new DomainError('Typ merania nie je platný.')
  const type = body.type as MeasurementType
  const value = parseDecimal(body.value)
  const measuredAt = body.measuredAt ? new Date(String(body.measuredAt)) : new Date()
  if (Number.isNaN(measuredAt.getTime())) throw new DomainError('Dátum merania nie je platný.')
  const row = { id: randomUUID(), batchId, type, value, unit: measurementUnits[type], measuredAt }
  db.insert(measurements).values(row).run()
  const created = db.select().from(measurements).where(eq(measurements.id, row.id)).get()!
  return measurementDto(created)
}

import { eq } from 'drizzle-orm'