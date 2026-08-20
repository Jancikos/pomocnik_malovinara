import { randomUUID } from 'node:crypto'
import { StavSarze, TypMerania, jednotkyMerani } from '../../shared/domain'
import { parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { merania } from '../database/schema'
import { najdiSarzu } from '../repositories/sarza.repository'
import { zoznamMerani } from '../repositories/meranie.repository'
import { DomainError, notFound } from '../utils/errors'
import { meranieDto } from './dto'

export async function nacitajMerania(db: Database, pivnicaId: string, sarzaId: string) {
  const sarza = await najdiSarzu(db, pivnicaId, sarzaId)
  if (!sarza) notFound('Šarža sa nenašla.')
  return (await zoznamMerani(db, sarzaId)).map(meranieDto)
}

export async function vytvorMeranie(db: Database, pivnicaId: string, sarzaId: string, body: Record<string, unknown>) {
  const sarza = await najdiSarzu(db, pivnicaId, sarzaId)
  if (!sarza) notFound('Šarža sa nenašla.')
  if (sarza.status !== StavSarze.AKTIVNA) throw new DomainError('Do uzavretej šarže nemožno zapisovať merania.', 409)
  if (!Object.values(TypMerania).includes(body.type as TypMerania)) throw new DomainError('Typ merania nie je platný.')
  const type = body.type as TypMerania
  const value = parseDecimal(body.value)
  const zmeraneAt = body.zmeraneAt ? new Date(String(body.zmeraneAt)) : new Date()
  if (Number.isNaN(zmeraneAt.getTime())) throw new DomainError('Dátum merania nie je platný.')
  const row = { id: randomUUID(), sarzaId, type, value, unit: jednotkyMerani[type], zmeraneAt }
  db.insert(merania).values(row).run()
  const created = db.select().from(merania).where(eq(merania.id, row.id)).get()!
  return meranieDto(created)
}

import { eq } from 'drizzle-orm'