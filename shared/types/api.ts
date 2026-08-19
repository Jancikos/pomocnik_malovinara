import type { BatchPhase, BatchStatus, InterventionType, MeasurementType, VesselType, WineColor } from '../domain'

export interface LatestMeasurementDto {
  id: string
  type: MeasurementType
  value: number
  unit: string
  measuredAt: string
}

export interface VesselSnapshotDto {
  name: string
  type: VesselType
  capacity: number
  location: string | null
}

export interface WineDto {
  id: string
  name: string
  code: string
  vintageYear: number
  color: WineColor
  notes: string | null
  sourceMaterials?: Array<{
    id: string
    grapeVariety: string
    percentage: number
    weightKg: number | null
    volumeLiters: number | null
    harvestSugar: number | null
  }>
}

export interface BatchSummaryDto {
  id: string
  wineId: string
  wineName: string
  wineCode: string
  vintageYear: number
  phase: BatchPhase
  status: BatchStatus
  volume: number
  vessel: VesselSnapshotDto
  latestMeasurements: Partial<Record<MeasurementType, LatestMeasurementDto>>
  parentBatchId: string | null
  openedAt: string
  closedAt: string | null
}

export interface MeasurementDto extends LatestMeasurementDto {
  batchId: string
  createdAt: string
}

export interface InterventionDto {
  id: string
  batchId: string
  type: InterventionType
  performedAt: string
  notes: string | null
  createdAt: string
}

export interface BatchDetailDto extends BatchSummaryDto {
  measurements: MeasurementDto[]
  interventions: InterventionDto[]
  children: Array<{ id: string; phase: BatchPhase; vesselName: string; volume: number }>
}
