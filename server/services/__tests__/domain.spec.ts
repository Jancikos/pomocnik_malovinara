import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FazaSarze, StavSarze, TypZasahu, TypMerania, TypNadoby, FarbaVina } from '../../../shared/domain'
import { createDatabase, type DatabaseContext } from '../../database/client'
import { sarze, clenoviaPivnice, pivnice, merania, cielePresunu, presuny, users, vina, vstupneSurovinyVina } from '../../database/schema'
import { uzavriSarzu, vytvorSarzu, vynutVymazanieSarze, nacitajSarzu, upravZakladSarze } from '../sarza.service'
import { vytvorZasah } from '../zasah.service'
import { vytvorMeranie } from '../meranie.service'
import { presunSarzu } from '../presun.service'
import { vytvorVino, upravVino } from '../vino.service'

let context: DatabaseContext

beforeEach(() => {
  context = createDatabase(':memory:')
  migrate(context.db, { migrationsFolder: resolve(process.cwd(), 'drizzle/migrations') })
  context.db.insert(users).values({ id: 'user-1', email: 'test@example.sk', passwordHash: 'x', name: 'Test' }).run()
  context.db.insert(pivnice).values({ id: 'pivnica-1', name: 'Testovacia pivnica' }).run()
  context.db.insert(clenoviaPivnice).values({ pivnicaId: 'pivnica-1', userId: 'user-1', role: 'OWNER' }).run()
  context.db.insert(vina).values({ id: 'vino-1', pivnicaId: 'pivnica-1', name: 'Irsai Oliver', code: 'IO', rocnik: 2026, color: FarbaVina.BIELE }).run()
})

afterEach(() => context.sqlite.close())

function nadoba(name: string, capacity = 200, type = TypNadoby.NEREZOVY_TANK) {
  return { name, type, capacity, location: 'Testovacia miestnosť' }
}

function vlozSarzu(
  faza: FazaSarze,
  volume = 100,
  nazovNadoby = 'Zdroj',
  id = `2026-IO-${faza}-001`,
) {
  context.db.insert(sarze).values({
    id,
    pivnicaId: 'pivnica-1',
    vinoId: 'vino-1',
    faza,
    nazovNadoby,
    typNadoby: TypNadoby.NEREZOVY_TANK,
    kapacitaNadoby: 200,
    umiestnenieNadoby: 'Testovacia miestnosť',
    volume,
    status: StavSarze.AKTIVNA,
    openedAt: new Date('2026-08-01T00:00:00Z'),
  }).run()
  return id
}

const kontextPresunu = { pivnicaId: 'pivnica-1', userId: 'user-1' }

describe('vino services', () => {
  it('kontroluje jedinečnosť kódu až v kombinácii s ročníkom', async () => {
    await expect(vytvorVino(context.db, 'pivnica-1', {
      name: 'Irsai Oliver 2025',
      code: 'IO',
      rocnik: 2025,
      color: FarbaVina.BIELE,
      vstupneSuroviny: [],
    })).resolves.toMatchObject({ code: 'IO', rocnik: 2025 })

    expect(() => vytvorVino(context.db, 'pivnica-1', {
      name: 'Iný Irsai',
      code: 'IO',
      rocnik: 2026,
      color: FarbaVina.BIELE,
      vstupneSuroviny: [],
    })).toThrow('kódom a ročníkom')
  })

  it('upraví existujúce víno a nahradí jeho zdrojové materiály', async () => {
    context.db.insert(vstupneSurovinyVina).values({
      id: 'material-old',
      vinoId: 'vino-1',
      odrodaHrozna: 'Pôvodná odroda',
      percentage: 100,
    }).run()

    const updated = await upravVino(context.db, 'pivnica-1', 'vino-1', {
      name: 'Irsai Oliver SS',
      code: 'IOS',
      rocnik: 1995,
      color: FarbaVina.BIELE,
      notes: 'Upravené víno.',
      vstupneSuroviny: [{
        odrodaHrozna: 'Irsai Oliver SS',
        percentage: 100,
        weightKg: 340,
        volumeLiters: 220,
        cukornatostPriZbere: 19.5,
      }],
    })

    expect(updated).toMatchObject({ id: 'vino-1', name: 'Irsai Oliver SS', code: 'IOS', rocnik: 1995, notes: 'Upravené víno.' })
    expect(updated.vstupneSuroviny).toHaveLength(1)
    expect(updated.vstupneSuroviny[0]).toMatchObject({ odrodaHrozna: 'Irsai Oliver SS', percentage: 100, weightKg: 340, volumeLiters: 220, cukornatostPriZbere: 19.5 })
    expect(context.db.select().from(vstupneSurovinyVina).where(eq(vstupneSurovinyVina.id, 'material-old')).get()).toBeUndefined()
  })

  it('pri úprave odmietne kolíziu kódu a ročníka s iným vínom', async () => {
    await vytvorVino(context.db, 'pivnica-1', {
      name: 'Irsai Oliver 2025',
      code: 'IO',
      rocnik: 2025,
      color: FarbaVina.BIELE,
      vstupneSuroviny: [],
    })

    expect(() => upravVino(context.db, 'pivnica-1', 'vino-1', {
      name: 'Irsai Oliver',
      code: 'IO',
      rocnik: 2025,
      color: FarbaVina.BIELE,
      vstupneSuroviny: [],
    })).toThrow('kódom a ročníkom')
  })
})

