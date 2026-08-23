import { createHash, randomBytes } from 'node:crypto'
import { eq } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getRequestURL } from 'h3'
import nodemailer from 'nodemailer'
import type { Database } from '../database/client'
import { emailVerificationTokens } from '../database/schema'
import { DomainError } from './errors'

const tokenDurationMs = 24 * 60 * 60 * 1000

export function verificationTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function issueEmailVerificationToken(db: Database, userId: string): string {
  const token = randomBytes(32).toString('base64url')
  db.transaction((tx) => {
    tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, userId)).run()
    tx.insert(emailVerificationTokens).values({
      tokenHash: verificationTokenHash(token),
      userId,
      expiresAt: new Date(Date.now() + tokenDurationMs),
    }).run()
  })
  return token
}

export async function sendVerificationEmail(event: H3Event, email: string, token: string): Promise<{ developmentUrl?: string }> {
  const config = useRuntimeConfig(event)
  const requestOrigin = getRequestURL(event).origin
  const appUrl = String(config.appUrl || requestOrigin).replace(/\/$/, '')
  const verificationUrl = `${appUrl}/verify-email?token=${encodeURIComponent(token)}`

  if (!config.smtpHost) {
    if (process.env.NODE_ENV === 'production') {
      throw new DomainError('Odosielanie overovacích e-mailov nie je nakonfigurované.', 503)
    }
    console.info(`[email-verification] ${email}: ${verificationUrl}`)
    return { developmentUrl: verificationUrl }
  }

  const transporter = nodemailer.createTransport({
    host: String(config.smtpHost),
    port: Number(config.smtpPort),
    secure: Boolean(config.smtpSecure),
    auth: config.smtpUser
      ? { user: String(config.smtpUser), pass: String(config.smtpPassword) }
      : undefined,
  })

  await transporter.sendMail({
    from: String(config.emailFrom),
    to: email,
    subject: 'Potvrďte registráciu vo Vinárskom Pomocníkovi',
    text: `Registráciu dokončíte otvorením tohto odkazu: ${verificationUrl}\n\nOdkaz je platný 24 hodín.`,
    html: `<p>Registráciu vo Vinárskom Pomocníkovi dokončíte kliknutím na tlačidlo:</p><p><a href="${verificationUrl}">Potvrdiť e-mail</a></p><p>Odkaz je platný 24 hodín.</p>`,
  })

  return {}
}
