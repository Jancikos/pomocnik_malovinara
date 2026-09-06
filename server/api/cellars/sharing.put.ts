import { and, eq } from 'drizzle-orm'
import { cellarInvitations, clenoviaPivnice } from '../../database/schema'
import { sharingRole } from '../../services/cellar-sharing.service'
import { requireOwner } from '../../utils/auth'
import { DomainError } from '../../utils/errors'
import { withAuth } from '../../utils/handler'
export default defineEventHandler(async event => withAuth(event, async (db, context) => {
  requireOwner(context.role)
  const body = await readBody<Record<string, unknown>>(event)
  if (body.invitationId) {
    db.delete(cellarInvitations).where(and(eq(cellarInvitations.pivnicaId, context.pivnicaId), eq(cellarInvitations.id, String(body.invitationId)))).run()
  } else {
    const where = and(eq(clenoviaPivnice.pivnicaId, context.pivnicaId), eq(clenoviaPivnice.userId, String(body.userId)))
    const member = db.select().from(clenoviaPivnice).where(where).get()
    if (!member || member.role === 'OWNER') throw new DomainError('Prístup vlastníka nemožno zmeniť.', 403)
    if (body.remove === true) db.delete(clenoviaPivnice).where(where).run()
    else db.update(clenoviaPivnice).set({ role: sharingRole(body.role) }).where(where).run()
  }
  return { success: true }
}))
