import { VesselType } from '../../shared/domain'
import { parseDecimal, requiredText } from '../../shared/utils/number'
import { DomainError } from '../utils/errors'

export interface VesselSnapshot {
  vesselName: string
  vesselType: VesselType
  vesselCapacity: number
  vesselLocation: string | null
}

export function parseVesselSnapshot(value: unknown, volume: number): VesselSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('Vyplňte informácie o nádobe.')
  }

  const input = value as Record<string, unknown>
  const vesselName = requiredText(input.name, 'Názov nádoby')
  const vesselType = input.type as VesselType
  const vesselCapacity = parseDecimal(input.capacity, 'Kapacita nádoby')
  const vesselLocation = typeof input.location === 'string' && input.location.trim()
    ? input.location.trim()
    : null

  if (!Object.values(VesselType).includes(vesselType)) {
    throw new DomainError('Typ nádoby nie je platný.')
  }
  if (vesselCapacity <= 0) throw new DomainError('Kapacita nádoby musí byť kladná.')
  if (volume > vesselCapacity) throw new DomainError(`Objem prekračuje kapacitu nádoby ${vesselName}.`)

  return { vesselName, vesselType, vesselCapacity, vesselLocation }
}
