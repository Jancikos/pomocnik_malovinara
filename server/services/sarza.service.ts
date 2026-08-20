import { and, count, eq, ne } from 'drizzle-orm'
import { FazaSarze, StavSarze } from '../../shared/domain'
import { parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { sarze, zasahy, merania, cielePresunu, presuny, vina } from '../database/schema'
import { najdiSarzu, najdiRiadokSarze, zoznamNaslednychSarzi, zoznamZasahovSarze, zoznamMeraniSarze, zoznamRiadkovSarzi } from '../repositories/sarza.repository'
import { posledneMeraniaPodlaTypu } from '../repositories/meranie.repository'
import { DomainError, notFound } from '../utils/errors'
import { dalsieIdSarzi } from './id-sarze'
import { detailSarzeDto, prehladSarzeDto, meranieDto } from './dto'
import { nacitajSnapshotNadoby } from './snapshot-nadoby'

export async function nacitajSarze(db: Database, pivnicaId: string, status?: StavSarze) {
  const rows = await zoznamRiadkovSarzi(db, pivnicaId)
  const selected = status ? rows.filter((row) => row.sarza.status === status) : rows
  const latest = await posledneMeraniaPodlaTypu(db, selected.map((row) => row.sarza.id))
  return selected.map((row) => prehladSarzeDto(row, latest.get(row.sarza.id)))
}

export async function nacitajSarzu(db: Database, pivnicaId: string, id: string) {
  const row = await najdiRiadokSarze(db, pivnicaId, id)
  if (!row) notFound('Šarža sa nenašla.')
  const [riadkyMerani, riadkyZasahov, children, latest] = await Promise.all([
    zoznamMeraniSarze(db, id),
    zoznamZasahovSarze(db, id),
    zoznamNaslednychSarzi(db, id),
    posledneMeraniaPodlaTypu(db, [id]),
  ])
  return detailSarzeDto(
    prehladSarzeDto(row, latest.get(id)),
    riadkyMerani.map(meranieDto),
    riadkyZasahov,
    children,
  )
}

function parseZakladSarzeInput(body: Record<string, unknown>) {
  const vinoId = String(body.vinoId || '')
  const faza = body.faza as FazaSarze
  if (!Object.values(FazaSarze).includes(faza)) throw new DomainError('Fáza šarže nie je platná.')
  const volume = parseDecimal(body.volume, 'Objem')
  if (volume <= 0) throw new DomainError('Objem musí byť kladný.')
  const nadoba = nacitajSnapshotNadoby(body.nadoba, volume)
  const openedAt = body.openedAt ? new Date(String(body.openedAt)) : new Date()
  if (Number.isNaN(openedAt.getTime())) throw new DomainError('Dátum otvorenia nie je platný.')
  return { vinoId, faza, volume, nadoba, openedAt }
}

function assertNadobaJeVolna(db: Database, pivnicaId: string, nazovNadoby: string, excludeId?: string) {
  const query = excludeId
    ? and(eq(sarze.pivnicaId, pivnicaId), eq(sarze.status, StavSarze.AKTIVNA), ne(sarze.id, excludeId))
    : and(eq(sarze.pivnicaId, pivnicaId), eq(sarze.status, StavSarze.AKTIVNA))
  const occupied = db.select({ name: sarze.nazovNadoby }).from(sarze)
    .where(query).all()
    .some((item) => item.name.localeCompare(nazovNadoby, 'sk', { sensitivity: 'base' }) === 0)
  if (occupied) throw new DomainError('Nádoba s týmto názvom už obsahuje aktívnu šaržu.', 409)
}

export function vytvorSarzu(db: Database, pivnicaId: string, body: Record<string, unknown>) {
  const parsed = parseZakladSarzeInput(body)

  let id = ''
  db.transaction((tx) => {
    const vino = tx.select().from(vina).where(and(eq(vina.id, parsed.vinoId), eq(vina.pivnicaId, pivnicaId))).get()
    if (!vino) notFound('Víno sa nenašlo.')

    assertNadobaJeVolna(tx as unknown as Database, pivnicaId, parsed.nadoba.nazovNadoby)

    id = dalsieIdSarzi(tx as unknown as Database, { pivnicaId, year: vino.rocnik, kodVina: vino.code, faza: parsed.faza })[0]!
    tx.insert(sarze).values({
      id,
      pivnicaId,
      vinoId: parsed.vinoId,
      faza: parsed.faza,
      ...parsed.nadoba,
      volume: parsed.volume,
      status: StavSarze.AKTIVNA,
      openedAt: parsed.openedAt,
    }).run()
  })
  return nacitajSarzu(db, pivnicaId, id)
}

export function upravZakladSarze(db: Database, pivnicaId: string, id: string, body: Record<string, unknown>) {
  const existing = db.select().from(sarze).where(and(eq(sarze.id, id), eq(sarze.pivnicaId, pivnicaId))).get()
  if (!existing) notFound('Šarža sa nenašla.')
  const parsed = parseZakladSarzeInput(body)
  const vino = db.select({ id: vina.id }).from(vina).where(and(eq(vina.id, parsed.vinoId), eq(vina.pivnicaId, pivnicaId))).get()
  if (!vino) notFound('Víno sa nenašlo.')
  if (existing.status === StavSarze.AKTIVNA) assertNadobaJeVolna(db, pivnicaId, parsed.nadoba.nazovNadoby, id)

  db.update(sarze).set({
    vinoId: parsed.vinoId,
    faza: parsed.faza,
    ...parsed.nadoba,
    volume: parsed.volume,
    openedAt: parsed.openedAt,
    updatedAt: new Date(),
  }).where(and(eq(sarze.id, id), eq(sarze.pivnicaId, pivnicaId))).run()
  return nacitajSarzu(db, pivnicaId, id)
}

export async function uzavriSarzu(db: Database, pivnicaId: string, id: string) {
  const sarza = await najdiSarzu(db, pivnicaId, id)
  if (!sarza) notFound('Šarža sa nenašla.')
  if (sarza.status !== StavSarze.AKTIVNA) throw new DomainError('Šarža je už uzavretá.', 409)
  db.update(sarze).set({ status: StavSarze.UZAVRETA, closedAt: new Date(), updatedAt: new Date() }).where(eq(sarze.id, id)).run()
  return nacitajSarzu(db, pivnicaId, id)
}

export async function vynutVymazanieSarze(db: Database, pivnicaId: string, id: string, confirmation: unknown) {
  if (confirmation !== 'FORCE DELETE') throw new DomainError('Pre vymazanie zadajte presne FORCE DELETE.')
  const sarza = await najdiSarzu(db, pivnicaId, id)
  if (!sarza) notFound('Šarža sa nenašla.')
  const linked = [
    db.select({ value: count() }).from(sarze).where(eq(sarze.rodicovskaSarzaId, id)).get()?.value ?? 0,
    db.select({ value: count() }).from(merania).where(eq(merania.sarzaId, id)).get()?.value ?? 0,
    db.select({ value: count() }).from(zasahy).where(eq(zasahy.sarzaId, id)).get()?.value ?? 0,
    db.select({ value: count() }).from(presuny).where(eq(presuny.zdrojovaSarzaId, id)).get()?.value ?? 0,
    db.select({ value: count() }).from(cielePresunu).where(eq(cielePresunu.vytvorenaSarzaId, id)).get()?.value ?? 0,
  ].reduce((sum, value) => sum + value, 0)
  if (linked > 0) throw new DomainError('Šaržu nemožno vymazať, pretože má históriu alebo následníkov.', 409)
  db.delete(sarze).where(eq(sarze.id, id)).run()
  return { deleted: true }
}
