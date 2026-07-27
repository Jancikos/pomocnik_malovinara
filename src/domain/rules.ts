import type { Batch, DisplayStatus, Measurement } from './models'

interface StatusRules {
  critical: {
    minimumFreeSo2: number
    maxMeasurementAgeDays: number
    minimumFillRatio: number
    temperatureByPhase: Record<string, { min: number; max: number }>
  }
  phaseStatus: Record<string, string>
}

const dayMs = 86_400_000

export function parseSlovakNumber(value: string): number | undefined {
  const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
  if (normalized === '') return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function normalizeContainerLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sk')
}

export function isContainerLabelUnique(
  label: string,
  batches: Batch[],
  exceptId?: string,
): boolean {
  const normalized = normalizeContainerLabel(label)
  return !batches.some(
    (batch) =>
      batch.status === 'active' &&
      batch.id !== exceptId &&
      normalizeContainerLabel(batch.container.label) === normalized,
  )
}

export function validateCapacity(volume: number, capacity: number): string | undefined {
  if (volume < 0 || capacity <= 0) return 'Objem aj kapacita musia byť kladné čísla.'
  if (volume > capacity) return 'Objem šarže nesmie prekročiť kapacitu nádoby.'
  return undefined
}

export function validateVolumeBalance(source: number, targets: number[], loss: number): boolean {
  const result = targets.reduce((sum, value) => sum + value, 0) + loss
  return Math.abs(result - source) < 0.001
}

export function latestMeasurements(measurements: Measurement[]): Map<string, Measurement> {
  const result = new Map<string, Measurement>()
  measurements
    .filter((item) => !item.deletedAt)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    .forEach((item) => {
      if (!result.has(item.type)) result.set(item.type, item)
    })
  return result
}

export function calculateDisplayStatus(
  batch: Batch,
  measurements: Measurement[],
  rules: StatusRules,
  now = new Date(),
): DisplayStatus {
  const reasons: string[] = []
  const latest = latestMeasurements(measurements)
  const freeSo2 = latest.get('free_so2')
  const temperature = latest.get('temperature')
  const ratio = batch.currentVolumeLiters / batch.container.capacityLiters

  if (freeSo2?.numericValue !== undefined && freeSo2.numericValue < rules.critical.minimumFreeSo2) {
    reasons.push(`Voľná síra je pod demo hranicou ${rules.critical.minimumFreeSo2} mg/l.`)
  }
  if (ratio < rules.critical.minimumFillRatio) {
    reasons.push('Nádoba je naplnená pod demo minimálnym pomerom.')
  }
  if (measurements.length > 0) {
    const lastDate = Math.max(...measurements.map((item) => new Date(item.measuredAt).getTime()))
    if ((now.getTime() - lastDate) / dayMs > rules.critical.maxMeasurementAgeDays) {
      reasons.push('Od posledného merania uplynulo priveľa dní.')
    }
  }
  const range = rules.critical.temperatureByPhase[batch.phase]
  if (
    range &&
    temperature?.numericValue !== undefined &&
    (temperature.numericValue < range.min || temperature.numericValue > range.max)
  ) {
    reasons.push(`Teplota je mimo demo rozsahu ${range.min}–${range.max} °C.`)
  }

  return {
    code: reasons.length ? 'action_required' : (rules.phaseStatus[batch.phase] ?? 'maturing'),
    reasons,
  }
}
