import { TypNadoby } from '../../shared/domain'
import { parseDecimal, requiredText } from '../../shared/utils/number'
import { DomainError } from '../utils/errors'

export interface SnapshotNadoby {
  nazovNadoby: string
  typNadoby: TypNadoby
  kapacitaNadoby: number
  umiestnenieNadoby: string | null
}

export function nacitajSnapshotNadoby(value: unknown, volume: number): SnapshotNadoby {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new DomainError('Vyplňte informácie o nádobe.')
  }

  const input = value as Record<string, unknown>
  const nazovNadoby = requiredText(input.name, 'Názov nádoby')
  const typNadoby = input.type as TypNadoby
  const kapacitaNadoby = parseDecimal(input.capacity, 'Kapacita nádoby')
  const umiestnenieNadoby = typeof input.location === 'string' && input.location.trim()
    ? input.location.trim()
    : null

  if (!Object.values(TypNadoby).includes(typNadoby)) {
    throw new DomainError('Typ nádoby nie je platný.')
  }
  if (kapacitaNadoby <= 0) throw new DomainError('Kapacita nádoby musí byť kladná.')
  if (volume > kapacitaNadoby) throw new DomainError(`Objem prekračuje kapacitu nádoby ${nazovNadoby}.`)

  return { nazovNadoby, typNadoby, kapacitaNadoby, umiestnenieNadoby }
}
