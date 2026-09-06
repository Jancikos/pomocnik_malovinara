import { randomBytes, randomUUID } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import type { Database } from '../database/client'
import { cellarInvitations, clenoviaPivnice, pivnice, users } from '../database/schema'
import { validEmail } from '../utils/account-input'
import { verificationTokenHash } from '../utils/email-verification'
import { DomainError } from '../utils/errors'
import { CELLAR_LOGO_MAX_BYTES, CELLAR_LOGO_MAX_DATA_URL_LENGTH } from '../../shared/constants/cellar-logo'

export function sharingRole(value: unknown): 'MEMBER' | 'VIEWER' {
  if (value !== 'MEMBER' && value !== 'VIEWER') throw new DomainError('Vyberte prístup na čítanie alebo úpravy.')
  return value
}

export function createInvitation(db: Database, pivnicaId: string, emailInput: unknown, roleInput: unknown) {
  const email = validEmail(emailInput)
  const role = sharingRole(roleInput)
  const member = db.select().from(clenoviaPivnice).innerJoin(users, eq(users.id, clenoviaPivnice.userId))
    .where(and(eq(clenoviaPivnice.pivnicaId, pivnicaId), eq(users.email, email))).get()
  if (member) throw new DomainError('Používateľ už má do tejto pivnice prístup.', 409)
  const token = randomBytes(32).toString('base64url')
  const invitation = { id: randomUUID(), tokenHash: verificationTokenHash(token), pivnicaId, email, role,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), createdAt: new Date() }
  db.transaction(tx => {
    tx.delete(cellarInvitations).where(and(eq(cellarInvitations.pivnicaId, pivnicaId), eq(cellarInvitations.email, email))).run()
    tx.insert(cellarInvitations).values(invitation).run()
  })
  return { ...invitation, token }
}

export function getInvitation(db: Database, token: string) {
  const invitation = db.select({ id: cellarInvitations.id, email: cellarInvitations.email,
    pivnicaId: cellarInvitations.pivnicaId, name: pivnice.name, role: cellarInvitations.role, expiresAt: cellarInvitations.expiresAt })
    .from(cellarInvitations).innerJoin(pivnice, eq(pivnice.id, cellarInvitations.pivnicaId))
    .where(eq(cellarInvitations.tokenHash, verificationTokenHash(token))).get()
  if (!invitation || invitation.expiresAt.getTime() <= Date.now()) throw new DomainError('Pozvánka je neplatná alebo vypršala. Požiadajte vlastníka o novú.', 410)
  return invitation
}

export function acceptInvitation(db: Database, token: string, userId: string) {
  return db.transaction(tx => {
    const invitation = getInvitation(tx, token)
    const user = tx.select().from(users).where(eq(users.id, userId)).get()
    if (!user?.emailVerifiedAt || user.email !== invitation.email) throw new DomainError('Prihláste sa overeným účtom s e-mailom, na ktorý bola pozvánka odoslaná.', 403)
    tx.insert(clenoviaPivnice).values({ pivnicaId: invitation.pivnicaId, userId, role: invitation.role }).onConflictDoNothing().run()
    tx.delete(cellarInvitations).where(eq(cellarInvitations.id, invitation.id)).run()
    return invitation.pivnicaId
  })
}

export function validateCellarLogo(value: unknown): string | null {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.length > CELLAR_LOGO_MAX_DATA_URL_LENGTH || !/^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/i.test(value)) {
    throw new DomainError('Logo musí byť obrázok PNG, JPEG alebo WebP do 10 MB.')
  }
  const bytes = Buffer.from(value.split(',')[1]!, 'base64')
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  const actualType = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : null
  if (bytes.length > CELLAR_LOGO_MAX_BYTES) throw new DomainError('Logo je väčšie ako 10 MB.')
  if (!actualType) throw new DomainError('Súbor nie je podporovaný obrázok. Vyberte PNG, JPEG alebo WebP.')
  // File extensions and browser MIME types can be wrong; store the detected format.
  return `data:${actualType};base64,${bytes.toString('base64')}`
}
