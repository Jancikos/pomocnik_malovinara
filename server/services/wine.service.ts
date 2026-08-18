import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { WineColor } from '../../shared/domain'
import { requiredText, parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { wineSourceMaterials, wines } from '../database/schema'
import { DomainError, notFound } from '../utils/errors'
import { findWine, listSourceMaterials, listWines } from '../repositories/wine.repository'

interface SourceMaterialInput {
  grapeVariety: unknown
  percentage: unknown
  weightKg?: unknown
  volumeLiters?: unknown
  harvestSugar?: unknown
}

export async function getWines(db: Database, cellarId: string) {
  return listWines(db, cellarId)
}

export async function getWine(db: Database, cellarId: string, id: string) {
  const wine = await findWine(db, cellarId, id)
  if (!wine) notFound('Víno sa nenašlo.')
  return { ...wine, sourceMaterials: await listSourceMaterials(db, wine.id) }
}

export function createWine(db: Database, cellarId: string, body: Record<string, unknown>) {
  const name = requiredText(body.name, 'Názov vína')
  const code = requiredText(body.code, 'Kód vína').toUpperCase()
  if (!/^[A-Z0-9]{2,8}$/.test(code)) throw new DomainError('Kód vína musí mať 2 až 8 písmen alebo číslic.')
  const vintageYear = parseDecimal(body.vintageYear, 'Ročník')
  if (!Number.isInteger(vintageYear) || vintageYear < 1900 || vintageYear > 2100) throw new DomainError('Ročník nie je platný.')
  if (!Object.values(WineColor).includes(body.color as WineColor)) throw new DomainError('Farba vína nie je platná.')
  const inputs = Array.isArray(body.sourceMaterials) ? body.sourceMaterials as SourceMaterialInput[] : []
  const materials = inputs.map((item) => ({
    id: randomUUID(),
    grapeVariety: requiredText(item.grapeVariety, 'Odroda'),
    percentage: parseDecimal(item.percentage, 'Percentuálny podiel'),
    weightKg: optionalNumber(item.weightKg, 'Hmotnosť'),
    volumeLiters: optionalNumber(item.volumeLiters, 'Objem'),
    harvestSugar: optionalNumber(item.harvestSugar, 'Cukornatosť pri zbere'),
  }))
  if (materials.length > 0) {
    const total = materials.reduce((sum, item) => sum + item.percentage, 0)
    if (materials.some((item) => item.percentage <= 0 || item.percentage > 100) || Math.abs(total - 100) > 0.001) {
      throw new DomainError('Percentuálne podiely odrôd musia spolu tvoriť 100 %.')
    }
  }
  const duplicate = db.select({ id: wines.id }).from(wines).where(and(eq(wines.cellarId, cellarId), eq(wines.code, code))).get()
  if (duplicate) throw new DomainError('Víno s týmto kódom už existuje.', 409)
  const id = randomUUID()
  db.transaction((tx) => {
    tx.insert(wines).values({ id, cellarId, name, code, vintageYear, color: body.color as WineColor, notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null }).run()
    if (materials.length) tx.insert(wineSourceMaterials).values(materials.map((item) => ({ ...item, wineId: id }))).run()
  })
  return getWine(db, cellarId, id)
}

function optionalNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null
  const result = parseDecimal(value, field)
  if (result < 0) throw new DomainError(`${field} nemôže byť záporná.`)
  return result
}