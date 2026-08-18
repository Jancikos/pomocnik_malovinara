import { and, asc, eq } from 'drizzle-orm'
import type { Database } from '../database/client'
import { wineSourceMaterials, wines } from '../database/schema'

export async function listWines(db: Database, cellarId: string) {
  return db.select().from(wines).where(eq(wines.cellarId, cellarId)).orderBy(asc(wines.name)).all()
}

export async function findWine(db: Database, cellarId: string, id: string) {
  return db.select().from(wines).where(and(eq(wines.id, id), eq(wines.cellarId, cellarId))).get()
}

export async function listSourceMaterials(db: Database, wineId: string) {
  return db.select().from(wineSourceMaterials).where(eq(wineSourceMaterials.wineId, wineId)).all()
}