describe('sarza lifecycle services', () => {
  it('generuje deterministické ID a uloží snapshot nádoby priamo do šarže', async () => {
    const first = await vytvorSarzu(context.db, 'pivnica-1', {
      vinoId: 'vino-1',
      faza: FazaSarze.ZRENIE,
      nadoba: nadoba('Tank T1'),
      volume: 100,
    })
    const second = await vytvorSarzu(context.db, 'pivnica-1', {
      vinoId: 'vino-1',
      faza: FazaSarze.MUST,
      nadoba: nadoba('Tank T2'),
      volume: 80,
    })

    expect(first.id).toBe('2026-IO-ZRENIE-001')
    expect(first.faza).toBe(FazaSarze.ZRENIE)
    expect(second.id).toBe('2026-IO-MUST-001')
    expect(first.nadoba).toEqual({
      name: 'Tank T1',
      type: TypNadoby.NEREZOVY_TANK,
      capacity: 200,
      location: 'Testovacia miestnosť',
    })
  })

  it('odmietne druhú aktívnu šaržu s rovnakým názvom nádoby', async () => {
    await vytvorSarzu(context.db, 'pivnica-1', { vinoId: 'vino-1', faza: FazaSarze.MUST, nadoba: nadoba('Tank T1'), volume: 100 })
    expect(() => vytvorSarzu(context.db, 'pivnica-1', {
      vinoId: 'vino-1',
      faza: FazaSarze.MUST,
      nadoba: nadoba('tank t1'),
      volume: 80,
    })).toThrow('aktívnu šaržu')
  })

  it('upraví základné údaje existujúcej šarže', async () => {
    const id = await vlozSarzu(FazaSarze.MUST)
    const updated = await upravZakladSarze(context.db, 'pivnica-1', id, {
      vinoId: 'vino-1',
      faza: FazaSarze.KVASENIE,
      nadoba: nadoba('Sud 200L', 200, TypNadoby.DREVENY_SUD),
      volume: 120,
      openedAt: '2026-08-02T10:30:00Z',
    })

    expect(updated).toMatchObject({ id, faza: FazaSarze.KVASENIE, volume: 120 })
    expect(updated.nadoba).toEqual({
      name: 'Sud 200L',
      type: TypNadoby.DREVENY_SUD,
      capacity: 200,
      location: 'Testovacia miestnosť',
    })
  })

  it('pri úprave odmietne názov už obsadenej aktívnej nádoby', async () => {
    const firstId = await vlozSarzu(FazaSarze.MUST, 100, 'Tank T1')
    const secondId = await vlozSarzu(FazaSarze.KVASENIE, 80, 'Tank T2', '2026-IO-KVASENIE-002')

    expect(() => upravZakladSarze(context.db, 'pivnica-1', secondId, {
      vinoId: 'vino-1',
      faza: FazaSarze.KVASENIE,
      nadoba: nadoba('tank t1'),
      volume: 80,
    })).toThrow('aktívnu šaržu')
    expect((await nacitajSarzu(context.db, 'pivnica-1', firstId)).nadoba.name).toBe('Tank T1')
  })

  it('merania iba pridáva a vracia posledné meranie daného typu', async () => {
    const id = vlozSarzu(FazaSarze.MUST)
    await vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.CUKORNATOST, value: 19, zmeraneAt: '2026-08-01T08:00:00Z' })
    await vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.CUKORNATOST, value: 18.4, zmeraneAt: '2026-08-02T08:00:00Z' })
    expect(context.db.select().from(merania).all()).toHaveLength(2)
    expect((await nacitajSarzu(context.db, 'pivnica-1', id)).posledneMerania.CUKORNATOST?.value).toBe(18.4)
  })

  it('umožní ľubovoľný zásah v ľubovoľnej aktívnej fáze', async () => {
    const id = vlozSarzu(FazaSarze.ZRENIE)
    const created = await vytvorZasah(context.db, 'pivnica-1', id, {
      type: TypZasahu.ODKALENIE,
      vykonaneAt: '2026-08-03T08:00:00Z',
      notes: 'Kontrolný zásah počas zrenia.',
    })
    expect(created?.type).toBe(TypZasahu.ODKALENIE)
  })
  it('umožní manuálne uzavretie a zablokuje ďalšie meranie', async () => {
    const id = vlozSarzu(FazaSarze.MUST)
    const closed = await uzavriSarzu(context.db, 'pivnica-1', id)
    expect(closed.status).toBe(StavSarze.UZAVRETA)
    await expect(vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.PH, value: 3.2 })).rejects.toThrow('uzavretej')
  })

  it('vykoná odkalenie v jednej transakcii a zachová parent lineage', () => {
    const sourceId = vlozSarzu(FazaSarze.MUST)
    const result = presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.ODKALENIE,
      ciele: [{ nadoba: nadoba('Cieľ A', 100), volume: 95 }],
      lossVolume: 5,
    })
    const source = context.db.select().from(sarze).where(eq(sarze.id, sourceId)).get()!
    const child = context.db.select().from(sarze).where(eq(sarze.id, result.vytvoreneSarzeIds[0]!)).get()!
    expect(source.status).toBe(StavSarze.UZAVRETA)
    expect(child).toMatchObject({
      faza: FazaSarze.ODKALENIE,
      rodicovskaSarzaId: sourceId,
      nazovNadoby: 'Cieľ A',
      kapacitaNadoby: 100,
      volume: 95,
    })
  })

  it('vykoná single-ciel stáčanie do kvasenia', () => {
    const sourceId = vlozSarzu(FazaSarze.ODKALENIE)
    const result = presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba('Cieľ A', 100), volume: 98 }],
      lossVolume: 2,
    })
    expect(context.db.select().from(sarze).where(eq(sarze.id, result.vytvoreneSarzeIds[0]!)).get()?.faza).toBe(FazaSarze.KVASENIE)
  })

  it('rozdelí šaržu do viacerých nádob a priradí každú k presunu', () => {
    const sourceId = vlozSarzu(FazaSarze.ODKALENIE)
    const result = presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.KVASENIE,
      ciele: [
        { nadoba: nadoba('Cieľ A', 100), volume: 60 },
        { nadoba: nadoba('Cieľ B', 100, TypNadoby.DREVENY_SUD), volume: 35 },
      ],
      lossVolume: 5,
    })
    expect(result.vytvoreneSarzeIds).toEqual(['2026-IO-KVASENIE-001', '2026-IO-KVASENIE-002'])
    expect(context.db.select().from(cielePresunu).all()).toHaveLength(2)
  })

  it('odmietne neúplnú objemovú bilanciu bez čiastočných zmien', () => {
    const sourceId = vlozSarzu(FazaSarze.ODKALENIE)
    expect(() => presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba('Cieľ A', 100), volume: 80 }],
      lossVolume: 5,
    })).toThrow('zodpovedať')
    expect(context.db.select().from(sarze).where(eq(sarze.id, sourceId)).get()?.status).toBe(StavSarze.AKTIVNA)
    expect(context.db.select().from(presuny).all()).toHaveLength(0)
  })

  it('odmietne prekročenie kapacity cieľovej nádoby', () => {
    const sourceId = vlozSarzu(FazaSarze.ODKALENIE, 120)
    expect(() => presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba('Cieľ A', 100), volume: 120 }],
      lossVolume: 0,
    })).toThrow('kapacitu')
  })

  it('uchová rekonštruovateľnú lineage cez sarza aj presun ciel', () => {
    const sourceId = vlozSarzu(FazaSarze.KVASENIE)
    const result = presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.ZRENIE,
      ciele: [{ nadoba: nadoba('Cieľ A', 100), volume: 100 }],
      lossVolume: 0,
    })
    const detail = context.db.select().from(cielePresunu).where(eq(cielePresunu.vytvorenaSarzaId, result.vytvoreneSarzeIds[0]!)).get()
    expect(detail?.presunId).toBe(result.id)
    expect(context.db.select().from(sarze).where(eq(sarze.id, result.vytvoreneSarzeIds[0]!)).get()?.rodicovskaSarzaId).toBe(sourceId)
  })

  it('force delete vyžaduje frázu a chráni naviazané dáta', async () => {
    const protectedId = vlozSarzu(FazaSarze.MUST)
    await vytvorMeranie(context.db, 'pivnica-1', protectedId, { type: TypMerania.PH, value: 3.2 })
    await expect(vynutVymazanieSarze(context.db, 'pivnica-1', protectedId, 'FORCE DELETE')).rejects.toThrow('históriu')
    const emptyId = vlozSarzu(FazaSarze.MUST, 10, 'Cieľ C', '2026-IO-MUST-099')
    await expect(vynutVymazanieSarze(context.db, 'pivnica-1', emptyId, 'delete')).rejects.toThrow('FORCE DELETE')
    expect(await vynutVymazanieSarze(context.db, 'pivnica-1', emptyId, 'FORCE DELETE')).toEqual({ deleted: true })
  })
})
