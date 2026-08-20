import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../database/client'
import { vstupneSurovinyVina, vina } from '../database/schema'

export async function zoznamVin(db: Database, pivnicaId: string) {
  return db.select().from(vina).where(eq(vina.pivnicaId, pivnicaId)).orderBy(asc(vina.name)).all()
}

export async function najdiVino(db: Database, pivnicaId: string, id: string) {
  return db.select().from(vina).where(and(eq(vina.id, id), eq(vina.pivnicaId, pivnicaId))).get()
}

export async function listSourceMaterials(db: Database, vinoId: string) {
  return db.select().from(vstupneSurovinyVina).where(eq(vstupneSurovinyVina.vinoId, vinoId)).all()
}