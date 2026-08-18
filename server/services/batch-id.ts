import { and, eq, like } from 'drizzle-orm'
import type { BatchPhase } from '../../shared/domain'
import type { Database } from '../database/client'
import { batches } from '../database/schema'

export function nextBatchIds(
  db: Database,
  input: { cellarId: string; year: number; wineCode: string; phase: BatchPhase; count?: number },
): string[] {
  const prefix = `${input.year}-${input.wineCode.toUpperCase()}-${input.phase}-`
  const existing = db.select({ id: batches.id }).from(batches)
    .where(and(eq(batches.cellarId, input.cellarId), like(batches.id, `${prefix}%`))).all()
  const current = existing.reduce((max, item) => {
    const parsed = Number(item.id.slice(prefix.length))
    return Number.isInteger(parsed) ? Math.max(max, parsed) : max
  }, 0)
  return Array.from({ length: input.count ?? 1 }, (_, index) => `${prefix}${String(current + index + 1).padStart(3, '0')}`)
}