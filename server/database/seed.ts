import { eq } from 'drizzle-orm'
import { FazaSarze, StavSarze, TypZasahu, TypMerania, TypNadoby, FarbaVina, jednotkyMerani } from '../../shared/domain'
import { hashPassword } from '../utils/password'
import type { Database } from './client'
import { sarze, clenoviaPivnice, pivnice, zasahy, merania, users, vstupneSurovinyVina, vina } from './schema'

export async function seedDevelopmentData(db: Database): Promise<void> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, 'oskar@example.sk')).get()
  if (existing) return

  const now = new Date('2026-08-17T08:00:00Z')
  db.transaction((tx) => {
    tx.insert(users).values({
      id: 'user-oskar',
      email: 'oskar@example.sk',
      passwordHash: hashPassword('vino2026'),
      name: 'Oskar',
      emailVerifiedAt: now,
      defaultContainerLocation: 'Hlavná miestnosť',
    }).run()
    tx.insert(pivnice).values({ id: 'pivnica-oskar', name: 'Oskarova pivnica' }).run()
    tx.insert(clenoviaPivnice).values({ pivnicaId: 'pivnica-oskar', userId: 'user-oskar', role: 'OWNER' }).run()
    tx.insert(vina).values([
      { id: 'vino-io', pivnicaId: 'pivnica-oskar', name: 'Irsai Oliver', code: 'IO', rocnik: 2026, color: FarbaVina.BIELE, notes: 'Aromatické biele víno.' },
      { id: 'vino-rv', pivnicaId: 'pivnica-oskar', name: 'Rizling vlašský', code: 'RV', rocnik: 2026, color: FarbaVina.BIELE },
      { id: 'vino-fr', pivnicaId: 'pivnica-oskar', name: 'Frankovka modrá', code: 'FR', rocnik: 2026, color: FarbaVina.CERVENE },
    ]).run()
    tx.insert(vstupneSurovinyVina).values([
      { id: 'material-io-1', vinoId: 'vino-io', odrodaHrozna: 'Irsai Oliver', percentage: 100, weightKg: 520, volumeLiters: 390, cukornatostPriZbere: 19.5 },
      { id: 'material-rv-1', vinoId: 'vino-rv', odrodaHrozna: 'Rizling vlašský', percentage: 70, weightKg: 350, volumeLiters: 250, cukornatostPriZbere: 20 },
      { id: 'material-rv-2', vinoId: 'vino-rv', odrodaHrozna: 'Veltlínske zelené', percentage: 30, weightKg: 150, volumeLiters: 110, cukornatostPriZbere: 19 },
      { id: 'material-fr-1', vinoId: 'vino-fr', odrodaHrozna: 'Frankovka modrá', percentage: 100, weightKg: 430, volumeLiters: 320, cukornatostPriZbere: 21 },
    ]).run()
    tx.insert(sarze).values([
      {
        id: '2026-IO-KVASENIE-001',
        pivnicaId: 'pivnica-oskar',
        vinoId: 'vino-io',
        faza: FazaSarze.KVASENIE,
        nazovNadoby: 'Tank T1',
        typNadoby: TypNadoby.NEREZOVY_TANK,
        kapacitaNadoby: 500,
        umiestnenieNadoby: 'Hlavná miestnosť',
        volume: 380,
        status: StavSarze.AKTIVNA,
        openedAt: new Date('2026-08-01T08:00:00Z'),
      },
      {
        id: '2026-RV-ODKALENIE-001',
        pivnicaId: 'pivnica-oskar',
        vinoId: 'vino-rv',
        faza: FazaSarze.ODKALENIE,
        nazovNadoby: 'Tank T2',
        typNadoby: TypNadoby.NEREZOVY_TANK,
        kapacitaNadoby: 300,
        umiestnenieNadoby: 'Hlavná miestnosť',
        volume: 280,
        status: StavSarze.AKTIVNA,
        openedAt: new Date('2026-08-05T08:00:00Z'),
      },
      {
        id: '2026-FR-ZRENIE-001',
        pivnicaId: 'pivnica-oskar',
        vinoId: 'vino-fr',
        faza: FazaSarze.ZRENIE,
        nazovNadoby: 'Sud S1',
        typNadoby: TypNadoby.DREVENY_SUD,
        kapacitaNadoby: 225,
        umiestnenieNadoby: 'Zadná stena',
        volume: 210,
        status: StavSarze.AKTIVNA,
        openedAt: new Date('2026-07-25T08:00:00Z'),
      },
    ]).run()
    tx.insert(merania).values([
      { id: 'meranie-1', sarzaId: '2026-IO-KVASENIE-001', type: TypMerania.HUSTOTA, value: 1030, unit: jednotkyMerani[TypMerania.HUSTOTA], zmeraneAt: now },
      { id: 'meranie-2', sarzaId: '2026-IO-KVASENIE-001', type: TypMerania.TEPLOTA, value: 18.4, unit: jednotkyMerani[TypMerania.TEPLOTA], zmeraneAt: now },
      { id: 'meranie-3', sarzaId: '2026-RV-ODKALENIE-001', type: TypMerania.PH, value: 3.25, unit: jednotkyMerani[TypMerania.PH], zmeraneAt: new Date('2026-08-16T08:00:00Z') },
      { id: 'meranie-4', sarzaId: '2026-FR-ZRENIE-001', type: TypMerania.TEPLOTA, value: 14.2, unit: jednotkyMerani[TypMerania.TEPLOTA], zmeraneAt: new Date('2026-08-16T09:00:00Z') },
    ]).run()
    tx.insert(zasahy).values({ id: 'zasah-1', sarzaId: '2026-IO-KVASENIE-001', type: TypZasahu.KVASENIE, vykonaneAt: new Date('2026-08-10T08:00:00Z'), notes: 'Kontrola priebehu kvasenia.' }).run()
  })
}
