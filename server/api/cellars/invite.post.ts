import { eq } from 'drizzle-orm'
import { cellarInvitations } from '../../database/schema'
import { createInvitation } from '../../services/cellar-sharing.service'
import { requireOwner } from '../../utils/auth'
import { sendVerificationEmail } from '../../utils/email-verification'
import { DomainError } from '../../utils/errors'
import { withAuth } from '../../utils/handler'
export default defineEventHandler(async event => withAuth(event, async (db, context) => {
  requireOwner(context.role)
  const body = await readBody<Record<string, unknown>>(event)
  const invitation = createInvitation(db, context.pivnicaId, body.email, body.role)
  try {
    const mail = await sendVerificationEmail(event, invitation.email, invitation.token, true)
    return { developmentUrl: mail.developmentUrl, expiresAt: invitation.expiresAt }
  } catch {
    db.delete(cellarInvitations).where(eq(cellarInvitations.id, invitation.id)).run()
    throw new DomainError('Pozvánku sa nepodarilo odoslať. Skúste to znova.', 503)
  }
}))
