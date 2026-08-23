import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { clenoviaPivnice, pivnice, users } from '../../database/schema'
import { requiredAccountText, requiredPassword, validEmail } from '../../utils/account-input'
import { issueEmailVerificationToken, sendVerificationEmail } from '../../utils/email-verification'
import { DomainError } from '../../utils/errors'
import { withDatabase } from '../../utils/handler'
import { hashPassword } from '../../utils/password'

export default defineEventHandler(async (event) => withDatabase(async (db) => {
  const body = await readBody<Record<string, unknown>>(event)
  const email = validEmail(body.email)
  const password = requiredPassword(body.password)
  const nickname = requiredAccountText(body.nickname, 'Prezývka')

  if (db.select({ id: users.id }).from(users).where(eq(users.email, email)).get()) {
    throw new DomainError('Účet s týmto e-mailom už existuje.', 409)
  }

  const userId = randomUUID()
  const pivnicaId = randomUUID()
  db.transaction((tx) => {
    tx.insert(users).values({
      id: userId,
      email,
      passwordHash: hashPassword(password),
      name: nickname,
    }).run()
    tx.insert(pivnice).values({ id: pivnicaId, name: 'Moja pivnica' }).run()
    tx.insert(clenoviaPivnice).values({ pivnicaId, userId, role: 'OWNER' }).run()
  })

  const token = issueEmailVerificationToken(db, userId)
  try {
    const mail = await sendVerificationEmail(event, email, token)
    return {
      email,
      emailSent: true,
      developmentVerificationUrl: mail.developmentUrl,
      message: 'Registrácia bola vytvorená. Skontrolujte si e-mail a potvrďte ju.',
    }
  }
  catch (error) {
    console.error('Verification email could not be sent', error)
    return {
      email,
      emailSent: false,
      message: 'Účet bol vytvorený, ale overovací e-mail sa nepodarilo odoslať. Skúste ho poslať znova.',
    }
  }
}))
