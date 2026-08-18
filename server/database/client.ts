import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import DatabaseDriver from 'better-sqlite3'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

export type Database = BetterSQLite3Database<typeof schema>
export interface DatabaseContext { db: Database; sqlite: DatabaseDriver.Database }

let singleton: DatabaseContext | undefined

export function createDatabase(url: string): DatabaseContext {
  if (url !== ':memory:') mkdirSync(dirname(resolve(url)), { recursive: true })
  const sqlite = new DatabaseDriver(url)
  sqlite.pragma('foreign_keys = ON')
  sqlite.pragma('busy_timeout = 5000')
  if (url !== ':memory:') sqlite.pragma('journal_mode = WAL')
  return { sqlite, db: drizzle(sqlite, { schema }) }
}

export function getDatabase(): DatabaseContext {
  if (!singleton) singleton = createDatabase(process.env.DATABASE_URL || './data/dev.sqlite')
  return singleton
}

export function closeDatabase(): void {
  singleton?.sqlite.close()
  singleton = undefined
}