import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FazaSarze, StavSarze, TypZasahu, TypMerania, TypNadoby, FarbaVina } from '../../../shared/domain'
import { createDatabase, type DatabaseContext } from '../../database/client'
import { sarze, clenoviaPivnice, pivnice, merania, cielePresunu, presuny, zasahy, users, vina, vstupneSurovinyVina } from '../../database/schema'
import { uzavriSarzu, vytvorSarzu, vynutVymazanieSarze, nacitajSarzu, upravZakladSarze } from '../sarza.service'
import { vytvorZasah } from '../zasah.service'
import { vytvorMeranie } from '../meranie.service'
import { presunSarzu } from '../presun.service'
import { vytvorVino, upravVino } from '../vino.service'

let context: DatabaseContext

beforeEach(() => {
  context = createDatabase(':memory:')
  migrate(context.db, { migrationsFolder: resolve(process.cwd(), 'drizzle/migrations') })
  context.db.insert(users).values({ id: 'user-1', email: 'test@example.sk', passwordHash: 'x', name: 'Test', emailVerifiedAt: new Date() }).run()
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
  it('vytvorí šarže v dvoch pivniciach s rovnakým kódom vína bez kolízie ID', async () => {
    context.db.insert(pivnice).values({ id: 'pivnica-2', name: 'Druhá pivnica' }).run()
    context.db.insert(vina).values({ id: 'vino-2', pivnicaId: 'pivnica-2', name: 'Irsai Oliver', code: 'IO', rocnik: 2026, color: FarbaVina.BIELE }).run()
    const first = await vytvorSarzu(context.db, 'pivnica-1', { vinoId: 'vino-1', faza: FazaSarze.MUST, nadoba: nadoba('Tank'), volume: 100 })
    const second = await vytvorSarzu(context.db, 'pivnica-2', { vinoId: 'vino-2', faza: FazaSarze.MUST, nadoba: nadoba('Tank'), volume: 100 })
    expect(first.id).not.toBe(second.id)
    await expect(nacitajSarzu(context.db, 'pivnica-1', second.id)).rejects.toThrow('nenašla')
  })
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
  it('sírenie iba zaeviduje hodnotu a nechá šaržu aktívnu', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE)
    const created = await vytvorZasah(context.db, 'pivnica-1', id, {
      type: TypZasahu.SIRENIE,
      sulfurMg: 25,
      vykonaneAt: '2026-08-03T08:00:00Z',
    })

    expect(created?.type).toBe(TypZasahu.SIRENIE)
    expect(created?.notes).toContain('25 mg')
    expect(context.db.select().from(sarze).where(eq(sarze.id, id)).get()?.status).toBe(StavSarze.AKTIVNA)
    expect(context.db.select().from(presuny).all()).toHaveLength(0)
  })

  it('zásah kvasenie uzavrie zdroj a vytvorí novú šaržu vo fáze kvasenia', () => {
    const sourceId = vlozSarzu(FazaSarze.ODKALENIE)
    const result = presunSarzu(context.db, kontextPresunu, {
      type: TypZasahu.KVASENIE,
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba('Kvasná nádoba', 100), volume: 98 }],
      lossVolume: 2,
    })

    expect(context.db.select().from(sarze).where(eq(sarze.id, sourceId)).get()?.status).toBe(StavSarze.UZAVRETA)
    expect(context.db.select().from(sarze).where(eq(sarze.id, result.vytvoreneSarzeIds[0]!)).get()?.faza).toBe(FazaSarze.KVASENIE)
    expect(context.db.select().from(zasahy).where(eq(zasahy.sarzaId, sourceId)).get()?.type).toBe(TypZasahu.KVASENIE)
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

  it('vymaže rozvetvený rodokmeň od listov a zachová ostatné vetvy', async () => {
    const root = vlozSarzu(FazaSarze.MUST)
    const split = presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: root, cielovaFaza: FazaSarze.ODKALENIE,
      ciele: [{ nadoba: nadoba('A'), volume: 60 }, { nadoba: nadoba('B'), volume: 40 }],
    })
    const [a, b] = split.vytvoreneSarzeIds as [string, string]
    const next = presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: a, cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba('C'), volume: 60 }],
    })
    const leaf = next.vytvoreneSarzeIds[0]!
    await vytvorMeranie(context.db, 'pivnica-1', leaf, { type: TypMerania.PH, value: 3.2 })
    const siblingBefore = await nacitajSarzu(context.db, 'pivnica-1', b)
    await expect(vynutVymazanieSarze(context.db, 'pivnica-1', a, 'FORCE DELETE')).rejects.toThrow('následníkov')
    expect(context.db.select().from(zasahy).all()).toHaveLength(2)
    await vynutVymazanieSarze(context.db, 'pivnica-1', leaf, 'FORCE DELETE')
    await vynutVymazanieSarze(context.db, 'pivnica-1', a, 'FORCE DELETE')
    expect(await nacitajSarzu(context.db, 'pivnica-1', b)).toEqual(siblingBefore)
    expect(context.db.select().from(cielePresunu).all()).toHaveLength(1)
    expect(context.db.select().from(presuny).all()).toHaveLength(1)
    expect((await nacitajSarzu(context.db, 'pivnica-1', root)).status).toBe(StavSarze.UZAVRETA)
    await expect(vynutVymazanieSarze(context.db, 'pivnica-1', root, 'FORCE DELETE')).rejects.toThrow('následníkov')
    await vynutVymazanieSarze(context.db, 'pivnica-1', b, 'FORCE DELETE')
    await vynutVymazanieSarze(context.db, 'pivnica-1', root, 'FORCE DELETE')
    expect(context.db.select().from(sarze).all()).toHaveLength(0)
    expect(context.db.select().from(presuny).all()).toHaveLength(0)
    expect(context.db.select().from(cielePresunu).all()).toHaveLength(0)
    expect(context.db.select().from(merania).all()).toHaveLength(0)
    expect(context.db.select().from(zasahy).all()).toHaveLength(0)
    expect(context.db.select().from(vina).all()).toHaveLength(1)
    expect(context.sqlite.pragma('foreign_key_check')).toEqual([])
  })

  it('pri chybe mazania vráti aj históriu a väzbu na rodičovský presun', async () => {
    const root = vlozSarzu(FazaSarze.MUST)
    const result = presunSarzu(context.db, kontextPresunu, {
      zdrojovaSarzaId: root, cielovaFaza: FazaSarze.ODKALENIE,
      ciele: [{ nadoba: nadoba('A'), volume: 100 }],
    })
    const leaf = result.vytvoreneSarzeIds[0]!
    await vytvorMeranie(context.db, 'pivnica-1', leaf, { type: TypMerania.PH, value: 3.2 })
    await vytvorZasah(context.db, 'pivnica-1', leaf, { type: TypZasahu.SIRENIE, sulfurMg: 25 })
    const before = await nacitajSarzu(context.db, 'pivnica-1', leaf)
    context.sqlite.exec("CREATE TRIGGER reject_delete BEFORE DELETE ON sarze BEGIN SELECT RAISE(ABORT, 'test failure'); END")
    await expect(vynutVymazanieSarze(context.db, 'pivnica-1', leaf, 'FORCE DELETE')).rejects.toThrow('test failure')
    expect(await nacitajSarzu(context.db, 'pivnica-1', leaf)).toEqual(before)
    expect(context.db.select().from(cielePresunu).all()).toHaveLength(1)
  })

  it('nedovolí vymazať šaržu inej pivnice', async () => {
    const id = vlozSarzu(FazaSarze.MUST)
    await vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.PH, value: 3.2 })
    await expect(vynutVymazanieSarze(context.db, 'pivnica-2', id, 'FORCE DELETE')).rejects.toThrow('nenašla')
    expect(context.db.select().from(sarze).all()).toHaveLength(1)
    expect(context.db.select().from(merania).all()).toHaveLength(1)
  })

  it('force delete vyžaduje frázu a vymaže aj históriu poslednej šarže', async () => {
    const protectedId = vlozSarzu(FazaSarze.MUST)
    await vytvorMeranie(context.db, 'pivnica-1', protectedId, { type: TypMerania.PH, value: 3.2 })
    await vytvorZasah(context.db, 'pivnica-1', protectedId, { type: TypZasahu.SIRENIE, sulfurMg: 25 })
    await expect(vynutVymazanieSarze(context.db, 'pivnica-1', protectedId, 'delete')).rejects.toThrow('FORCE DELETE')
    expect(context.db.select().from(merania).all()).toHaveLength(1)
    await expect(vynutVymazanieSarze(context.db, 'pivnica-1', protectedId, 'FORCE DELETE')).resolves.toEqual({ deleted: true })
    expect(context.db.select().from(merania).all()).toHaveLength(0)
    expect(context.db.select().from(zasahy).all()).toHaveLength(0)
    const emptyId = vlozSarzu(FazaSarze.MUST, 10, 'Cieľ C', '2026-IO-MUST-099')
    await expect(vynutVymazanieSarze(context.db, 'pivnica-1', emptyId, 'delete')).rejects.toThrow('FORCE DELETE')
    expect(await vynutVymazanieSarze(context.db, 'pivnica-1', emptyId, 'FORCE DELETE')).toEqual({ deleted: true })
  })
})


