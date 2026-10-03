import { DomainError } from './errors'

export function parseKoeficientDosladzania(value: unknown, field: string): number {
  const parsed = typeof value === 'string' && /^\d+(?:[.,]\d+)?$/.test(value.trim())
    ? Number(value.trim().replace(',', '.'))
    : value
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) {
    throw new DomainError(`${field} musí byť kladné konečné číslo.`)
  }
  return parsed
}
