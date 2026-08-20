import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { StavSarze, TypZasahu } from '../../shared/domain'
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

  const vykonaneAt = body.vykonaneAt ? new Date(String(body.vykonaneAt)) : new Date()
  if (Number.isNaN(vykonaneAt.getTime())) throw new DomainError('Dátum zásahu nie je platný.')

  const id = randomUUID()
  db.insert(zasahy).values({
    id,
    sarzaId,
    type: body.type as TypZasahu,
    vykonaneAt,
    notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
  }).run()
  return db.select().from(zasahy).where(eq(zasahy.id, id)).get()
}
