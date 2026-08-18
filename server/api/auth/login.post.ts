import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { createSession } from '../../utils/auth'
import { DomainError } from '../../utils/errors'
import { withDatabase } from '../../utils/handler'
import { verifyPassword } from '../../utils/password'

export default defineEventHandler(async (event) => withDatabase(async (db) => {
  const body = await readBody<Record<string, unknown>>(event)
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const user = db.select().from(users).where(eq(users.email, email)).get()
  if (!user || !verifyPassword(password, user.passwordHash)) throw new DomainError('E-mail alebo heslo nie sú správne.', 401)
  createSession(event, db, user.id)
  return { id: user.id, name: user.name, email: user.email }
}))