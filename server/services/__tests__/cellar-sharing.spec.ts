import { resolve } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'
import { IncomingMessage, ServerResponse } from 'node:http'
import { Socket } from 'node:net'
import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { createEvent, createError } from 'h3'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as database from '../../database/client'
import { cellarInvitations, clenoviaPivnice, pivnice, sessions, users } from '../../database/schema'
import { acceptInvitation, createInvitation, getInvitation, sharingRole, validateCellarLogo } from '../cellar-sharing.service'
import { requireAuth, requireOwner, selectCellar } from '../../utils/auth'
import { withAuth } from '../../utils/handler'

vi.mock('../../database/init', () => ({ initializeDatabase: async () => {} }))
let context: database.DatabaseContext
function event(path = '/api/pivnica/prehlad', method = 'GET', cellarId?: string) {
  const req = new IncomingMessage(new Socket())
  req.url = path
  req.method = method
  req.headers.cookie = 'vinarsky_session=session-token'
  if (cellarId) req.headers['x-cellar-id'] = cellarId
  return createEvent(req, new ServerResponse(req))
}
beforeEach(() => {
  context = database.createDatabase(':memory:')
  migrate(context.db, { migrationsFolder: resolve('drizzle/migrations') })
  vi.spyOn(database, 'getDatabase').mockReturnValue(context)
  vi.stubGlobal('createError', createError)
  for (const id of ['owner', 'guest', 'other']) context.db.insert(users).values({ id, name: id, email: `${id}@example.sk`, passwordHash: 'x', emailVerifiedAt: new Date() }).run()
  context.db.insert(pivnice).values([{ id: 'shared', name: 'Zdieľaná', defaultContainerLocation: 'Hlavná' }, { id: 'own', name: 'Vlastná' }]).run()
  context.db.insert(clenoviaPivnice).values([{ pivnicaId: 'shared', userId: 'owner', role: 'OWNER' }, { pivnicaId: 'own', userId: 'guest', role: 'OWNER' }]).run()
  context.db.insert(sessions).values({ tokenHash: createHash('sha256').update('session-token').digest('hex'), userId: 'guest', activePivnicaId: 'own', expiresAt: new Date(Date.now() + 60000) }).run()
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); context.sqlite.close() })
const membership = () => context.db.select().from(clenoviaPivnice).where(and(eq(clenoviaPivnice.userId, 'guest'), eq(clenoviaPivnice.pivnicaId, 'shared'))).get()
function join(role: 'MEMBER' | 'VIEWER' = 'VIEWER') {
  const invitation = createInvitation(context.db, 'shared', 'guest@example.sk', role)
  acceptInvitation(context.db, invitation.token, 'guest')
  selectCellar(event(), context.db, 'guest', 'shared')
}

