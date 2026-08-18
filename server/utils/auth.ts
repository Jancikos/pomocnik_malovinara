import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { deleteCookie, getCookie, setCookie } from 'h3'
import { cellarMembers, cellars, sessions, users } from '../database/schema'
import type { Database } from '../database/client'
import { DomainError } from './errors'

const cookieName = 'vinarsky_session'
const sessionDurationMs = 30 * 24 * 60 * 60 * 1000

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function requireAuth(event: H3Event, db: Database) {
  const token = getCookie(event, cookieName)
  if (!token) throw new DomainError('Prihláste sa.', 401)
  const row = db.select({ userId: users.id, userName: users.name, cellarId: cellars.id, cellarName: cellars.name })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(cellarMembers, eq(cellarMembers.userId, users.id))
    .innerJoin(cellars, eq(cellarMembers.cellarId, cellars.id))
    .where(and(eq(sessions.tokenHash, tokenHash(token)), gt(sessions.expiresAt, new Date())))
    .get()
  if (!row) {
    deleteCookie(event, cookieName)
    throw new DomainError('Platnosť prihlásenia vypršala.', 401)
  }
  return { userId: row.userId, userName: row.userName, cellarId: row.cellarId, cellarName: row.cellarName }
}

export function createSession(event: H3Event, db: Database, userId: string): void {
  const token = randomBytes(32).toString('base64url')
  db.insert(sessions).values({ tokenHash: tokenHash(token), userId, expiresAt: new Date(Date.now() + sessionDurationMs) }).run()
  setCookie(event, cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: sessionDurationMs / 1000,
  })
}

export function destroySession(event: H3Event, db: Database): void {
  const token = getCookie(event, cookieName)
  if (token) db.delete(sessions).where(eq(sessions.tokenHash, tokenHash(token))).run()
  deleteCookie(event, cookieName, { path: '/' })
}