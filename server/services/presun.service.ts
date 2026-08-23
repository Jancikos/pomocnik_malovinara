import { randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { FazaSarze, StavSarze, TypZasahu, overBilanciuObjemu } from '../../shared/domain'
import { parseDecimal } from '../../shared/utils/number'
import type { Database } from '../database/client'
import { sarze, zasahy, cielePresunu, presuny, vina } from '../database/schema'
import { DomainError, notFound } from '../utils/errors'
import { dalsieIdSarzi } from './id-sarze'
import { nacitajSnapshotNadoby, type SnapshotNadoby } from './snapshot-nadoby'

interface Ciel extends SnapshotNadoby {
  volume: number
}

export function presunSarzu(
  db: Database,
  context: { pivnicaId: string; userId: string },
  body: Record<string, unknown>,
) {
  const zdrojovaSarzaId = String(body.zdrojovaSarzaId || '')
  const cielovaFaza = body.cielovaFaza as FazaSarze
  const rawCiele = Array.isArray(body.ciele) ? body.ciele as Array<Record<string, unknown>> : []
  const ciele: Ciel[] = rawCiele.map((item) => {
    const volume = parseDecimal(item.volume, 'Cieľový objem')
    return { volume, ...nacitajSnapshotNadoby(item.nadoba, volume) }
  })
  const lossVolume = parseDecimal(body.lossVolume ?? 0, 'Strata')
  const vykonaneAt = body.vykonaneAt ? new Date(String(body.vykonaneAt)) : new Date()
  if (Number.isNaN(vykonaneAt.getTime())) throw new DomainError('Dátum presunu nie je platný.')
  const typZasahu = Object.values(TypZasahu).includes(body.type as TypZasahu)
    ? body.type as TypZasahu
    : cielovaFaza === FazaSarze.ODKALENIE ? TypZasahu.ODKALENIE : TypZasahu.STACANIE
  if (typZasahu === TypZasahu.SIRENIE) throw new DomainError('Sírenie nevytvára nové šarže.')

  const cielNames = ciele.map((item) => item.nazovNadoby.toLocaleLowerCase('sk'))
  if (new Set(cielNames).size !== cielNames.length) {
    throw new DomainError('Každá cieľová nádoba môže byť uvedená iba raz.')
  }

  const vytvoreneSarzeIds: string[] = []
  const presunId = randomUUID()
  db.transaction((tx) => {
    const source = tx.select().from(sarze).where(and(eq(sarze.id, zdrojovaSarzaId), eq(sarze.pivnicaId, context.pivnicaId))).get()
    if (!source) notFound('Zdrojová šarža sa nenašla.')
    if (source.status !== StavSarze.AKTIVNA) throw new DomainError('Zdrojová šarža nie je aktívna.', 409)
    if (cielNames.includes(source.nazovNadoby.toLocaleLowerCase('sk'))) {
      throw new DomainError('Cieľová nádoba musí byť odlišná od zdrojovej.')
    }

    if (source.faza === cielovaFaza) throw new DomainError('Cieľová fáza musí byť odlišná od aktuálnej fázy šarže.')
    if (typZasahu === TypZasahu.ODKALENIE && cielovaFaza !== FazaSarze.ODKALENIE) throw new DomainError('Odkalenie vytvára šarže vo fáze odkalenia.')
    if (typZasahu === TypZasahu.KVASENIE && cielovaFaza !== FazaSarze.KVASENIE) throw new DomainError('Kvasenie vytvára šarže vo fáze kvasenia.')
    overBilanciuObjemu(source.volume, ciele, lossVolume)

    const vino = tx.select().from(vina).where(and(eq(vina.id, source.vinoId), eq(vina.pivnicaId, context.pivnicaId))).get()
    if (!vino) notFound('Víno sa nenašlo.')

    const occupiedNames = tx.select({ name: sarze.nazovNadoby }).from(sarze)
      .where(and(eq(sarze.pivnicaId, context.pivnicaId), eq(sarze.status, StavSarze.AKTIVNA))).all()
      .map((item) => item.name.toLocaleLowerCase('sk'))
    const occupiedTarget = ciele.find((item) => occupiedNames.includes(item.nazovNadoby.toLocaleLowerCase('sk')))
    if (occupiedTarget) throw new DomainError(`Nádoba ${occupiedTarget.nazovNadoby} už obsahuje aktívnu šaržu.`, 409)

    const ids = dalsieIdSarzi(tx as unknown as Database, {
      pivnicaId: context.pivnicaId,
      year: vino.rocnik,
      kodVina: vino.code,
      faza: cielovaFaza,
      count: ciele.length,
    })
    tx.update(sarze).set({ status: StavSarze.UZAVRETA, closedAt: vykonaneAt, updatedAt: new Date() }).where(eq(sarze.id, source.id)).run()
    tx.insert(presuny).values({
      id: presunId,
      pivnicaId: context.pivnicaId,
      zdrojovaSarzaId: source.id,
      lossVolume,
      cielovaFaza,
      vykonaneAt,
      createdBy: context.userId,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    }).run()
    tx.insert(zasahy).values({
      id: randomUUID(),
      sarzaId: source.id,
      type: typZasahu,
      vykonaneAt,
      notes: typeof body.notes === 'string' && body.notes.trim() ? body.notes.trim() : null,
    }).run()
    ciele.forEach((ciel, index) => {
      const id = ids[index]!
      vytvoreneSarzeIds.push(id)
      tx.insert(sarze).values({
        id,
        pivnicaId: context.pivnicaId,
        vinoId: source.vinoId,
        faza: cielovaFaza,
        nazovNadoby: ciel.nazovNadoby,
        typNadoby: ciel.typNadoby,
        kapacitaNadoby: ciel.kapacitaNadoby,
        umiestnenieNadoby: ciel.umiestnenieNadoby,
        rodicovskaSarzaId: source.id,
        volume: ciel.volume,
        status: StavSarze.AKTIVNA,
        openedAt: vykonaneAt,
      }).run()
      tx.insert(cielePresunu).values({
        id: randomUUID(),
        presunId,
        volume: ciel.volume,
        vytvorenaSarzaId: id,
      }).run()
    })
  })
  return { id: presunId, zdrojovaSarzaId, vytvoreneSarzeIds, lossVolume, cielovaFaza }
}
