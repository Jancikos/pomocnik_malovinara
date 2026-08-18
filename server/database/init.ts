import { resolve } from 'node:path'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { getDatabase } from './client'
import { seedDevelopmentData } from './seed'

let initialized: Promise<void> | undefined

export function initializeDatabase(): Promise<void> {
  initialized ??= Promise.resolve().then(async () => {
    const { db } = getDatabase()
    migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle/migrations') })
    if (process.env.NODE_ENV !== 'production') await seedDevelopmentData(db)
  })
  return initialized
}