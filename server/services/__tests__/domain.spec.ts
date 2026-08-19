import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BatchPhase, BatchStatus, MeasurementType, VesselType, WineColor } from '../../../shared/domain'
import { createDatabase, type DatabaseContext } from '../../database/client'
import { batches, cellarMembers, cellars, measurements, transferDestinations, transfers, users, wines } from '../../database/schema'
import { closeBatch, createBatch, forceDeleteBatch, getBatch } from '../batch.service'
import { createMeasurement } from '../measurement.service'
import { transferBatch } from '../transfer.service'

let context: DatabaseContext

beforeEach(() => {
  context = createDatabase(':memory:')
  migrate(context.db, { migrationsFolder: resolve(process.cwd(), 'drizzle/migrations') })
  context.db.insert(users).values({ id: 'user-1', email: 'test@example.sk', passwordHash: 'x', name: 'Test' }).run()
  context.db.insert(cellars).values({ id: 'cellar-1', name: 'Testovacia pivnica' }).run()
  context.db.insert(cellarMembers).values({ cellarId: 'cellar-1', userId: 'user-1', role: 'OWNER' }).run()
  context.db.insert(wines).values({ id: 'wine-1', cellarId: 'cellar-1', name: 'Irsai Oliver', code: 'IO', vintageYear: 2026, color: WineColor.WHITE }).run()
})

afterEach(() => context.sqlite.close())

function vessel(name: string, capacity = 200, type = VesselType.STEEL_TANK) {
  return { name, type, capacity, location: 'Testovacia miestnosť' }
}

function insertBatch(
  phase: BatchPhase,
  volume = 100,
  vesselName = 'Zdroj',
  id = `2026-IO-${phase}-001`,
) {
  context.db.insert(batches).values({
    id,
    cellarId: 'cellar-1',
    wineId: 'wine-1',
    phase,
    vesselName,
    vesselType: VesselType.STEEL_TANK,
    vesselCapacity: 200,
    vesselLocation: 'Testovacia miestnosť',
    volume,
    status: BatchStatus.ACTIVE,
    openedAt: new Date('2026-08-01T00:00:00Z'),
  }).run()
  return id
}

const transferContext = { cellarId: 'cellar-1', userId: 'user-1' }

