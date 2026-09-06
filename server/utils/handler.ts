import type { H3Event } from 'h3'
import { getDatabase, type Database } from '../database/client'
import { initializeDatabase } from '../database/init'
import { requireAuth, requireCellarWrite } from './auth'
import { toHttpError } from './errors'

export type AuthContext = Awaited<ReturnType<typeof requireAuth>>

export async function withDatabase<T>(action: (db: Database) => Promise<T> | T): Promise<T> {
  try {
    await initializeDatabase()
    return await action(getDatabase().db)
  } catch (error) {
    return toHttpError(error)
  }
}

export async function withAuth<T>(event: H3Event, action: (db: Database, context: AuthContext) => Promise<T> | T): Promise<T> {
  return withDatabase(async (db) => {
    const context = await requireAuth(event, db)
    const path = event.path.split('?')[0]!.replace(/\/+$/, '')
    const personalActions = ['/api/account', '/api/cellars/select', '/api/invitations/accept']
    if (!['GET', 'HEAD', 'OPTIONS'].includes(event.method)
      && !personalActions.includes(path)) requireCellarWrite(context.role)
    return action(db, context)
  })
}
