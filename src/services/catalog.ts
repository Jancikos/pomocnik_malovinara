import type { CatalogFile, CatalogItem } from '@/domain/models'
import containerTypes from '@/data/config/container-types.json'
import batchPhases from '@/data/config/batch-phases.json'
import displayStatuses from '@/data/config/display-statuses.json'
import measurementTypes from '@/data/config/measurement-types.json'
import sensoryRatings from '@/data/config/sensory-ratings.json'
import clarityRatings from '@/data/config/clarity-ratings.json'
import interventionTypes from '@/data/config/intervention-types.json'
import units from '@/data/config/units.json'

const files = [
  containerTypes,
  batchPhases,
  displayStatuses,
  measurementTypes,
  sensoryRatings,
  clarityRatings,
  interventionTypes,
  units,
] as CatalogFile[]

export class CatalogService {
  private readonly catalogs = new Map<string, CatalogFile>()

  constructor() {
    files.forEach((file) => {
      validateCatalog(file)
      this.catalogs.set(file.catalog, file)
    })
  }

  list(catalog: string, includeDisabled = false): CatalogItem[] {
    const file = this.catalogs.get(catalog)
    if (!file) throw new Error(`Neznámy katalóg: ${catalog}`)
    return file.items
      .filter((item) => includeDisabled || item.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder)
  }

  get(catalog: string, code: string): CatalogItem | undefined {
    return this.catalogs.get(catalog)?.items.find((item) => item.code === code)
  }

  label(catalog: string, code: string): string {
    return this.get(catalog, code)?.label ?? code
  }
}

export function validateCatalog(file: CatalogFile): void {
  if (!file.catalog || !Number.isInteger(file.version) || !Array.isArray(file.items)) {
    throw new Error('Katalóg nemá platnú základnú štruktúru.')
  }
  const codes = new Set<string>()
  file.items.forEach((item) => {
    if (!item.code || !item.label || !Number.isFinite(item.sortOrder)) {
      throw new Error(`Neplatná položka v katalógu ${file.catalog}.`)
    }
    if (codes.has(item.code)) throw new Error(`Duplicitný kód ${item.code} v ${file.catalog}.`)
    if (item.color && !/^#[0-9a-f]{6}$/i.test(item.color)) {
      throw new Error(`Neplatná farba pri ${item.code}.`)
    }
    codes.add(item.code)
  })
}

export interface Option {
  value: string
  label: string
  disabled?: boolean
  color?: string
  iconKey?: string
}

export interface OptionProvider {
  options(): Option[]
}

export class CatalogOptionProvider implements OptionProvider {
  constructor(
    private readonly service: CatalogService,
    private readonly catalog: string,
  ) {}

  options(): Option[] {
    return this.service.list(this.catalog).map((item) => ({
      value: item.code,
      label: item.label,
      color: item.color,
      iconKey: item.iconKey,
    }))
  }
}

export class EnumOptionProvider<T extends string> implements OptionProvider {
  constructor(
    private readonly values: readonly T[],
    private readonly labels: Record<T, string>,
  ) {}

  options(): Option[] {
    return this.values.map((value) => ({ value, label: this.labels[value] }))
  }
}

export const catalogService = new CatalogService()
