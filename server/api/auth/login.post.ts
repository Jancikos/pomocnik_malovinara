import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { normalizeEmail } from '../../utils/account-input'
import { createSession } from '../../utils/auth'
import { DomainError } from '../../utils/errors'
import { withDatabase } from '../../utils/handler'
import { verifyPassword } from '../../utils/password'

export default defineEventHandler(async (event) => withDatabase(async (db) => {
  const body = await readBody<Record<string, unknown>>(event)
  const email = normalizeEmail(body.email)
  const password = String(body.password || '')
  const user = db.select().from(users).where(eq(users.email, email)).get()
  if (!user || !password || !verifyPassword(password, user.passwordHash)) throw new DomainError('E-mail alebo heslo nie sú správne.', 401)
  if (!user.emailVerifiedAt) throw new DomainError('Najprv potvrďte svoju registráciu odkazom v e-maile.', 403)
  createSession(event, db, user.id)
  return { id: user.id, nickname: user.name, email: user.email }
}))