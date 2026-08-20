import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { FarbaVina } from '../../shared/domain'
import { requiredText, parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { vstupneSurovinyVina, vina } from '../database/schema'
import { DomainError, notFound } from '../utils/errors'
import { najdiVino, listSourceMaterials, zoznamVin } from '../repositories/vino.repository'

interface SourceMaterialInput {
  odrodaHrozna: unknown
  percentage: unknown
  weightKg?: unknown
  volumeLiters?: unknown
  cukornatostPriZbere?: unknown
}

export async function nacitajVina(db: Database, pivnicaId: string) {
  return zoznamVin(db, pivnicaId)
}

export async function nacitajVino(db: Database, pivnicaId: string, id: string) {
  const vino = await najdiVino(db, pivnicaId, id)
  if (!vino) notFound('Víno sa nenašlo.')
  return { ...vino, vstupneSuroviny: await listSourceMaterials(db, vino.id) }
}

export function vytvorVino(db: Database, pivnicaId: string, body: Record<string, unknown>) {
  const name = requiredText(body.name, 'Názov vína')
  const code = requiredText(body.code, 'Kód vína').toUpperCase()
  if (!/^[A-Z0-9]{2,8}$/.test(code)) throw new DomainError('Kód vína musí mať 2 až 8 písmen alebo číslic.')
  const rocnik = parseDecimal(body.rocnik, 'Ročník')
  if (!Number.isInteger(rocnik) || rocnik < 1900 || rocnik > 2100) throw new DomainError('Ročník nie je platný.')
  if (!Object.values(FarbaVina).includes(body.color as FarbaVina)) throw new DomainError('Farba vína nie je platná.')
  const inputs = Array.isArray(body.vstupneSuroviny) ? body.vstupneSuroviny as SourceMaterialInput[] : []
  const materials = inputs.map((item) => ({
    id: randomUUID(),
    odrodaHrozna: requiredText(item.odrodaHrozna, 'Odroda'),
    percentage: parseDecimal(item.percentage, 'Percentuálny podiel'),
    weightKg: optionalNumber(item.weightKg, 'Hmotnosť'),
    volumeLiters: optionalNumber(item.volumeLiters, 'Objem'),
    cukornatostPriZbere: optionalNumber(item.cukornatostPriZbere, 'Cukornatosť pri zbere'),
  }))
  if (materials.length > 0) {
    const total = materials.reduce((sum, item) => sum + item.percentage, 0)
    if (materials.some((item) => item.percentage <= 0 || item.percentage > 100) || Math.abs(total - 100) > 0.001) {
      throw new DomainError('Percentuálne podiely odrôd musia spolu tvoriť 100 %.')
    }
  }
  const duplicate = db.select({ id: vina.id }).from(vina).where(and(eq(vina.pivnicaId, pivnicaId), eq(vina.code, code))).get()
  if (duplicate) throw new DomainError('Víno s týmto kódom už existuje.', 409)
  const id = randomUUID()
  db.transaction((tx) => {
    tx.insert(vina).values({ id, pivnicaId, name, code, rocnik, color: body.color as FarbaVina, notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null }).run()
    if (materials.length) tx.insert(vstupneSurovinyVina).values(materials.map((item) => ({ ...item, vinoId: id }))).run()
  })
  return nacitajVino(db, pivnicaId, id)
}

function optionalNumber(value: unknown, field: string): number | null {
  if (value === undefined || value === null || value === '') return null
  const result = parseDecimal(value, field)
  if (result < 0) throw new DomainError(`${field} nemôže byť záporná.`)
  return result
}