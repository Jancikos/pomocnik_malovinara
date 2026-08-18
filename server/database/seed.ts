import { eq } from 'drizzle-orm'
import { BatchPhase, BatchStatus, InterventionType, MeasurementType, VesselType, WineColor, measurementUnits } from '../../shared/domain'
import { hashPassword } from '../utils/password'
import type { Database } from './client'
import { batches, cellarMembers, cellars, interventions, measurements, users, vessels, wineSourceMaterials, wines } from './schema'

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
    tx.insert(vessels).values([
      { id: 'vessel-t1', cellarId: 'cellar-oskar', name: 'Tank T1', type: VesselType.STEEL_TANK, capacity: 500, location: 'Hlavná miestnosť' },
      { id: 'vessel-t2', cellarId: 'cellar-oskar', name: 'Tank T2', type: VesselType.STEEL_TANK, capacity: 300, location: 'Hlavná miestnosť' },
      { id: 'vessel-s1', cellarId: 'cellar-oskar', name: 'Sud S1', type: VesselType.OAK_BARREL, capacity: 225, location: 'Zadná stena' },
      { id: 'vessel-k1', cellarId: 'cellar-oskar', name: 'Kaďa K1', type: VesselType.PLASTIC_VAT, capacity: 450, location: 'Lisovňa' },
      { id: 'vessel-d1', cellarId: 'cellar-oskar', name: 'Demižón D1', type: VesselType.DEMIJOHN, capacity: 50, location: 'Polica' },
    ]).run()
    tx.insert(batches).values([
      { id: '2026-IO-FERMENTATION-001', cellarId: 'cellar-oskar', wineId: 'wine-io', phase: BatchPhase.FERMENTATION, vesselId: 'vessel-t1', volume: 380, status: BatchStatus.ACTIVE, openedAt: new Date('2026-08-01T08:00:00Z') },
      { id: '2026-RV-CLARIFICATION-001', cellarId: 'cellar-oskar', wineId: 'wine-rv', phase: BatchPhase.CLARIFICATION, vesselId: 'vessel-t2', volume: 280, status: BatchStatus.ACTIVE, openedAt: new Date('2026-08-05T08:00:00Z') },
      { id: '2026-FR-AGING-001', cellarId: 'cellar-oskar', wineId: 'wine-fr', phase: BatchPhase.AGING, vesselId: 'vessel-s1', volume: 210, status: BatchStatus.ACTIVE, openedAt: new Date('2026-07-25T08:00:00Z') },
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