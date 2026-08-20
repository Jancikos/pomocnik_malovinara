import { and, eq, like } from 'drizzle-orm'
import type { FazaSarze } from '../../shared/domain'
import type { Database } from '../database/client'
import { sarze } from '../database/schema'

export function dalsieIdSarzi(
  db: Database,
  input: { pivnicaId: string; year: number; kodVina: string; faza: FazaSarze; count?: number },
): string[] {
  const prefix = `${input.year}-${input.kodVina.toUpperCase()}-${input.faza}-`
  const existing = db.select({ id: sarze.id }).from(sarze)
    .where(and(eq(sarze.pivnicaId, input.pivnicaId), like(sarze.id, `${prefix}%`))).all()
  const current = existing.reduce((max, item) => {
    const parsed = Number(item.id.slice(prefix.length))
    return Number.isInteger(parsed) ? Math.max(max, parsed) : max
  }, 0)
  return Array.from({ length: input.count ?? 1 }, (_, index) => `${prefix}${String(current + index + 1).padStart(3, '0')}`)
}