describe('počiatočná cukornatosť kvasenia', () => {
  async function pripravZdroj() {
    const id = vlozSarzu(FazaSarze.ODKALENIE)
    await vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.CUKORNATOST, value: 18.5, zmeraneAt: '2026-08-02T08:00:00Z' })
    await vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.CUKORNATOST, value: 20, zmeraneAt: '2026-08-01T08:00:00Z' })
    await vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.TEPLOTA, value: 25, zmeraneAt: '2026-08-03T08:00:00Z' })
    return id
  }
  function kvasenie(id: string, extra: Record<string, unknown> = {}) {
    return presunSarzu(context.db, kontextPresunu, {
      type: TypZasahu.KVASENIE, zdrojovaSarzaId: id, cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba('Kvasenie A'), volume: 60 }, { nadoba: nadoba('Kvasenie B'), volume: 40 }],
      ...extra,
    })
  }
  it('prevezme poslednú cukornatosť podľa dátumu do všetkých nových šarží a zachová ju pri ďalšom meraní', async () => {
    const source = await pripravZdroj()
    const result = kvasenie(source)
    for (const id of result.vytvoreneSarzeIds) {
      await vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.CUKORNATOST, value: 5 })
      const detail = await nacitajSarzu(context.db, 'pivnica-1', id)
      expect(detail.pociatocnaCukornatost).toBe(18.5)
      expect(detail.posledneMerania.CUKORNATOST?.value).toBe(5)
    }
    expect((await nacitajSarzu(context.db, 'pivnica-1', source)).pociatocnaCukornatost).toBeNull()
  })
  it.each([0, 21.5])('uloží manuálnu hodnotu %s namiesto posledného merania', async (value) => {
    const result = kvasenie(await pripravZdroj(), { pociatocnaCukornatost: value })
    expect((await nacitajSarzu(context.db, 'pivnica-1', result.vytvoreneSarzeIds[0]!)).pociatocnaCukornatost).toBe(value)
  })
  it('bez merania ponechá hodnotu nevyplnenú', async () => {
    const result = kvasenie(vlozSarzu(FazaSarze.ODKALENIE))
    expect((await nacitajSarzu(context.db, 'pivnica-1', result.vytvoreneSarzeIds[0]!)).pociatocnaCukornatost).toBeNull()
  })
  it.each([-1, 'abc', true])('odmietne neplatnú hodnotu %s bez zmeny šarže', (value) => {
    const id = vlozSarzu(FazaSarze.ODKALENIE)
    expect(() => kvasenie(id, { pociatocnaCukornatost: value })).toThrow()
    expect(context.db.select().from(sarze).where(eq(sarze.id, id)).get()?.status).toBe(StavSarze.AKTIVNA)
    expect(context.db.select().from(presuny).all()).toHaveLength(0)
  })
})


