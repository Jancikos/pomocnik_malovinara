import { desc, eq } from 'drizzle-orm'
import type { TypMerania } from '../../shared/domain'
import type { Database } from '../database/client'
import { merania } from '../database/schema'

export async function zoznamMerani(db: Database, sarzaId: string) {
  return db.select().from(merania).where(eq(merania.sarzaId, sarzaId)).orderBy(desc(merania.zmeraneAt)).all()
}

export async function posledneMeraniaPodlaTypu(db: Database, sarzeIds: string[]) {
  if (sarzeIds.length === 0) return new Map<string, Partial<Record<TypMerania, typeof merania.$inferSelect>>>()
  const rows = db.select().from(merania).orderBy(desc(merania.zmeraneAt)).all()
  const requested = new Set(sarzeIds)
  const result = new Map<string, Partial<Record<TypMerania, typeof merania.$inferSelect>>>()
  for (const row of rows) {
    if (!requested.has(row.sarzaId)) continue
    const byType = result.get(row.sarzaId) ?? {}
    if (!byType[row.type]) byType[row.type] = row
    result.set(row.sarzaId, byType)
  }
  return result
}