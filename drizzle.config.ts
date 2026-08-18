import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './server/database/schema.ts',
  out: './drizzle/migrations',
  dbCredentials: { url: process.env.DATABASE_URL || './data/dev.sqlite' },
  strict: true,
})