describe('batch lifecycle services', () => {
  it('generuje deterministické ID a uloží snapshot nádoby priamo do šarže', async () => {
    const first = await createBatch(context.db, 'cellar-1', {
      wineId: 'wine-1',
      vessel: vessel('Tank T1'),
      volume: 100,
    })
    const second = await createBatch(context.db, 'cellar-1', {
      wineId: 'wine-1',
      vessel: vessel('Tank T2'),
      volume: 80,
    })

    expect(first.id).toBe('2026-IO-MUST-001')
    expect(second.id).toBe('2026-IO-MUST-002')
    expect(first.vessel).toEqual({
      name: 'Tank T1',
      type: VesselType.STEEL_TANK,
      capacity: 200,
      location: 'Testovacia miestnosť',
    })
  })

  it('odmietne druhú aktívnu šaržu s rovnakým názvom nádoby', async () => {
    await createBatch(context.db, 'cellar-1', { wineId: 'wine-1', vessel: vessel('Tank T1'), volume: 100 })
    expect(() => createBatch(context.db, 'cellar-1', {
      wineId: 'wine-1',
      vessel: vessel('tank t1'),
      volume: 80,
    })).toThrow('aktívnu šaržu')
  })

  it('merania iba pridáva a vracia posledné meranie daného typu', async () => {
    const id = insertBatch(BatchPhase.MUST)
    await createMeasurement(context.db, 'cellar-1', id, { type: MeasurementType.SUGAR, value: 19, measuredAt: '2026-08-01T08:00:00Z' })
    await createMeasurement(context.db, 'cellar-1', id, { type: MeasurementType.SUGAR, value: 18.4, measuredAt: '2026-08-02T08:00:00Z' })
    expect(context.db.select().from(measurements).all()).toHaveLength(2)
    expect((await getBatch(context.db, 'cellar-1', id)).latestMeasurements.SUGAR?.value).toBe(18.4)
  })

  it('umožní manuálne uzavretie a zablokuje ďalšie meranie', async () => {
    const id = insertBatch(BatchPhase.MUST)
    const closed = await closeBatch(context.db, 'cellar-1', id)
    expect(closed.status).toBe(BatchStatus.CLOSED)
    await expect(createMeasurement(context.db, 'cellar-1', id, { type: MeasurementType.PH, value: 3.2 })).rejects.toThrow('uzavretej')
  })

  it('vykoná odkalenie v jednej transakcii a zachová parent lineage', () => {
    const sourceId = insertBatch(BatchPhase.MUST)
    const result = transferBatch(context.db, transferContext, {
      sourceBatchId: sourceId,
      targetPhase: BatchPhase.CLARIFICATION,
      destinations: [{ vessel: vessel('Cieľ A', 100), volume: 95 }],
      lossVolume: 5,
    })
    const source = context.db.select().from(batches).where(eq(batches.id, sourceId)).get()!
    const child = context.db.select().from(batches).where(eq(batches.id, result.createdBatchIds[0]!)).get()!
    expect(source.status).toBe(BatchStatus.CLOSED)
    expect(child).toMatchObject({
      phase: BatchPhase.CLARIFICATION,
      parentBatchId: sourceId,
      vesselName: 'Cieľ A',
      vesselCapacity: 100,
      volume: 95,
    })
  })

  it('vykoná single-destination stáčanie do kvasenia', () => {
    const sourceId = insertBatch(BatchPhase.CLARIFICATION)
    const result = transferBatch(context.db, transferContext, {
      sourceBatchId: sourceId,
      targetPhase: BatchPhase.FERMENTATION,
      destinations: [{ vessel: vessel('Cieľ A', 100), volume: 98 }],
      lossVolume: 2,
    })
    expect(context.db.select().from(batches).where(eq(batches.id, result.createdBatchIds[0]!)).get()?.phase).toBe(BatchPhase.FERMENTATION)
  })

  it('rozdelí šaržu do viacerých nádob a priradí každú k transferu', () => {
    const sourceId = insertBatch(BatchPhase.CLARIFICATION)
    const result = transferBatch(context.db, transferContext, {
      sourceBatchId: sourceId,
      targetPhase: BatchPhase.FERMENTATION,
      destinations: [
        { vessel: vessel('Cieľ A', 100), volume: 60 },
        { vessel: vessel('Cieľ B', 100, VesselType.OAK_BARREL), volume: 35 },
      ],
      lossVolume: 5,
    })
    expect(result.createdBatchIds).toEqual(['2026-IO-FERMENTATION-001', '2026-IO-FERMENTATION-002'])
    expect(context.db.select().from(transferDestinations).all()).toHaveLength(2)
  })

  it('odmietne neúplnú objemovú bilanciu bez čiastočných zmien', () => {
    const sourceId = insertBatch(BatchPhase.CLARIFICATION)
    expect(() => transferBatch(context.db, transferContext, {
      sourceBatchId: sourceId,
      targetPhase: BatchPhase.FERMENTATION,
      destinations: [{ vessel: vessel('Cieľ A', 100), volume: 80 }],
      lossVolume: 5,
    })).toThrow('zodpovedať')
    expect(context.db.select().from(batches).where(eq(batches.id, sourceId)).get()?.status).toBe(BatchStatus.ACTIVE)
    expect(context.db.select().from(transfers).all()).toHaveLength(0)
  })

  it('odmietne prekročenie kapacity cieľovej nádoby', () => {
    const sourceId = insertBatch(BatchPhase.CLARIFICATION, 120)
    expect(() => transferBatch(context.db, transferContext, {
      sourceBatchId: sourceId,
      targetPhase: BatchPhase.FERMENTATION,
      destinations: [{ vessel: vessel('Cieľ A', 100), volume: 120 }],
      lossVolume: 0,
    })).toThrow('kapacitu')
  })

  it('uchová rekonštruovateľnú lineage cez batch aj transfer destination', () => {
    const sourceId = insertBatch(BatchPhase.FERMENTATION)
    const result = transferBatch(context.db, transferContext, {
      sourceBatchId: sourceId,
      targetPhase: BatchPhase.AGING,
      destinations: [{ vessel: vessel('Cieľ A', 100), volume: 100 }],
      lossVolume: 0,
    })
    const detail = context.db.select().from(transferDestinations).where(eq(transferDestinations.createdBatchId, result.createdBatchIds[0]!)).get()
    expect(detail?.transferId).toBe(result.id)
    expect(context.db.select().from(batches).where(eq(batches.id, result.createdBatchIds[0]!)).get()?.parentBatchId).toBe(sourceId)
  })

  it('force delete vyžaduje frázu a chráni naviazané dáta', async () => {
    const protectedId = insertBatch(BatchPhase.MUST)
    await createMeasurement(context.db, 'cellar-1', protectedId, { type: MeasurementType.PH, value: 3.2 })
    await expect(forceDeleteBatch(context.db, 'cellar-1', protectedId, 'FORCE DELETE')).rejects.toThrow('históriu')
    const emptyId = insertBatch(BatchPhase.MUST, 10, 'Cieľ C', '2026-IO-MUST-099')
    await expect(forceDeleteBatch(context.db, 'cellar-1', emptyId, 'delete')).rejects.toThrow('FORCE DELETE')
    expect(await forceDeleteBatch(context.db, 'cellar-1', emptyId, 'FORCE DELETE')).toEqual({ deleted: true })
  })
})