describe('email invitations', () => {
  it('normalizes email, stores only a hash and accepts exactly once for the selected cellar', () => {
    const before = Date.now()
    const invitation = createInvitation(context.db, 'shared', ' GUEST@Example.sk ', 'VIEWER')
    expect(invitation.expiresAt.getTime() - before).toBeGreaterThanOrEqual(86400000)
    expect(invitation.expiresAt.getTime() - before).toBeLessThan(86401000)
    expect(context.db.select().from(cellarInvitations).get()?.tokenHash).not.toBe(invitation.token)
    expect(acceptInvitation(context.db, invitation.token, 'guest')).toBe('shared')
    expect(membership()?.role).toBe('VIEWER')
    expect(context.db.select().from(clenoviaPivnice).where(eq(clenoviaPivnice.pivnicaId, 'own')).get()?.role).toBe('OWNER')
    expect(() => acceptInvitation(context.db, invitation.token, 'guest')).toThrow('neplatná')
  })
  it('supports invitations issued before registration and requires email verification', () => {
    const invitation = createInvitation(context.db, 'shared', 'new@example.sk', 'MEMBER')
    context.db.insert(users).values({ id: 'new', name: 'New', email: 'new@example.sk', passwordHash: 'x' }).run()
    expect(() => acceptInvitation(context.db, invitation.token, 'new')).toThrow('overeným')
    context.db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, 'new')).run()
    expect(acceptInvitation(context.db, invitation.token, 'new')).toBe('shared')
  })
  it('rejects another email without consuming the invitation', () => {
    const invitation = createInvitation(context.db, 'shared', 'guest@example.sk', 'VIEWER')
    expect(() => acceptInvitation(context.db, invitation.token, 'other')).toThrow('overeným')
    expect(getInvitation(context.db, invitation.token).email).toBe('guest@example.sk')
    expect(membership()).toBeUndefined()
  })
  it('expires at exactly 24 hours and rejects unknown tokens', () => {
    vi.useFakeTimers()
    try {
      const invitation = createInvitation(context.db, 'shared', 'guest@example.sk', 'VIEWER')
      vi.advanceTimersByTime(86400000)
      expect(() => acceptInvitation(context.db, invitation.token, 'guest')).toThrow('vypršala')
      expect(() => getInvitation(context.db, 'invented')).toThrow('neplatná')
    } finally { vi.useRealTimers() }
  })
  it('invalidates previous invites when resent and refuses existing members', () => {
    const old = createInvitation(context.db, 'shared', 'guest@example.sk', 'VIEWER')
    const next = createInvitation(context.db, 'shared', 'guest@example.sk', 'MEMBER')
    expect(() => getInvitation(context.db, old.token)).toThrow('neplatná')
    acceptInvitation(context.db, next.token, 'guest')
    expect(membership()?.role).toBe('MEMBER')
    expect(() => createInvitation(context.db, 'shared', 'guest@example.sk', 'VIEWER')).toThrow('už má')
  })
  it('rejects escalation to owner and invalid emails', () => {
    expect(() => sharingRole('OWNER')).toThrow()
    expect(() => createInvitation(context.db, 'shared', 'invalid', 'VIEWER')).toThrow('e-mailovú')
    expect(() => requireOwner('MEMBER')).toThrow('vlastník')
    expect(() => requireOwner('VIEWER')).toThrow('vlastník')
  })
  it('rolls back membership if consuming the invitation fails', () => {
    const invite = createInvitation(context.db, 'shared', 'guest@example.sk', 'VIEWER')
    context.sqlite.exec("CREATE TRIGGER fail_consume BEFORE DELETE ON cellar_invitations BEGIN SELECT RAISE(ABORT, 'test failure'); END")
    expect(() => acceptInvitation(context.db, invite.token, 'guest')).toThrow('test failure')
    expect(membership()).toBeUndefined()
  })
})

describe('cellar authorization', () => {
  it('selects only member cellars and supplies the selected cellar preferences', async () => {
    expect(() => selectCellar(event(), context.db, 'guest', 'shared')).toThrow('prístup')
    join()
    expect(await requireAuth(event(), context.db)).toMatchObject({ pivnicaId: 'shared', role: 'VIEWER', defaultContainerLocation: 'Hlavná' })
    selectCellar(event(), context.db, 'guest', 'own')
    expect(await requireAuth(event(), context.db)).toMatchObject({ pivnicaId: 'own', role: 'OWNER' })
  })
  it.each([
    ['/api/vina', 'POST'], ['/api/vina/1', 'PUT'], ['/api/sarze', 'POST'], ['/api/sarze/1', 'PUT'],
    ['/api/sarze/1', 'DELETE'], ['/api/sarze/1/merania', 'POST'], ['/api/sarze/1/zasahy', 'POST'],
    ['/api/sarze/1/uzavriet', 'POST'], ['/api/presuny', 'POST'], ['/api/pivnica', 'PUT'],
    ['/api/pivnica?source=form', 'PUT'], ['/api/vina?source=form', 'POST'], ['/api/vina/', 'POST'],
  ])('blocks viewer mutation %s %s at the API boundary', async (path, method) => {
    join()
    const action = vi.fn()
    await expect(withAuth(event(path, method), action)).rejects.toMatchObject({ statusCode: 403 })
    expect(action).not.toHaveBeenCalled()
  })
  it('allows viewer reads and personal account edits, and member cellar writes', async () => {
    join()
    await expect(withAuth(event(), () => 'read')).resolves.toBe('read')
    await expect(withAuth(event('/api/account', 'PUT'), () => 'personal')).resolves.toBe('personal')
    context.db.update(clenoviaPivnice).set({ role: 'MEMBER' }).where(eq(clenoviaPivnice.pivnicaId, 'shared')).run()
    await expect(withAuth(event('/api/vina', 'POST'), () => 'write')).resolves.toBe('write')
  })
  it('applies revocation immediately without redirecting writes to the owned cellar', async () => {
    join()
    context.db.delete(clenoviaPivnice).where(and(eq(clenoviaPivnice.pivnicaId, 'shared'), eq(clenoviaPivnice.userId, 'guest'))).run()
    await expect(requireAuth(event('/api/vina', 'POST'), context.db)).rejects.toMatchObject({ statusCode: 403 })
    expect((await requireAuth(event('/api/auth/me'), context.db)).pivnicaId).toBe('own')
    await expect(requireAuth(event('/api/vina', 'POST', 'shared'), context.db)).rejects.toMatchObject({ statusCode: 409 })
  })
  it('rejects stale forms after a cellar switch in another tab', async () => {
    join('MEMBER')
    selectCellar(event(), context.db, 'guest', 'own')
    await expect(requireAuth(event('/api/vina', 'POST', 'shared'), context.db)).rejects.toMatchObject({ statusCode: 409 })
  })
})

