import { describe, expect, it } from 'vitest'
import type { Batch, Measurement } from '@/domain/models'
import {
  calculateDisplayStatus,
  isContainerLabelUnique,
  latestMeasurements,
  normalizeContainerLabel,
  parseSlovakNumber,
  validateCapacity,
  validateVolumeBalance,
} from '@/domain/rules'
import statusRules from '@/data/config/status-rules.json'

const batch: Batch = {
  id: 'batch-test',
  wineId: 'wine-test',
  code: 'T-1',
  name: 'Test',
  status: 'active',
  phase: 'maturation',
  container: { label: 'Sud 1', type: 'wood_barrel', capacityLiters: 100, imageKey: 'barrel' },
  currentVolumeLiters: 95,
  startedAt: '2026-07-01T00:00:00Z',
  createdAt: '2026-07-01T00:00:00Z',
  updatedAt: '2026-07-01T00:00:00Z',
}

function measurement(id: string, type: string, value: number, date: string): Measurement {
  return {
    id,
    wineId: 'wine-test',
    batchId: batch.id,
    type,
    numericValue: value,
    measuredAt: date,
    createdAt: date,
    updatedAt: date,
    syncStatus: 'synced',
  }
}

describe('doménové pravidlá', () => {
  it('parsuje slovenskú čiarku aj bodku', () => {
    expect(parseSlovakNumber(' 12,45 ')).toBe(12.45)
    expect(parseSlovakNumber('12.45')).toBe(12.45)
    expect(parseSlovakNumber('víno')).toBeUndefined()
  })

  it('normalizuje a kontroluje označenie nádoby', () => {
    expect(normalizeContainerLabel('  SUD   1 ')).toBe('sud 1')
    expect(isContainerLabelUnique(' sud  1 ', [batch])).toBe(false)
    expect(isContainerLabelUnique('Sud 2', [batch])).toBe(true)
  })

  it('validuje kapacitu a objemovú bilanciu', () => {
    expect(validateCapacity(101, 100)).toContain('kapacitu')
    expect(validateCapacity(99, 100)).toBeUndefined()
    expect(validateVolumeBalance(100, [60, 38], 2)).toBe(true)
    expect(validateVolumeBalance(100, [60, 30], 2)).toBe(false)
  })

  it('vyberie posledné platné meranie', () => {
    const older = measurement('m1', 'temperature', 17, '2026-07-20T08:00:00Z')
    const latest = measurement('m2', 'temperature', 18, '2026-07-21T08:00:00Z')
    expect(latestMeasurements([older, latest]).get('temperature')?.numericValue).toBe(18)
  })

  it('vypočíta zrenie aj konkrétny dôvod zásahu', () => {
    const healthy = [
      measurement('m1', 'free_so2', 25, '2026-07-25T08:00:00Z'),
      measurement('m2', 'temperature', 14, '2026-07-25T08:00:00Z'),
    ]
    expect(
      calculateDisplayStatus(batch, healthy, statusRules, new Date('2026-07-27T08:00:00Z')).code,
    ).toBe('maturing')
    const lowSulfur = [measurement('m3', 'free_so2', 8, '2026-07-25T08:00:00Z')]
    const result = calculateDisplayStatus(
      batch,
      lowSulfur,
      statusRules,
      new Date('2026-07-27T08:00:00Z'),
    )
    expect(result.code).toBe('action_required')
    expect(result.reasons[0]).toContain('Voľná síra')
  })
})
