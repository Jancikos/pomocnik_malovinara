import { and, eq } from 'drizzle-orm'
import { cellarInvitations, clenoviaPivnice, users } from '../../database/schema'
import { requireOwner } from '../../utils/auth'
import { withAuth } from '../../utils/handler'
export default defineEventHandler(event => withAuth(event, (db, context) => {
  requireOwner(context.role)
  return {
    members: db.select({ id: users.id, email: users.email, nickname: users.name, role: clenoviaPivnice.role })
      .from(clenoviaPivnice).innerJoin(users, eq(users.id, clenoviaPivnice.userId)).where(eq(clenoviaPivnice.pivnicaId, context.pivnicaId)).all(),
    invitations: db.select({ id: cellarInvitations.id, email: cellarInvitations.email, role: cellarInvitations.role, expiresAt: cellarInvitations.expiresAt })
      .from(cellarInvitations).where(and(eq(cellarInvitations.pivnicaId, context.pivnicaId))).all(),
  }
}))
