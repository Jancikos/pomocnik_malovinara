import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { VesselType } from '../../shared/domain'
import { parseDecimal, requiredText } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { vessels } from '../database/schema'
import { activeBatchInVessel, findVessel, listVessels } from '../repositories/vessel.repository'
import { DomainError, notFound } from '../utils/errors'

export async function getVessels(db: Database, cellarId: string) {
  const rows = await listVessels(db, cellarId)
  return Promise.all(rows.map(async (vessel) => ({ ...vessel, activeVolume: (await activeBatchInVessel(db, cellarId, vessel.id))?.volume ?? 0 })))
}

export async function getVessel(db: Database, cellarId: string, id: string) {
  const vessel = await findVessel(db, cellarId, id)
  if (!vessel) notFound('Nádoba sa nenašla.')
  return { ...vessel, activeBatch: await activeBatchInVessel(db, cellarId, id) ?? null }
}

export function createVessel(db: Database, cellarId: string, body: Record<string, unknown>) {
  const name = requiredText(body.name, 'Názov nádoby')
  const capacity = parseDecimal(body.capacity, 'Kapacita')
  if (capacity <= 0) throw new DomainError('Kapacita musí byť kladná.')
  if (!Object.values(VesselType).includes(body.type as VesselType)) throw new DomainError('Typ nádoby nie je platný.')
  const duplicate = db.select({ id: vessels.id }).from(vessels).where(and(eq(vessels.cellarId, cellarId), eq(vessels.name, name))).get()
  if (duplicate) throw new DomainError('Nádoba s týmto názvom už existuje.', 409)
  const id = randomUUID()
  db.insert(vessels).values({ id, cellarId, name, capacity, type: body.type as VesselType, location: typeof body.location === 'string' && body.location.trim() ? body.location.trim() : null }).run()
  return getVessel(db, cellarId, id)
}

export async function updateVessel(db: Database, cellarId: string, id: string, body: Record<string, unknown>) {
  const vessel = await findVessel(db, cellarId, id)
  if (!vessel) notFound('Nádoba sa nenašla.')
  const active = await activeBatchInVessel(db, cellarId, id)
  const capacity = body.capacity === undefined ? vessel.capacity : parseDecimal(body.capacity, 'Kapacita')
  if (capacity <= 0 || (active && capacity < active.volume)) throw new DomainError('Kapacita nesmie byť menšia ako aktuálny objem.')
  const name = body.name === undefined ? vessel.name : requiredText(body.name, 'Názov nádoby')
  db.update(vessels).set({ name, capacity, location: body.location === undefined ? vessel.location : String(body.location || '').trim() || null, updatedAt: new Date() }).where(eq(vessels.id, id)).run()
  return getVessel(db, cellarId, id)
}