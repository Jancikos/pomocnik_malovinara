import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { StavSarze, TypZasahu } from '../../shared/domain'
import { parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { zasahy } from '../database/schema'
import { najdiSarzu } from '../repositories/sarza.repository'
import { DomainError, notFound } from '../utils/errors'

export async function vytvorZasah(db: Database, pivnicaId: string, sarzaId: string, body: Record<string, unknown>) {
  const sarza = await najdiSarzu(db, pivnicaId, sarzaId)
  if (!sarza) notFound('Šarža sa nenašla.')
  if (sarza.status !== StavSarze.AKTIVNA) throw new DomainError('Do uzavretej šarže nemožno zapisovať zásahy.', 409)
  if (!Object.values(TypZasahu).includes(body.type as TypZasahu)) {
    throw new DomainError('Typ zásahu nie je platný.')
  }
  const type = body.type as TypZasahu

  const vykonaneAt = body.vykonaneAt ? new Date(String(body.vykonaneAt)) : new Date()
  if (Number.isNaN(vykonaneAt.getTime())) throw new DomainError('Dátum zásahu nie je platný.')

  let notes = typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null
  if (type === TypZasahu.SIRENIE) {
    const sulfurMg = parseDecimal(body.sulfurMg, 'Pridaná síra')
    if (sulfurMg < 0) throw new DomainError('Pridaná síra nemôže byť záporná.')
    const formattedSulfur = sulfurMg.toLocaleString('sk-SK', { maximumFractionDigits: 2 })
    const sulfurNote = 'Pridaná síra: ' + formattedSulfur + ' mg'
    notes = notes ? sulfurNote + '\n' + notes : sulfurNote
  }

  const id = randomUUID()
  db.insert(zasahy).values({
    id,
    sarzaId,
    type,
    vykonaneAt,
    notes,
  }).run()
  return db.select().from(zasahy).where(eq(zasahy.id, id)).get()
}
