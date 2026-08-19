import type { BatchPhase } from './batch'
import type { VesselType } from './vessel'

export interface TransferDestinationInput {
  vessel: {
    name: string
    type: VesselType
    capacity: number
    location?: string
  }
  volume: number
}

export interface TransferInput {
  sourceBatchId: string
  destinations: TransferDestinationInput[]
  lossVolume: number
  targetPhase: BatchPhase
  performedAt?: string
  notes?: string
}

export function validateVolumeBalance(
  sourceVolume: number,
  destinations: Array<{ volume: number }>,
  lossVolume: number,
): void {
  if (lossVolume < 0) throw new Error('Strata nemôže byť záporná.')
  if (destinations.length === 0) throw new Error('Vyplňte aspoň jednu cieľovú nádobu.')
  if (destinations.some((destination) => destination.volume <= 0)) {
    throw new Error('Cieľové objemy musia byť kladné.')
  }
  const used = destinations.reduce((sum, destination) => sum + destination.volume, 0)
  if (Math.abs(used + lossVolume - sourceVolume) > 0.001) {
    throw new Error('Súčet cieľových objemov a straty musí zodpovedať zdrojovému objemu.')
  }
}
