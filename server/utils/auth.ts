import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { deleteCookie, getCookie, getHeader, setCookie } from 'h3'
import { clenoviaPivnice, pivnice, sessions, users } from '../database/schema'
import type { Database } from '../database/client'
import { DomainError } from './errors'

const cookieName = 'vinarsky_session'
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')

export function listCellars(db: Database, userId: string) {
  return db.select({ id: pivnice.id, name: pivnice.name, logo: pivnice.logo, role: clenoviaPivnice.role,
    defaultContainerLocation: pivnice.defaultContainerLocation })
    .from(clenoviaPivnice).innerJoin(pivnice, eq(clenoviaPivnice.pivnicaId, pivnice.id))
    .where(eq(clenoviaPivnice.userId, userId)).orderBy(clenoviaPivnice.createdAt, pivnice.id).all()
}

export async function requireAuth(event: H3Event, db: Database) {
  const token = getCookie(event, cookieName)
  if (!token) throw new DomainError('Prihláste sa.', 401)
  const row = db.select({ userId: users.id, userNickname: users.name, userEmail: users.email,
    emailVerifiedAt: users.emailVerifiedAt, activePivnicaId: sessions.activePivnicaId })
    .from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date()))).get()
  if (!row || !row.emailVerifiedAt) {
    deleteCookie(event, cookieName)
    throw new DomainError('Platnosť prihlásenia vypršala.', 401)
  }
  const cellars = listCellars(db, row.userId)
  const selected = cellars.find(c => c.id === row.activePivnicaId)
  const canRecoverSelection = event.path.split('?')[0] === '/api/auth/me' || event.path === '/api/cellars/select'
  const cellar = selected ?? (!row.activePivnicaId || canRecoverSelection ? cellars[0] : undefined)
  // A revoked selection must never silently redirect a write to another cellar.
  if (!cellar) throw new DomainError('Prístup k aktívnej pivnici bol odobratý. Prihláste sa znova.', 403)
  const expectedCellar = getHeader(event, 'x-cellar-id')
  if (expectedCellar && expectedCellar !== cellar.id) throw new DomainError('Aktívna pivnica sa zmenila v inom okne. Obnovte stránku pred uložením.', 409)
  if (row.activePivnicaId !== cellar.id) selectCellar(event, db, row.userId, cellar.id)
  return { userId: row.userId, userNickname: row.userNickname, userEmail: row.userEmail,
    defaultContainerLocation: cellar.defaultContainerLocation, pivnicaId: cellar.id,
    nazovPivnice: cellar.name, role: cellar.role, logo: cellar.logo, cellars }
}

export function selectCellar(event: H3Event, db: Database, userId: string, cellarId: string) {
  if (!listCellars(db, userId).some(c => c.id === cellarId)) throw new DomainError('K tejto pivnici nemáte prístup.', 403)
  const token = getCookie(event, cookieName)
  if (!token) throw new DomainError('Prihláste sa.', 401)
  db.update(sessions).set({ activePivnicaId: cellarId }).where(and(eq(sessions.tokenHash, tokenHash(token)), eq(sessions.userId, userId))).run()
}

export function requireCellarWrite(role: string) {
  if (role !== 'OWNER' && role !== 'MEMBER') throw new DomainError('Táto pivnica je pre vás iba na čítanie.', 403)
}

export function requireOwner(role: string) {
  if (role !== 'OWNER') throw new DomainError('Zdieľanie môže spravovať iba vlastník pivnice.', 403)
}

export function createSession(event: H3Event, db: Database, userId: string): void {
  const token = randomBytes(32).toString('base64url')
  db.insert(sessions).values({ tokenHash: tokenHash(token), userId, activePivnicaId: listCellars(db, userId)[0]?.id, expiresAt: new Date(Date.now() + sessionDurationMs) }).run()
  setCookie(event, cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: sessionDurationMs / 1000 })
}

export function destroySession(event: H3Event, db: Database): void {
  const token = getCookie(event, cookieName)
  if (token) db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token))).run()
  deleteCookie(event, cookieName, { path: '/' })
}
