import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { StavSarze, TypZasahu, TypMerania, jednotkyMerani } from '../../shared/domain'
import { parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { zasahy, merania, sarze } from '../database/schema'
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

  const dosladzanie: { pociatocnaCukornatost?: number; pozadovanaCukornatost?: number; pridanyCukorKg?: number } = {}
  if (type === TypZasahu.DOSLADZANIE) {
    const fields = {
      pociatocnaCukornatost: 'Počiatočná cukornatosť',
      pozadovanaCukornatost: 'Požadovaná cukornatosť',
      pridanyCukorKg: 'Skutočne pridaný cukor',
    } as const
    for (const key of Object.keys(fields) as Array<keyof typeof fields>) {
      const raw = body[key]
      if ((typeof raw !== 'number' && typeof raw !== 'string') || (typeof raw === 'string' && !raw.trim())) {
        throw new DomainError(fields[key] + ' musí byť vyplnené číslo.')
      }
      const value = parseDecimal(raw, fields[key])
      if (value < 0) throw new DomainError(fields[key] + ' nesmie byť záporné.')
      dosladzanie[key] = value
    }
  }

  const voda: { pridanaVodaLitrov?: number; pozadovanaCukornatost?: number; pridanyCukorKg?: number; objemPredZasahom?: number } = {}
  if (type === TypZasahu.PRIDANIE_VODY) {
    const fields = { pridanaVodaLitrov: 'Pridaná voda', pozadovanaCukornatost: 'Cukornatosť vody', pridanyCukorKg: 'Cukor pridaný do vody' } as const
    for (const key of Object.keys(fields) as Array<keyof typeof fields>) {
      const raw = body[key]
      if ((typeof raw !== 'number' && typeof raw !== 'string') || (typeof raw === 'string' && !raw.trim())) throw new DomainError(fields[key] + ' musí byť vyplnené číslo.')
      const value = parseDecimal(raw, fields[key])
      if (value < 0 || (key === 'pridanaVodaLitrov' && value === 0)) throw new DomainError(fields[key] + ' má neplatnú hodnotu.')
      voda[key] = value
    }
  }

  const id = randomUUID()
  db.transaction((tx) => {
    if (type === TypZasahu.PRIDANIE_VODY) {
      const aktualna = tx.select().from(sarze).where(eq(sarze.id, sarzaId)).get()!
      if (aktualna.status !== StavSarze.AKTIVNA) throw new DomainError('Do uzavretej šarže nemožno zapisovať zásahy.', 409)
      voda.objemPredZasahom = aktualna.volume
      const novyObjem = aktualna.volume + voda.pridanaVodaLitrov!
      if (novyObjem > aktualna.kapacitaNadoby) throw new DomainError('Doliata voda by prekročila kapacitu nádoby.')
      tx.update(sarze).set({ volume: novyObjem, updatedAt: new Date() }).where(eq(sarze.id, sarzaId)).run()
    }
    tx.insert(zasahy).values({
      id,
      sarzaId,
      type,
      vykonaneAt,
      notes,
      ...dosladzanie,
      ...voda,
    }).run()
    if (type === TypZasahu.DOSLADZANIE) {
      tx.insert(merania).values({
        id: randomUUID(),
        sarzaId,
        type: TypMerania.CUKORNATOST,
        value: dosladzanie.pozadovanaCukornatost!,
        unit: jednotkyMerani[TypMerania.CUKORNATOST],
        zmeraneAt: vykonaneAt,
      }).run()
    }
  })
  return db.select().from(zasahy).where(eq(zasahy.id, id)).get()
}
