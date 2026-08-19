import type { MeasurementType } from '../../shared/domain'
import type { BatchDetailDto, BatchSummaryDto, LatestMeasurementDto, MeasurementDto } from '../../shared/types/api'

export function measurementDto(row: { id: string; batchId: string; type: MeasurementType; value: number; unit: string; measuredAt: Date; createdAt: Date }): MeasurementDto {
  return { id: row.id, batchId: row.batchId, type: row.type, value: row.value, unit: row.unit, measuredAt: row.measuredAt.toISOString(), createdAt: row.createdAt.toISOString() }
}

export function latestDto(rows: Partial<Record<MeasurementType, { id: string; type: MeasurementType; value: number; unit: string; measuredAt: Date }>>): Partial<Record<MeasurementType, LatestMeasurementDto>> {
  return Object.fromEntries(Object.entries(rows).map(([type, row]) => [type, row && { id: row.id, type: row.type, value: row.value, unit: row.unit, measuredAt: row.measuredAt.toISOString() }]))
}

export function batchSummaryDto(row: any, latest: Partial<Record<MeasurementType, any>> = {}): BatchSummaryDto {
  return {
    id: row.batch.id,
    wineId: row.wine.id,
    wineName: row.wine.name,
    wineCode: row.wine.code,
    vintageYear: row.wine.vintageYear,
    phase: row.batch.phase,
    status: row.batch.status,
    volume: row.batch.volume,
    vessel: {
      name: row.batch.vesselName,
      type: row.batch.vesselType,
      capacity: row.batch.vesselCapacity,
      location: row.batch.vesselLocation,
    },
    latestMeasurements: latestDto(latest),
    parentBatchId: row.batch.parentBatchId,
    openedAt: row.batch.openedAt.toISOString(),
    closedAt: row.batch.closedAt?.toISOString() ?? null,
  }
}

export function batchDetailDto(summary: BatchSummaryDto, measurements: MeasurementDto[], interventions: any[], children: any[]): BatchDetailDto {
  return {
    ...summary,
    measurements,
    interventions: interventions.map((item) => ({ id: item.id, batchId: item.batchId, type: item.type, performedAt: item.performedAt.toISOString(), notes: item.notes, createdAt: item.createdAt.toISOString() })),
    children,
  }
}