describe('cellar logo', () => {
  it('recognizes PNG content even when the extension reports JPEG or an unknown type', () => {
    const data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXZsAAAAASUVORK5CYII='
    for (const type of ['image/jpeg', 'application/octet-stream', 'image/png']) {
      expect(validateCellarLogo(`data:${type};base64,${data}`)).toBe(`data:image/png;base64,${data}`)
    }
  })
  it('accepts an image at the 10 MB limit and rejects one byte above it', () => {
    const bytes = Buffer.alloc(10_000_000)
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes)
    const atLimit = `data:image/png;base64,${bytes.toString('base64')}`
    expect(validateCellarLogo(atLimit)).toBe(atLimit)
    const overLimit = `data:image/png;base64,${Buffer.concat([bytes, Buffer.alloc(1)]).toString('base64')}`
    expect(() => validateCellarLogo(overLimit)).toThrow('10 MB')
  })
  it('allows a small PNG and removal, rejects SVG, URLs, disguised files and oversized data', () => {
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXZsAAAAASUVORK5CYII='
    expect(validateCellarLogo(png)).toBe(png)
    expect(validateCellarLogo(null)).toBeNull()
    for (const value of ['https://example.com/logo.png', 'data:image/svg+xml;base64,PHN2Zz4=', 'data:image/png;base64,PHNjcmlwdD4=', 'data:image/png;base64,' + 'A'.repeat(700001)]) expect(() => validateCellarLogo(value)).toThrow()
  })
})

describe('existing cellar migration', () => {
  it('preserves membership and moves the owner default location to the cellar', () => {
    const legacy = database.createDatabase(':memory:')
    try {
      const folder = resolve('drizzle/migrations')
      for (const file of readdirSync(folder).filter(file => file.endsWith('.sql') && file < '0006').sort()) {
        legacy.sqlite.exec(readFileSync(resolve(folder, file), 'utf8'))
      }
      legacy.sqlite.exec(`
        INSERT INTO users (id, email, password_hash, name, default_container_location) VALUES ('legacy', 'legacy@example.sk', 'x', 'Owner', 'Stará miestnosť');
        INSERT INTO pivnice (id, name) VALUES ('legacy', 'Stará pivnica');
        INSERT INTO pivnica_members (pivnica_id, user_id, role) VALUES ('legacy', 'legacy', 'OWNER');
      `)
      legacy.sqlite.exec(readFileSync(resolve(folder, '0006_eminent_agent_brand.sql'), 'utf8'))
      expect(legacy.db.select().from(pivnice).get()).toMatchObject({ name: 'Stará pivnica', defaultContainerLocation: 'Stará miestnosť', logo: null })
      expect(legacy.db.select().from(clenoviaPivnice).get()?.role).toBe('OWNER')
    } finally { legacy.sqlite.close() }
  })
})