describe('presun do pôvodnej nádoby', () => {
  it.each(['Zdroj', 'zdroj'])('umožní pokračovanie v nádobe %s a uzavrie pôvodnú šaržu', (name) => {
    const sourceId = vlozSarzu(FazaSarze.ODKALENIE)
    const result = presunSarzu(context.db, kontextPresunu, {
      type: TypZasahu.KVASENIE,
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba(name), volume: 100 }],
    })
    expect(context.db.select().from(sarze).where(eq(sarze.id, sourceId)).get()?.status).toBe(StavSarze.UZAVRETA)
    expect(context.db.select().from(sarze).where(eq(sarze.id, result.vytvoreneSarzeIds[0]!)).get()).toMatchObject({
      nazovNadoby: name, status: StavSarze.AKTIVNA, rodicovskaSarzaId: sourceId, volume: 100,
    })
  })

  it('pri rozdelení povolí pôvodnú nádobu, ale odmietne nádobu obsadenú inou šaržou', () => {
    const sourceId = vlozSarzu(FazaSarze.ODKALENIE)
    vlozSarzu(FazaSarze.ZRENIE, 50, 'Obsadená')
    const body = {
      zdrojovaSarzaId: sourceId,
      cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba('Zdroj'), volume: 60 }, { nadoba: nadoba('obsadená'), volume: 40 }],
    }
    expect(() => presunSarzu(context.db, kontextPresunu, body)).toThrow('už obsahuje aktívnu šaržu')
    expect(context.db.select().from(sarze).where(eq(sarze.id, sourceId)).get()?.status).toBe(StavSarze.AKTIVNA)
    expect(context.db.select().from(presuny).all()).toHaveLength(0)
    body.ciele[1]!.nadoba.name = 'Voľná'
    expect(presunSarzu(context.db, kontextPresunu, body).vytvoreneSarzeIds).toHaveLength(2)
  })
})

