import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../database/client'
import { sarze, zasahy, merania, vina } from '../database/schema'

export async function najdiSarzu(db: Database, pivnicaId: string, id: string) {
  return db.select().from(sarze).where(and(eq(sarze.id, id), eq(sarze.pivnicaId, pivnicaId))).get()
}

export async function zoznamRiadkovSarzi(db: Database, pivnicaId: string) {
  return db.select({ sarza: sarze, vino: vina })
    .from(sarze)
    .innerJoin(vina, eq(sarze.vinoId, vina.id))
    .where(eq(sarze.pivnicaId, pivnicaId))
    .orderBy(desc(sarze.openedAt)).all()
}

export async function najdiRiadokSarze(db: Database, pivnicaId: string, id: string) {
  return db.select({ sarza: sarze, vino: vina })
    .from(sarze)
    .innerJoin(vina, eq(sarze.vinoId, vina.id))
    .where(and(eq(sarze.pivnicaId, pivnicaId), eq(sarze.id, id))).get()
}

export async function zoznamMeraniSarze(db: Database, sarzaId: string) {
  return db.select().from(merania).where(eq(merania.sarzaId, sarzaId)).orderBy(desc(merania.zmeraneAt)).all()
}

export async function zoznamZasahovSarze(db: Database, sarzaId: string) {
  return db.select().from(zasahy).where(eq(zasahy.sarzaId, sarzaId)).orderBy(desc(zasahy.vykonaneAt)).all()
}

export async function zoznamNaslednychSarzi(db: Database, sarzaId: string) {
  return db.select({ id: sarze.id, faza: sarze.faza, nazovNadoby: sarze.nazovNadoby, volume: sarze.volume })
    .from(sarze)
    .where(eq(sarze.rodicovskaSarzaId, sarzaId)).all()
}
