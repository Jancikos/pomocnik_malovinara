import { eq } from 'drizzle-orm'
import { BatchPhase, BatchStatus, InterventionType, MeasurementType, VesselType, WineColor, measurementUnits } from '../../shared/domain'
import { hashPassword } from '../utils/password'
import type { Database } from './client'
import { batches, cellarMembers, cellars, interventions, measurements, users, wineSourceMaterials, wines } from './schema'

export async function seedDevelopmentData(db: Database): Promise<void> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, 'oskar@example.sk')).get()
  if (existing) return

  const now = new Date('2026-08-17T08:00:00Z')
  db.transaction((tx) => {
    tx.insert(users).values({ id: 'user-oskar', email: 'oskar@example.sk', passwordHash: hashPassword('vino2026'), name: 'Oskar' }).run()
    tx.insert(cellars).values({ id: 'cellar-oskar', name: 'Oskarova pivnica' }).run()
    tx.insert(cellarMembers).values({ cellarId: 'cellar-oskar', userId: 'user-oskar', role: 'OWNER' }).run()
    tx.insert(wines).values([
      { id: 'wine-io', cellarId: 'cellar-oskar', name: 'Irsai Oliver', code: 'IO', vintageYear: 2026, color: WineColor.WHITE, notes: 'Aromatické biele víno.' },
      { id: 'wine-rv', cellarId: 'cellar-oskar', name: 'Rizling vlašský', code: 'RV', vintageYear: 2026, color: WineColor.WHITE },
      { id: 'wine-fr', cellarId: 'cellar-oskar', name: 'Frankovka modrá', code: 'FR', vintageYear: 2026, color: WineColor.RED },
    ]).run()
    tx.insert(wineSourceMaterials).values([
      { id: 'material-io-1', wineId: 'wine-io', grapeVariety: 'Irsai Oliver', percentage: 100, weightKg: 520, volumeLiters: 390, harvestSugar: 19.5 },
      { id: 'material-rv-1', wineId: 'wine-rv', grapeVariety: 'Rizling vlašský', percentage: 70, weightKg: 350, volumeLiters: 250, harvestSugar: 20 },
      { id: 'material-rv-2', wineId: 'wine-rv', grapeVariety: 'Veltlínske zelené', percentage: 30, weightKg: 150, volumeLiters: 110, harvestSugar: 19 },
      { id: 'material-fr-1', wineId: 'wine-fr', grapeVariety: 'Frankovka modrá', percentage: 100, weightKg: 430, volumeLiters: 320, harvestSugar: 21 },
    ]).run()
    tx.insert(batches).values([
      {
        id: '2026-IO-FERMENTATION-001',
        cellarId: 'cellar-oskar',
        wineId: 'wine-io',
        phase: BatchPhase.FERMENTATION,
        vesselName: 'Tank T1',
        vesselType: VesselType.STEEL_TANK,
        vesselCapacity: 500,
        vesselLocation: 'Hlavná miestnosť',
        volume: 380,
        status: BatchStatus.ACTIVE,
        openedAt: new Date('2026-08-01T08:00:00Z'),
      },
      {
        id: '2026-RV-CLARIFICATION-001',
        cellarId: 'cellar-oskar',
        wineId: 'wine-rv',
        phase: BatchPhase.CLARIFICATION,
        vesselName: 'Tank T2',
        vesselType: VesselType.STEEL_TANK,
        vesselCapacity: 300,
        vesselLocation: 'Hlavná miestnosť',
        volume: 280,
        status: BatchStatus.ACTIVE,
        openedAt: new Date('2026-08-05T08:00:00Z'),
      },
      {
        id: '2026-FR-AGING-001',
        cellarId: 'cellar-oskar',
        wineId: 'wine-fr',
        phase: BatchPhase.AGING,
        vesselName: 'Sud S1',
        vesselType: VesselType.OAK_BARREL,
        vesselCapacity: 225,
        vesselLocation: 'Zadná stena',
        volume: 210,
        status: BatchStatus.ACTIVE,
        openedAt: new Date('2026-07-25T08:00:00Z'),
      },
    ]).run()
    tx.insert(measurements).values([
      { id: 'measurement-1', batchId: '2026-IO-FERMENTATION-001', type: MeasurementType.DENSITY, value: 1030, unit: measurementUnits[MeasurementType.DENSITY], measuredAt: now },
      { id: 'measurement-2', batchId: '2026-IO-FERMENTATION-001', type: MeasurementType.TEMPERATURE, value: 18.4, unit: measurementUnits[MeasurementType.TEMPERATURE], measuredAt: now },
      { id: 'measurement-3', batchId: '2026-RV-CLARIFICATION-001', type: MeasurementType.PH, value: 3.25, unit: measurementUnits[MeasurementType.PH], measuredAt: new Date('2026-08-16T08:00:00Z') },
      { id: 'measurement-4', batchId: '2026-FR-AGING-001', type: MeasurementType.TEMPERATURE, value: 14.2, unit: measurementUnits[MeasurementType.TEMPERATURE], measuredAt: new Date('2026-08-16T09:00:00Z') },
    ]).run()
    tx.insert(interventions).values({ id: 'intervention-1', batchId: '2026-IO-FERMENTATION-001', type: InterventionType.FERMENTATION, performedAt: new Date('2026-08-10T08:00:00Z'), notes: 'Kontrola priebehu kvasenia.' }).run()
  })
}
