import type { H3Event } from 'h3'
import { getDatabase, type Database } from '../database/client'
import { initializeDatabase } from '../database/init'
import { requireAuth } from './auth'
import { toHttpError } from './errors'

export interface AuthContext {
  userId: string
  userName: string
  userEmail: string
  cellarId: string
  cellarName: string
}

export async function withDatabase<T>(action: (db: Database) => Promise<T> | T): Promise<T> {
  try {
    await initializeDatabase()
    return await action(getDatabase().db)
  } catch (error) {
    return toHttpError(error)
  }
}

export async function withAuth<T>(event: H3Event, action: (db: Database, context: AuthContext) => Promise<T> | T): Promise<T> {
  return withDatabase(async (db) => action(db, await requireAuth(event, db)))
}