describe('dosládzanie', () => {
  it('uloží skutočne pridané kg aj keď sú iné ako výpočet a ponechá šaržu aktívnu', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE, 100)
    const result = await vytvorZasah(context.db, 'pivnica-1', id, {
      type: TypZasahu.DOSLADZANIE,
      pociatocnaCukornatost: 18,
      pozadovanaCukornatost: 20,
      pridanyCukorKg: '3,1',
    })
    expect(result).toMatchObject({ pociatocnaCukornatost: 18, pozadovanaCukornatost: 20, pridanyCukorKg: 3.1 })
    const detail = await nacitajSarzu(context.db, 'pivnica-1', id)
    expect(detail.zasahy[0]).toMatchObject({ type: TypZasahu.DOSLADZANIE, pociatocnaCukornatost: 18, pozadovanaCukornatost: 20, pridanyCukorKg: 3.1 })
    expect(detail.status).toBe(StavSarze.AKTIVNA)
    expect(detail.volume).toBe(100)
    expect(detail.merania).toHaveLength(1)
    expect(detail.posledneMerania.CUKORNATOST).toMatchObject({ value: 20, unit: '°NM', zmeraneAt: result!.vykonaneAt.toISOString() })
    expect(context.db.select().from(presuny).all()).toHaveLength(0)
  })
  it.each(['pociatocnaCukornatost', 'pozadovanaCukornatost', 'pridanyCukorKg'])('validuje povinné nezáporné číslo %s', async (key) => {
    const id = vlozSarzu(FazaSarze.KVASENIE)
    for (const value of [undefined, null, '', ' ', -1, 'abc', true, Infinity]) {
      await expect(vytvorZasah(context.db, 'pivnica-1', id, {
        type: TypZasahu.DOSLADZANIE, pociatocnaCukornatost: 18, pozadovanaCukornatost: 20, pridanyCukorKg: 2.5, [key]: value,
      })).rejects.toThrow()
    }
    expect(context.db.select().from(zasahy).all()).toHaveLength(0)
  })
  it('uloží aj nulové množstvo cukru', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE)
    expect(await vytvorZasah(context.db, 'pivnica-1', id, {
      type: TypZasahu.DOSLADZANIE, pociatocnaCukornatost: 20, pozadovanaCukornatost: 20, pridanyCukorKg: 0,
    })).toMatchObject({ pridanyCukorKg: 0 })
  })
  it('nedovolí vykonať dosládzanie ako presun', () => {
    const id = vlozSarzu(FazaSarze.ODKALENIE)
    expect(() => presunSarzu(context.db, kontextPresunu, {
      type: TypZasahu.DOSLADZANIE, zdrojovaSarzaId: id, cielovaFaza: FazaSarze.KVASENIE,
      ciele: [{ nadoba: nadoba('Cieľ'), volume: 100 }],
    })).toThrow('nevytvára nové šarže')
  })
})


