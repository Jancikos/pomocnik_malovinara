import { eq } from 'drizzle-orm'
import { emailVerificationTokens, users } from '../../database/schema'
import { verificationTokenHash } from '../../utils/email-verification'
import { DomainError } from '../../utils/errors'
import { withDatabase } from '../../utils/handler'

export default defineEventHandler(async (event) => withDatabase(async (db) => {
  const body = await readBody<Record<string, unknown>>(event)
  const token = String(body.token ?? '')
  if (!token) throw new DomainError('Overovací odkaz nie je platný.')

  const verification = db.select().from(emailVerificationTokens)
    .where(eq(emailVerificationTokens.tokenHash, verificationTokenHash(token)))
    .get()

  if (!verification) throw new DomainError('Overovací odkaz nie je platný alebo už bol použitý.')
  if (verification.expiresAt.getTime() <= Date.now()) {
    db.delete(emailVerificationTokens).where(eq(emailVerificationTokens.tokenHash, verification.tokenHash)).run()
    throw new DomainError('Platnosť overovacieho odkazu vypršala. Vyžiadajte si nový.')
  }

  const now = new Date()
  db.transaction((tx) => {
    tx.update(users).set({ emailVerifiedAt: now, updatedAt: now }).where(eq(users.id, verification.userId)).run()
    tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, verification.userId)).run()
  })

  return { ok: true, message: 'E-mail bol potvrdený. Teraz sa môžete prihlásiť.' }
}))