describe('sharing API endpoints', () => {
  async function globals(body: Record<string, unknown>) {
    const h3 = await import('h3')
    vi.stubGlobal('defineEventHandler', h3.defineEventHandler)
    vi.stubGlobal('readBody', vi.fn().mockResolvedValue(body))
  }
  it('lets an owner downgrade and revoke a member; blocks changes to owners', async () => {
    join('MEMBER')
    context.db.update(sessions).set({ userId: 'owner' }).run()
    await globals({ userId: 'guest', role: 'VIEWER' })
    const handler = (await import('../../api/cellars/sharing.put')).default
    await handler(event('/api/cellars/sharing', 'PUT'))
    expect(membership()?.role).toBe('VIEWER')
    await globals({ userId: 'owner', remove: true })
    await expect(handler(event('/api/cellars/sharing', 'PUT'))).rejects.toMatchObject({ statusCode: 403 })
    await globals({ userId: 'guest', remove: true })
    await handler(event('/api/cellars/sharing', 'PUT'))
    expect(membership()).toBeUndefined()
  })
  it('blocks editors from reading or modifying sharing and issuing invites', async () => {
    join('MEMBER')
    await globals({ email: 'other@example.sk', role: 'MEMBER', userId: 'owner', remove: true })
    const read = (await import('../../api/cellars/sharing.get')).default
    const update = (await import('../../api/cellars/sharing.put')).default
    const invite = (await import('../../api/cellars/invite.post')).default
    await expect(read(event('/api/cellars/sharing'))).rejects.toMatchObject({ statusCode: 403 })
    await expect(update(event('/api/cellars/sharing', 'PUT'))).rejects.toMatchObject({ statusCode: 403 })
    await expect(invite(event('/api/cellars/invite', 'POST'))).rejects.toMatchObject({ statusCode: 403 })
  })
  it('revokes only invitations in the active cellar', async () => {
    const invitation = createInvitation(context.db, 'shared', 'other@example.sk', 'VIEWER')
    await globals({ invitationId: invitation.id })
    const handler = (await import('../../api/cellars/sharing.put')).default
    await handler(event('/api/cellars/sharing', 'PUT'))
    expect(getInvitation(context.db, invitation.token).pivnicaId).toBe('shared')
    context.db.update(sessions).set({ userId: 'owner', activePivnicaId: 'shared' }).run()
    await handler(event('/api/cellars/sharing', 'PUT'))
    expect(() => getInvitation(context.db, invitation.token)).toThrow('neplatná')
  })
  it('updates shared cellar settings while personal settings cannot modify the cellar', async () => {
    join('MEMBER')
    await globals({ name: 'Nový názov', defaultContainerLocation: 'Sklad', logo: null })
    const settings = (await import('../../api/pivnica/index.put')).default
    await settings(event('/api/pivnica', 'PUT'))
    expect(context.db.select().from(pivnice).where(eq(pivnice.id, 'shared')).get()).toMatchObject({ name: 'Nový názov', defaultContainerLocation: 'Sklad' })
    await globals({ nickname: 'Hosť', cellarName: 'Neoprávnená zmena', defaultContainerLocation: 'Iné' })
    const account = (await import('../../api/account/index.put')).default
    await account(event('/api/account', 'PUT'))
    expect(context.db.select().from(pivnice).where(eq(pivnice.id, 'shared')).get()?.name).toBe('Nový názov')
  })
  it('returns a development link without sending mail and selects the cellar after acceptance', async () => {
    context.db.update(sessions).set({ userId: 'owner', activePivnicaId: 'shared' }).run()
    await globals({ email: 'guest@example.sk', role: 'VIEWER' })
    vi.stubGlobal('useRuntimeConfig', () => ({ appUrl: 'http://localhost:3000', smtpHost: '' }))
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const invite = (await import('../../api/cellars/invite.post')).default
    const result = await invite(event('/api/cellars/invite', 'POST'))
    expect(result.developmentUrl).toContain('/pozvanka?token=')
    const token = new URL(result.developmentUrl!).searchParams.get('token')!
    context.db.update(sessions).set({ userId: 'guest', activePivnicaId: 'own' }).run()
    await globals({ token })
    const accept = (await import('../../api/invitations/accept.post')).default
    await accept(event('/api/invitations/accept', 'POST'))
    expect((await requireAuth(event(), context.db)).pivnicaId).toBe('shared')
    expect(membership()?.role).toBe('VIEWER')
  })
  it('removes the issued token if email configuration fails', async () => {
    context.db.update(sessions).set({ userId: 'owner', activePivnicaId: 'shared' }).run()
    await globals({ email: 'guest@example.sk', role: 'VIEWER' })
    vi.stubGlobal('useRuntimeConfig', () => { throw new Error('mail unavailable') })
    const invite = (await import('../../api/cellars/invite.post')).default
    await expect(invite(event('/api/cellars/invite', 'POST'))).rejects.toMatchObject({ statusCode: 503 })
    expect(context.db.select().from(cellarInvitations).all()).toHaveLength(0)
  })
})
