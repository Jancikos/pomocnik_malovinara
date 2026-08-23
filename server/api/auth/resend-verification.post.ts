import { eq } from 'drizzle-orm'
import { users } from '../../database/schema'
import { normalizeEmail } from '../../utils/account-input'
import { issueEmailVerificationToken, sendVerificationEmail } from '../../utils/email-verification'
import { withDatabase } from '../../utils/handler'

const genericMessage = 'Ak účet čaká na overenie, poslali sme na jeho e-mail nový odkaz.'

export default defineEventHandler(async (event) => withDatabase(async (db) => {
  const body = await readBody<Record<string, unknown>>(event)
  const email = normalizeEmail(body.email)
  const user = email ? db.select().from(users).where(eq(users.email, email)).get() : undefined

  if (!user || user.emailVerifiedAt) return { ok: true, message: genericMessage }

  const token = issueEmailVerificationToken(db, user.id)
  const mail = await sendVerificationEmail(event, user.email, token)
  return {
    ok: true,
    message: genericMessage,
    developmentVerificationUrl: mail.developmentUrl,
  }
}))