describe('meranie pri dosládzaní', () => {
  it('pridá požadovanú hodnotu v čase zásahu a zachová staršie meranie', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE)
    await vytvorMeranie(context.db, 'pivnica-1', id, { type: TypMerania.CUKORNATOST, value: 18, zmeraneAt: '2026-08-01T08:00:00Z' })
    await vytvorZasah(context.db, 'pivnica-1', id, {
      type: TypZasahu.DOSLADZANIE, pociatocnaCukornatost: 18, pozadovanaCukornatost: 21,
      pridanyCukorKg: 4, vykonaneAt: '2026-08-02T09:30:00Z',
    })
    const detail = await nacitajSarzu(context.db, 'pivnica-1', id)
    expect(detail.merania).toHaveLength(2)
    expect(detail.posledneMerania.CUKORNATOST).toMatchObject({ value: 21, zmeraneAt: '2026-08-02T09:30:00.000Z' })
    expect(detail.merania[1]?.value).toBe(18)
  })
  it('pri zlyhaní merania neuloží ani zásah', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE)
    context.sqlite.exec("CREATE TRIGGER reject_measurement BEFORE INSERT ON merania BEGIN SELECT RAISE(ABORT, 'test failure'); END")
    await expect(vytvorZasah(context.db, 'pivnica-1', id, {
      type: TypZasahu.DOSLADZANIE, pociatocnaCukornatost: 18, pozadovanaCukornatost: 20, pridanyCukorKg: 2.5,
    })).rejects.toThrow('test failure')
    expect(context.db.select().from(zasahy).all()).toHaveLength(0)
    expect(context.db.select().from(merania).all()).toHaveLength(0)
  })
})

describe('pridanie vody', () => {
  const body = { type: TypZasahu.PRIDANIE_VODY, pridanaVodaLitrov: 10, pozadovanaCukornatost: 20, pridanyCukorKg: 3 }
  it('zvýši objem o vodu a uloží skutočný cukor aj pôvodný objem', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE, 100)
    await vytvorZasah(context.db, 'pivnica-1', id, body)
    let detail = await nacitajSarzu(context.db, 'pivnica-1', id)
    expect(detail).toMatchObject({ volume: 110, status: StavSarze.AKTIVNA })
    expect(detail.zasahy[0]).toMatchObject({ pridanaVodaLitrov: 10, objemPredZasahom: 100, pridanyCukorKg: 3, pozadovanaCukornatost: 20 })
    expect(detail.merania).toHaveLength(0)
    await vytvorZasah(context.db, 'pivnica-1', id, { ...body, pridanaVodaLitrov: 5, pridanyCukorKg: 0 })
    detail = await nacitajSarzu(context.db, 'pivnica-1', id)
    expect(detail.volume).toBe(115)
    expect(detail.zasahy).toHaveLength(2)
  })
  it('odmietne prekročenie kapacity bez zmeny objemu a histórie', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE, 195)
    await expect(vytvorZasah(context.db, 'pivnica-1', id, body)).rejects.toThrow('kapacitu')
    expect((await nacitajSarzu(context.db, 'pivnica-1', id)).volume).toBe(195)
    expect(context.db.select().from(zasahy).all()).toHaveLength(0)
  })
  it('vráti objem späť, ak zlyhá uloženie zásahu', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE)
    context.sqlite.exec("CREATE TRIGGER reject_action BEFORE INSERT ON zasahy BEGIN SELECT RAISE(ABORT, 'test failure'); END")
    await expect(vytvorZasah(context.db, 'pivnica-1', id, body)).rejects.toThrow('test failure')
    expect((await nacitajSarzu(context.db, 'pivnica-1', id)).volume).toBe(100)
  })
  it.each(['pridanaVodaLitrov', 'pozadovanaCukornatost', 'pridanyCukorKg'])('validuje pole %s', async (key) => {
    const id = vlozSarzu(FazaSarze.KVASENIE)
    for (const value of [undefined, null, '', -1, 'abc', true, Infinity]) {
      await expect(vytvorZasah(context.db, 'pivnica-1', id, { ...body, [key]: value })).rejects.toThrow()
    }
    expect((await nacitajSarzu(context.db, 'pivnica-1', id)).volume).toBe(100)
  })
  it('odmietne nulový objem vody a uzavretú šaržu', async () => {
    const id = vlozSarzu(FazaSarze.KVASENIE)
    await expect(vytvorZasah(context.db, 'pivnica-1', id, { ...body, pridanaVodaLitrov: 0 })).rejects.toThrow()
    await uzavriSarzu(context.db, 'pivnica-1', id)
    await expect(vytvorZasah(context.db, 'pivnica-1', id, body)).rejects.toThrow('uzavretej')
  })
})
